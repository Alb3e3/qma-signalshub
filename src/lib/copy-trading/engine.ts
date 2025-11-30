// @ts-nocheck
// TODO: Fix Supabase type inference issues with Database type
/**
 * Copy-Trading Engine
 * Handles trade detection, position sizing, and execution
 */

import { createAdminClient } from '@/lib/supabase/server';
import { BitgetClient, createBitgetClient } from '@/lib/exchanges/bitget';
import { decrypt } from '@/lib/utils/crypto';

interface CopySettings {
  id: string;
  subscriber_wallet_id: string;
  provider_id: string;
  is_active: boolean;
  copy_mode: 'proportional' | 'fixed_percent' | 'fixed_size';
  size_value: number;
  max_position_usd: number;
  max_daily_loss_usd: number;
  allowed_pairs: string[] | null;
  copy_stop_loss: boolean;
  copy_take_profit: boolean;
}

interface SubscriberWallet {
  id: string;
  user_id: string;
  exchange: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
  api_passphrase_encrypted: string | null;
  is_active: boolean;
}

interface Trade {
  id: string;
  provider_id: string;
  pair: string;
  direction: 'long' | 'short';
  entry_price: number;
  quantity: number;
  leverage: number;
  stop_loss?: number;
  take_profit?: number;
  status: string;
}

interface CopyExecutionResult {
  success: boolean;
  copySettingsId: string;
  subscriberWalletId: string;
  orderId?: string;
  executedSize?: number;
  executedPrice?: number;
  error?: string;
}

/**
 * Calculate position size based on copy mode
 */
function calculatePositionSize(
  settings: CopySettings,
  providerTrade: Trade,
  subscriberBalance: number
): number {
  let size = 0;

  switch (settings.copy_mode) {
    case 'proportional':
      // Copy the same percentage of balance as the provider
      // settings.size_value is the multiplier (e.g., 1.0 = same, 0.5 = half)
      size = providerTrade.quantity * settings.size_value;
      break;

    case 'fixed_percent':
      // Use a fixed percentage of subscriber's balance
      // settings.size_value is the percentage (e.g., 5 = 5%)
      const percentValue = (settings.size_value / 100) * subscriberBalance;
      size = percentValue / providerTrade.entry_price;
      break;

    case 'fixed_size':
      // Fixed USD size per trade
      // settings.size_value is the USD amount
      size = settings.size_value / providerTrade.entry_price;
      break;
  }

  // Apply max position limit
  const maxSize = settings.max_position_usd / providerTrade.entry_price;
  return Math.min(size, maxSize);
}

/**
 * Check if a trade should be copied based on settings
 */
function shouldCopyTrade(settings: CopySettings, trade: Trade): boolean {
  // Check if copy-trading is active
  if (!settings.is_active) {
    return false;
  }

  // Check if pair is allowed
  if (settings.allowed_pairs && settings.allowed_pairs.length > 0) {
    if (!settings.allowed_pairs.includes(trade.pair)) {
      return false;
    }
  }

  return true;
}

/**
 * Get decrypted exchange credentials
 */
async function getExchangeCredentials(wallet: SubscriberWallet) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }

  return {
    apiKey: decrypt(wallet.api_key_encrypted, encryptionKey),
    secretKey: decrypt(wallet.api_secret_encrypted, encryptionKey),
    passphrase: wallet.api_passphrase_encrypted
      ? decrypt(wallet.api_passphrase_encrypted, encryptionKey)
      : '',
  };
}

/**
 * Execute a copy trade for a single subscriber
 */
async function executeCopyTrade(
  settings: CopySettings,
  wallet: SubscriberWallet,
  trade: Trade
): Promise<CopyExecutionResult> {
  const adminClient = createAdminClient();

  try {
    // Get exchange credentials
    const credentials = await getExchangeCredentials(wallet);

    // Create exchange client (currently only Bitget supported)
    if (wallet.exchange !== 'bitget') {
      return {
        success: false,
        copySettingsId: settings.id,
        subscriberWalletId: wallet.id,
        error: `Exchange ${wallet.exchange} not supported`,
      };
    }

    const client = createBitgetClient(credentials);

    // Get subscriber's balance
    const balances = await client.getBalance();
    const usdtBalance = balances.find(b => b.coin === 'USDT');
    const availableBalance = parseFloat(usdtBalance?.available || '0');

    if (availableBalance <= 0) {
      return {
        success: false,
        copySettingsId: settings.id,
        subscriberWalletId: wallet.id,
        error: 'Insufficient balance',
      };
    }

    // Check daily loss limit
    const today = new Date().toISOString().split('T')[0];
    const { data: todayExecutions } = await adminClient
      .from('copy_executions')
      .select('realized_pnl')
      .eq('copy_settings_id', settings.id)
      .gte('created_at', `${today}T00:00:00Z`);

    const todayPnl = todayExecutions?.reduce(
      (sum, e) => sum + (e.realized_pnl || 0),
      0
    ) || 0;

    if (todayPnl < -settings.max_daily_loss_usd) {
      return {
        success: false,
        copySettingsId: settings.id,
        subscriberWalletId: wallet.id,
        error: 'Daily loss limit reached',
      };
    }

    // Calculate position size
    const positionSize = calculatePositionSize(settings, trade, availableBalance);

    if (positionSize <= 0) {
      return {
        success: false,
        copySettingsId: settings.id,
        subscriberWalletId: wallet.id,
        error: 'Calculated position size is zero or negative',
      };
    }

    // Format symbol for Bitget (e.g., BTC/USDT -> BTCUSDT)
    const symbol = trade.pair.replace('/', '') + '_UMCBL';

    // Execute the trade
    let orderResult;
    if (trade.direction === 'long') {
      orderResult = await client.openLong(
        symbol,
        positionSize.toFixed(4),
        trade.leverage
      );
    } else {
      orderResult = await client.openShort(
        symbol,
        positionSize.toFixed(4),
        trade.leverage
      );
    }

    // Get execution price
    const executionPrice = await client.getPrice(symbol);

    // Record the execution
    await adminClient.from('copy_executions').insert({
      copy_settings_id: settings.id,
      provider_trade_id: trade.id,
      subscriber_order_id: orderResult.orderId,
      pair: trade.pair,
      direction: trade.direction,
      size: positionSize,
      entry_price: parseFloat(executionPrice),
      leverage: trade.leverage,
      status: 'open',
    });

    return {
      success: true,
      copySettingsId: settings.id,
      subscriberWalletId: wallet.id,
      orderId: orderResult.orderId,
      executedSize: positionSize,
      executedPrice: parseFloat(executionPrice),
    };
  } catch (error) {
    return {
      success: false,
      copySettingsId: settings.id,
      subscriberWalletId: wallet.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a new trade and execute copy trades for all subscribers
 */
export async function processNewTrade(trade: Trade): Promise<CopyExecutionResult[]> {
  const adminClient = createAdminClient();

  // Get all active copy settings for this provider
  const { data: copySettings, error: settingsError } = await adminClient
    .from('copy_settings')
    .select(`
      *,
      subscriber_wallets!inner (
        id,
        user_id,
        exchange,
        api_key_encrypted,
        api_secret_encrypted,
        api_passphrase_encrypted,
        is_active
      )
    `)
    .eq('provider_id', trade.provider_id)
    .eq('is_active', true);

  if (settingsError || !copySettings || copySettings.length === 0) {
    return [];
  }

  const results: CopyExecutionResult[] = [];

  // Execute copy trades in parallel
  const promises = copySettings.map(async (settings) => {
    const wallet = settings.subscriber_wallets as unknown as SubscriberWallet;

    // Skip inactive wallets
    if (!wallet.is_active) {
      return {
        success: false,
        copySettingsId: settings.id,
        subscriberWalletId: wallet.id,
        error: 'Wallet is inactive',
      } as CopyExecutionResult;
    }

    // Check if this trade should be copied
    if (!shouldCopyTrade(settings, trade)) {
      return {
        success: false,
        copySettingsId: settings.id,
        subscriberWalletId: wallet.id,
        error: 'Trade filtered by settings',
      } as CopyExecutionResult;
    }

    return executeCopyTrade(settings, wallet, trade);
  });

  const settledResults = await Promise.allSettled(promises);

  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      // Log rejected promises
      console.error('Copy trade execution failed:', result.reason);
    }
  }

  return results;
}

/**
 * Process a closed trade and close copy positions
 */
export async function processClosedTrade(trade: Trade): Promise<CopyExecutionResult[]> {
  const adminClient = createAdminClient();

  // Get all open copy executions for this trade
  const { data: executions, error } = await adminClient
    .from('copy_executions')
    .select(`
      *,
      copy_settings!inner (
        id,
        subscriber_wallet_id
      )
    `)
    .eq('provider_trade_id', trade.id)
    .eq('status', 'open');

  if (error || !executions || executions.length === 0) {
    return [];
  }

  const results: CopyExecutionResult[] = [];

  for (const execution of executions) {
    try {
      // Get the subscriber wallet
      const { data: wallet } = await adminClient
        .from('subscriber_wallets')
        .select('*')
        .eq('id', execution.copy_settings.subscriber_wallet_id)
        .single();

      if (!wallet) {
        continue;
      }

      const credentials = await getExchangeCredentials(wallet);
      const client = createBitgetClient(credentials);

      // Format symbol
      const symbol = execution.pair.replace('/', '') + '_UMCBL';

      // Close the position
      await client.closePosition(
        symbol,
        execution.direction,
        execution.size.toString()
      );

      // Get exit price
      const exitPrice = await client.getPrice(symbol);
      const exitPriceNum = parseFloat(exitPrice);

      // Calculate PnL
      const entryPrice = execution.entry_price;
      const pnlPercent =
        execution.direction === 'long'
          ? ((exitPriceNum - entryPrice) / entryPrice) * 100
          : ((entryPrice - exitPriceNum) / entryPrice) * 100;

      const pnlUsd = execution.size * entryPrice * (pnlPercent / 100);

      // Update execution record
      await adminClient
        .from('copy_executions')
        .update({
          exit_price: exitPriceNum,
          realized_pnl: pnlUsd,
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('id', execution.id);

      results.push({
        success: true,
        copySettingsId: execution.copy_settings.id,
        subscriberWalletId: wallet.id,
        executedPrice: exitPriceNum,
      });
    } catch (error) {
      results.push({
        success: false,
        copySettingsId: execution.copy_settings.id,
        subscriberWalletId: execution.copy_settings.subscriber_wallet_id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
