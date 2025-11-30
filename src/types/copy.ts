/**
 * Copy Trading Types
 * Types for copy-trading configuration and execution
 */

export type CopyMode = 'proportional' | 'fixed_percent' | 'fixed_size';
export type CopyAction = 'open' | 'close' | 'update_sl' | 'update_tp';
export type CopyExecutionStatus = 'pending' | 'success' | 'failed' | 'blocked';

export interface CopySettings {
  id: string;
  subscription_id: string;
  wallet_id: string;
  copy_mode: CopyMode;
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
}

export interface CopySettingsInput {
  copy_mode?: CopyMode;
  size_percent?: number;
  size_fixed_usdt?: number;
  max_position_percent?: number;
  max_concurrent_trades?: number;
  max_daily_loss_percent?: number;
  risk_multiplier?: number;
  pairs_whitelist?: string[] | null;
  pairs_blacklist?: string[];
  mirror_sl?: boolean;
  mirror_tp?: boolean;
  is_paused?: boolean;
}

export interface CopyExecution {
  id: string;
  trade_id: string | null;
  subscription_id: string;
  wallet_id: string;
  external_id: string | null;
  action: CopyAction;
  pair: string;
  side: 'long' | 'short' | null;
  size: number | null;
  size_usdt: number | null;
  price: number | null;
  leverage: number | null;
  status: CopyExecutionStatus;
  error_message: string | null;
  block_reason: string | null;
  pnl_usdt: number | null;
  executed_at: string;
}

export interface CopyExecutionFilters {
  subscription_id?: string;
  status?: CopyExecutionStatus;
  action?: CopyAction;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface CopyExecutionWithTrade extends CopyExecution {
  trade?: {
    id: string;
    pair: string;
    side: string;
    entry_price: number;
    provider: {
      display_name: string;
    };
  };
}

export interface CopyValidationResult {
  approved: boolean;
  size_usdt: number | null;
  block_reason: string | null;
  warnings: string[];
}

export interface CopyRiskCheck {
  check: string;
  passed: boolean;
  message: string;
  value?: number;
  limit?: number;
}
