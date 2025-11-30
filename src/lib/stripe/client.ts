/**
 * Stripe Client Configuration
 */

import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    });
  }
  return stripeClient;
}

// Subscription tier to Stripe price ID mapping
export const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro',
  copy: process.env.STRIPE_PRICE_COPY || 'price_copy',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
};

// Tier names for display
export const TIER_NAMES: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  copy: 'Copy',
  enterprise: 'Enterprise',
};

// Tier features for display
export const TIER_FEATURES: Record<string, string[]> = {
  free: [
    '50 API calls/day',
    'Delayed signals (15 min)',
    'Public leaderboard access',
  ],
  pro: [
    'Unlimited API calls',
    'Real-time signals',
    'Webhook delivery',
    'Telegram alerts',
    '5 API keys',
  ],
  copy: [
    'Everything in Pro',
    'Copy-trading enabled',
    '1 connected exchange',
    'Risk management tools',
    '10 API keys',
  ],
  enterprise: [
    'Everything in Copy',
    'Multiple exchanges',
    'Priority support',
    'Custom integrations',
    '50 API keys',
  ],
};

// Monthly prices in USD
export const TIER_PRICES: Record<string, number> = {
  free: 0,
  pro: 49,
  copy: 99,
  enterprise: 199,
};
