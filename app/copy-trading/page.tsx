// @ts-nocheck
// TODO: Fix Supabase type inference issues
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOut } from '../auth/actions';

interface Subscription {
  id: string;
  tier: string;
  copy_enabled: boolean;
  status: string;
  created_at: string;
  providers: {
    id: string;
    display_name: string;
    is_verified: boolean;
    win_rate: number;
    performance_30d: number;
  };
}

interface CopyExecution {
  id: string;
  pair: string;
  action: string;
  side: string | null;
  size_usdt: number | null;
  price: number | null;
  status: string;
  pnl_usdt: number | null;
  executed_at: string;
}

interface CopySettings {
  id: string;
  copy_mode: string;
  size_percent: number | null;
  size_fixed_usdt: number | null;
  max_position_percent: number;
  max_concurrent_trades: number;
  max_daily_loss_percent: number;
  is_paused: boolean;
  daily_pnl_usdt: number;
  subscriptions: {
    providers: {
      display_name: string;
    };
  };
}

export default async function CopyTradingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  // Get user's subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id,
      tier,
      copy_enabled,
      status,
      created_at,
      providers (
        id,
        display_name,
        is_verified,
        win_rate,
        performance_30d
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  // Get copy settings
  const { data: copySettings } = await supabase
    .from('copy_settings')
    .select(`
      id,
      copy_mode,
      size_percent,
      size_fixed_usdt,
      max_position_percent,
      max_concurrent_trades,
      max_daily_loss_percent,
      is_paused,
      daily_pnl_usdt,
      subscriptions (
        providers (
          display_name
        )
      )
    `)
    .eq('subscriptions.user_id', user.id);

  // Get recent copy executions
  const { data: executions } = await supabase
    .from('copy_executions')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(20);

  // Calculate stats
  const totalExecutions = executions?.length || 0;
  const successfulExecutions = executions?.filter(e => e.status === 'success').length || 0;
  const totalPnl = executions?.reduce((sum, e) => sum + (e.pnl_usdt || 0), 0) || 0;

  const canCopyTrade = profile?.subscription_tier === 'copy' || profile?.subscription_tier === 'enterprise';

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
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                Copy Trading
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Copy Trading</h1>
          <p className="mt-1 text-gray-400">
            Automatically mirror trades from top providers
          </p>
        </div>

        {/* Subscription Required Banner */}
        {!canCopyTrade && (
          <div className="mb-8 p-6 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Upgrade to Enable Copy Trading</h3>
                <p className="mt-1 text-gray-400">
                  Copy trading requires a Copy or Enterprise subscription. Upgrade now to automatically mirror trades from top providers.
                </p>
              </div>
              <Link
                href="/billing"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium text-white transition-colors whitespace-nowrap"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">{(subscriptions as Subscription[] || []).length}</div>
            <div className="text-sm text-gray-400">Active Subscriptions</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">{totalExecutions}</div>
            <div className="text-sm text-gray-400">Total Executions</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-green-400">
              {totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)} USD
            </div>
            <div className="text-sm text-gray-400">Total P&L</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/leaderboard"
            className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Find Providers</h3>
            <p className="mt-1 text-sm text-gray-400">Browse top signal providers on the leaderboard</p>
          </Link>

          <Link
            href="/copy-trading/wallets"
            className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Manage Wallets</h3>
            <p className="mt-1 text-sm text-gray-400">Connect exchange wallets for copy trading</p>
          </Link>

          <Link
            href="/copy-trading/settings"
            className="p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Copy Settings</h3>
            <p className="mt-1 text-sm text-gray-400">Configure position sizing and risk limits</p>
          </Link>
        </div>

        {/* Active Subscriptions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Your Subscriptions</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {(subscriptions as Subscription[] || []).length > 0 ? (
              <div className="divide-y divide-gray-800">
                {(subscriptions as Subscription[]).map((sub) => (
                  <div key={sub.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg text-white font-bold">
                        {sub.providers?.display_name?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{sub.providers?.display_name || 'Unknown'}</span>
                          {sub.providers?.is_verified && (
                            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Win Rate: {sub.providers?.win_rate?.toFixed(1) || 0}%</span>
                          <span className={sub.providers?.performance_30d >= 0 ? 'text-green-400' : 'text-red-400'}>
                            30D: {sub.providers?.performance_30d >= 0 ? '+' : ''}{sub.providers?.performance_30d?.toFixed(2) || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {sub.copy_enabled ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                          Copy Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                          Signals Only
                        </span>
                      )}
                      <Link
                        href={`/copy-trading/settings/${sub.id}`}
                        className="px-3 py-1.5 border border-gray-700 rounded text-sm text-white hover:bg-gray-800 transition-colors"
                      >
                        Configure
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-white font-medium mb-1">No Subscriptions Yet</h3>
                <p className="text-gray-500 text-sm mb-4">Browse the leaderboard to find providers</p>
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

        {/* Recent Executions */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Copy Executions</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {(executions as CopyExecution[] || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Pair</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Action</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Size</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Price</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {(executions as CopyExecution[]).map((exec) => (
                      <tr key={exec.id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {new Date(exec.executed_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-medium">{exec.pair}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            exec.action === 'open' ? 'bg-green-500/20 text-green-400' :
                            exec.action === 'close' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {exec.action.toUpperCase()}
                            {exec.side && ` ${exec.side.toUpperCase()}`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 text-right">
                          ${exec.size_usdt?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 text-right font-mono">
                          ${exec.price?.toFixed(2) || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            exec.status === 'success' ? 'bg-green-500/20 text-green-400' :
                            exec.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                            exec.status === 'blocked' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {exec.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {exec.pnl_usdt !== null ? (
                            <span className={exec.pnl_usdt >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {exec.pnl_usdt >= 0 ? '+' : ''}{exec.pnl_usdt.toFixed(2)}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No copy executions yet
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
