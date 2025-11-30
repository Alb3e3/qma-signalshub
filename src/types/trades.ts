/**
 * Trade Types
 * Types for provider trades and copy executions
 */

export type TradeSide = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'cancelled';

export interface Trade {
  id: string;
  provider_id: string;
  external_id: string | null;
  pair: string;
  side: TradeSide;
  entry_price: number | null;
  current_price: number | null;
  exit_price: number | null;
  size: number | null;
  size_usdt: number | null;
  leverage: number;
  stop_loss: number | null;
  take_profit: number | null;
  status: TradeStatus;
  pnl_usdt: number | null;
  pnl_percent: number | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeWithProvider extends Trade {
  provider: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export interface TradeFilters {
  provider_id?: string;
  status?: TradeStatus | 'all';
  pair?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface TradeCreateInput {
  provider_id: string;
  external_id?: string;
  pair: string;
  side: TradeSide;
  entry_price: number;
  size: number;
  size_usdt: number;
  leverage?: number;
  stop_loss?: number;
  take_profit?: number;
  opened_at?: string;
}

export interface TradeUpdateInput {
  current_price?: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  status?: TradeStatus;
  pnl_usdt?: number;
  pnl_percent?: number;
  closed_at?: string;
}
