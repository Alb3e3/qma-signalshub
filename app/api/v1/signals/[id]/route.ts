import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateApiRequest } from '@/lib/api/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/signals/[id]
 * Get a specific signal by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Authenticate the request
  const auth = await authenticateApiRequest(request, 'signals:read');
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const adminClient = createAdminClient();

  const { data: signal, error } = await adminClient
    .from('signals')
    .select(`
      id,
      provider_id,
      trade_id,
      pair,
      direction,
      entry_price,
      stop_loss,
      take_profit,
      leverage,
      confidence,
      status,
      result_pnl_percent,
      notes,
      created_at,
      closed_at,
      providers!inner (
        id,
        display_name,
        is_verified,
        performance_30d
      )
    `)
    .eq('id', id)
    .single();

  if (error || !signal) {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
  }

  // Free tier: check if signal is old enough
  if (auth.tier === 'free') {
    const signalAge = Date.now() - new Date(signal.created_at).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    if (signalAge < fifteenMinutes) {
      return NextResponse.json(
        {
          error: 'Signal not available yet',
          available_at: new Date(new Date(signal.created_at).getTime() + fifteenMinutes).toISOString(),
          upgrade_url: '/billing'
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ signal });
}
