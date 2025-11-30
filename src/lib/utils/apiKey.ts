/**
 * API Key Utilities
 * Functions for generating and validating API keys
 */

import { generateSecureRandom, sha256 } from './crypto';

export type ApiKeyEnvironment = 'live' | 'test';

export interface GeneratedApiKey {
  /** Full API key (shown only once) */
  key: string;
  /** SHA-256 hash of the key (stored in database) */
  hash: string;
  /** Prefix for identification (e.g., qma_live_abc1) */
  prefix: string;
}

/**
 * Generate a new API key
 * @param environment - 'live' or 'test'
 * @returns Object containing key, hash, and prefix
 */
export function generateApiKey(environment: ApiKeyEnvironment = 'live'): GeneratedApiKey {
  const randomBytes = generateSecureRandom(32);
  const key = `qma_${environment}_${randomBytes}`;
  const hash = sha256(key);
  const prefix = key.substring(0, 12);

  return { key, hash, prefix };
}

/**
 * Hash an API key for storage/comparison
 * @param key - Full API key
 * @returns SHA-256 hash
 */
export function hashApiKey(key: string): string {
  return sha256(key);
}

/**
 * Extract environment from API key
 * @param key - Full API key
 * @returns 'live', 'test', or null if invalid
 */
export function getApiKeyEnvironment(key: string): ApiKeyEnvironment | null {
  if (key.startsWith('qma_live_')) return 'live';
  if (key.startsWith('qma_test_')) return 'test';
  return null;
}

/**
 * Get the prefix from an API key
 * @param key - Full API key
 * @returns First 12 characters
 */
export function getApiKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

/**
 * Validate API key format
 * @param key - API key to validate
 * @returns Whether the key has valid format
 */
export function isValidApiKeyFormat(key: string): boolean {
  const pattern = /^qma_(live|test)_[a-f0-9]{64}$/;
  return pattern.test(key);
}

/**
 * Mask an API key for display
 * @param key - Full API key
 * @returns Masked key (e.g., qma_live_abc1...xxxx)
 */
export function maskApiKey(key: string): string {
  if (key.length < 20) return key;
  const prefix = key.substring(0, 12);
  const suffix = key.substring(key.length - 4);
  return `${prefix}...${suffix}`;
}
