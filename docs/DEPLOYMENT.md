# Deployment Guide

Complete guide for deploying QMA SignalsHub to production.

## Prerequisites

Before deploying, ensure you have:

- [ ] Node.js 20+ installed locally
- [ ] Vercel account (recommended) or other hosting
- [ ] Supabase project created
- [ ] Stripe account (for billing)
- [ ] Domain name (optional but recommended)

## Environment Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and keys:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### 3. Configure Stripe

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Get your API keys:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Set up webhook endpoint (after deployment):
   - `STRIPE_WEBHOOK_SECRET`

### 4. Generate Encryption Key

Generate a 32-byte hex key for credential encryption:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this as `ENCRYPTION_KEY`.

## Deployment Options

### Option 1: Vercel (Recommended)

#### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/qma-signalshub)

#### Manual Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# For production
vercel --prod
```

#### Environment Variables

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxx

# Freqtrade (optional)
FREQTRADE_API_URL=https://your-bot.ts.net
FREQTRADE_USERNAME=freqtrader
FREQTRADE_PASSWORD=xxxxx

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-xxxxx

# Security
ENCRYPTION_KEY=your-32-byte-hex-key

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

#### Cron Jobs

Create `vercel.json` for scheduled tasks:

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest-trades",
      "schedule": "*/1 * * * *"
    },
    {
      "path": "/api/cron/ingest-signals",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/performance-snapshot",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Option 2: Docker

#### Dockerfile

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    restart: unless-stopped

  # Optional: Redis for caching/rate limiting
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

#### Deploy

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f web
```

### Option 3: Railway

1. Connect your GitHub repository
2. Add environment variables
3. Deploy automatically on push

### Option 4: Self-Hosted (PM2)

```bash
# Build
npm run build

# Install PM2
npm install -g pm2

# Start with PM2
pm2 start npm --name "qma-signals" -- start

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

## Post-Deployment Setup

### 1. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### 2. Configure Telegram Bot

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get the bot token
3. Set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

### 3. Set Up Custom Domain

#### Vercel

1. Go to Project → Settings → Domains
2. Add your domain
3. Configure DNS:
   - A record: `76.76.21.21`
   - Or CNAME: `cname.vercel-dns.com`

#### Cloudflare (recommended)

1. Add your domain to Cloudflare
2. Update nameservers at your registrar
3. Configure DNS to point to Vercel
4. Enable SSL/TLS (Full strict)

### 4. Enable Row Level Security

Run in Supabase SQL editor:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
```

## Monitoring

### Vercel Analytics

Enable in `next.config.js`:

```javascript
module.exports = {
  // ...
  experimental: {
    webVitals: true
  }
};
```

### Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
```

Configure `sentry.client.config.js`:

```javascript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Uptime Monitoring

Use services like:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://pingdom.com)
- [Better Uptime](https://betterstack.com/better-uptime)

Monitor these endpoints:
- `https://your-domain.com/api/health`
- `https://your-domain.com/api/v1/signals/latest`

## Scaling

### Database

Supabase auto-scales, but for high traffic:

1. Enable connection pooling
2. Add read replicas (Pro plan)
3. Optimize queries with indexes

### Serverless Functions

Vercel auto-scales, but watch for:
- Cold start times
- Execution duration limits (10s hobby, 60s pro)
- Memory limits

### Caching

Add Redis for:
- Rate limiting
- Session storage
- API response caching

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});
```

## Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables
- [ ] No secrets in code or commits
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] RLS policies enabled

### Post-Deployment

- [ ] Verify HTTPS is working
- [ ] Test webhook signatures
- [ ] Verify API authentication
- [ ] Check RLS is enforced
- [ ] Test rate limiting

## Rollback

### Vercel

1. Go to Deployments
2. Find the previous working deployment
3. Click "..." → "Promote to Production"

### Docker

```bash
# List images
docker images

# Run previous version
docker run -d your-app:previous-tag
```

### Database

```bash
# Supabase migrations can be rolled back
supabase db reset
```

## Troubleshooting

### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Environment Variables Not Working

1. Check variable names match exactly
2. Restart the deployment
3. Check if `NEXT_PUBLIC_` prefix is needed for client-side

### Database Connection Issues

1. Check Supabase is running
2. Verify connection string
3. Check RLS policies aren't blocking

### Cron Jobs Not Running

1. Verify `vercel.json` is correct
2. Check Vercel project has cron enabled (Pro plan)
3. Check function logs for errors

## Cost Optimization

### Vercel

| Plan | Cost | Best For |
|------|------|----------|
| Hobby | Free | Development |
| Pro | $20/mo | Small production |
| Enterprise | Custom | High traffic |

### Supabase

| Plan | Cost | Best For |
|------|------|----------|
| Free | $0 | Development |
| Pro | $25/mo | Small production |
| Team | $599/mo | Large teams |

### Tips

1. Use edge functions for latency-sensitive endpoints
2. Enable caching where possible
3. Optimize images and assets
4. Use serverless functions efficiently

---

## Support

- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **Supabase**: [supabase.com/support](https://supabase.com/support)
- **Project Issues**: [GitHub Issues](https://github.com/your-username/qma-signalshub/issues)
