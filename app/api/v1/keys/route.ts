// @ts-nocheck
// TODO: Fix Supabase type inference issues
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateApiKey, getApiKeyPrefix } from '@/lib/utils/apiKey';

/**
 * GET /api/v1/keys
 * List all API keys for the authenticated user
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, environment, permissions, last_used_at, created_at, expires_at, is_active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }

  return NextResponse.json({ keys });
}

/**
 * POST /api/v1/keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check subscription tier for API key limits
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier || 'free';

  // Count existing active keys
  const { count } = await supabase
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);

  const keyLimits: Record<string, number> = {
    free: 2,
    pro: 5,
    copy: 10,
    enterprise: 50,
  };

  const limit = keyLimits[tier] || 2;
  if ((count || 0) >= limit) {
    return NextResponse.json(
      { error: `API key limit reached. Your ${tier} plan allows ${limit} active keys.` },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, environment = 'live', permissions = ['signals:read'], expires_in_days } = body;

  if (!name || typeof name !== 'string' || name.length < 1 || name.length > 100) {
    return NextResponse.json({ error: 'Name is required (1-100 characters)' }, { status: 400 });
  }

  if (!['live', 'test'].includes(environment)) {
    return NextResponse.json({ error: 'Environment must be "live" or "test"' }, { status: 400 });
  }

  // Validate permissions
  const validPermissions = ['signals:read', 'signals:write', 'trades:read', 'trades:write', 'webhooks:manage'];
  const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p));
  if (invalidPerms.length > 0) {
    return NextResponse.json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` }, { status: 400 });
  }

  // Generate the API key
  const { key, hash, prefix } = generateApiKey(environment as 'live' | 'test');

  // Calculate expiration
  let expiresAt = null;
  if (expires_in_days && typeof expires_in_days === 'number' && expires_in_days > 0) {
    expiresAt = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();
  }

  // Use admin client to insert (bypasses RLS for initial insert)
  const adminClient = createAdminClient();
  const { data: newKey, error: insertError } = await adminClient
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      key_hash: hash,
      key_prefix: prefix,
      environment,
      permissions,
      expires_at: expiresAt,
      is_active: true,
    })
    .select('id, name, key_prefix, environment, permissions, created_at, expires_at')
    .single();

  if (insertError) {
    console.error('Failed to create API key:', insertError);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }

  // Return the full key only once - it won't be retrievable again
  return NextResponse.json({
    key,
    ...newKey,
    message: 'Store this key securely. It will not be shown again.',
  }, { status: 201 });
}
