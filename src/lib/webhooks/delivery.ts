// @ts-nocheck
// TODO: Fix Supabase type inference issues with Database type
/**
 * Webhook Delivery System
 * Handles sending webhooks to subscriber endpoints
 */

import { createAdminClient } from '@/lib/supabase/server';
import { signWebhookPayload } from '@/lib/utils/webhook';

export interface WebhookEvent {
  type: 'signal.new' | 'signal.closed' | 'trade.opened' | 'trade.closed';
  data: Record<string, unknown>;
  timestamp: string;
}

interface WebhookDeliveryResult {
  webhookId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  duration: number;
}

/**
 * Send a webhook to a specific endpoint
 */
async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  event: WebhookEvent
): Promise<WebhookDeliveryResult> {
  const startTime = Date.now();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(event, secret, timestamp);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SignalsHub-Signature': signature,
        'X-SignalsHub-Event': event.type,
        'X-SignalsHub-Timestamp': timestamp.toString(),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const duration = Date.now() - startTime;

    return {
      webhookId,
      success: response.ok,
      statusCode: response.status,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      webhookId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };
  }
}

/**
 * Record a webhook delivery attempt in the database
 */
async function recordDelivery(
  webhookId: string,
  event: WebhookEvent,
  result: WebhookDeliveryResult
) {
  const adminClient = createAdminClient();

  await adminClient.from('webhook_deliveries').insert({
    webhook_id: webhookId,
    event_type: event.type,
    payload: event.data,
    status_code: result.statusCode,
    success: result.success,
    error_message: result.error,
    duration_ms: result.duration,
  });

  // Update last_triggered_at on the webhook
  await adminClient
    .from('webhooks')
    .update({ last_triggered_at: new Date().toISOString() })
    .eq('id', webhookId);
}

/**
 * Dispatch a webhook event to all subscribed endpoints
 */
export async function dispatchWebhookEvent(
  eventType: WebhookEvent['type'],
  data: Record<string, unknown>,
  userIds?: string[]
): Promise<void> {
  const adminClient = createAdminClient();

  // Build query for active webhooks subscribed to this event
  let query = adminClient
    .from('webhooks')
    .select('id, url, secret, user_id')
    .eq('is_active', true)
    .contains('events', [eventType]);

  // Optionally filter by specific user IDs
  if (userIds && userIds.length > 0) {
    query = query.in('user_id', userIds);
  }

  const { data: webhooks, error } = await query;

  if (error || !webhooks || webhooks.length === 0) {
    return;
  }

  const event: WebhookEvent = {
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  };

  // Deliver to all webhooks in parallel
  const deliveryPromises = webhooks.map(async (webhook) => {
    const result = await deliverWebhook(
      webhook.id,
      webhook.url,
      webhook.secret,
      event
    );

    // Record the delivery attempt
    await recordDelivery(webhook.id, event, result);

    return result;
  });

  await Promise.allSettled(deliveryPromises);
}

/**
 * Dispatch a signal.new event
 */
export async function dispatchSignalNew(signal: Record<string, unknown>) {
  await dispatchWebhookEvent('signal.new', signal);
}

/**
 * Dispatch a signal.closed event
 */
export async function dispatchSignalClosed(signal: Record<string, unknown>) {
  await dispatchWebhookEvent('signal.closed', signal);
}

/**
 * Dispatch a trade.opened event
 */
export async function dispatchTradeOpened(trade: Record<string, unknown>) {
  await dispatchWebhookEvent('trade.opened', trade);
}

/**
 * Dispatch a trade.closed event
 */
export async function dispatchTradeClosed(trade: Record<string, unknown>) {
  await dispatchWebhookEvent('trade.closed', trade);
}
