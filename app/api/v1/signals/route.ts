// @ts-nocheck
// TODO: Fix Supabase type inference issues
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/api/auth';

/**
 * GET /api/v1/signals
 * Get signals with filtering and pagination
 * Query params: provider_id, pair, status, limit, offset, since
 */
export async function GET(request: NextRequest) {
  // Authenticate the request
  const auth = await authenticateApiRequest(request, 'signals:read');
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

  // Build query
  let query = adminClient
    .from('signals')
    .select(`
      id,
      provider_id,
      pair,
      direction,
      entry_price,
      stop_loss,
      take_profit,
      leverage,
      confidence,
      status,
      result_pnl_percent,
      created_at,
      closed_at,
      providers!inner (
        id,
        display_name,
        is_verified
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (providerId) {
    query = query.eq('provider_id', providerId);
  }

  if (pair) {
    query = query.eq('pair', pair.toUpperCase());
  }

  if (status) {
    const validStatuses = ['active', 'closed', 'cancelled'];
    if (validStatuses.includes(status)) {
      query = query.eq('status', status);
    }
  }

  if (since) {
    query = query.gte('created_at', since);
  }

  // Free tier gets delayed signals (15 min delay)
  if (auth.tier === 'free') {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    query = query.lte('created_at', fifteenMinutesAgo);
  }

  const { data: signals, error, count } = await query;

  if (error) {
    console.error('Failed to fetch signals:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }

  return NextResponse.json({
    signals,
    pagination: {
      limit,
      offset,
      total: count || signals?.length || 0,
    },
    tier: auth.tier,
    delayed: auth.tier === 'free',
  });
}
