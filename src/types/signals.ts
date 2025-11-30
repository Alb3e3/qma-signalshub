/**
 * Signal Types
 * Types for trading signals and KDE levels
 */

export type SignalType = 'long' | 'short' | 'close';

export interface KDELevel {
  price: number;
  strength: number;
  type: 'support' | 'resistance' | 'neutral';
  touches?: number;
}

export interface KDELevels {
  resistances: number[];
  supports: number[];
  nearest_resistance?: number;
  nearest_support?: number;
}

export interface Signal {
  id: string;
  provider_id: string;
  provider_name?: string;
  pair: string;
  timeframe: string;
  signal_type: SignalType;
  entry_price: number;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  take_profit_3: number | null;
  kde_levels: KDELevels | null;
  confidence: number | null;
  is_active: boolean;
  created_at: string;
}

export interface SignalCreateInput {
  provider_id: string;
  pair: string;
  timeframe: string;
  signal_type: SignalType;
  entry_price: number;
  stop_loss?: number;
  take_profit_1?: number;
  take_profit_2?: number;
  take_profit_3?: number;
  kde_levels?: KDELevels;
  confidence?: number;
}

export interface SignalFilters {
  pair?: string;
  provider_id?: string;
  signal_type?: SignalType;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface SignalWithProvider extends Signal {
  provider: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}
