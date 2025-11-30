# QMA SignalsHub — Trading Signals Marketplace & Copy-Trading Platform

A comprehensive platform for distributing trading signals and enabling copy-trading. Signal providers can monetize their trading strategies while subscribers can follow trades automatically.

## Overview

QMA SignalsHub connects **Signal Providers** (master traders) with **Subscribers** (copiers). Providers connect their exchange wallets, and their trades are automatically broadcast to subscribers who can receive signals via API, webhooks, Telegram, or enable fully automated copy-trading.

Key features:
- **Real-time signal distribution** via REST API, WebSocket, and webhooks
- **Automated copy-trading** with customizable risk settings
- **Telegram bot integration** for instant alerts
- **Tiered subscription model** with Stripe billing
- **Public leaderboard** with verified performance metrics
- **Enterprise API access** for algorithmic traders

## Table of Contents

1. [Architecture](#architecture)
2. [Core Flows](#core-flows)
3. [Directory Structure](#directory-structure)
4. [Subscription Tiers](#subscription-tiers)
5. [API Reference](#api-reference)
6. [Copy-Trading Engine](#copy-trading-engine)
7. [Setup & Running Locally](#setup--running-locally)
8. [Database Schema](#database-schema)
9. [Security](#security)
10. [Deployment](#deployment)
11. [Related Documentation](#related-documentation)

## Architecture

```mermaid
flowchart TB
    subgraph Providers["Signal Providers"]
        FT[Freqtrade Bot]
        EW[Exchange Wallet<br/>Bitget/Binance]
        MS[Manual Signals]
    end

    subgraph Ingestion["Trade Ingestion Service"]
        TIS[Trade Ingestion<br/>Polls every 5-10s]
        SIS[Signal Ingestion<br/>KDE Levels]
    end

    subgraph Database["Supabase"]
        DB[(PostgreSQL)]
        RT[Realtime]
        AUTH[Auth]
    end

    subgraph Distribution["Distribution Layer"]
        API[REST API<br/>/api/v1/signals/*]
        WS[WebSocket<br/>Real-time stream]
        WH[Webhook<br/>Delivery]
        TG[Telegram Bot]
    end

    subgraph CopyEngine["Copy-Trade Engine"]
        CE[Copy Engine<br/>Position mirroring]
        RM[Risk Manager<br/>Size calculation]
    end

    subgraph Subscribers["Subscribers"]
        FREE[Free Tier<br/>15m delayed]
        PRO[Pro Tier<br/>Real-time]
        COPY[Copy Tier<br/>Auto-trading]
        ENT[Enterprise<br/>Full API]
    end

    FT --> SIS
    EW --> TIS
    MS --> TIS

    TIS --> DB
    SIS --> DB

    DB --> RT
    RT --> WS
    DB --> API
    DB --> WH
    DB --> TG

    DB --> CE
    CE --> RM
    RM --> |Execute trades| EW

    API --> FREE & PRO & COPY & ENT
    WS --> PRO & COPY & ENT
    WH --> PRO & COPY & ENT
    TG --> PRO & COPY
    CE --> COPY
```

## Core Flows

### Signal Provider Flow

```mermaid
sequenceDiagram
    participant Provider as Provider Wallet
    participant Ingestion as Trade Ingestion
    participant DB as Supabase
    participant Notify as Notification Service
    participant Copiers as Copy Engine

    Provider->>Provider: Opens trade on exchange

    loop Every 5 seconds
        Ingestion->>Provider: Poll positions via API
        Provider-->>Ingestion: Current positions
        Ingestion->>Ingestion: Detect new/changed positions
    end

    Ingestion->>DB: Store new trade
    DB->>DB: Trigger realtime event

    par Notify Subscribers
        DB->>Notify: New trade event
        Notify->>Notify: Send webhooks
        Notify->>Notify: Send Telegram alerts
        Notify->>Notify: Push to WebSocket
    and Execute Copy Trades
        DB->>Copiers: New trade to copy
        Copiers->>Copiers: Get subscriber settings
        Copiers->>Copiers: Calculate position size
        Copiers->>Provider: Execute on subscriber wallet
    end
```

### Copy-Trading Flow

```mermaid
sequenceDiagram
    participant PT as Provider Trade
    participant CE as Copy Engine
    participant CS as Copy Settings
    participant RM as Risk Manager
    participant SW as Subscriber Wallet
    participant DB as Database

    PT->>CE: New trade detected
    CE->>DB: Get all active copiers for provider

    loop For each copier
        CE->>CS: Load copy settings
        CS-->>CE: {mode, sizePercent, maxRisk, whitelist}

        CE->>RM: Calculate position size
        RM->>RM: Check balance
        RM->>RM: Apply risk limits
        RM->>RM: Check daily loss limit
        RM-->>CE: Approved size or BLOCKED

        alt Trade Approved
            CE->>SW: Execute trade via exchange API
            SW-->>CE: Order result
            CE->>DB: Log copy_execution (success)
            CE->>CE: Notify subscriber
        else Trade Blocked
            CE->>DB: Log copy_execution (blocked, reason)
            CE->>CE: Notify subscriber of skip
        end
    end
```

### Webhook Delivery Flow

```mermaid
sequenceDiagram
    participant Signal as New Signal
    participant WD as Webhook Delivery
    participant DB as Database
    participant Sub as Subscriber Endpoint

    Signal->>WD: Signal created
    WD->>DB: Get active webhooks for signal type

    loop For each webhook
        WD->>WD: Sign payload (HMAC-SHA256)
        WD->>Sub: POST with signature header

        alt Success (2xx)
            Sub-->>WD: 200 OK
            WD->>DB: Log delivery (success)
            WD->>DB: Reset failure_count
        else Failure
            Sub-->>WD: Error/Timeout
            WD->>DB: Increment failure_count

            alt failure_count < 3
                WD->>WD: Schedule retry (exponential backoff)
            else failure_count >= 3
                WD->>DB: Deactivate webhook
                WD->>WD: Notify user webhook disabled
            end
        end
    end
```

## Directory Structure

```
qma-signalshub/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── signals/
│   │   │   │   ├── latest/route.ts       # GET latest signals
│   │   │   │   ├── history/route.ts      # GET historical signals
│   │   │   │   └── stream/route.ts       # WebSocket stream
│   │   │   ├── trades/
│   │   │   │   ├── route.ts              # GET provider trades
│   │   │   │   └── [id]/route.ts         # GET single trade
│   │   │   ├── webhooks/
│   │   │   │   ├── route.ts              # CRUD webhooks
│   │   │   │   └── test/route.ts         # Test webhook
│   │   │   ├── keys/
│   │   │   │   └── route.ts              # API key management
│   │   │   └── copy/
│   │   │       ├── settings/route.ts     # Copy settings
│   │   │       └── executions/route.ts   # Copy execution log
│   │   ├── auth/
│   │   │   ├── callback/route.ts         # OAuth callback
│   │   │   └── [...supabase]/route.ts    # Supabase auth
│   │   ├── stripe/
│   │   │   └── webhook/route.ts          # Stripe webhooks
│   │   ├── telegram/
│   │   │   └── webhook/route.ts          # Telegram bot webhook
│   │   └── cron/
│   │       ├── ingest-trades/route.ts    # Trade polling cron
│   │       └── ingest-signals/route.ts   # Signal polling cron
│   ├── (public)/
│   │   ├── page.tsx                      # Landing page
│   │   ├── leaderboard/page.tsx          # Public leaderboard
│   │   ├── pricing/page.tsx              # Pricing page
│   │   ├── providers/[id]/page.tsx       # Provider profile
│   │   └── docs/
│   │       ├── page.tsx                  # API documentation
│   │       └── [...slug]/page.tsx        # Doc pages
│   ├── (protected)/
│   │   ├── layout.tsx                    # Auth wrapper
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  # Main dashboard
│   │   │   ├── signals/page.tsx          # Live signals view
│   │   │   └── analytics/page.tsx        # Performance analytics
│   │   ├── api-keys/page.tsx             # Manage API keys
│   │   ├── webhooks/page.tsx             # Manage webhooks
│   │   ├── copy-trading/
│   │   │   ├── page.tsx                  # Copy trading setup
│   │   │   ├── settings/page.tsx         # Copy settings
│   │   │   └── history/page.tsx          # Execution history
│   │   ├── wallet/page.tsx               # Connected wallets
│   │   ├── billing/page.tsx              # Subscription management
│   │   └── provider/
│   │       ├── page.tsx                  # Provider dashboard
│   │       ├── setup/page.tsx            # Become a provider
│   │       └── earnings/page.tsx         # Earnings & payouts
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/page.tsx
│   └── layout.tsx
├── src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                 # Browser client
│   │   │   ├── server.ts                 # Server client
│   │   │   ├── middleware.ts             # Auth middleware
│   │   │   └── types.ts                  # Generated types
│   │   ├── stripe/
│   │   │   ├── client.ts                 # Stripe client
│   │   │   ├── products.ts               # Product/price config
│   │   │   └── webhooks.ts               # Webhook handlers
│   │   ├── exchanges/
│   │   │   ├── bitget/
│   │   │   │   ├── client.ts             # Bitget API client
│   │   │   │   ├── types.ts              # Bitget types
│   │   │   │   └── signer.ts             # HMAC signing
│   │   │   └── types.ts                  # Common exchange types
│   │   ├── telegram/
│   │   │   ├── bot.ts                    # Telegram bot
│   │   │   └── commands.ts               # Bot commands
│   │   ├── freqtrade/
│   │   │   └── client.ts                 # Freqtrade client (from QMA-webapp)
│   │   └── utils/
│   │       ├── crypto.ts                 # Encryption helpers
│   │       ├── apiKey.ts                 # API key generation
│   │       └── webhook.ts                # Webhook signing
│   ├── services/
│   │   ├── tradeIngestion.ts             # Poll & detect trades
│   │   ├── signalIngestion.ts            # Poll & detect signals
│   │   ├── copyEngine.ts                 # Copy-trade execution
│   │   ├── webhookDelivery.ts            # Webhook dispatch
│   │   ├── performanceTracker.ts         # Calculate stats
│   │   └── notificationService.ts        # Unified notifications
│   ├── stores/
│   │   ├── userStore.ts                  # User state (Zustand)
│   │   └── signalStore.ts                # Signal state
│   ├── types/
│   │   ├── database.ts                   # Supabase generated
│   │   ├── signals.ts                    # Signal types
│   │   ├── trades.ts                     # Trade types
│   │   ├── copy.ts                       # Copy-trading types
│   │   └── api.ts                        # API request/response
│   ├── components/
│   │   ├── ui/                           # Radix UI components
│   │   ├── dashboard/                    # Dashboard components
│   │   ├── signals/                      # Signal display
│   │   ├── copy-trading/                 # Copy-trading UI
│   │   ├── leaderboard/                  # Leaderboard components
│   │   └── providers/                    # Provider components
│   └── env.ts                            # Environment validation
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql        # Database schema
│   ├── functions/                        # Edge functions (optional)
│   └── config.toml                       # Supabase config
├── docs/
│   ├── API.md                            # API documentation
│   ├── COPY_TRADING.md                   # Copy-trading guide
│   ├── WEBHOOKS.md                       # Webhook integration
│   └── TELEGRAM.md                       # Telegram bot setup
├── .env.example                          # Environment template
├── .env.local                            # Local environment (gitignored)
├── middleware.ts                         # Next.js middleware
├── package.json
└── tsconfig.json
```

## Subscription Tiers

| Feature | Free | Pro ($49/mo) | Copy ($99/mo) | Enterprise ($199/mo) |
|---------|------|--------------|---------------|----------------------|
| Signal Access | 15min delayed | Real-time | Real-time | Real-time |
| Web Dashboard | Yes | Yes | Yes | Yes |
| Telegram Alerts | No | Yes | Yes | Yes |
| Webhook Endpoints | No | 1 | 3 | Unlimited |
| API Access | No | Yes | Yes | Yes |
| Rate Limit | - | 100/min | 100/min | 1000/min |
| Historical Data | 7 days | 30 days | 90 days | Unlimited |
| Copy-Trading | No | No | Yes | Yes |
| Max Copy Amount | - | - | $10,000 | Unlimited |
| Priority Support | No | No | Yes | Yes |
| Custom Integration | No | No | No | Yes |

## API Reference

### Authentication

All API requests require an API key in the header:

```bash
Authorization: Bearer qma_live_xxxxxxxxxxxxx
```

### Endpoints

#### GET /api/v1/signals/latest

Get the latest signals.

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
      "pair": "BTC/USDT",
      "signal_type": "long",
      "entry_price": 67500.00,
      "stop_loss": 66000.00,
      "take_profit_1": 69000.00,
      "take_profit_2": 71000.00,
      "take_profit_3": 73000.00,
      "confidence": 85.5,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "has_more": false
  }
}
```

#### GET /api/v1/trades

Get provider trades (for copy-trading subscribers).

```bash
curl -X GET "https://api.qma-signals.com/api/v1/trades?status=open" \
  -H "Authorization: Bearer qma_live_xxxxx"
```

#### POST /api/v1/webhooks

Register a webhook endpoint.

```bash
curl -X POST "https://api.qma-signals.com/api/v1/webhooks" \
  -H "Authorization: Bearer qma_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "events": ["signal.created", "trade.opened", "trade.closed"],
    "secret": "your_webhook_secret"
  }'
```

See [API.md](docs/API.md) for complete API documentation.

## Copy-Trading Engine

The copy-trading engine automatically mirrors provider trades on subscriber wallets.

### Copy Modes

| Mode | Description |
|------|-------------|
| **Proportional** | Same % of balance as provider (e.g., provider uses 5% → you use 5%) |
| **Fixed Percent** | Always use X% of your balance per trade |
| **Fixed Size** | Always use $X per trade |

### Risk Controls

- **Max position size**: Limit % of balance per trade
- **Max concurrent trades**: Limit open positions
- **Daily loss limit**: Pause copying if daily loss exceeds X%
- **Pair whitelist/blacklist**: Only copy specific pairs
- **Risk multiplier**: Scale position size (0.5x - 2x)

### Safety Features

- **Instant pause**: One-click to stop all copy-trading
- **Manual override**: Close any position manually
- **Execution logging**: Full audit trail of all copied trades
- **Failure notifications**: Instant alerts if copy fails

See [COPY_TRADING.md](docs/COPY_TRADING.md) for detailed documentation.

## Setup & Running Locally

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account (free tier works)
- Stripe account (for billing)
- Bitget API credentials (for copy-trading)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/qma-signalshub.git
cd qma-signalshub

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxx

# Freqtrade (optional - for signal ingestion)
FREQTRADE_API_URL=https://your-bot.ts.net
FREQTRADE_USERNAME=freqtrader
FREQTRADE_PASSWORD=xxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-xxxxx
TELEGRAM_WEBHOOK_SECRET=xxxxx

# Encryption
ENCRYPTION_KEY=32-byte-hex-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Setup

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Run migrations
npx supabase db push
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema

See [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) for the complete schema.

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends Supabase auth) |
| `providers` | Signal provider accounts |
| `provider_wallets` | Provider exchange connections |
| `trades` | Trades from provider wallets |
| `signals` | KDE/technical signals |
| `subscriptions` | User subscriptions to providers |
| `subscriber_wallets` | Subscriber exchange connections |
| `copy_settings` | Per-subscription copy configuration |
| `copy_executions` | Audit log of copied trades |
| `api_keys` | User API keys |
| `webhooks` | Registered webhook endpoints |
| `webhook_deliveries` | Webhook delivery log |
| `performance_daily` | Daily performance snapshots |

## Security

### API Key Security

- Keys are hashed (SHA-256) before storage
- Only the prefix is stored for identification
- Keys shown once at creation, never again

### Exchange Credential Security

- Encrypted at rest using AES-256
- Encryption key stored in environment variable
- Never exposed to frontend
- All exchange calls are server-side only

### Webhook Security

- Payloads signed with HMAC-SHA256
- Signature included in `X-Signature-256` header
- Timestamp included to prevent replay attacks

See [SECURITY.md](docs/SECURITY.md) for complete security documentation.

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables on Vercel

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.example`
3. Redeploy

### Cron Jobs

Set up Vercel Cron for trade ingestion:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/ingest-trades",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/cron/ingest-signals",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide.

## Related Documentation

- [API.md](docs/API.md) - Complete API reference
- [COPY_TRADING.md](docs/COPY_TRADING.md) - Copy-trading setup and configuration
- [WEBHOOKS.md](docs/WEBHOOKS.md) - Webhook integration guide
- [TELEGRAM.md](docs/TELEGRAM.md) - Telegram bot commands
- [SECURITY.md](docs/SECURITY.md) - Security implementation details
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment guide

## License

MIT

---

**Need Help?**

- Documentation: [docs.qma-signals.com](https://docs.qma-signals.com)
- GitHub Issues: [github.com/your-username/qma-signalshub/issues](https://github.com/your-username/qma-signalshub/issues)
- Email: support@qma-signals.com
