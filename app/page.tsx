import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <span className="text-xl font-bold text-white">SignalsHub</span>
            <div className="flex items-center gap-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Trading Signals
              <span className="text-blue-400"> Marketplace</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Access premium trading signals via API, webhooks, and Telegram.
              Enable copy-trading to automatically mirror trades from top performers.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                href="/auth/signup"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Start Free Trial
              </Link>
              <Link
                href="/leaderboard"
                className="px-6 py-3 border border-gray-700 hover:bg-gray-900 rounded-lg text-sm font-medium text-white transition-colors"
              >
                View Leaderboard
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Signals</h3>
              <p className="text-gray-400">
                Get instant notifications via REST API, WebSocket, or webhooks when new trading opportunities arise.
              </p>
            </div>

            <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Copy Trading</h3>
              <p className="text-gray-400">
                Connect your exchange and automatically mirror trades from verified top performers with customizable risk settings.
              </p>
            </div>

            <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Verified Performance</h3>
              <p className="text-gray-400">
                All providers have verified track records. View real-time leaderboard with win rates, ROI, and Sharpe ratios.
              </p>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mt-24">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Simple Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Free Tier */}
              <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
                <h3 className="text-lg font-semibold text-white">Free</h3>
                <p className="mt-2 text-3xl font-bold text-white">$0<span className="text-sm text-gray-400">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-gray-400">
                  <li>50 API calls/day</li>
                  <li>Delayed signals (15 min)</li>
                  <li>Public leaderboard access</li>
                </ul>
              </div>

              {/* Pro Tier */}
              <div className="p-6 bg-gray-900 border border-blue-500/50 rounded-xl relative">
                <span className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-500 rounded text-xs font-medium">Popular</span>
                <h3 className="text-lg font-semibold text-white">Pro</h3>
                <p className="mt-2 text-3xl font-bold text-white">$49<span className="text-sm text-gray-400">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-gray-400">
                  <li>Unlimited API calls</li>
                  <li>Real-time signals</li>
                  <li>Webhook delivery</li>
                  <li>Telegram alerts</li>
                </ul>
              </div>

              {/* Copy Tier */}
              <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
                <h3 className="text-lg font-semibold text-white">Copy</h3>
                <p className="mt-2 text-3xl font-bold text-white">$99<span className="text-sm text-gray-400">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-gray-400">
                  <li>Everything in Pro</li>
                  <li>Copy-trading enabled</li>
                  <li>1 connected exchange</li>
                  <li>Risk management tools</li>
                </ul>
              </div>

              {/* Enterprise Tier */}
              <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl">
                <h3 className="text-lg font-semibold text-white">Enterprise</h3>
                <p className="mt-2 text-3xl font-bold text-white">$199<span className="text-sm text-gray-400">/mo</span></p>
                <ul className="mt-6 space-y-3 text-sm text-gray-400">
                  <li>Everything in Copy</li>
                  <li>Multiple exchanges</li>
                  <li>Priority support</li>
                  <li>Custom integrations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">
              Part of the QMA Ecosystem
            </span>
            <div className="flex gap-6">
              <Link href="/docs" className="text-sm text-gray-400 hover:text-white">
                API Docs
              </Link>
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-gray-400 hover:text-white">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
