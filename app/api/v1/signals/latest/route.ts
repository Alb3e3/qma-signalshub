import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/api/auth';

/**
 * GET /api/v1/signals/latest
 * Get the latest active signals (most common use case)
 * Query params: provider_id, limit
 */
export async function GET(request: NextRequest) {
  // Authenticate the request
  const auth = await authenticateApiRequest(request, 'signals:read');
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('provider_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

  const adminClient = createAdminClient();

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
      created_at,
      providers!inner (
        id,
        display_name,
        is_verified
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (providerId) {
    query = query.eq('provider_id', providerId);
  }

  // Free tier gets delayed signals
  if (auth.tier === 'free') {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    query = query.lte('created_at', fifteenMinutesAgo);
  }

  const { data: signals, error } = await query;

  if (error) {
    console.error('Failed to fetch latest signals:', error);
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 });
  }

  return NextResponse.json({
    signals,
    count: signals?.length || 0,
    tier: auth.tier,
    delayed: auth.tier === 'free',
  });
}
