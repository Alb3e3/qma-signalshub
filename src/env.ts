/**
 * Environment Variables Validation
 * Uses @t3-oss/env-nextjs for type-safe environment variables
 */

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    // Stripe
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_PRICE_PRO: z.string().optional(),
    STRIPE_PRICE_COPY: z.string().optional(),
    STRIPE_PRICE_ENTERPRISE: z.string().optional(),

    // Freqtrade (optional)
    FREQTRADE_API_URL: z.string().url().optional(),
    FREQTRADE_USERNAME: z.string().optional(),
    FREQTRADE_PASSWORD: z.string().optional(),
    FREQTRADE_3M_API_URL: z.string().url().optional(),

    // Telegram
    TELEGRAM_BOT_TOKEN: z.string().optional(),

    // Security
    ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 32 bytes (64 hex characters)'),

    // Cron
    CRON_SECRET: z.string().optional(),

    // Node environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  },
  client: {
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // Stripe
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),

    // App
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  // For Next.js >= 13.4.4, you need to destructure client vars
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // Skip validation during build if SKIP_ENV_VALIDATION is set
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
