// @ts-nocheck
// TODO: Fix Supabase type inference issues with Database type
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/utils/crypto';
import { createBitgetClient } from '@/lib/exchanges/bitget';

/**
 * GET /api/v1/copy-trading/wallets
 * Get all subscriber wallets for the authenticated user
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: wallets, error } = await supabase
    .from('subscriber_wallets')
    .select('id, exchange, label, is_active, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 });
  }

  return NextResponse.json({ wallets });
}

/**
 * POST /api/v1/copy-trading/wallets
 * Connect a new exchange wallet for copy-trading
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier || 'free';

  if (!['copy', 'enterprise'].includes(tier)) {
    return NextResponse.json(
      { error: 'Copy-trading requires a Copy subscription or higher' },
      { status: 403 }
    );
  }

  // Check wallet limits
  const { count } = await supabase
    .from('subscriber_wallets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const walletLimits: Record<string, number> = {
    copy: 1,
    enterprise: 5,
  };

  const limit = walletLimits[tier] || 0;
  if ((count || 0) >= limit) {
    return NextResponse.json(
      { error: `Wallet limit reached. Your ${tier} plan allows ${limit} connected wallets.` },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { exchange, api_key, api_secret, api_passphrase, label } = body;

  // Validate required fields
  if (!exchange || !api_key || !api_secret) {
    return NextResponse.json(
      { error: 'exchange, api_key, and api_secret are required' },
      { status: 400 }
    );
  }

  // Currently only Bitget is supported
  if (exchange !== 'bitget') {
    return NextResponse.json(
      { error: 'Currently only Bitget exchange is supported' },
      { status: 400 }
    );
  }

  // Bitget requires passphrase
  if (exchange === 'bitget' && !api_passphrase) {
    return NextResponse.json(
      { error: 'Bitget requires an API passphrase' },
      { status: 400 }
    );
  }

  // Validate credentials by testing connection
  try {
    const client = createBitgetClient({
      apiKey: api_key,
      secretKey: api_secret,
      passphrase: api_passphrase || '',
    });

    const isValid = await client.validateCredentials();
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API credentials. Please check your keys and try again.' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to validate credentials: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 400 }
    );
  }

  // Encrypt credentials
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    return NextResponse.json({ error: 'Encryption not configured' }, { status: 500 });
  }

  const apiKeyEncrypted = encrypt(api_key, encryptionKey);
  const apiSecretEncrypted = encrypt(api_secret, encryptionKey);
  const apiPassphraseEncrypted = api_passphrase
    ? encrypt(api_passphrase, encryptionKey)
    : null;

  const adminClient = createAdminClient();
  const { data: wallet, error } = await adminClient
    .from('subscriber_wallets')
    .insert({
      user_id: user.id,
      exchange,
      label: label || `${exchange} wallet`,
      api_key_encrypted: apiKeyEncrypted,
      api_secret_encrypted: apiSecretEncrypted,
      api_passphrase_encrypted: apiPassphraseEncrypted,
      is_active: true,
    })
    .select('id, exchange, label, is_active, created_at')
    .single();

  if (error) {
    console.error('Failed to create wallet:', error);
    return NextResponse.json({ error: 'Failed to connect wallet' }, { status: 500 });
  }

  return NextResponse.json({
    wallet,
    message: 'Wallet connected successfully. Your credentials are encrypted and stored securely.',
  }, { status: 201 });
}
