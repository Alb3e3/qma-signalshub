/**
 * Freqtrade API Client
 * Fetches trades and signals from Freqtrade bots
 */

interface FreqtradeAuth {
  baseUrl: string;
  username: string;
  password: string;
}

interface FreqtradeTrade {
  trade_id: number;
  pair: string;
  is_short: boolean;
  open_rate: number;
  close_rate: number | null;
  stake_amount: number;
  amount: number;
  leverage: number;
  stop_loss_abs: number | null;
  profit_ratio: number | null;
  profit_abs: number | null;
  is_open: boolean;
  open_date: string;
  close_date: string | null;
}

interface FreqtradeStatus {
  running: boolean;
  dry_run: boolean;
  trading_mode: string;
  stake_currency: string;
}

export class FreqtradeClient {
  private auth: FreqtradeAuth;
  private token: string | null = null;

  constructor(auth: FreqtradeAuth) {
    this.auth = auth;
  }

  private async getToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    const response = await fetch(`${this.auth.baseUrl}/api/v1/token/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: this.auth.username,
        password: this.auth.password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Freqtrade login failed: ${response.status}`);
    }

    const data = await response.json();
    this.token = data.access_token;
    return this.token!;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const token = await this.getToken();

    const response = await fetch(`${this.auth.baseUrl}/api/v1${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      // Token might be expired, try to refresh
      if (response.status === 401) {
        this.token = null;
        const newToken = await this.getToken();
        const retryResponse = await fetch(`${this.auth.baseUrl}/api/v1${endpoint}`, {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        if (!retryResponse.ok) {
          throw new Error(`Freqtrade API error: ${retryResponse.status}`);
        }
        return retryResponse.json();
      }
      throw new Error(`Freqtrade API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get bot status
   */
  async getStatus(): Promise<FreqtradeStatus> {
    return this.request<FreqtradeStatus>('/show_config');
  }

  /**
   * Get all open trades
   */
  async getOpenTrades(): Promise<FreqtradeTrade[]> {
    const data = await this.request<{ trades: FreqtradeTrade[] }>('/status');
    return data.trades || [];
  }

  /**
   * Get closed trades
   */
  async getClosedTrades(limit: number = 50): Promise<FreqtradeTrade[]> {
    const data = await this.request<{ trades: FreqtradeTrade[] }>(`/trades?limit=${limit}`);
    return (data.trades || []).filter(t => !t.is_open);
  }

  /**
   * Get all trades (open and closed)
   */
  async getAllTrades(limit: number = 100): Promise<FreqtradeTrade[]> {
    const data = await this.request<{ trades: FreqtradeTrade[] }>(`/trades?limit=${limit}`);
    return data.trades || [];
  }

  /**
   * Get performance summary
   */
  async getPerformance(): Promise<{
    profit_all_coin: number;
    profit_all_percent: number;
    trade_count: number;
    winning_trades: number;
    losing_trades: number;
  }> {
    return this.request('/profit');
  }
}

/**
 * Convert Freqtrade trade to our internal format
 */
export function convertFreqtradeTrade(trade: FreqtradeTrade, providerId: string) {
  return {
    provider_id: providerId,
    external_trade_id: trade.trade_id.toString(),
    pair: trade.pair,
    direction: trade.is_short ? 'short' : 'long',
    entry_price: trade.open_rate,
    exit_price: trade.close_rate,
    quantity: trade.amount,
    leverage: trade.leverage || 1,
    stop_loss: trade.stop_loss_abs,
    pnl_percent: trade.profit_ratio ? trade.profit_ratio * 100 : null,
    pnl_usd: trade.profit_abs,
    status: trade.is_open ? 'open' : 'closed',
    opened_at: trade.open_date,
    closed_at: trade.close_date,
  };
}
