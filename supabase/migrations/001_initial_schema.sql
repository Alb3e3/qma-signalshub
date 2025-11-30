-- QMA SignalsHub Database Schema
-- Initial migration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== PROFILES ====================
-- Extends Supabase auth.users

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  telegram_chat_id TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'copy', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PROVIDERS ====================
-- Signal providers (master traders)

CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  total_copiers INT DEFAULT 0,
  total_aum DECIMAL(20,2) DEFAULT 0,
  commission_percent DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ==================== PROVIDER WALLETS ====================
-- Provider's connected exchange accounts

CREATE TABLE provider_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('bitget', 'binance', 'bybit')),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  passphrase_encrypted TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  balance_usdt DECIMAL(20,2),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, exchange)
);

-- ==================== TRADES ====================
-- Actual trades from provider wallets

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  external_id TEXT,
  pair TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  entry_price DECIMAL(20,8),
  current_price DECIMAL(20,8),
  exit_price DECIMAL(20,8),
  size DECIMAL(20,8),
  size_usdt DECIMAL(20,2),
  leverage INT DEFAULT 1,
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  pnl_usdt DECIMAL(20,2),
  pnl_percent DECIMAL(10,4),
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_provider ON trades(provider_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_pair ON trades(pair);
CREATE INDEX idx_trades_opened_at ON trades(opened_at DESC);

-- ==================== SIGNALS ====================
-- KDE signals from Freqtrade or manual

CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('long', 'short', 'close')),
  entry_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  take_profit_1 DECIMAL(20,8),
  take_profit_2 DECIMAL(20,8),
  take_profit_3 DECIMAL(20,8),
  kde_levels JSONB,
  confidence DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_provider ON signals(provider_id);
CREATE INDEX idx_signals_pair ON signals(pair);
CREATE INDEX idx_signals_created_at ON signals(created_at DESC);

-- ==================== SUBSCRIPTIONS ====================
-- User subscriptions to providers

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'copy', 'enterprise')),
  copy_enabled BOOLEAN DEFAULT FALSE,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider_id);

-- ==================== SUBSCRIBER WALLETS ====================
-- Subscriber's connected wallets for copy-trading

CREATE TABLE subscriber_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL CHECK (exchange IN ('bitget', 'binance', 'bybit')),
  api_key_encrypted TEXT NOT NULL,
  api_secret_encrypted TEXT NOT NULL,
  passphrase_encrypted TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  balance_usdt DECIMAL(20,2),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exchange)
);

-- ==================== COPY SETTINGS ====================
-- Per-subscription copy configuration

CREATE TABLE copy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES subscriber_wallets(id) ON DELETE CASCADE,
  copy_mode TEXT DEFAULT 'proportional' CHECK (copy_mode IN ('proportional', 'fixed_percent', 'fixed_size')),
  size_percent DECIMAL(5,2) DEFAULT 5.0,
  size_fixed_usdt DECIMAL(20,2),
  max_position_percent DECIMAL(5,2) DEFAULT 5.0,
  max_concurrent_trades INT DEFAULT 3,
  max_daily_loss_percent DECIMAL(5,2) DEFAULT 10.0,
  risk_multiplier DECIMAL(3,2) DEFAULT 1.0,
  pairs_whitelist TEXT[],
  pairs_blacklist TEXT[] DEFAULT '{}',
  mirror_sl BOOLEAN DEFAULT TRUE,
  mirror_tp BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,
  daily_pnl_usdt DECIMAL(20,2) DEFAULT 0,
  daily_pnl_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id)
);

-- ==================== COPY EXECUTIONS ====================
-- Audit log of copied trades

CREATE TABLE copy_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES subscriber_wallets(id) ON DELETE CASCADE,
  external_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('open', 'close', 'update_sl', 'update_tp')),
  pair TEXT NOT NULL,
  side TEXT CHECK (side IN ('long', 'short')),
  size DECIMAL(20,8),
  size_usdt DECIMAL(20,2),
  price DECIMAL(20,8),
  leverage INT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'blocked')),
  error_message TEXT,
  block_reason TEXT,
  pnl_usdt DECIMAL(20,2),
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_copy_executions_subscription ON copy_executions(subscription_id);
CREATE INDEX idx_copy_executions_trade ON copy_executions(trade_id);
CREATE INDEX idx_copy_executions_executed_at ON copy_executions(executed_at DESC);

-- ==================== API KEYS ====================
-- User API keys for programmatic access

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{"signals:read"}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ==================== WEBHOOKS ====================
-- Registered webhook endpoints

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  failure_count INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_user ON webhooks(user_id);

-- ==================== WEBHOOK DELIVERIES ====================
-- Log of webhook delivery attempts

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  attempt_count INT DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);

-- ==================== PERFORMANCE ====================
-- Daily performance snapshots

CREATE TABLE performance_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  trades_count INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  pnl_usdt DECIMAL(20,2) DEFAULT 0,
  pnl_percent DECIMAL(10,4) DEFAULT 0,
  volume_usdt DECIMAL(20,2) DEFAULT 0,
  max_drawdown_percent DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, date)
);

CREATE INDEX idx_performance_daily_provider ON performance_daily(provider_id);
CREATE INDEX idx_performance_daily_date ON performance_daily(date DESC);

-- ==================== ROW LEVEL SECURITY ====================

-- Profiles: Users can only access their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Providers: Public read for active providers, own write
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active providers"
ON providers FOR SELECT
USING (is_active = TRUE);

CREATE POLICY "Users can manage own provider account"
ON providers FOR ALL
USING (user_id = auth.uid());

-- Provider wallets: Only provider can access
ALTER TABLE provider_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can manage own wallets"
ON provider_wallets FOR ALL
USING (
  provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  )
);

-- Trades: Public read for active providers
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trades from active providers"
ON trades FOR SELECT
USING (
  provider_id IN (
    SELECT id FROM providers WHERE is_active = TRUE
  )
);

CREATE POLICY "Providers can manage own trades"
ON trades FOR ALL
USING (
  provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  )
);

-- Signals: Public read, provider write
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view signals"
ON signals FOR SELECT
USING (TRUE);

CREATE POLICY "Providers can create signals"
ON signals FOR INSERT
WITH CHECK (
  provider_id IN (
    SELECT id FROM providers WHERE user_id = auth.uid()
  )
);

-- Subscriptions: Own access only
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
ON subscriptions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own subscriptions"
ON subscriptions FOR ALL
USING (user_id = auth.uid());

-- Subscriber wallets: Own access only
ALTER TABLE subscriber_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wallets"
ON subscriber_wallets FOR ALL
USING (user_id = auth.uid());

-- Copy settings: Own access only
ALTER TABLE copy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own copy settings"
ON copy_settings FOR SELECT
USING (
  subscription_id IN (
    SELECT id FROM subscriptions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own copy settings"
ON copy_settings FOR ALL
USING (
  subscription_id IN (
    SELECT id FROM subscriptions WHERE user_id = auth.uid()
  )
);

-- Copy executions: Own access only
ALTER TABLE copy_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions"
ON copy_executions FOR SELECT
USING (
  subscription_id IN (
    SELECT id FROM subscriptions WHERE user_id = auth.uid()
  )
);

-- API keys: Own access only
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own API keys"
ON api_keys FOR ALL
USING (user_id = auth.uid());

-- Webhooks: Own access only
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own webhooks"
ON webhooks FOR ALL
USING (user_id = auth.uid());

-- Webhook deliveries: Own access only
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deliveries"
ON webhook_deliveries FOR SELECT
USING (
  webhook_id IN (
    SELECT id FROM webhooks WHERE user_id = auth.uid()
  )
);

-- Performance: Public read
ALTER TABLE performance_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view performance"
ON performance_daily FOR SELECT
USING (TRUE);

-- ==================== FUNCTIONS ====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_providers_updated_at
BEFORE UPDATE ON providers
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trades_updated_at
BEFORE UPDATE ON trades
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_copy_settings_updated_at
BEFORE UPDATE ON copy_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON webhooks
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update provider stats
CREATE OR REPLACE FUNCTION update_provider_copiers()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.copy_enabled = TRUE THEN
    UPDATE providers SET total_copiers = total_copiers + 1 WHERE id = NEW.provider_id;
  ELSIF TG_OP = 'DELETE' AND OLD.copy_enabled = TRUE THEN
    UPDATE providers SET total_copiers = total_copiers - 1 WHERE id = OLD.provider_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.copy_enabled = FALSE AND NEW.copy_enabled = TRUE THEN
      UPDATE providers SET total_copiers = total_copiers + 1 WHERE id = NEW.provider_id;
    ELSIF OLD.copy_enabled = TRUE AND NEW.copy_enabled = FALSE THEN
      UPDATE providers SET total_copiers = total_copiers - 1 WHERE id = NEW.provider_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_provider_copiers_trigger
AFTER INSERT OR UPDATE OR DELETE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_provider_copiers();
