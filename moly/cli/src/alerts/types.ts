export type AlertConditionType =
  | 'balance_below'
  | 'balance_above'
  | 'reward_rate_below'
  | 'reward_rate_above'
  | 'withdrawal_ready'
  | 'proposal_new'
  | 'conversion_rate_above'
  | 'conversion_rate_below';

export type AlertChannel = 'telegram' | 'webhook';

export interface Alert {
  id: string;
  condition: AlertConditionType;
  threshold?: number;
  channel: AlertChannel;
  enabled: boolean;
  lastTriggered?: string;
  createdAt: string;
}

export interface AlertsFile {
  alerts: Alert[];
  lastProposalCount?: number;
}
