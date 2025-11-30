# Webhook Integration Guide

This guide covers how to set up and integrate with QMA SignalsHub webhooks.

## Overview

Webhooks allow you to receive real-time notifications when events occur in the system. Instead of polling for updates, your server receives HTTP POST requests whenever signals are created, trades are opened/closed, or copy trades are executed.

## Quick Start

### 1. Create a Webhook Endpoint

Create an HTTPS endpoint on your server to receive webhook events:

```javascript
// Express.js example
app.post('/webhooks/qma-signals', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-signature-256'];
  const timestamp = req.headers['x-timestamp'];

  // Verify signature
  if (!verifySignature(req.body, signature, timestamp)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  console.log('Received event:', event.event);

  // Process the event
  handleEvent(event);

  res.status(200).send('OK');
});
```

### 2. Register Your Webhook

Via API:
```bash
curl -X POST "https://api.qma-signals.com/api/v1/webhooks" \
  -H "Authorization: Bearer qma_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/qma-signals",
    "events": ["signal.created", "trade.opened", "trade.closed"],
    "secret": "your_strong_secret_here"
  }'
```

Via Dashboard:
1. Go to **Webhooks** in the sidebar
2. Click **Add Webhook**
3. Enter your endpoint URL
4. Select events to subscribe to
5. Enter a secret for signature verification
6. Click **Create**

### 3. Test Your Webhook

Send a test event to verify everything works:

```bash
curl -X POST "https://api.qma-signals.com/api/v1/webhooks/wh_xxx/test" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

## Available Events

### Signal Events

| Event | Description |
|-------|-------------|
| `signal.created` | New trading signal published |

### Trade Events

| Event | Description |
|-------|-------------|
| `trade.opened` | Provider opened a new position |
| `trade.closed` | Provider closed a position |
| `trade.updated` | Trade SL/TP was modified |

### Copy Events

| Event | Description |
|-------|-------------|
| `copy.executed` | Your copy trade was executed |
| `copy.failed` | Copy trade failed to execute |

## Webhook Payloads

### Common Structure

All webhook payloads follow this structure:

```json
{
  "id": "evt_xxxxxxxxxx",
  "event": "event.type",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    // Event-specific data
  }
}
```

### signal.created

```json
{
  "id": "evt_sig123",
  "event": "signal.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "sig_abc123",
    "provider_id": "prov_xyz",
    "provider_name": "CryptoMaster",
    "pair": "BTC/USDT",
    "timeframe": "1h",
    "signal_type": "long",
    "entry_price": 67500.00,
    "stop_loss": 66000.00,
    "take_profit_1": 69000.00,
    "take_profit_2": 71000.00,
    "take_profit_3": 73000.00,
    "confidence": 85.5,
    "kde_levels": {
      "resistances": [68500, 70000, 72000],
      "supports": [66000, 64500, 63000]
    }
  }
}
```

### trade.opened

```json
{
  "id": "evt_trade123",
  "event": "trade.opened",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "trade_abc123",
    "provider_id": "prov_xyz",
    "provider_name": "CryptoMaster",
    "external_id": "12345678",
    "pair": "BTC/USDT",
    "side": "long",
    "entry_price": 67500.00,
    "size": 0.1,
    "size_usdt": 6750.00,
    "leverage": 10,
    "stop_loss": 66000.00,
    "take_profit": 70000.00
  }
}
```

### trade.closed

```json
{
  "id": "evt_trade124",
  "event": "trade.closed",
  "timestamp": "2024-01-15T12:30:00Z",
  "data": {
    "id": "trade_abc123",
    "provider_id": "prov_xyz",
    "provider_name": "CryptoMaster",
    "pair": "BTC/USDT",
    "side": "long",
    "entry_price": 67500.00,
    "exit_price": 69000.00,
    "size": 0.1,
    "size_usdt": 6750.00,
    "pnl_usdt": 150.00,
    "pnl_percent": 2.22,
    "duration_minutes": 120,
    "result": "win"
  }
}
```

### trade.updated

```json
{
  "id": "evt_trade125",
  "event": "trade.updated",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "id": "trade_abc123",
    "pair": "BTC/USDT",
    "changes": {
      "stop_loss": {
        "old": 66000.00,
        "new": 67000.00
      },
      "take_profit": {
        "old": 70000.00,
        "new": 71000.00
      }
    }
  }
}
```

### copy.executed

```json
{
  "id": "evt_copy123",
  "event": "copy.executed",
  "timestamp": "2024-01-15T10:30:05Z",
  "data": {
    "execution_id": "exec_abc123",
    "trade_id": "trade_abc123",
    "provider_name": "CryptoMaster",
    "action": "open",
    "pair": "BTC/USDT",
    "side": "long",
    "size": 0.01,
    "size_usdt": 675.00,
    "price": 67505.00,
    "leverage": 10,
    "status": "success",
    "exchange_order_id": "987654321"
  }
}
```

### copy.failed

```json
{
  "id": "evt_copy124",
  "event": "copy.failed",
  "timestamp": "2024-01-15T10:30:05Z",
  "data": {
    "execution_id": "exec_abc124",
    "trade_id": "trade_abc123",
    "action": "open",
    "pair": "BTC/USDT",
    "status": "failed",
    "error_code": "INSUFFICIENT_BALANCE",
    "error_message": "Not enough margin to open position"
  }
}
```

## Signature Verification

All webhooks are signed to ensure they're from QMA SignalsHub.

### Headers

```
X-Signature-256: sha256=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X-Timestamp: 1705312800
```

### Verification Code

#### Node.js

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, timestamp, secret) {
  // Check timestamp is recent (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);
  if (Math.abs(now - webhookTime) > 300) {
    return false; // Possible replay attack
  }

  // Compute expected signature
  const message = `${timestamp}.${payload}`;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  // Compare using timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

#### Python

```python
import hmac
import hashlib
import time

def verify_webhook_signature(payload: bytes, signature: str, timestamp: str, secret: str) -> bool:
    # Check timestamp is recent
    now = int(time.time())
    webhook_time = int(timestamp)
    if abs(now - webhook_time) > 300:
        return False

    # Compute expected signature
    message = f"{timestamp}.{payload.decode('utf-8')}"
    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Timing-safe comparison
    return hmac.compare_digest(signature, expected)
```

#### PHP

```php
function verifyWebhookSignature($payload, $signature, $timestamp, $secret) {
    // Check timestamp
    $now = time();
    if (abs($now - (int)$timestamp) > 300) {
        return false;
    }

    // Compute expected signature
    $message = $timestamp . '.' . $payload;
    $expected = 'sha256=' . hash_hmac('sha256', $message, $secret);

    return hash_equals($expected, $signature);
}
```

#### Go

```go
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "math"
    "strconv"
    "time"
)

func verifyWebhookSignature(payload, signature, timestamp, secret string) bool {
    // Check timestamp
    now := time.Now().Unix()
    webhookTime, _ := strconv.ParseInt(timestamp, 10, 64)
    if math.Abs(float64(now-webhookTime)) > 300 {
        return false
    }

    // Compute expected signature
    message := fmt.Sprintf("%s.%s", timestamp, payload)
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(message))
    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))

    return hmac.Equal([]byte(expected), []byte(signature))
}
```

## Retry Policy

If your endpoint fails to respond with a 2xx status code, we will retry:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |

After 5 failed attempts, the webhook is marked as **failed** and disabled.

### Failure Handling

- **Timeouts**: 30 second timeout per request
- **Non-2xx response**: Counts as failure
- **Connection errors**: Counts as failure

### Re-enabling a Failed Webhook

Via Dashboard:
1. Go to **Webhooks**
2. Find the disabled webhook
3. Click **Re-enable**
4. Test to verify it's working

Via API:
```bash
curl -X PATCH "https://api.qma-signals.com/api/v1/webhooks/wh_xxx" \
  -H "Authorization: Bearer qma_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}'
```

## Best Practices

### 1. Respond Quickly

Return a 200 response immediately, then process the event asynchronously:

```javascript
app.post('/webhook', (req, res) => {
  // Verify signature first
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid');
  }

  // Respond immediately
  res.status(200).send('OK');

  // Process asynchronously
  processEventAsync(req.body);
});
```

### 2. Handle Duplicate Events

Webhooks may be delivered more than once. Use the event `id` to deduplicate:

```javascript
const processedEvents = new Set();

function handleEvent(event) {
  if (processedEvents.has(event.id)) {
    return; // Already processed
  }

  processedEvents.add(event.id);
  // Process the event...
}
```

### 3. Use HTTPS

We only send webhooks to HTTPS endpoints. Ensure your SSL certificate is valid.

### 4. Log Everything

Log all received webhooks for debugging:

```javascript
app.post('/webhook', (req, res) => {
  console.log({
    timestamp: new Date().toISOString(),
    event: req.body.event,
    id: req.body.id,
    headers: req.headers
  });

  // ...
});
```

### 5. Monitor Failures

Set up alerts for:
- Failed signature verification
- Processing errors
- High latency

## Testing Webhooks

### Local Development

Use a tunnel service like ngrok to expose your local server:

```bash
# Start your local server
npm run dev

# In another terminal, start ngrok
ngrok http 3000
```

Use the ngrok URL when registering your webhook.

### Test Events

Send test events from the dashboard or API:

```bash
curl -X POST "https://api.qma-signals.com/api/v1/webhooks/wh_xxx/test" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

Test events have `"test": true` in the payload.

### Webhook Playground

Use our webhook playground to:
- View recent deliveries
- See request/response details
- Retry failed deliveries
- Send test events

Access at: Dashboard → Webhooks → [Your Webhook] → Deliveries

## Troubleshooting

### Not Receiving Webhooks

1. **Check webhook is active**: Dashboard → Webhooks → Status
2. **Verify URL is correct**: Must be HTTPS and publicly accessible
3. **Check server logs**: Look for incoming requests
4. **Test the endpoint**: Use curl to send a test POST
5. **Check firewall**: Ensure incoming connections are allowed

### Invalid Signature Errors

1. **Check secret**: Must match exactly what you provided
2. **Check encoding**: Secret should be the raw string, not encoded
3. **Check payload**: Use the raw body, not parsed JSON
4. **Check timestamp**: Must be in seconds, not milliseconds

### Webhook Disabled

1. **View failure reason**: Dashboard → Webhooks → [Webhook] → Errors
2. **Fix the issue**: Timeout, invalid response, server error
3. **Re-enable**: Click "Re-enable" and test

## Rate Limits

| Tier | Webhooks Allowed | Events/Minute |
|------|------------------|---------------|
| Free | 0 | 0 |
| Pro | 1 | 100 |
| Copy | 3 | 300 |
| Enterprise | Unlimited | 1000 |

---

## Example Implementations

### Trading Bot Integration

```javascript
// Automatically execute trades based on signals
app.post('/webhook', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid');
  }

  res.status(200).send('OK');

  const event = req.body;

  if (event.event === 'signal.created') {
    const signal = event.data;

    // Execute on your exchange
    await myExchange.createOrder({
      symbol: signal.pair,
      side: signal.signal_type === 'long' ? 'buy' : 'sell',
      type: 'limit',
      price: signal.entry_price,
      amount: calculatePositionSize(signal)
    });

    console.log(`Placed ${signal.signal_type} order for ${signal.pair}`);
  }
});
```

### Telegram Notification Bot

```javascript
// Send Telegram notifications for new signals
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

app.post('/webhook', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid');
  }

  res.status(200).send('OK');

  const event = req.body;

  if (event.event === 'signal.created') {
    const { pair, signal_type, entry_price, stop_loss, take_profit_1 } = event.data;

    const message = `
🚨 *New Signal*

📊 *${pair}*
📈 Type: ${signal_type.toUpperCase()}
💰 Entry: $${entry_price}
🛑 Stop Loss: $${stop_loss}
🎯 Take Profit: $${take_profit_1}
    `;

    await bot.sendMessage(process.env.CHAT_ID, message, { parse_mode: 'Markdown' });
  }
});
```

---

**Need help?** Contact support@qma-signals.com
