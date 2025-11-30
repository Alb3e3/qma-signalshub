import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/webhooks/[id]
 * Get a specific webhook
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .select('id, url, events, is_active, created_at, last_triggered_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  // Get recent delivery attempts
  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select('id, event_type, status_code, success, created_at')
    .eq('webhook_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    webhook,
    recent_deliveries: deliveries || [],
  });
}

/**
 * PATCH /api/v1/webhooks/[id]
 * Update a webhook
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, events, is_active } = body;

  const updates: Record<string, unknown> = {};

  if (url !== undefined) {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
      updates.url = url;
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
  }

  if (events !== undefined) {
    const validEvents = ['signal.new', 'signal.closed', 'trade.opened', 'trade.closed'];
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Events must be an array' }, { status: 400 });
    }
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(', ')}` }, { status: 400 });
    }
    updates.events = events;
  }

  if (is_active !== undefined) {
    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active must be a boolean' }, { status: 400 });
    }
    updates.is_active = is_active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, url, events, is_active, created_at, last_triggered_at')
    .single();

  if (error || !webhook) {
    return NextResponse.json({ error: 'Webhook not found or update failed' }, { status: 404 });
  }

  return NextResponse.json({ webhook });
}

/**
 * DELETE /api/v1/webhooks/[id]
 * Delete a webhook
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Webhook deleted successfully' });
}
