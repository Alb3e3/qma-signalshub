import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateWebhookSecret } from '@/lib/utils/webhook';

/**
 * GET /api/v1/webhooks
 * List all webhooks for the authenticated user
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('id, url, events, is_active, created_at, last_triggered_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }

  return NextResponse.json({ webhooks });
}

/**
 * POST /api/v1/webhooks
 * Create a new webhook endpoint
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = profile?.subscription_tier || 'free';

  if (tier === 'free') {
    return NextResponse.json(
      { error: 'Webhooks require a Pro subscription or higher' },
      { status: 403 }
    );
  }

  // Check webhook limits
  const { count } = await supabase
    .from('webhooks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);

  const webhookLimits: Record<string, number> = {
    pro: 3,
    copy: 5,
    enterprise: 20,
  };

  const limit = webhookLimits[tier] || 0;
  if ((count || 0) >= limit) {
    return NextResponse.json(
      { error: `Webhook limit reached. Your ${tier} plan allows ${limit} active webhooks.` },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, events = ['signal.new'] } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  // Validate events
  const validEvents = ['signal.new', 'signal.closed', 'trade.opened', 'trade.closed'];
  const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
  if (invalidEvents.length > 0) {
    return NextResponse.json(
      { error: `Invalid events: ${invalidEvents.join(', ')}. Valid: ${validEvents.join(', ')}` },
      { status: 400 }
    );
  }

  // Generate webhook secret
  const secret = generateWebhookSecret();

  const adminClient = createAdminClient();
  const { data: webhook, error } = await adminClient
    .from('webhooks')
    .insert({
      user_id: user.id,
      url,
      secret,
      events,
      is_active: true,
    })
    .select('id, url, events, is_active, created_at')
    .single();

  if (error) {
    console.error('Failed to create webhook:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }

  return NextResponse.json({
    webhook: {
      ...webhook,
      secret, // Only shown once
    },
    message: 'Store the secret securely. It will not be shown again.',
  }, { status: 201 });
}
