// @ts-nocheck
// TODO: Fix Supabase type inference issues
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOut } from '../auth/actions';

interface Trade {
  id: string;
  pair: string;
  direction: 'long' | 'short';
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  leverage: number;
  pnl_percent: number | null;
  pnl_usd: number | null;
  status: 'open' | 'closed' | 'cancelled';
  opened_at: string | null;
  closed_at: string | null;
}

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
}

export default async function ProviderDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get provider profile
  const { data: provider } = await supabase
    .from('providers')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!provider) {
    redirect('/provider/register');
  }

  // Get recent trades
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('provider_id', provider.id)
    .order('opened_at', { ascending: false })
    .limit(10);

  // Get recent signals
  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get subscriber count
  const { count: subscriberCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', provider.id)
    .eq('status', 'active');

  // Get open trades count
  const openTrades = (trades as Trade[] || []).filter(t => t.status === 'open');
  const closedTrades = (trades as Trade[] || []).filter(t => t.status === 'closed');

  // Calculate today's PnL
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = (trades as Trade[] || []).filter(t =>
    t.closed_at && t.closed_at.startsWith(today)
  );
  const todayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl_usd || 0), 0);

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
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                Provider
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
        {/* Provider Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl text-white font-bold">
              {provider.display_name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white">{provider.display_name}</h1>
                {provider.is_verified && (
                  <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-gray-400">{provider.bio || 'No bio set'}</p>
            </div>
          </div>
          <Link
            href="/provider/settings"
            className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-800 transition-colors"
          >
            Edit Profile
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">{subscriberCount || 0}</div>
            <div className="text-sm text-gray-400">Subscribers</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">{openTrades.length}</div>
            <div className="text-sm text-gray-400">Open Trades</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className={`text-2xl font-bold ${todayPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {todayPnl >= 0 ? '+' : ''}{todayPnl.toFixed(2)} USD
            </div>
            <div className="text-sm text-gray-400">Today&apos;s P&L</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">{provider.win_rate?.toFixed(1) || 0}%</div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
        </div>

        {/* Performance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-sm text-gray-400 mb-1">30D Performance</div>
            <div className={`text-xl font-bold ${(provider.performance_30d || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(provider.performance_30d || 0) >= 0 ? '+' : ''}{provider.performance_30d?.toFixed(2) || '0.00'}%
            </div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-sm text-gray-400 mb-1">Total Trades</div>
            <div className="text-xl font-bold text-white">{provider.total_trades || 0}</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-sm text-gray-400 mb-1">Max Drawdown</div>
            <div className="text-xl font-bold text-red-400">
              {provider.max_drawdown?.toFixed(2) || '0.00'}%
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/provider/trades"
            className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">My Trades</h3>
            <p className="mt-1 text-sm text-gray-400">View and manage all your trades</p>
          </Link>

          <Link
            href="/provider/signals"
            className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">My Signals</h3>
            <p className="mt-1 text-sm text-gray-400">View signals sent to subscribers</p>
          </Link>

          <Link
            href="/provider/subscribers"
            className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Subscribers</h3>
            <p className="mt-1 text-sm text-gray-400">View subscriber analytics</p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Trades */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
              <Link href="/provider/trades" className="text-sm text-blue-400 hover:text-blue-300">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-800">
              {(trades as Trade[] || []).slice(0, 5).map((trade) => (
                <div key={trade.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${trade.status === 'open' ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{trade.pair}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          trade.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.direction.toUpperCase()}
                        </span>
                        {trade.leverage > 1 && (
                          <span className="text-xs text-gray-500">{trade.leverage}x</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Entry: ${trade.entry_price?.toFixed(2) || '-'}
                      </div>
                    </div>
                  </div>
                  {trade.status === 'closed' ? (
                    <span className={`font-mono font-medium ${(trade.pnl_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(trade.pnl_percent || 0) >= 0 ? '+' : ''}{trade.pnl_percent?.toFixed(2) || '0'}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Open</span>
                  )}
                </div>
              ))}
              {(!trades || trades.length === 0) && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No trades yet
                </div>
              )}
            </div>
          </div>

          {/* Recent Signals */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Recent Signals</h2>
              <Link href="/provider/signals" className="text-sm text-blue-400 hover:text-blue-300">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-800">
              {(signals as Signal[] || []).slice(0, 5).map((signal) => (
                <div key={signal.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${signal.status === 'active' ? 'bg-blue-400' : 'bg-gray-500'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{signal.pair}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          signal.direction === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {signal.direction.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(signal.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {signal.status === 'closed' ? (
                    <span className={`font-mono font-medium ${(signal.result_pnl_percent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(signal.result_pnl_percent || 0) >= 0 ? '+' : ''}{signal.result_pnl_percent?.toFixed(2) || '0'}%
                    </span>
                  ) : (
                    <span className="text-xs text-blue-400">Active</span>
                  )}
                </div>
              ))}
              {(!signals || signals.length === 0) && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No signals yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bot Connection Status */}
        <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Bot Connection</h3>
              <p className="text-sm text-gray-400 mt-1">
                Connect your Freqtrade bot to automatically sync trades
              </p>
            </div>
            <Link
              href="/provider/bot-settings"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Configure Bot
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
