import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { mainnet, base, arbitrum } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { LidoSDK } from '@lidofinance/lido-ethereum-sdk';
import { loadConfig, saveConfig } from '../config/store.js';
import { CHAIN_CONFIG, L2_CHAINS } from '../config/types.js';
import type { MolyConfig, Network, Mode, L2Chain } from '../config/types.js';

// Hoodi is not in viem/chains yet — define it manually
const hoodi = defineChain({
  id: 560048,
  name: 'Hoodi Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://hoodi.drpc.org'] } },
});

const L2_VIEM_CHAINS: Record<L2Chain, typeof base> = { base, arbitrum };

export interface Runtime {
  config: MolyConfig;
  chainAddresses: typeof CHAIN_CONFIG['hoodi'];
  publicClient: ReturnType<typeof createPublicClient>;
  sdk: LidoSDK;
  getWallet: () => ReturnType<typeof createWalletClient>;
  getAddress: () => `0x${string}`;
  getL2PublicClient: (chain: L2Chain) => ReturnType<typeof createPublicClient>;
  getL2Wallet: (chain: L2Chain) => ReturnType<typeof createWalletClient>;
  reload: () => void;
}

let _runtime: Runtime | null = null;

function buildRuntime(): Runtime {
  const config = loadConfig();
  const chainCfg = CHAIN_CONFIG[config.network];
  const rpcUrl = config.rpc ?? chainCfg.defaultRpc;
  const viemChain = config.network === 'mainnet' ? mainnet : hoodi;

  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(rpcUrl),
  });

  const sdk = new LidoSDK({
    chainId: chainCfg.chainId as 1 | 560048,
    rpcProvider: publicClient as any,
  });

  let _wallet: ReturnType<typeof createWalletClient> | null = null;

  function getWallet() {
    if (_wallet) return _wallet;
    const pk = config.privateKey;
    if (!pk) throw new Error('No private key configured. Run: moly setup');
    const account = privateKeyToAccount(pk as `0x${string}`);
    _wallet = createWalletClient({
      account,
      chain: viemChain,
      transport: http(rpcUrl),
    });
    return _wallet;
  }

  function getAddress(): `0x${string}` {
    const pk = config.privateKey;
    if (!pk) throw new Error('No private key configured. Run: moly setup');
    return privateKeyToAccount(pk as `0x${string}`).address;
  }

  const _l2Clients: Partial<Record<L2Chain, ReturnType<typeof createPublicClient>>> = {};
  const _l2Wallets: Partial<Record<L2Chain, ReturnType<typeof createWalletClient>>> = {};

  function getL2PublicClient(chain: L2Chain) {
    if (_l2Clients[chain]) return _l2Clients[chain]!;
    const cfg = L2_CHAINS[chain];
    const client = createPublicClient({ chain: L2_VIEM_CHAINS[chain], transport: http(cfg.defaultRpc) });
    _l2Clients[chain] = client;
    return client;
  }

  function getL2Wallet(chain: L2Chain) {
    if (_l2Wallets[chain]) return _l2Wallets[chain]!;
    const pk = config.privateKey;
    if (!pk) throw new Error('No private key configured. Run: moly setup');
    const account = privateKeyToAccount(pk as `0x${string}`);
    const cfg = L2_CHAINS[chain];
    const wallet = createWalletClient({ account, chain: L2_VIEM_CHAINS[chain], transport: http(cfg.defaultRpc) });
    _l2Wallets[chain] = wallet;
    return wallet;
  }

  return {
    config,
    chainAddresses: chainCfg,
    publicClient,
    sdk,
    getWallet,
    getAddress,
    getL2PublicClient,
    getL2Wallet,
    reload() { _runtime = null; },
  };
}

export function getRuntime(): Runtime {
  if (!_runtime) _runtime = buildRuntime();
  return _runtime;
}

/** Called by update_settings tool — patches config and rebuilds runtime */
export function applySettingsUpdate(patch: {
  network?: Network;
  mode?: Mode;
  rpc?: string | null;
  model?: string;
}): MolyConfig {
  const current = loadConfig();

  if (patch.network !== undefined) current.network = patch.network;
  if (patch.mode !== undefined) current.mode = patch.mode;
  if (patch.rpc !== undefined) current.rpc = patch.rpc;
  if (patch.model !== undefined && current.ai) current.ai.model = patch.model;

  saveConfig(current);
  _runtime = null; // force rebuild on next getRuntime()
  return current;
}
