export type Network = 'hoodi' | 'mainnet';
export type Mode = 'simulation' | 'live';
export type AiProvider = 'anthropic' | 'google' | 'openrouter' | null;
export type AiClient = 'claude-desktop' | 'cursor' | 'windsurf' | null;

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

export interface MolyConfig {
  network: Network;
  mode: Mode;
  rpc: string | null;
  privateKey: string | null;
  ai: AiConfig | null;
  setupComplete: boolean;
}

// Per-chain contract addresses
export interface ChainAddresses {
  chainId: number;
  stETH: `0x${string}`;
  wstETH: `0x${string}`;
  voting: `0x${string}`;
  defaultRpc: string;
  name: string;
}

export const CHAIN_CONFIG: Record<Network, ChainAddresses> = {
  hoodi: {
    chainId: 560048,
    stETH: '0x3508A952176b3c15387C97BE809eaffB1982176a',
    wstETH: '0x7E99eE3C66636DE415D2d7C880938F2f40f94De4',
    voting: '0x49B3512c44891bef83F8967d075121Bd1b07a01B',
    defaultRpc: 'https://hoodi.drpc.org',
    name: 'Hoodi Testnet',
  },
  mainnet: {
    chainId: 1,
    stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    voting: '0x2e59A20f205bB85a89C53f1936454680651E618e',
    defaultRpc: 'https://eth.llamarpc.com',
    name: 'Ethereum Mainnet',
  },
};
