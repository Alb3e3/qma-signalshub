/**
 * Database Types
 * Generated from Supabase schema - update this after running migrations
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          telegram_chat_id: string | null;
          subscription_tier: 'free' | 'pro' | 'copy' | 'enterprise';
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          telegram_chat_id?: string | null;
          subscription_tier?: 'free' | 'pro' | 'copy' | 'enterprise';
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          telegram_chat_id?: string | null;
          subscription_tier?: 'free' | 'pro' | 'copy' | 'enterprise';
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      providers: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          is_verified: boolean;
          is_active: boolean;
          total_copiers: number;
          total_aum: number;
          commission_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          bio?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          total_copiers?: number;
          total_aum?: number;
          commission_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          bio?: string | null;
          avatar_url?: string | null;
          is_verified?: boolean;
          is_active?: boolean;
          total_copiers?: number;
          total_aum?: number;
          commission_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      provider_wallets: {
        Row: {
          id: string;
          provider_id: string;
          exchange: 'bitget' | 'binance' | 'bybit';
          api_key_encrypted: string;
          api_secret_encrypted: string;
          passphrase_encrypted: string | null;
          is_active: boolean;
          balance_usdt: number | null;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          exchange: 'bitget' | 'binance' | 'bybit';
          api_key_encrypted: string;
          api_secret_encrypted: string;
          passphrase_encrypted?: string | null;
          is_active?: boolean;
          balance_usdt?: number | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          exchange?: 'bitget' | 'binance' | 'bybit';
          api_key_encrypted?: string;
          api_secret_encrypted?: string;
          passphrase_encrypted?: string | null;
          is_active?: boolean;
          balance_usdt?: number | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
      };
      trades: {
        Row: {
          id: string;
          provider_id: string;
          external_id: string | null;
          pair: string;
          side: 'long' | 'short';
          entry_price: number | null;
          current_price: number | null;
          exit_price: number | null;
          size: number | null;
          size_usdt: number | null;
          leverage: number;
          stop_loss: number | null;
          take_profit: number | null;
          status: 'open' | 'closed' | 'cancelled';
          pnl_usdt: number | null;
          pnl_percent: number | null;
          opened_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          external_id?: string | null;
          pair: string;
          side: 'long' | 'short';
          entry_price?: number | null;
          current_price?: number | null;
          exit_price?: number | null;
          size?: number | null;
          size_usdt?: number | null;
          leverage?: number;
          stop_loss?: number | null;
          take_profit?: number | null;
          status?: 'open' | 'closed' | 'cancelled';
          pnl_usdt?: number | null;
          pnl_percent?: number | null;
          opened_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          external_id?: string | null;
          pair?: string;
          side?: 'long' | 'short';
          entry_price?: number | null;
          current_price?: number | null;
          exit_price?: number | null;
          size?: number | null;
          size_usdt?: number | null;
          leverage?: number;
          stop_loss?: number | null;
          take_profit?: number | null;
          status?: 'open' | 'closed' | 'cancelled';
          pnl_usdt?: number | null;
          pnl_percent?: number | null;
          opened_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      signals: {
        Row: {
          id: string;
          provider_id: string;
          pair: string;
          timeframe: string;
          signal_type: 'long' | 'short' | 'close';
          entry_price: number | null;
          stop_loss: number | null;
          take_profit_1: number | null;
          take_profit_2: number | null;
          take_profit_3: number | null;
          kde_levels: Json | null;
          confidence: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          pair: string;
          timeframe: string;
          signal_type: 'long' | 'short' | 'close';
          entry_price?: number | null;
          stop_loss?: number | null;
          take_profit_1?: number | null;
          take_profit_2?: number | null;
          take_profit_3?: number | null;
          kde_levels?: Json | null;
          confidence?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          pair?: string;
          timeframe?: string;
          signal_type?: 'long' | 'short' | 'close';
          entry_price?: number | null;
          stop_loss?: number | null;
          take_profit_1?: number | null;
          take_profit_2?: number | null;
          take_profit_3?: number | null;
          kde_levels?: Json | null;
          confidence?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          provider_id: string;
          tier: 'free' | 'pro' | 'copy' | 'enterprise';
          copy_enabled: boolean;
          stripe_subscription_id: string | null;
          status: 'active' | 'paused' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider_id: string;
          tier?: 'free' | 'pro' | 'copy' | 'enterprise';
          copy_enabled?: boolean;
          stripe_subscription_id?: string | null;
          status?: 'active' | 'paused' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider_id?: string;
          tier?: 'free' | 'pro' | 'copy' | 'enterprise';
          copy_enabled?: boolean;
          stripe_subscription_id?: string | null;
          status?: 'active' | 'paused' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriber_wallets: {
        Row: {
          id: string;
          user_id: string;
          exchange: 'bitget' | 'binance' | 'bybit';
          api_key_encrypted: string;
          api_secret_encrypted: string;
          passphrase_encrypted: string | null;
          is_active: boolean;
          balance_usdt: number | null;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exchange: 'bitget' | 'binance' | 'bybit';
          api_key_encrypted: string;
          api_secret_encrypted: string;
          passphrase_encrypted?: string | null;
          is_active?: boolean;
          balance_usdt?: number | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exchange?: 'bitget' | 'binance' | 'bybit';
          api_key_encrypted?: string;
          api_secret_encrypted?: string;
          passphrase_encrypted?: string | null;
          is_active?: boolean;
          balance_usdt?: number | null;
          last_synced_at?: string | null;
          created_at?: string;
        };
      };
      copy_settings: {
        Row: {
          id: string;
          subscription_id: string;
          wallet_id: string;
          copy_mode: 'proportional' | 'fixed_percent' | 'fixed_size';
          size_percent: number | null;
          size_fixed_usdt: number | null;
          max_position_percent: number;
          max_concurrent_trades: number;
          max_daily_loss_percent: number;
          risk_multiplier: number;
          pairs_whitelist: string[] | null;
          pairs_blacklist: string[];
          mirror_sl: boolean;
          mirror_tp: boolean;
          is_paused: boolean;
          daily_pnl_usdt: number;
          daily_pnl_reset_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          wallet_id: string;
          copy_mode?: 'proportional' | 'fixed_percent' | 'fixed_size';
          size_percent?: number | null;
          size_fixed_usdt?: number | null;
          max_position_percent?: number;
          max_concurrent_trades?: number;
          max_daily_loss_percent?: number;
          risk_multiplier?: number;
          pairs_whitelist?: string[] | null;
          pairs_blacklist?: string[];
          mirror_sl?: boolean;
          mirror_tp?: boolean;
          is_paused?: boolean;
          daily_pnl_usdt?: number;
          daily_pnl_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          wallet_id?: string;
          copy_mode?: 'proportional' | 'fixed_percent' | 'fixed_size';
          size_percent?: number | null;
          size_fixed_usdt?: number | null;
          max_position_percent?: number;
          max_concurrent_trades?: number;
          max_daily_loss_percent?: number;
          risk_multiplier?: number;
          pairs_whitelist?: string[] | null;
          pairs_blacklist?: string[];
          mirror_sl?: boolean;
          mirror_tp?: boolean;
          is_paused?: boolean;
          daily_pnl_usdt?: number;
          daily_pnl_reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      copy_executions: {
        Row: {
          id: string;
          trade_id: string | null;
          subscription_id: string;
          wallet_id: string;
          external_id: string | null;
          action: 'open' | 'close' | 'update_sl' | 'update_tp';
          pair: string;
          side: 'long' | 'short' | null;
          size: number | null;
          size_usdt: number | null;
          price: number | null;
          leverage: number | null;
          status: 'pending' | 'success' | 'failed' | 'blocked';
          error_message: string | null;
          block_reason: string | null;
          pnl_usdt: number | null;
          executed_at: string;
        };
        Insert: {
          id?: string;
          trade_id?: string | null;
          subscription_id: string;
          wallet_id: string;
          external_id?: string | null;
          action: 'open' | 'close' | 'update_sl' | 'update_tp';
          pair: string;
          side?: 'long' | 'short' | null;
          size?: number | null;
          size_usdt?: number | null;
          price?: number | null;
          leverage?: number | null;
          status: 'pending' | 'success' | 'failed' | 'blocked';
          error_message?: string | null;
          block_reason?: string | null;
          pnl_usdt?: number | null;
          executed_at?: string;
        };
        Update: {
          id?: string;
          trade_id?: string | null;
          subscription_id?: string;
          wallet_id?: string;
          external_id?: string | null;
          action?: 'open' | 'close' | 'update_sl' | 'update_tp';
          pair?: string;
          side?: 'long' | 'short' | null;
          size?: number | null;
          size_usdt?: number | null;
          price?: number | null;
          leverage?: number | null;
          status?: 'pending' | 'success' | 'failed' | 'blocked';
          error_message?: string | null;
          block_reason?: string | null;
          pnl_usdt?: number | null;
          executed_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key_hash: string;
          prefix: string;
          scopes: string[];
          last_used_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key_hash: string;
          prefix: string;
          scopes?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          key_hash?: string;
          prefix?: string;
          scopes?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      webhooks: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          secret_hash: string;
          events: string[];
          is_active: boolean;
          failure_count: number;
          last_triggered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          secret_hash: string;
          events: string[];
          is_active?: boolean;
          failure_count?: number;
          last_triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          url?: string;
          secret_hash?: string;
          events?: string[];
          is_active?: boolean;
          failure_count?: number;
          last_triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      webhook_deliveries: {
        Row: {
          id: string;
          webhook_id: string;
          event_type: string;
          payload: Json;
          response_status: number | null;
          response_body: string | null;
          attempt_count: number;
          status: 'pending' | 'success' | 'failed';
          next_retry_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          event_type: string;
          payload: Json;
          response_status?: number | null;
          response_body?: string | null;
          attempt_count?: number;
          status: 'pending' | 'success' | 'failed';
          next_retry_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          event_type?: string;
          payload?: Json;
          response_status?: number | null;
          response_body?: string | null;
          attempt_count?: number;
          status?: 'pending' | 'success' | 'failed';
          next_retry_at?: string | null;
          created_at?: string;
        };
      };
      performance_daily: {
        Row: {
          id: string;
          provider_id: string;
          date: string;
          trades_count: number;
          wins: number;
          losses: number;
          pnl_usdt: number;
          pnl_percent: number;
          volume_usdt: number;
          max_drawdown_percent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          date: string;
          trades_count?: number;
          wins?: number;
          losses?: number;
          pnl_usdt?: number;
          pnl_percent?: number;
          volume_usdt?: number;
          max_drawdown_percent?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          date?: string;
          trades_count?: number;
          wins?: number;
          losses?: number;
          pnl_usdt?: number;
          pnl_percent?: number;
          volume_usdt?: number;
          max_drawdown_percent?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
