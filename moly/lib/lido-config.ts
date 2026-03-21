import { createPublicClient, http, type Chain } from 'viem';
import { mainnet } from 'viem/chains';

// ─── Types ───────────────────────────────────────────────────

export type Mode = 'simulation' | 'live';
export type Network = 'testnet' | 'mainnet';

export interface NetworkChain {
  id: string;
  name: string;
  chainId: number;
  chain: Chain;
  rpcUrl: string;
  writeRpcUrl?: string;
  addrs: ContractAddresses;
}

export interface ContractAddresses {
  steth: `0x${string}`;
  wsteth: `0x${string}`;
  withdrawalQueue: `0x${string}`;
  voting: `0x${string}`;
}

// ─── Hoodi Testnet ───────────────────────────────────────────

const hoodiChain: Chain = {
  id: 560048,
  name: 'Hoodi',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://eth-hoodi.g.alchemy.com/v2/9GGes9QipD09NUv7CJue2'] },
  },
  testnet: true,
};

// ─── Chain Definitions ───────────────────────────────────────

export const CHAINS: Record<string, NetworkChain> = {
  hoodi: {
    id: 'hoodi',
    name: 'Hoodi Testnet',
    chainId: 560048,
    chain: hoodiChain,
    rpcUrl: process.env.HOODI_RPC_URL ?? 'https://eth-hoodi.g.alchemy.com/v2/9GGes9QipD09NUv7CJue2',
    addrs: {
      steth: '0x3508A952176b3c15387C97BE809eaffB1982176a',
      wsteth: '0x7E99eE3C66636DE415D2d7C880938F2f40f94De4',
      withdrawalQueue: '0xfe56573178f1bcdf53F01A6E9977670dcBBD9186',
      voting: '0x49B3512c44891bef83F8967d075121Bd1b07a01B',
    },
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    chain: mainnet,
    rpcUrl: process.env.MAINNET_RPC_URL ?? 'https://eth-mainnet.g.alchemy.com/v2/t7Oxw5b_OpDL6yQVWN70ZjxO6hTCaZeW',
    writeRpcUrl: process.env.MAINNET_WRITE_RPC_URL ?? 'https://eth-mainnet.g.alchemy.com/v2/t7Oxw5b_OpDL6yQVWN70ZjxO6hTCaZeW',
    addrs: {
      steth: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
      wsteth: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
      withdrawalQueue: '0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1',
      voting: '0x2e59A20f205bB85a89C53f1936454680651E618e',
    },
  },
};

export const TESTNET_CHAINS = ['hoodi'] as const;
export const MAINNET_CHAINS = ['ethereum'] as const;

// L2 chains for bridging (mainnet only)
export const L2_CHAINS: Record<string, { id: string; name: string; chainId: number; wstETH: `0x${string}`; rpcUrl: string }> = {
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    wstETH: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
    rpcUrl: 'https://mainnet.base.org',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    wstETH: '0x5979D7b546E38E9Ab8049dCFAc0B5D35A8De3f6e',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
};

// ─── Config Helpers ──────────────────────────────────────────

export function getChain(network: Network, chainId?: string): NetworkChain {
  if (network === 'testnet') {
    return CHAINS[chainId ?? 'hoodi'] ?? CHAINS.hoodi;
  }
  return CHAINS[chainId ?? 'ethereum'] ?? CHAINS.ethereum;
}

export function getClient(network: Network, chainId?: string) {
  const c = getChain(network, chainId);
  return createPublicClient({
    chain: c.chain,
    transport: http(c.rpcUrl, { timeout: 15_000 }),
  });
}
