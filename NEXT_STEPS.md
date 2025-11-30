# QMA SignalsHub - Development Plan

## Current Status (2025-11-30)

### ✅ Completed
- Core authentication system (Supabase Auth)
- Database schema and types
- Stripe billing integration
- API endpoints (signals, trades, webhooks, copy-trading)
- Leaderboard page
- Provider dashboard UI
- Subscriber dashboard UI (copy-trading, signals, API keys, webhooks)
- Freqtrade bot integration
- Copy-trading engine
- Webhook delivery system
- Cron jobs (trade sync, performance updates)
- Build passes successfully

### 🚧 What's Missing

#### 1. Database Migrations
**Priority: HIGH - Must do before anything else**
- Need to create and run Supabase migrations for new fields:
  - `profiles.is_provider` (boolean, default false)
  - `providers` table: Add performance fields (total_trades, win_rate, performance_30d, performance_90d, max_drawdown, sharpe_ratio, avg_trade_duration_hours, last_performance_update)
  - `performance_daily` table: Rename columns (wins → win_count, losses → loss_count)
  - `provider_wallets`: Add bot fields (bot_api_url_encrypted, bot_api_username_encrypted, bot_api_password_encrypted, last_sync_at)

**Action Items:**
1. Create migration file in `supabase/migrations/`
2. Run migration: `supabase db push`
3. Update type generation: `supabase gen types typescript`

#### 2. Missing API Endpoints
The following pages expect API endpoints that don't exist yet:

- **POST /api/keys** - Create API key (used by api-keys page)
- **DELETE /api/keys/[id]** - Revoke API key
- **POST /api/webhooks** - Create webhook (used by webhooks page)
- **PATCH /api/webhooks/[id]** - Update webhook
- **DELETE /api/webhooks/[id]** - Delete webhook
- **GET /copy-trading/wallets** - Manage exchange wallets page (referenced but not created)
- **GET /copy-trading/settings** - Copy trading settings page (referenced but not created)
- **GET /copy-trading/settings/[id]** - Individual subscription settings
- **GET /provider/trades** - Provider trades page (referenced but not created)
- **GET /provider/signals** - Provider signals page (referenced but not created)
- **GET /provider/subscribers** - Provider subscribers page (referenced but not created)
- **GET /provider/settings** - Provider profile settings (referenced but not created)
- **GET /provider/bot-settings** - Bot connection settings (referenced but not created)

#### 3. Authentication Flow
- Auth callback handler exists but needs verification
- Need to test Google OAuth flow
- Need to test password reset flow
- Profile creation on signup needs to set default values

#### 4. Provider Onboarding
- Provider registration works but needs:
  - Verification process (how do providers get verified?)
  - Bot connection wizard
  - Initial setup guide

#### 5. Copy Trading Settings
- Copy settings page needs to be built
- Wallet management page needs to be built
- Exchange API key encryption/decryption flow

#### 6. Real-time Features
- Consider WebSocket/Server-Sent Events for live signal updates
- Real-time copy execution notifications

#### 7. Testing & Deployment
- Test all flows end-to-end
- Set up environment variables in production
- Deploy to Vercel/Railway
- Set up cron jobs (Vercel Cron or external service)
- Configure Supabase RLS policies

## Recommended Next Session Tasks

### Session 1: Database Migrations
1. Create migration file with all schema changes
2. Run migrations locally
3. Verify types are correct
4. Test that existing code still works

### Session 2: Missing API Endpoints (Part 1 - Core)
1. Build `/api/keys` endpoints (create, delete)
2. Build `/api/webhooks` endpoints (create, update, delete)
3. Test API keys and webhooks pages work end-to-end

### Session 3: Provider Pages
1. Build provider trades page (`/provider/trades`)
2. Build provider signals page (`/provider/signals`)
3. Build provider subscribers page (`/provider/subscribers`)
4. Build provider settings page (`/provider/settings`)
5. Build bot settings page (`/provider/bot-settings`)

### Session 4: Subscriber Pages
1. Build copy trading wallets page (`/copy-trading/wallets`)
2. Build copy trading settings page (`/copy-trading/settings`)
3. Build subscription settings page (`/copy-trading/settings/[id]`)

### Session 5: Testing & Polish
1. Test complete provider flow (register → connect bot → view performance)
2. Test complete subscriber flow (signup → subscribe → configure copy trading)
3. Test API authentication
4. Test webhooks delivery
5. Fix any bugs found

### Session 6: Deployment
1. Set up production environment variables
2. Deploy to Vercel
3. Run Supabase migrations in production
4. Set up cron jobs
5. Test production environment

## Important Notes

### Environment Variables Needed
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Security
ENCRYPTION_KEY=  # For encrypting API keys and secrets
CRON_SECRET=     # For protecting cron endpoints

# Optional
TELEGRAM_BOT_TOKEN=
```

### Known Issues
- Supabase type inference returns 'never' for some operations (using @ts-nocheck as workaround)
- Need to decide on verification process for providers
- Need to define subscription tiers and what each tier includes

## Architecture Decisions to Make

1. **Provider Verification**: How do providers get verified badges?
   - Manual review?
   - Minimum trades threshold?
   - Performance requirements?

2. **Subscription Model**: How do users subscribe to providers?
   - Through Stripe subscriptions?
   - Platform tier + individual provider subs?
   - Free signals vs paid copy trading?

3. **Copy Trading Risk Management**:
   - How to handle failed executions?
   - What happens if user runs out of balance?
   - Circuit breakers for losing streaks?

4. **Bot Integration**:
   - Only Freqtrade or support multiple platforms?
   - How to verify bot ownership?

5. **Real-time Updates**:
   - Polling vs WebSockets vs SSE?
   - How often to sync trades?

## File Structure
```
app/
├── api/
│   ├── v1/           # Public API endpoints (with API key auth)
│   ├── stripe/       # Stripe webhooks and checkout
│   └── cron/         # Cron job endpoints
├── auth/             # Authentication pages
├── provider/         # Provider dashboard
├── copy-trading/     # Subscriber copy trading
├── signals/          # Subscriber signals view
├── api-keys/         # API key management
├── webhooks/         # Webhook management
├── leaderboard/      # Public leaderboard
├── billing/          # Subscription management
└── dashboard/        # Main dashboard

src/
├── lib/
│   ├── supabase/     # Supabase client setup
│   ├── stripe/       # Stripe client
│   ├── freqtrade/    # Freqtrade API client
│   ├── api/          # API authentication
│   ├── copy-trading/ # Copy trading engine
│   ├── webhooks/     # Webhook delivery
│   └── utils/        # Crypto, validation, etc.
└── types/
    └── database.ts   # Supabase types
```

## Quick Start Commands
```bash
# Development
npm run dev

# Build
npm run build

# Database
supabase start           # Start local Supabase
supabase db push         # Push migrations
supabase gen types       # Generate TypeScript types

# Deploy
vercel deploy
```

## Contact & Resources
- Supabase Dashboard: https://app.supabase.com
- Stripe Dashboard: https://dashboard.stripe.com
- Vercel Dashboard: https://vercel.com/dashboard
- Freqtrade Docs: https://www.freqtrade.io/
