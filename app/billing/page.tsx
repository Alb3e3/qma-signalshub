'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { TIER_FEATURES, TIER_PRICES, TIER_NAMES } from '@/lib/stripe/client';

interface Profile {
  subscription_tier: string;
  stripe_customer_id: string | null;
}

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('subscription_tier, stripe_customer_id')
          .eq('id', user.id)
          .single();

        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();
  }, []);

  const handleCheckout = async (tier: string) => {
    setCheckoutLoading(tier);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch {
      alert('Failed to create checkout session');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch {
      alert('Failed to open billing portal');
    }
  };

  const currentTier = profile?.subscription_tier || 'free';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-xl font-bold text-white">
              SignalsHub
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success/Cancel Messages */}
        {success && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400">
            Subscription activated successfully! Your account has been upgraded.
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg text-yellow-400">
            Checkout was canceled. You can try again anytime.
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Billing</h1>
          <p className="mt-2 text-gray-400">
            Manage your subscription and billing details
          </p>
        </div>

        {/* Current Plan */}
        <div className="mb-12 p-6 bg-gray-900 border border-gray-800 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-2">Current Plan</h2>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-white">
              {TIER_NAMES[currentTier]}
            </span>
            <span className="text-gray-400">
              ${TIER_PRICES[currentTier]}/month
            </span>
          </div>
          {profile?.stripe_customer_id && currentTier !== 'free' && (
            <button
              onClick={handlePortal}
              className="mt-4 px-4 py-2 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-800 transition-colors"
            >
              Manage Subscription
            </button>
          )}
        </div>

        {/* Pricing Plans */}
        <h2 className="text-xl font-bold text-white mb-6">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {(['free', 'pro', 'copy', 'enterprise'] as const).map((tier) => {
            const isCurrent = tier === currentTier;
            const isDowngrade = TIER_PRICES[tier] < TIER_PRICES[currentTier];

            return (
              <div
                key={tier}
                className={`p-6 rounded-xl border ${
                  isCurrent
                    ? 'bg-blue-500/10 border-blue-500/50'
                    : tier === 'pro'
                    ? 'bg-gray-900 border-blue-500/30'
                    : 'bg-gray-900 border-gray-800'
                }`}
              >
                {tier === 'pro' && !isCurrent && (
                  <span className="inline-block px-2 py-0.5 bg-blue-500 rounded text-xs font-medium mb-3">
                    Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="inline-block px-2 py-0.5 bg-green-500 rounded text-xs font-medium mb-3">
                    Current Plan
                  </span>
                )}

                <h3 className="text-lg font-semibold text-white">{TIER_NAMES[tier]}</h3>
                <p className="mt-2 text-3xl font-bold text-white">
                  ${TIER_PRICES[tier]}
                  <span className="text-sm text-gray-400">/mo</span>
                </p>

                <ul className="mt-6 space-y-3">
                  {TIER_FEATURES[tier].map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {tier !== 'free' && !isCurrent && !isDowngrade && (
                  <button
                    onClick={() => handleCheckout(tier)}
                    disabled={checkoutLoading === tier}
                    className="mt-6 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                  >
                    {checkoutLoading === tier ? 'Loading...' : 'Upgrade'}
                  </button>
                )}

                {tier === 'free' && !isCurrent && (
                  <button
                    onClick={handlePortal}
                    className="mt-6 w-full py-2 px-4 border border-gray-700 rounded-lg text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                  >
                    Downgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
