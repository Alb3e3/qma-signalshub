import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyChatId, sendCustomAlert } from '@/lib/telegram/bot';

/**
 * GET /api/v1/telegram
 * Get user's Telegram notification settings
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_chat_id, telegram_notifications_enabled')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    chat_id: profile?.telegram_chat_id || null,
    notifications_enabled: profile?.telegram_notifications_enabled || false,
  });
}

/**
 * POST /api/v1/telegram
 * Connect or update Telegram notifications
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

  if (!['pro', 'copy', 'enterprise'].includes(tier)) {
    return NextResponse.json(
      { error: 'Telegram notifications require a Pro subscription or higher' },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { chat_id, notifications_enabled = true } = body;

  if (!chat_id) {
    return NextResponse.json({ error: 'chat_id is required' }, { status: 400 });
  }

  // Verify chat ID is valid
  const isValid = await verifyChatId(chat_id);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid chat ID. Make sure you have started a conversation with the bot.' },
      { status: 400 }
    );
  }

  // Update profile
  const adminClient = createAdminClient();
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({
      telegram_chat_id: chat_id.toString(),
      telegram_notifications_enabled: notifications_enabled,
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  // Send confirmation message
  await sendCustomAlert(
    chat_id,
    '✅ <b>SignalsHub Connected!</b>\n\nYou will now receive trading signal alerts here.',
    'HTML'
  );

  return NextResponse.json({
    message: 'Telegram notifications enabled',
    chat_id: chat_id.toString(),
    notifications_enabled,
  });
}

/**
 * DELETE /api/v1/telegram
 * Disable Telegram notifications
 */
export async function DELETE() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  await adminClient
    .from('profiles')
    .update({
      telegram_notifications_enabled: false,
    })
    .eq('id', user.id);

  return NextResponse.json({ message: 'Telegram notifications disabled' });
}
