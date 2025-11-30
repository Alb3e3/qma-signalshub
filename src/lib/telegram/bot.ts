/**
 * Telegram Bot Integration
 * Handles sending alerts to Telegram users/channels
 */

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage(message: TelegramMessage): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('Telegram bot token not configured');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data.description);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

/**
 * Format a signal alert for Telegram
 */
export function formatSignalAlert(signal: {
  pair: string;
  direction: 'long' | 'short';
  entry_price: number;
  stop_loss?: number;
  take_profit?: number;
  leverage?: number;
  provider_name: string;
}): string {
  const emoji = signal.direction === 'long' ? '🟢' : '🔴';
  const directionText = signal.direction.toUpperCase();

  let message = `${emoji} <b>NEW SIGNAL</b>\n\n`;
  message += `📊 <b>Pair:</b> ${signal.pair}\n`;
  message += `📈 <b>Direction:</b> ${directionText}\n`;
  message += `💰 <b>Entry:</b> $${signal.entry_price.toFixed(4)}\n`;

  if (signal.stop_loss) {
    message += `🛑 <b>Stop Loss:</b> $${signal.stop_loss.toFixed(4)}\n`;
  }

  if (signal.take_profit) {
    message += `🎯 <b>Take Profit:</b> $${signal.take_profit.toFixed(4)}\n`;
  }

  if (signal.leverage && signal.leverage > 1) {
    message += `⚡ <b>Leverage:</b> ${signal.leverage}x\n`;
  }

  message += `\n👤 <b>Provider:</b> ${signal.provider_name}`;
  message += `\n\n<i>via SignalsHub</i>`;

  return message;
}

/**
 * Format a trade closed alert for Telegram
 */
export function formatTradeClosedAlert(trade: {
  pair: string;
  direction: 'long' | 'short';
  pnl_percent: number;
  pnl_usd?: number;
  provider_name: string;
}): string {
  const isProfitable = trade.pnl_percent >= 0;
  const emoji = isProfitable ? '✅' : '❌';
  const pnlEmoji = isProfitable ? '📈' : '📉';

  let message = `${emoji} <b>TRADE CLOSED</b>\n\n`;
  message += `📊 <b>Pair:</b> ${trade.pair}\n`;
  message += `${pnlEmoji} <b>P/L:</b> ${isProfitable ? '+' : ''}${trade.pnl_percent.toFixed(2)}%`;

  if (trade.pnl_usd !== undefined) {
    message += ` ($${isProfitable ? '+' : ''}${trade.pnl_usd.toFixed(2)})`;
  }

  message += `\n\n👤 <b>Provider:</b> ${trade.provider_name}`;
  message += `\n\n<i>via SignalsHub</i>`;

  return message;
}

/**
 * Send a signal alert to a Telegram chat
 */
export async function sendSignalAlert(
  chatId: string | number,
  signal: {
    pair: string;
    direction: 'long' | 'short';
    entry_price: number;
    stop_loss?: number;
    take_profit?: number;
    leverage?: number;
    provider_name: string;
  }
): Promise<boolean> {
  const text = formatSignalAlert(signal);

  return sendTelegramMessage({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

/**
 * Send a trade closed alert to a Telegram chat
 */
export async function sendTradeClosedAlert(
  chatId: string | number,
  trade: {
    pair: string;
    direction: 'long' | 'short';
    pnl_percent: number;
    pnl_usd?: number;
    provider_name: string;
  }
): Promise<boolean> {
  const text = formatTradeClosedAlert(trade);

  return sendTelegramMessage({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });
}

/**
 * Send a custom message to a Telegram chat
 */
export async function sendCustomAlert(
  chatId: string | number,
  text: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
): Promise<boolean> {
  return sendTelegramMessage({
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  });
}

/**
 * Verify a Telegram chat ID is valid and bot can send messages
 */
export async function verifyChatId(chatId: string | number): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}${botToken}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId }),
    });

    const data: TelegramResponse = await response.json();
    return data.ok;
  } catch {
    return false;
  }
}
