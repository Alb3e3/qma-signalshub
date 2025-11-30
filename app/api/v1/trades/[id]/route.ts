// @ts-nocheck
// TODO: Fix Supabase type inference issues with Database type
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/api/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/trades/[id]
 * Get a specific trade by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const auth = await authenticateApiRequest(request, 'trades:read');
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: trade, error } = await adminClient
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
      stop_loss,
      take_profit,
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
    .eq('id', id)
    .single();

  if (error || !trade) {
    return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
  }

  return NextResponse.json({ trade });
}

/**
 * PATCH /api/v1/trades/[id]
 * Update a trade (close it, update exit price, etc.)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

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

  const adminClient = createAdminClient();

  // Get the provider for this user
  const { data: provider } = await adminClient
    .from('providers')
    .select('id')
    .eq('user_id', auth.userId)
    .single();

  if (!provider) {
    return NextResponse.json({ error: 'Provider not found' }, { status: 403 });
  }

  // Verify the trade belongs to this provider
  const { data: existingTrade } = await adminClient
    .from('trades')
    .select('id, provider_id, entry_price, direction, status')
    .eq('id', id)
    .single();

  if (!existingTrade) {
    return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
  }

  if (existingTrade.provider_id !== provider.id) {
    return NextResponse.json({ error: 'Not authorized to update this trade' }, { status: 403 });
  }

  const { exit_price, status, fees_usd } = body;

  const updates: Record<string, unknown> = {};

  if (exit_price !== undefined) {
    updates.exit_price = parseFloat(exit_price);

    // Calculate PnL
    const entryPrice = existingTrade.entry_price;
    const direction = existingTrade.direction;
    const pnlPercent =
      direction === 'long'
        ? ((exit_price - entryPrice) / entryPrice) * 100
        : ((entryPrice - exit_price) / entryPrice) * 100;
    updates.pnl_percent = pnlPercent;
  }

  if (status !== undefined) {
    const validStatuses = ['open', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updates.status = status;
    if (status === 'closed' || status === 'cancelled') {
      updates.closed_at = new Date().toISOString();
    }
  }

  if (fees_usd !== undefined) {
    updates.fees_usd = parseFloat(fees_usd);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: trade, error } = await adminClient
    .from('trades')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }

  // Also update the associated signal if closing the trade
  if (status === 'closed' || status === 'cancelled') {
    await adminClient
      .from('signals')
      .update({
        status: status === 'closed' ? 'closed' : 'cancelled',
        result_pnl_percent: updates.pnl_percent as number | undefined,
        closed_at: updates.closed_at as string,
      })
      .eq('trade_id', id);
  }

  return NextResponse.json({ trade });
}
