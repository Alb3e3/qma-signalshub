import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { FreqtradeClient, convertFreqtradeTrade } from '@/lib/freqtrade/client';
import { decrypt } from '@/lib/utils/crypto';
import { dispatchSignalNew, dispatchSignalClosed, dispatchTradeOpened, dispatchTradeClosed } from '@/lib/webhooks/delivery';
import { processNewTrade, processClosedTrade } from '@/lib/copy-trading/engine';

/**
 * POST /api/cron/sync-trades
 * Sync trades from all provider bots
 * Should be called by a cron job every 1-5 minutes
 */
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    return NextResponse.json({ error: 'Encryption key not configured' }, { status: 500 });
  }

  // Get all active providers with connected bots
  const { data: providerWallets, error } = await adminClient
    .from('provider_wallets')
    .select(`
      id,
      provider_id,
      bot_api_url_encrypted,
      bot_api_username_encrypted,
      bot_api_password_encrypted,
      last_sync_at,
      providers!inner (
        id,
        user_id,
        display_name,
        is_active
      )
    `)
    .eq('is_active', true);

  if (error || !providerWallets) {
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }

  const results: { providerId: string; synced: number; errors: string[] }[] = [];

  for (const wallet of providerWallets) {
    const errors: string[] = [];
    let synced = 0;

    try {
      // Decrypt credentials
      const botUrl = decrypt(wallet.bot_api_url_encrypted, encryptionKey);
      const botUsername = decrypt(wallet.bot_api_username_encrypted, encryptionKey);
      const botPassword = decrypt(wallet.bot_api_password_encrypted, encryptionKey);

      const client = new FreqtradeClient({
        baseUrl: botUrl,
        username: botUsername,
        password: botPassword,
      });

      // Get all trades from Freqtrade
      const trades = await client.getAllTrades(100);
      const provider = wallet.providers as unknown as { id: string; display_name: string };

      for (const ftTrade of trades) {
        const tradeData = convertFreqtradeTrade(ftTrade, wallet.provider_id);

        // Check if trade already exists
        const { data: existingTrade } = await adminClient
          .from('trades')
          .select('id, status')
          .eq('provider_id', wallet.provider_id)
          .eq('external_trade_id', tradeData.external_trade_id)
          .single();

        if (!existingTrade) {
          // New trade - insert it
          const { data: newTrade, error: insertError } = await adminClient
            .from('trades')
            .insert(tradeData)
            .select()
            .single();

          if (insertError) {
            errors.push(`Failed to insert trade ${tradeData.external_trade_id}: ${insertError.message}`);
            continue;
          }

          synced++;

          // Create signal for new trade
          if (tradeData.status === 'open') {
            await adminClient.from('signals').insert({
              provider_id: wallet.provider_id,
              trade_id: newTrade.id,
              pair: tradeData.pair,
              direction: tradeData.direction,
              entry_price: tradeData.entry_price,
              stop_loss: tradeData.stop_loss,
              leverage: tradeData.leverage,
              status: 'active',
            });

            // Dispatch webhooks and copy trades
            await dispatchSignalNew({
              ...newTrade,
              provider_name: provider.display_name,
            });

            await dispatchTradeOpened({
              ...newTrade,
              provider_name: provider.display_name,
            });

            // Execute copy trades
            await processNewTrade({
              id: newTrade.id,
              provider_id: wallet.provider_id,
              pair: tradeData.pair,
              direction: tradeData.direction as 'long' | 'short',
              entry_price: tradeData.entry_price,
              quantity: tradeData.quantity,
              leverage: tradeData.leverage,
              stop_loss: tradeData.stop_loss || undefined,
              take_profit: undefined,
              status: 'open',
            });
          }
        } else if (existingTrade.status !== tradeData.status) {
          // Trade status changed - update it
          const { data: updatedTrade } = await adminClient
            .from('trades')
            .update({
              exit_price: tradeData.exit_price,
              pnl_percent: tradeData.pnl_percent,
              pnl_usd: tradeData.pnl_usd,
              status: tradeData.status,
              closed_at: tradeData.closed_at,
            })
            .eq('id', existingTrade.id)
            .select()
            .single();

          synced++;

          // Update corresponding signal
          if (tradeData.status === 'closed') {
            await adminClient
              .from('signals')
              .update({
                status: 'closed',
                result_pnl_percent: tradeData.pnl_percent,
                closed_at: tradeData.closed_at,
              })
              .eq('trade_id', existingTrade.id);

            // Dispatch webhooks
            await dispatchSignalClosed({
              ...updatedTrade,
              provider_name: provider.display_name,
            });

            await dispatchTradeClosed({
              ...updatedTrade,
              provider_name: provider.display_name,
            });

            // Close copy positions
            await processClosedTrade({
              id: existingTrade.id,
              provider_id: wallet.provider_id,
              pair: tradeData.pair,
              direction: tradeData.direction as 'long' | 'short',
              entry_price: tradeData.entry_price,
              quantity: tradeData.quantity,
              leverage: tradeData.leverage,
              status: 'closed',
            });
          }
        }
      }

      // Update last sync time
      await adminClient
        .from('provider_wallets')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', wallet.id);

    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown error');
    }

    results.push({
      providerId: wallet.provider_id,
      synced,
      errors,
    });
  }

  return NextResponse.json({
    message: 'Trade sync completed',
    results,
    total_synced: results.reduce((sum, r) => sum + r.synced, 0),
  });
}
