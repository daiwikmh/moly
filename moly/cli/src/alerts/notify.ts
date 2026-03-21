import type { AlertChannelConfig } from '../config/types.js';
import type { Alert, AlertChannel } from './types.js';

async function sendTelegram(token: string, chatId: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      process.stderr.write(`Telegram send failed (${res.status}): ${await res.text()}\n`);
      return false;
    }
    return true;
  } catch (err: any) {
    process.stderr.write(`Telegram error: ${err.message}\n`);
    return false;
  }
}

async function sendWebhook(url: string, payload: object): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      process.stderr.write(`Webhook send failed (${res.status})\n`);
      return false;
    }
    return true;
  } catch (err: any) {
    process.stderr.write(`Webhook error: ${err.message}\n`);
    return false;
  }
}

function formatTelegramMessage(alert: Alert, data: Record<string, unknown>): string {
  const lines = [
    '*Moly Alert*',
    '',
    `Condition: \`${alert.condition}\``,
  ];
  if (alert.threshold !== undefined) lines.push(`Threshold: ${alert.threshold}`);
  if (data.current !== undefined) lines.push(`Current: ${data.current}`);
  if (data.detail) lines.push(`Detail: ${data.detail}`);
  lines.push(`Triggered: ${new Date().toISOString()}`);
  return lines.join('\n');
}

export async function dispatch(
  channelConfig: AlertChannelConfig,
  channel: AlertChannel,
  alert: Alert,
  data: Record<string, unknown>,
): Promise<boolean> {
  if (channel === 'telegram') {
    const tg = channelConfig.telegram;
    if (!tg) { process.stderr.write('Telegram not configured\n'); return false; }
    return sendTelegram(tg.token, tg.chatId, formatTelegramMessage(alert, data));
  }

  if (channel === 'webhook') {
    const wh = channelConfig.webhook;
    if (!wh) { process.stderr.write('Webhook not configured\n'); return false; }
    return sendWebhook(wh.url, {
      alert: { id: alert.id, condition: alert.condition, threshold: alert.threshold },
      data,
      timestamp: new Date().toISOString(),
      source: 'moly-alerts',
    });
  }

  return false;
}
