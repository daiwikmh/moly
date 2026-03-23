import { addAlert, removeAlert, loadAlerts, loadChannelConfig, saveChannelConfig } from '../alerts/store.js';
import type { AlertConditionType, AlertChannel } from '../alerts/types.js';

const VALID_CONDITIONS: AlertConditionType[] = [
  'balance_below', 'balance_above',
  'reward_rate_below', 'reward_rate_above',
  'withdrawal_ready', 'proposal_new',
  'conversion_rate_above', 'conversion_rate_below',
  'reward_delta', 'governance_expiring',
];

const NEEDS_THRESHOLD = new Set([
  'balance_below', 'balance_above',
  'reward_rate_below', 'reward_rate_above',
  'conversion_rate_above', 'conversion_rate_below',
  'reward_delta',
]);

export function setAlert(params: {
  condition: string;
  threshold?: number;
  channel?: string;
}) {
  const condition = params.condition as AlertConditionType;
  if (!VALID_CONDITIONS.includes(condition)) {
    throw new Error(`Invalid condition: ${params.condition}. Valid: ${VALID_CONDITIONS.join(', ')}`);
  }
  if (NEEDS_THRESHOLD.has(condition) && params.threshold === undefined) {
    throw new Error(`Condition "${condition}" requires a threshold value`);
  }
  const channel = (params.channel ?? 'telegram') as AlertChannel;
  if (channel !== 'telegram' && channel !== 'webhook') {
    throw new Error(`Invalid channel: ${params.channel}. Valid: telegram, webhook`);
  }
  const channels = loadChannelConfig();
  if (channel === 'telegram' && !channels.telegram?.token) {
    throw new Error('Telegram not configured. Use configure_alert_channels with telegram_token and telegram_chat_id first.');
  }
  if (channel === 'webhook' && !channels.webhook?.url) {
    throw new Error('Webhook not configured. Use configure_alert_channels with webhook_url first.');
  }
  return addAlert({ condition, threshold: params.threshold, channel });
}

export function listAlerts() {
  return loadAlerts();
}

export function removeAlertById(id: string) {
  const removed = removeAlert(id);
  return { removed, id };
}

export function configureAlertChannels(params: {
  telegram_token?: string;
  telegram_chat_id?: string;
  webhook_url?: string;
}) {
  const current = loadChannelConfig();

  if (params.telegram_token && params.telegram_chat_id) {
    current.telegram = { token: params.telegram_token, chatId: params.telegram_chat_id };
  }
  if (params.webhook_url) {
    current.webhook = { url: params.webhook_url };
  }

  saveChannelConfig(current);

  return {
    telegram: current.telegram
      ? { chatId: current.telegram.chatId, token: '*** configured' }
      : undefined,
    webhook: current.webhook ? { url: current.webhook.url } : undefined,
  };
}
