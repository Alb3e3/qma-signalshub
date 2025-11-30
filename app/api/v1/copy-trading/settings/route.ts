import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/copy-trading/settings
 * Get all copy-trading settings for the authenticated user
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's subscriber wallets first
  const { data: wallets } = await supabase
    .from('subscriber_wallets')
    .select('id')
    .eq('user_id', user.id);

  if (!wallets || wallets.length === 0) {
    return NextResponse.json({ settings: [] });
  }

  const walletIds = wallets.map(w => w.id);

  const { data: settings, error } = await supabase
    .from('copy_settings')
    .select(`
      id,
      provider_id,
      is_active,
      copy_mode,
      size_value,
      max_position_usd,
      max_daily_loss_usd,
      allowed_pairs,
      copy_stop_loss,
      copy_take_profit,
      created_at,
      subscriber_wallet_id,
      providers!inner (
        id,
        display_name,
        is_verified,
        performance_30d
      )
    `)
    .in('subscriber_wallet_id', walletIds)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }

  return NextResponse.json({ settings });
}

/**
 * POST /api/v1/copy-trading/settings
 * Create new copy-trading settings
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    subscriber_wallet_id,
    provider_id,
    copy_mode = 'fixed_percent',
    size_value = 5,
    max_position_usd = 1000,
    max_daily_loss_usd = 500,
    allowed_pairs = null,
    copy_stop_loss = true,
    copy_take_profit = true,
  } = body;

  // Validate required fields
  if (!subscriber_wallet_id || !provider_id) {
    return NextResponse.json(
      { error: 'subscriber_wallet_id and provider_id are required' },
      { status: 400 }
    );
  }

  // Validate copy_mode
  if (!['proportional', 'fixed_percent', 'fixed_size'].includes(copy_mode)) {
    return NextResponse.json({ error: 'Invalid copy_mode' }, { status: 400 });
  }

  // Verify wallet belongs to user
  const { data: wallet } = await supabase
    .from('subscriber_wallets')
    .select('id')
    .eq('id', subscriber_wallet_id)
    .eq('user_id', user.id)
    .single();

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  // Check if settings already exist for this wallet-provider pair
  const { data: existing } = await supabase
    .from('copy_settings')
    .select('id')
    .eq('subscriber_wallet_id', subscriber_wallet_id)
    .eq('provider_id', provider_id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: 'Copy settings already exist for this provider' },
      { status: 409 }
    );
  }

  const adminClient = createAdminClient();
  const { data: settings, error } = await adminClient
    .from('copy_settings')
    .insert({
      subscriber_wallet_id,
      provider_id,
      is_active: true,
      copy_mode,
      size_value,
      max_position_usd,
      max_daily_loss_usd,
      allowed_pairs,
      copy_stop_loss,
      copy_take_profit,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create copy settings:', error);
    return NextResponse.json({ error: 'Failed to create copy settings' }, { status: 500 });
  }

  return NextResponse.json({ settings }, { status: 201 });
}
