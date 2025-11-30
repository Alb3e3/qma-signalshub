import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { signOut } from '@/app/auth/actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">SignalsHub</span>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                {profile?.subscription_tier || 'free'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{user.email}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-gray-400">
            Welcome back, {profile?.display_name || user.email?.split('@')[0]}
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* API Keys Card */}
          <Link
            href="/api-keys"
            className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">API Keys</h3>
            <p className="mt-1 text-sm text-gray-400">
              Manage your API keys for accessing signals programmatically
            </p>
          </Link>

          {/* Signals Card */}
          <Link
            href="/signals"
            className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Signals</h3>
            <p className="mt-1 text-sm text-gray-400">
              View latest trading signals from your subscriptions
            </p>
          </Link>

          {/* Webhooks Card */}
          <Link
            href="/webhooks"
            className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Webhooks</h3>
            <p className="mt-1 text-sm text-gray-400">
              Configure webhook endpoints for real-time signal delivery
            </p>
          </Link>

          {/* Copy Trading Card */}
          <Link
            href="/copy-trading"
            className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Copy Trading</h3>
            <p className="mt-1 text-sm text-gray-400">
              Automatically copy trades from top providers
            </p>
          </Link>

          {/* Leaderboard Card */}
          <Link
            href="/leaderboard"
            className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
            <p className="mt-1 text-sm text-gray-400">
              Browse top signal providers and their performance
            </p>
          </Link>

          {/* Billing Card */}
          <Link
            href="/billing"
            className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Billing</h3>
            <p className="mt-1 text-sm text-gray-400">
              Manage your subscription and payment methods
            </p>
          </Link>
        </div>

        {/* Provider Section */}
        {profile?.is_provider && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white mb-4">Provider Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link
                href="/provider/signals"
                className="block p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white">My Signals</h3>
                <p className="mt-1 text-sm text-gray-400">
                  View and manage signals from your trading bot
                </p>
              </Link>

              <Link
                href="/provider/subscribers"
                className="block p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white">Subscribers</h3>
                <p className="mt-1 text-sm text-gray-400">
                  View your subscriber count and analytics
                </p>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
