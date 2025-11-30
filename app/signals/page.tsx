// @ts-nocheck
// TODO: Fix Supabase type inference issues
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOut } from '../auth/actions';

interface Signal {
  id: string;
  pair: string;
  direction: 'long' | 'short';
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  leverage: number | null;
  status: 'active' | 'closed' | 'cancelled';
  result_pnl_percent: number | null;
  created_at: string;
  closed_at: string | null;
  providers: {
    id: string;
    display_name: string;
    is_verified: boolean;
  };
}

export default async function SignalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's subscribed provider IDs
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('provider_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const providerIds = subscriptions?.map(s => s.provider_id) || [];

  // Get signals from subscribed providers
  let signals: Signal[] = [];
  if (providerIds.length > 0) {
    const { data } = await supabase
      .from('signals')
      .select(`
        id,
        pair,
        direction,
        entry_price,
        stop_loss,
        take_profit,
        leverage,
        status,
        result_pnl_percent,
        created_at,
        closed_at,
        providers (
          id,
          display_name,
          is_verified
        )
      `)
      .in('provider_id', providerIds)
      .order('created_at', { ascending: false })
      .limit(50);

    signals = (data as unknown as Signal[]) || [];
  }

  const activeSignals = signals.filter(s => s.status === 'active');
  const closedSignals = signals.filter(s => s.status === 'closed');

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl font-bold text-white">
                SignalsHub
              </Link>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                Signals
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
                Back to Dashboard
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-sm text-gray-400 hover:text-white">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Trading Signals</h1>
            <p className="mt-1 text-gray-400">
              Real-time signals from your subscribed providers
            </p>
          </div>
          <Link
            href="/leaderboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Find More Providers
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-green-400">{activeSignals.length}</div>
            <div className="text-sm text-gray-400">Active Signals</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">{closedSignals.length}</div>
            <div className="text-sm text-gray-400">Closed Signals</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">{providerIds.length}</div>
            <div className="text-sm text-gray-400">Subscriptions</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">
              {closedSignals.filter(s => (s.result_pnl_percent || 0) > 0).length}
            </div>
            <div className="text-sm text-gray-400">Winning Signals</div>
          </div>
        </div>

        {/* Active Signals */}
        {activeSignals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Active Signals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSignals.map((signal) => (
                <div key={signal.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white">{signal.pair}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        signal.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {signal.direction.toUpperCase()}
                      </span>
                    </div>
                    {signal.leverage && signal.leverage > 1 && (
                      <span className="text-xs text-gray-500">{signal.leverage}x</span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entry</span>
                      <span className="text-white font-mono">${signal.entry_price?.toFixed(2) || '-'}</span>
                    </div>
                    {signal.stop_loss && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Stop Loss</span>
                        <span className="text-red-400 font-mono">${signal.stop_loss.toFixed(2)}</span>
                      </div>
                    )}
                    {signal.take_profit && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Take Profit</span>
                        <span className="text-green-400 font-mono">${signal.take_profit.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{signal.providers?.display_name}</span>
                      {signal.providers?.is_verified && (
                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(signal.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signal History */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Signal History</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {signals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Provider</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Pair</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Direction</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Entry</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">SL</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">TP</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Result</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {signals.map((signal) => (
                      <tr key={signal.id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">{signal.providers?.display_name || 'Unknown'}</span>
                            {signal.providers?.is_verified && (
                              <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-medium">{signal.pair}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            signal.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {signal.direction.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 text-right font-mono">
                          ${signal.entry_price?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-400 text-right font-mono">
                          {signal.stop_loss ? `$${signal.stop_loss.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-400 text-right font-mono">
                          {signal.take_profit ? `$${signal.take_profit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            signal.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                            signal.status === 'closed' ? 'bg-gray-700 text-gray-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {signal.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {signal.result_pnl_percent !== null ? (
                            <span className={signal.result_pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {signal.result_pnl_percent >= 0 ? '+' : ''}{signal.result_pnl_percent.toFixed(2)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">
                          {new Date(signal.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-white font-medium mb-1">No Signals Yet</h3>
                <p className="text-gray-500 text-sm mb-4">Subscribe to providers to receive trading signals</p>
                <Link
                  href="/leaderboard"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  Browse Providers
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
