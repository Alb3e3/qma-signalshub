# API Documentation

Complete reference for the QMA SignalsHub REST API.

## Base URL

```
Production: https://api.qma-signals.com/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All API requests require authentication via API key in the Authorization header:

```bash
Authorization: Bearer qma_live_xxxxxxxxxxxxxxxxxxxxx
```

### Getting an API Key

1. Log in to your dashboard
2. Navigate to **API Keys**
3. Click **Create New Key**
4. Copy the key (shown only once!)

### API Key Formats

| Environment | Format | Example |
|-------------|--------|---------|
| Production | `qma_live_*` | `qma_live_abc123def456...` |
| Test | `qma_test_*` | `qma_test_abc123def456...` |

## Rate Limits

| Tier | Requests/Minute | Burst |
|------|-----------------|-------|
| Free | N/A (no API access) | - |
| Pro | 100 | 20 |
| Copy | 100 | 20 |
| Enterprise | 1000 | 100 |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

## Response Format

All responses follow this structure:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "count": 10,
    "total": 100,
    "page": 1,
    "has_more": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or expired",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or expired |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | No permission for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### Signals

#### GET /signals/latest

Get the latest trading signals.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pair` | string | No | Filter by trading pair (e.g., "BTC/USDT") |
| `provider_id` | string | No | Filter by provider |
| `signal_type` | string | No | Filter by type: "long", "short", "close" |
| `limit` | number | No | Results per page (default: 20, max: 100) |
| `offset` | number | No | Pagination offset |

**Request:**

```bash
curl -X GET "https://api.qma-signals.com/api/v1/signals/latest?pair=BTC/USDT&limit=10" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
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
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "has_more": false
  }
}
```

#### GET /signals/history

Get historical signals.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pair` | string | No | Filter by trading pair |
| `provider_id` | string | No | Filter by provider |
| `from` | string | No | Start date (ISO 8601) |
| `to` | string | No | End date (ISO 8601) |
| `limit` | number | No | Results per page (default: 50, max: 500) |
| `offset` | number | No | Pagination offset |

**Request:**

```bash
curl -X GET "https://api.qma-signals.com/api/v1/signals/history?from=2024-01-01&limit=100" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

---

### Trades

#### GET /trades

Get provider trades (requires Copy tier or higher).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter: "open", "closed", "all" |
| `pair` | string | No | Filter by trading pair |
| `provider_id` | string | No | Filter by provider |
| `from` | string | No | Start date (ISO 8601) |
| `to` | string | No | End date (ISO 8601) |
| `limit` | number | No | Results per page (default: 50) |

**Request:**

```bash
curl -X GET "https://api.qma-signals.com/api/v1/trades?status=open" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "trade_abc123",
      "provider_id": "prov_xyz",
      "external_id": "12345678",
      "pair": "BTC/USDT",
      "side": "long",
      "entry_price": 67500.00,
      "current_price": 68200.00,
      "size": 0.1,
      "size_usdt": 6750.00,
      "leverage": 10,
      "stop_loss": 66000.00,
      "take_profit": 70000.00,
      "status": "open",
      "unrealized_pnl_usdt": 70.00,
      "unrealized_pnl_percent": 1.04,
      "opened_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "has_more": false
  }
}
```

#### GET /trades/:id

Get a single trade by ID.

**Request:**

```bash
curl -X GET "https://api.qma-signals.com/api/v1/trades/trade_abc123" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

---

### Webhooks

#### GET /webhooks

List your registered webhooks.

**Request:**

```bash
curl -X GET "https://api.qma-signals.com/api/v1/webhooks" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "wh_abc123",
      "url": "https://your-server.com/webhook",
      "events": ["signal.created", "trade.opened", "trade.closed"],
      "is_active": true,
      "failure_count": 0,
      "created_at": "2024-01-10T08:00:00Z"
    }
  ]
}
```

#### POST /webhooks

Register a new webhook.

**Request Body:**

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["signal.created", "trade.opened", "trade.closed"],
  "secret": "your_webhook_secret"
}
```

**Events:**

| Event | Description |
|-------|-------------|
| `signal.created` | New signal published |
| `trade.opened` | Provider opened a trade |
| `trade.closed` | Provider closed a trade |
| `trade.updated` | Trade SL/TP modified |
| `copy.executed` | Your copy trade executed |
| `copy.failed` | Copy trade failed |

**Request:**

```bash
curl -X POST "https://api.qma-signals.com/api/v1/webhooks" \
  -H "Authorization: Bearer qma_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["signal.created", "trade.opened"],
    "secret": "my_secret_key"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "wh_abc123",
    "url": "https://your-server.com/webhook",
    "events": ["signal.created", "trade.opened"],
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### DELETE /webhooks/:id

Delete a webhook.

```bash
curl -X DELETE "https://api.qma-signals.com/api/v1/webhooks/wh_abc123" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

#### POST /webhooks/:id/test

Send a test webhook.

```bash
curl -X POST "https://api.qma-signals.com/api/v1/webhooks/wh_abc123/test" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

---

### API Keys

#### GET /keys

List your API keys.

**Request:**

```bash
curl -X GET "https://api.qma-signals.com/api/v1/keys" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "key_abc123",
      "name": "Production Bot",
      "prefix": "qma_live_abc1",
      "scopes": ["signals:read", "trades:read"],
      "last_used_at": "2024-01-15T10:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /keys

Create a new API key.

**Request Body:**

```json
{
  "name": "Trading Bot",
  "scopes": ["signals:read", "trades:read", "webhooks:write"]
}
```

**Available Scopes:**

| Scope | Description |
|-------|-------------|
| `signals:read` | Read signals |
| `trades:read` | Read trades |
| `webhooks:read` | List webhooks |
| `webhooks:write` | Create/delete webhooks |
| `copy:read` | Read copy executions |
| `copy:write` | Modify copy settings |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "name": "Trading Bot",
    "key": "qma_live_abc123def456ghi789jkl012mno345",
    "prefix": "qma_live_abc1",
    "scopes": ["signals:read", "trades:read", "webhooks:write"],
    "created_at": "2024-01-15T10:00:00Z"
  },
  "message": "Store this key securely. It will not be shown again."
}
```

#### DELETE /keys/:id

Revoke an API key.

```bash
curl -X DELETE "https://api.qma-signals.com/api/v1/keys/key_abc123" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

---

### Copy Trading

#### GET /copy/settings

Get your copy trading settings.

```bash
curl -X GET "https://api.qma-signals.com/api/v1/copy/settings" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

#### PUT /copy/settings

Update copy trading settings.

**Request Body:**

```json
{
  "copy_mode": "fixed_percent",
  "size_percent": 2,
  "max_position_percent": 5,
  "max_concurrent_trades": 3,
  "max_daily_loss_percent": 10,
  "risk_multiplier": 1.0,
  "pairs_whitelist": ["BTC/USDT", "ETH/USDT"],
  "mirror_sl": true,
  "mirror_tp": true,
  "is_paused": false
}
```

#### GET /copy/executions

Get copy execution history.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: "success", "failed", "blocked" |
| `from` | string | Start date |
| `to` | string | End date |
| `limit` | number | Results per page |

```bash
curl -X GET "https://api.qma-signals.com/api/v1/copy/executions?status=success&limit=50" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

---

### Providers

#### GET /providers

List signal providers.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sort` | string | Sort by: "performance", "copiers", "newest" |
| `timeframe` | string | Performance timeframe: "7d", "30d", "90d", "all" |

```bash
curl -X GET "https://api.qma-signals.com/api/v1/providers?sort=performance&timeframe=30d" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

#### GET /providers/:id

Get provider details and performance.

```bash
curl -X GET "https://api.qma-signals.com/api/v1/providers/prov_abc123" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "prov_abc123",
    "display_name": "CryptoMaster",
    "bio": "Professional trader with 5+ years experience",
    "avatar_url": "https://...",
    "is_verified": true,
    "stats": {
      "total_trades": 150,
      "win_rate": 68.5,
      "avg_profit_percent": 2.3,
      "max_drawdown_percent": 12.5,
      "sharpe_ratio": 1.8,
      "total_copiers": 45,
      "total_aum_usdt": 125000
    },
    "performance": {
      "7d": 5.2,
      "30d": 18.7,
      "90d": 45.3,
      "all_time": 156.8
    }
  }
}
```

---

## Webhook Payloads

### Signature Verification

All webhooks include a signature header for verification:

```
X-Signature-256: sha256=xxxxxxxxxxxxxxxx
X-Timestamp: 1705312800
```

**Verify the signature:**

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### Payload Examples

#### signal.created

```json
{
  "event": "signal.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "sig_abc123",
    "provider_id": "prov_xyz",
    "pair": "BTC/USDT",
    "signal_type": "long",
    "entry_price": 67500.00,
    "stop_loss": 66000.00,
    "take_profit_1": 69000.00
  }
}
```

#### trade.opened

```json
{
  "event": "trade.opened",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "trade_abc123",
    "provider_id": "prov_xyz",
    "pair": "BTC/USDT",
    "side": "long",
    "entry_price": 67500.00,
    "size_usdt": 5000.00,
    "leverage": 10,
    "stop_loss": 66000.00,
    "take_profit": 70000.00
  }
}
```

#### trade.closed

```json
{
  "event": "trade.closed",
  "timestamp": "2024-01-15T12:30:00Z",
  "data": {
    "id": "trade_abc123",
    "provider_id": "prov_xyz",
    "pair": "BTC/USDT",
    "side": "long",
    "entry_price": 67500.00,
    "exit_price": 69000.00,
    "pnl_usdt": 222.22,
    "pnl_percent": 4.44,
    "duration_minutes": 120
  }
}
```

#### copy.executed

```json
{
  "event": "copy.executed",
  "timestamp": "2024-01-15T10:30:05Z",
  "data": {
    "execution_id": "exec_abc123",
    "trade_id": "trade_abc123",
    "action": "open",
    "pair": "BTC/USDT",
    "side": "long",
    "size_usdt": 100.00,
    "price": 67505.00,
    "status": "success"
  }
}
```

---

## SDKs & Libraries

### JavaScript/TypeScript

```bash
npm install @qma-signals/sdk
```

```typescript
import { QMAClient } from '@qma-signals/sdk';

const client = new QMAClient({
  apiKey: 'qma_live_xxxxx'
});

// Get latest signals
const signals = await client.signals.latest({ pair: 'BTC/USDT' });

// Subscribe to real-time signals
client.signals.subscribe((signal) => {
  console.log('New signal:', signal);
});
```

### Python

```bash
pip install qma-signals
```

```python
from qma_signals import QMAClient

client = QMAClient(api_key='qma_live_xxxxx')

# Get latest signals
signals = client.signals.latest(pair='BTC/USDT')

# Subscribe to real-time
for signal in client.signals.stream():
    print(f'New signal: {signal}')
```

---

## Support

- **Email**: api-support@qma-signals.com
- **Discord**: [#api-help channel](https://discord.gg/qma-signals)
- **Status Page**: [status.qma-signals.com](https://status.qma-signals.com)
