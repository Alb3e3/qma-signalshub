// @ts-nocheck
// TODO: Fix Supabase type inference issues
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/api/auth';

/**
 * GET /api/v1/trades
 * Get trades with filtering and pagination
 * Query params: provider_id, pair, status, limit, offset, since
 */
export async function GET(request: NextRequest) {
  // Authenticate the request
  const auth = await authenticateApiRequest(request, 'trades:read');
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('provider_id');
  const pair = searchParams.get('pair');
  const status = searchParams.get('status');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const since = searchParams.get('since'); // ISO timestamp

  const adminClient = createAdminClient();

  let query = adminClient
    .from('trades')
    .select(`
      id,
      provider_id,
      external_trade_id,
      pair,
      direction,
      entry_price,
      exit_price,
      quantity,
      leverage,
      pnl_percent,
      pnl_usd,
      fees_usd,
      status,
      opened_at,
      closed_at,
      providers!inner (
        id,
        display_name,
        is_verified
      )
    `)
    .order('opened_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (providerId) {
    query = query.eq('provider_id', providerId);
  }

  if (pair) {
    query = query.eq('pair', pair.toUpperCase());
  }

  if (status) {
    const validStatuses = ['open', 'closed', 'cancelled'];
    if (validStatuses.includes(status)) {
      query = query.eq('status', status);
    }
  }

  if (since) {
    query = query.gte('opened_at', since);
  }

  const { data: trades, error, count } = await query;

  if (error) {
    console.error('Failed to fetch trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }

  return NextResponse.json({
    trades,
    pagination: {
      limit,
      offset,
      total: count || trades?.length || 0,
    },
  });
}

/**
 * POST /api/v1/trades
 * Create a new trade (for providers pushing their trades)
 */
export async function POST(request: NextRequest) {
  // Authenticate the request
  const auth = await authenticateApiRequest(request, 'trades:write');
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    external_trade_id,
    pair,
    direction,
    entry_price,
    quantity,
    leverage = 1,
    stop_loss,
    take_profit,
  } = body;

  // Validate required fields
  if (!pair || !direction || !entry_price || !quantity) {
    return NextResponse.json(
      { error: 'Missing required fields: pair, direction, entry_price, quantity' },
      { status: 400 }
    );
  }

  if (!['long', 'short'].includes(direction)) {
    return NextResponse.json({ error: 'Direction must be "long" or "short"' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Get the provider for this user
  const { data: provider, error: providerError } = await adminClient
    .from('providers')
    .select('id')
    .eq('user_id', auth.userId)
    .single();

  if (providerError || !provider) {
    return NextResponse.json(
      { error: 'You must be a registered provider to create trades' },
      { status: 403 }
    );
  }

  // Create the trade
  const { data: trade, error } = await adminClient
    .from('trades')
    .insert({
      provider_id: provider.id,
      external_trade_id,
      pair: pair.toUpperCase(),
      direction,
      entry_price: parseFloat(entry_price),
      quantity: parseFloat(quantity),
      leverage: parseInt(leverage),
      stop_loss: stop_loss ? parseFloat(stop_loss) : null,
      take_profit: take_profit ? parseFloat(take_profit) : null,
      status: 'open',
      opened_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }

  // Also create a signal for this trade
  const { error: signalError } = await adminClient
    .from('signals')
    .insert({
      provider_id: provider.id,
      trade_id: trade.id,
      pair: trade.pair,
      direction: trade.direction,
      entry_price: trade.entry_price,
      stop_loss: trade.stop_loss,
      take_profit: trade.take_profit,
      leverage: trade.leverage,
      status: 'active',
    });

  if (signalError) {
    console.error('Failed to create signal for trade:', signalError);
    // Don't fail the request, the trade was created
  }

  return NextResponse.json({ trade }, { status: 201 });
}
