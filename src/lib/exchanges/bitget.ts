/**
 * Bitget Exchange Client
 * Handles API interactions for copy-trading execution
 */

import crypto from 'crypto';

export interface BitgetCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
}

export interface BitgetOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  size: string;
  price?: string;
  leverage?: number;
  marginMode?: 'cross' | 'isolated';
  productType?: 'USDT-FUTURES' | 'COIN-FUTURES' | 'USDC-FUTURES';
}

export interface BitgetOrderResult {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  side: string;
  size: string;
  price?: string;
  status: string;
}

export interface BitgetPosition {
  symbol: string;
  side: 'long' | 'short';
  size: string;
  entryPrice: string;
  unrealizedPnl: string;
  leverage: number;
  marginMode: string;
}

export interface BitgetBalance {
  coin: string;
  available: string;
  frozen: string;
  total: string;
}

const BITGET_API_URL = 'https://api.bitget.com';

/**
 * Generate signature for Bitget API requests
 */
function generateSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string,
  secretKey: string
): string {
  const message = timestamp + method.toUpperCase() + requestPath + body;
  const hmac = crypto.createHmac('sha256', secretKey);
  return hmac.update(message).digest('base64');
}

/**
 * Make an authenticated request to Bitget API
 */
async function bitgetRequest<T>(
  credentials: BitgetCredentials,
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const timestamp = Date.now().toString();
  const bodyStr = body ? JSON.stringify(body) : '';
  const signature = generateSignature(
    timestamp,
    method,
    endpoint,
    bodyStr,
    credentials.secretKey
  );

  const headers: Record<string, string> = {
    'ACCESS-KEY': credentials.apiKey,
    'ACCESS-SIGN': signature,
    'ACCESS-TIMESTAMP': timestamp,
    'ACCESS-PASSPHRASE': credentials.passphrase,
    'Content-Type': 'application/json',
    'locale': 'en-US',
  };

  const response = await fetch(`${BITGET_API_URL}${endpoint}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  const data = await response.json();

  if (data.code !== '00000') {
    throw new Error(`Bitget API Error: ${data.msg} (code: ${data.code})`);
  }

  return data.data as T;
}

export class BitgetClient {
  private credentials: BitgetCredentials;

  constructor(credentials: BitgetCredentials) {
    this.credentials = credentials;
  }

  /**
   * Get account balance
   */
  async getBalance(productType: string = 'USDT-FUTURES'): Promise<BitgetBalance[]> {
    const endpoint = `/api/v2/mix/account/accounts?productType=${productType}`;
    return bitgetRequest<BitgetBalance[]>(this.credentials, 'GET', endpoint);
  }

  /**
   * Get current positions
   */
  async getPositions(productType: string = 'USDT-FUTURES'): Promise<BitgetPosition[]> {
    const endpoint = `/api/v2/mix/position/all-position?productType=${productType}`;
    const data = await bitgetRequest<BitgetPosition[]>(this.credentials, 'GET', endpoint);
    return data || [];
  }

  /**
   * Get position for a specific symbol
   */
  async getPosition(symbol: string, productType: string = 'USDT-FUTURES'): Promise<BitgetPosition | null> {
    const positions = await this.getPositions(productType);
    return positions.find(p => p.symbol === symbol) || null;
  }

  /**
   * Set leverage for a symbol
   */
  async setLeverage(
    symbol: string,
    leverage: number,
    marginMode: 'cross' | 'isolated' = 'cross',
    productType: string = 'USDT-FUTURES'
  ): Promise<void> {
    const endpoint = '/api/v2/mix/account/set-leverage';
    await bitgetRequest(this.credentials, 'POST', endpoint, {
      symbol,
      productType,
      marginCoin: 'USDT',
      leverage: leverage.toString(),
      holdSide: 'long', // Set for both sides
    });

    // Also set for short side
    await bitgetRequest(this.credentials, 'POST', endpoint, {
      symbol,
      productType,
      marginCoin: 'USDT',
      leverage: leverage.toString(),
      holdSide: 'short',
    });
  }

  /**
   * Place a market order
   */
  async placeMarketOrder(params: BitgetOrderParams): Promise<BitgetOrderResult> {
    const endpoint = '/api/v2/mix/order/place-order';

    const body = {
      symbol: params.symbol,
      productType: params.productType || 'USDT-FUTURES',
      marginMode: params.marginMode || 'cross',
      marginCoin: 'USDT',
      size: params.size,
      side: params.side,
      tradeSide: params.side === 'buy' ? 'open' : 'close',
      orderType: 'market',
    };

    return bitgetRequest<BitgetOrderResult>(this.credentials, 'POST', endpoint, body);
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(params: BitgetOrderParams): Promise<BitgetOrderResult> {
    if (!params.price) {
      throw new Error('Price is required for limit orders');
    }

    const endpoint = '/api/v2/mix/order/place-order';

    const body = {
      symbol: params.symbol,
      productType: params.productType || 'USDT-FUTURES',
      marginMode: params.marginMode || 'cross',
      marginCoin: 'USDT',
      size: params.size,
      price: params.price,
      side: params.side,
      tradeSide: params.side === 'buy' ? 'open' : 'close',
      orderType: 'limit',
    };

    return bitgetRequest<BitgetOrderResult>(this.credentials, 'POST', endpoint, body);
  }

  /**
   * Open a long position
   */
  async openLong(
    symbol: string,
    size: string,
    leverage?: number,
    productType: string = 'USDT-FUTURES'
  ): Promise<BitgetOrderResult> {
    if (leverage) {
      await this.setLeverage(symbol, leverage, 'cross', productType);
    }

    return this.placeMarketOrder({
      symbol,
      side: 'buy',
      orderType: 'market',
      size,
      productType: productType as BitgetOrderParams['productType'],
    });
  }

  /**
   * Open a short position
   */
  async openShort(
    symbol: string,
    size: string,
    leverage?: number,
    productType: string = 'USDT-FUTURES'
  ): Promise<BitgetOrderResult> {
    if (leverage) {
      await this.setLeverage(symbol, leverage, 'cross', productType);
    }

    return this.placeMarketOrder({
      symbol,
      side: 'sell',
      orderType: 'market',
      size,
      productType: productType as BitgetOrderParams['productType'],
    });
  }

  /**
   * Close a position
   */
  async closePosition(
    symbol: string,
    side: 'long' | 'short',
    size: string,
    productType: string = 'USDT-FUTURES'
  ): Promise<BitgetOrderResult> {
    // To close a long, we sell. To close a short, we buy.
    const closeSide = side === 'long' ? 'sell' : 'buy';

    const endpoint = '/api/v2/mix/order/place-order';

    const body = {
      symbol,
      productType,
      marginMode: 'cross',
      marginCoin: 'USDT',
      size,
      side: closeSide,
      tradeSide: 'close',
      orderType: 'market',
    };

    return bitgetRequest<BitgetOrderResult>(this.credentials, 'POST', endpoint, body);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    symbol: string,
    orderId: string,
    productType: string = 'USDT-FUTURES'
  ): Promise<void> {
    const endpoint = '/api/v2/mix/order/cancel-order';
    await bitgetRequest(this.credentials, 'POST', endpoint, {
      symbol,
      productType,
      orderId,
    });
  }

  /**
   * Get order history
   */
  async getOrderHistory(
    symbol: string,
    productType: string = 'USDT-FUTURES',
    limit: number = 50
  ): Promise<BitgetOrderResult[]> {
    const endpoint = `/api/v2/mix/order/orders-history?symbol=${symbol}&productType=${productType}&limit=${limit}`;
    return bitgetRequest<BitgetOrderResult[]>(this.credentials, 'GET', endpoint);
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string, productType: string = 'USDT-FUTURES'): Promise<string> {
    const endpoint = `/api/v2/mix/market/ticker?symbol=${symbol}&productType=${productType}`;
    const data = await bitgetRequest<{ lastPr: string }>(this.credentials, 'GET', endpoint);
    return data.lastPr;
  }

  /**
   * Validate credentials by making a simple API call
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a Bitget client from encrypted credentials
 */
export function createBitgetClient(credentials: BitgetCredentials): BitgetClient {
  return new BitgetClient(credentials);
}
