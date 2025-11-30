import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/v1/* (public API routes - authenticated via API key)
     * - api/stripe/webhook (Stripe webhook)
     * - api/telegram/webhook (Telegram webhook)
     * - api/cron/* (Cron jobs)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/v1|api/stripe/webhook|api/telegram/webhook|api/cron).*)',
  ],
};
