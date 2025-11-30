// @ts-nocheck
// TODO: Fix Supabase type inference issues with Database type
/**
 * API Authentication Utilities
 * Validates API keys and checks permissions for API routes
 */

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { hashApiKey, isValidApiKeyFormat, getApiKeyEnvironment } from '@/lib/utils/apiKey';

export interface ApiKeyValidation {
  valid: boolean;
  userId?: string;
  keyId?: string;
  environment?: 'live' | 'test';
  permissions?: string[];
  tier?: string;
  error?: string;
}

/**
 * Extract API key from request headers
 * Supports both Bearer token and X-API-Key header
 */
export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header first (Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fall back to X-API-Key header
  const apiKeyHeader = request.headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Validate an API key and return user info
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyValidation> {
  // Check format first
  if (!isValidApiKeyFormat(apiKey)) {
    return { valid: false, error: 'Invalid API key format' };
  }

  const environment = getApiKeyEnvironment(apiKey);
  if (!environment) {
    return { valid: false, error: 'Invalid API key environment' };
  }

  // Hash the key to compare with stored hash
  const keyHash = hashApiKey(apiKey);

  // Use admin client to look up the key
  const adminClient = createAdminClient();

  const { data: keyRecord, error } = await adminClient
    .from('api_keys')
    .select(`
      id,
      user_id,
      environment,
      permissions,
      expires_at,
      is_active,
      profiles!inner (
        subscription_tier
      )
    `)
    .eq('key_hash', keyHash)
    .single();

  if (error || !keyRecord) {
    return { valid: false, error: 'Invalid API key' };
  }

  // Check if key is active
  if (!keyRecord.is_active) {
    return { valid: false, error: 'API key is disabled' };
  }

  // Check expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }

  // Update last used timestamp (fire and forget)
  adminClient
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {});

  // Extract tier from joined profile
  const profile = keyRecord.profiles as unknown as { subscription_tier: string };

  return {
    valid: true,
    userId: keyRecord.user_id,
    keyId: keyRecord.id,
    environment: keyRecord.environment as 'live' | 'test',
    permissions: keyRecord.permissions as string[],
    tier: profile?.subscription_tier || 'free',
  };
}

/**
 * Check if a key has a specific permission
 */
export function hasPermission(permissions: string[], required: string): boolean {
  // Check exact match
  if (permissions.includes(required)) {
    return true;
  }

  // Check wildcard (e.g., "signals:*" matches "signals:read")
  const [resource, action] = required.split(':');
  if (permissions.includes(`${resource}:*`)) {
    return true;
  }

  // Check full wildcard
  if (permissions.includes('*')) {
    return true;
  }

  return false;
}

/**
 * Middleware helper to authenticate API requests
 */
export async function authenticateApiRequest(
  request: NextRequest,
  requiredPermission?: string
): Promise<ApiKeyValidation> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return { valid: false, error: 'API key required. Use Bearer token or X-API-Key header.' };
  }

  const validation = await validateApiKey(apiKey);

  if (!validation.valid) {
    return validation;
  }

  // Check permission if required
  if (requiredPermission && validation.permissions) {
    if (!hasPermission(validation.permissions, requiredPermission)) {
      return { valid: false, error: `Missing permission: ${requiredPermission}` };
    }
  }

  return validation;
}

/**
 * Rate limiting based on subscription tier
 */
export function getRateLimits(tier: string): { requests: number; window: number } {
  const limits: Record<string, { requests: number; window: number }> = {
    free: { requests: 50, window: 86400 }, // 50/day
    pro: { requests: 1000, window: 3600 }, // 1000/hour
    copy: { requests: 5000, window: 3600 }, // 5000/hour
    enterprise: { requests: 50000, window: 3600 }, // 50000/hour
  };

  return limits[tier] || limits.free;
}
