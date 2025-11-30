import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

interface Provider {
  id: string;
  display_name: string;
  is_verified: boolean;
  total_trades: number;
  win_rate: number;
  performance_30d: number;
  performance_90d: number;
  max_drawdown: number;
  sharpe_ratio: number;
  avg_trade_duration_hours: number;
  profiles: {
    avatar_url: string | null;
  };
}

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // Fetch top providers ordered by 30-day performance
  const { data: providers } = await supabase
    .from('providers')
    .select(`
      id,
      display_name,
      is_verified,
      total_trades,
      win_rate,
      performance_30d,
      performance_90d,
      max_drawdown,
      sharpe_ratio,
      avg_trade_duration_hours,
      profiles!inner (
        avatar_url
      )
    `)
    .eq('is_active', true)
    .order('performance_30d', { ascending: false })
    .limit(50);

  const topProviders = (providers || []) as unknown as Provider[];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-white">
              SignalsHub
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="mt-2 text-gray-400">
            Top signal providers ranked by verified performance
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">{topProviders.length}</div>
            <div className="text-sm text-gray-400">Active Providers</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-green-400">
              {topProviders.filter(p => p.performance_30d > 0).length}
            </div>
            <div className="text-sm text-gray-400">Profitable (30d)</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">
              {topProviders.reduce((sum, p) => sum + p.total_trades, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Trades</div>
          </div>
          <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="text-2xl font-bold text-white">
              {(topProviders.reduce((sum, p) => sum + p.win_rate, 0) / topProviders.length || 0).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-400">Avg Win Rate</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    30D Return
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    90D Return
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Sharpe
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Max DD
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {topProviders.map((provider, index) => (
                  <tr key={provider.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-gray-400/20 text-gray-300' :
                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-800 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium">
                          {provider.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{provider.display_name}</span>
                            {provider.is_verified && (
                              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Avg {provider.avg_trade_duration_hours?.toFixed(1) || '0'}h per trade
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-mono font-medium ${
                        provider.performance_30d > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {provider.performance_30d > 0 ? '+' : ''}{provider.performance_30d?.toFixed(2) || '0.00'}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-mono ${
                        provider.performance_90d > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {provider.performance_90d > 0 ? '+' : ''}{provider.performance_90d?.toFixed(2) || '0.00'}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-mono text-white">
                        {provider.win_rate?.toFixed(1) || '0.0'}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-400">
                      {provider.total_trades?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-mono ${
                        (provider.sharpe_ratio || 0) >= 2 ? 'text-green-400' :
                        (provider.sharpe_ratio || 0) >= 1 ? 'text-yellow-400' : 'text-gray-400'
                      }`}>
                        {provider.sharpe_ratio?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-mono text-red-400">
                        -{Math.abs(provider.max_drawdown || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {topProviders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No providers found. Be the first to join!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center p-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to copy top traders?
          </h2>
          <p className="text-gray-400 mb-6">
            Subscribe to signals or enable copy-trading to mirror their trades automatically.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </main>
    </div>
  );
}
