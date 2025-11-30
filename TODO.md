# TODO List

## Immediate Next Steps (Priority Order)

### 🔴 CRITICAL - Do This First
- [ ] Create and run database migrations for new schema changes
  - [ ] Add `is_provider` to profiles table
  - [ ] Add performance fields to providers table
  - [ ] Update performance_daily columns
  - [ ] Add bot connection fields to provider_wallets
- [ ] Verify all migrations work locally
- [ ] Update database types after migrations

### 🟡 HIGH PRIORITY - Core Functionality
- [ ] Build missing API endpoints:
  - [ ] POST /api/keys (create API key)
  - [ ] DELETE /api/keys/[id] (revoke API key)
  - [ ] POST /api/webhooks (create webhook)
  - [ ] PATCH /api/webhooks/[id] (update webhook)
  - [ ] DELETE /api/webhooks/[id] (delete webhook)

### 🟢 MEDIUM PRIORITY - Provider Features
- [ ] Build provider pages:
  - [ ] /provider/trades (view all trades)
  - [ ] /provider/signals (view all signals)
  - [ ] /provider/subscribers (subscriber list & analytics)
  - [ ] /provider/settings (edit profile, bio, avatar)
  - [ ] /provider/bot-settings (connect Freqtrade bot)

### 🔵 MEDIUM PRIORITY - Subscriber Features
- [ ] Build subscriber pages:
  - [ ] /copy-trading/wallets (manage exchange API keys)
  - [ ] /copy-trading/settings (global copy settings)
  - [ ] /copy-trading/settings/[id] (per-provider settings)

### 🟣 LOW PRIORITY - Polish & Extras
- [ ] Add loading states to all pages
- [ ] Add error boundaries
- [ ] Add toast notifications for actions
- [ ] Add confirmation modals for destructive actions
- [ ] Add pagination to long lists
- [ ] Add search/filter to tables
- [ ] Add export functionality (CSV/JSON)
- [ ] Add dark/light mode toggle (if desired)

### 🧪 TESTING
- [ ] Test provider registration flow
- [ ] Test bot connection flow
- [ ] Test subscriber signup → subscribe → copy trading flow
- [ ] Test API key creation and usage
- [ ] Test webhook delivery
- [ ] Test cron jobs manually
- [ ] Test Stripe checkout and billing portal

### 🚀 DEPLOYMENT
- [ ] Set up production environment variables
- [ ] Run migrations in production Supabase
- [ ] Deploy to Vercel
- [ ] Set up Vercel Cron or external cron service
- [ ] Test production deployment
- [ ] Set up monitoring/error tracking (Sentry?)

## Notes
- Build passed successfully with 28 routes
- All dashboards created and working
- Cron jobs exist and are functional
- Main blocker is database migrations
