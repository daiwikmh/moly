import { holesky, mainnet, base, arbitrum } from 'viem/chains';
import type { Chain } from 'viem';

export type Mode = 'simulation' | 'live';
export type L2Chain = 'base' | 'arbitrum';

const mode = (process.env.LIDO_MODE ?? 'simulation') as Mode;

if (mode !== 'simulation' && mode !== 'live') {
  throw new Error(`LIDO_MODE must be "simulation" or "live", got: ${mode}`);
}

export const config = {
  mode,
  isSimulation: mode === 'simulation',
  chain: mode === 'simulation' ? holesky : mainnet,
  chainId: mode === 'simulation' ? 17000 : 1,
  rpcUrl:
    mode === 'simulation'
      ? (process.env.HOLESKY_RPC_URL ?? 'https://ethereum-holesky-rpc.publicnode.com')
      : (process.env.MAINNET_RPC_URL ?? 'https://eth.llamarpc.com'),
  referralAddress: (process.env.REFERRAL_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
};

export interface L2ChainConfig {
  chainId: number;
  name: string;
  defaultRpc: string;
  viemChain: Chain;
  wstETH: `0x${string}`;
}

export const L2_CHAINS: Record<L2Chain, L2ChainConfig> = {
  base: {
    chainId: 8453,
    name: 'Base',
    defaultRpc: 'https://mainnet.base.org',
    viemChain: base,
    wstETH: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    defaultRpc: 'https://arb1.arbitrum.io/rpc',
    viemChain: arbitrum,
    wstETH: '0x5979D7b546E38E9Ab8049dCFAc0B5D35A8De3f6e',
  },
};
