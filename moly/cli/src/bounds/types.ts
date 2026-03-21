export interface Bounds {
  maxStakePerTx: number;
  maxDailyStake: number;
  minEthReserve: number;
  autoRestakeThreshold: number;
  governanceAutoVote: boolean;
  dailyStaked: number;
  lastResetDate: string;
}
