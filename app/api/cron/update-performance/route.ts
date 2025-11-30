import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * POST /api/cron/update-performance
 * Update provider performance metrics
 * Should be called by a cron job daily
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Get all active providers
  const { data: providers, error } = await adminClient
    .from('providers')
    .select('id')
    .eq('is_active', true);

  if (error || !providers) {
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }

  const results: { providerId: string; success: boolean; error?: string }[] = [];

  for (const provider of providers) {
    try {
      // Get trades for last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: trades30d } = await adminClient
        .from('trades')
        .select('pnl_percent, opened_at, closed_at')
        .eq('provider_id', provider.id)
        .eq('status', 'closed')
        .gte('closed_at', thirtyDaysAgo);

      const { data: trades90d } = await adminClient
        .from('trades')
        .select('pnl_percent')
        .eq('provider_id', provider.id)
        .eq('status', 'closed')
        .gte('closed_at', ninetyDaysAgo);

      const { data: allTrades } = await adminClient
        .from('trades')
        .select('pnl_percent, opened_at, closed_at')
        .eq('provider_id', provider.id)
        .eq('status', 'closed');

      // Calculate metrics
      const performance30d = (trades30d || []).reduce((sum, t) => sum + (t.pnl_percent || 0), 0);
      const performance90d = (trades90d || []).reduce((sum, t) => sum + (t.pnl_percent || 0), 0);

      const totalTrades = allTrades?.length || 0;
      const winningTrades = (allTrades || []).filter(t => (t.pnl_percent || 0) > 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      // Calculate max drawdown (simplified)
      let maxDrawdown = 0;
      let peak = 0;
      let cumulative = 0;
      for (const trade of allTrades || []) {
        cumulative += trade.pnl_percent || 0;
        if (cumulative > peak) peak = cumulative;
        const drawdown = peak - cumulative;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }

      // Calculate Sharpe ratio (simplified, assuming 0% risk-free rate)
      const returns = (allTrades || []).map(t => t.pnl_percent || 0);
      const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1)
      );
      const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

      // Calculate average trade duration
      let totalDuration = 0;
      for (const trade of trades30d || []) {
        if (trade.opened_at && trade.closed_at) {
          const duration = new Date(trade.closed_at).getTime() - new Date(trade.opened_at).getTime();
          totalDuration += duration;
        }
      }
      const avgDurationHours = trades30d?.length
        ? totalDuration / trades30d.length / (1000 * 60 * 60)
        : 0;

      // Update provider
      await adminClient
        .from('providers')
        .update({
          total_trades: totalTrades,
          win_rate: winRate,
          performance_30d: performance30d,
          performance_90d: performance90d,
          max_drawdown: -maxDrawdown,
          sharpe_ratio: sharpeRatio,
          avg_trade_duration_hours: avgDurationHours,
          last_performance_update: new Date().toISOString(),
        })
        .eq('id', provider.id);

      // Insert daily performance record
      await adminClient.from('performance_daily').insert({
        provider_id: provider.id,
        date: new Date().toISOString().split('T')[0],
        trades_count: trades30d?.length || 0,
        pnl_percent: trades30d?.reduce((sum, t) => sum + (t.pnl_percent || 0), 0) || 0,
        win_count: (trades30d || []).filter(t => (t.pnl_percent || 0) > 0).length,
        loss_count: (trades30d || []).filter(t => (t.pnl_percent || 0) < 0).length,
      });

      results.push({ providerId: provider.id, success: true });
    } catch (err) {
      results.push({
        providerId: provider.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    message: 'Performance update completed',
    results,
    updated: results.filter(r => r.success).length,
  });
}
