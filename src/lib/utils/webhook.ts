/**
 * Webhook Utilities
 * Functions for signing and verifying webhooks
 */

import { hmacSha256, timingSafeEqual } from './crypto';

export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookHeaders {
  'x-signature-256': string;
  'x-timestamp': string;
  'content-type': string;
  'user-agent': string;
}

/**
 * Sign a webhook payload
 * @param payload - Payload object to sign
 * @param secret - Webhook secret
 * @param timestamp - Unix timestamp in seconds
 * @returns Signature string prefixed with 'sha256='
 */
export function signWebhookPayload(
  payload: object,
  secret: string,
  timestamp: number
): string {
  const message = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = hmacSha256(message, secret);
  return `sha256=${signature}`;
}

/**
 * Verify a webhook signature
 * @param payload - Raw payload string (not parsed)
 * @param signature - Signature from X-Signature-256 header
 * @param timestamp - Timestamp from X-Timestamp header
 * @param secret - Webhook secret
 * @param maxAgeSeconds - Maximum age of webhook in seconds (default: 300)
 * @returns Whether the signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string,
  maxAgeSeconds: number = 300
): boolean {
  // Check timestamp is recent
  const now = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);

  if (isNaN(webhookTime)) {
    return false;
  }

  if (Math.abs(now - webhookTime) > maxAgeSeconds) {
    return false; // Replay attack prevention
  }

  // Compute expected signature
  const message = `${timestamp}.${payload}`;
  const expected = `sha256=${hmacSha256(message, secret)}`;

  // Timing-safe comparison
  return timingSafeEqual(signature, expected);
}

/**
 * Create webhook headers
 * @param signature - Computed signature
 * @param timestamp - Unix timestamp
 * @returns Headers object
 */
export function createWebhookHeaders(
  signature: string,
  timestamp: number
): WebhookHeaders {
  return {
    'x-signature-256': signature,
    'x-timestamp': timestamp.toString(),
    'content-type': 'application/json',
    'user-agent': 'QMA-SignalsHub-Webhook/1.0',
  };
}

/**
 * Create a webhook event payload
 * @param event - Event type (e.g., 'signal.created')
 * @param data - Event data
 * @returns Complete webhook payload
 */
export function createWebhookPayload(
  event: string,
  data: Record<string, unknown>
): WebhookPayload {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    event,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Webhook event types
 */
export const WebhookEvents = {
  SIGNAL_CREATED: 'signal.created',
  TRADE_OPENED: 'trade.opened',
  TRADE_CLOSED: 'trade.closed',
  TRADE_UPDATED: 'trade.updated',
  COPY_EXECUTED: 'copy.executed',
  COPY_FAILED: 'copy.failed',
} as const;

export type WebhookEvent = (typeof WebhookEvents)[keyof typeof WebhookEvents];
