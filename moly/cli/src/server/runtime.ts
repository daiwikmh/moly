import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { mainnet, base, arbitrum } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { LidoSDK } from '@lidofinance/lido-ethereum-sdk';
import { createRequire } from 'module';
import { join } from 'path';
import { homedir } from 'os';
const _require = createRequire(import.meta.url);
import { loadConfig, saveConfig } from '../config/store.js';
import { CHAIN_CONFIG, L2_CHAINS } from '../config/types.js';
import type { MolyConfig, Network, Mode, L2Chain, ChainScope } from '../config/types.js';

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

  // SDK initialized lazily after wallet is available
  let _sdk: LidoSDK | null = null;
  function getSdk(): LidoSDK {
    if (_sdk) return _sdk;
    const sdkOpts: any = {
      chainId: chainCfg.chainId as 1 | 560048,
      rpcProvider: publicClient as any,
    };
    try {
      sdkOpts.web3Provider = getWallet() as any;
    } catch {}
    _sdk = new LidoSDK(sdkOpts);
    return _sdk;
  }

  let _wallet: ReturnType<typeof createWalletClient> | null = null;
  let _resolvedAccount: ReturnType<typeof privateKeyToAccount> | null = null;

  function resolveAccount() {
    if (_resolvedAccount) return _resolvedAccount;

    if (config.ows) {
      let owsSdk: any;
      const loaders = [
        () => _require('@open-wallet-standard/core'),
        () => createRequire(join(homedir(), '.moly', 'package.json'))('@open-wallet-standard/core'),
        () => createRequire(join(homedir(), '.nvm', 'versions', 'node', process.version, 'lib', 'node_modules', 'package.json'))('@open-wallet-standard/core'),
      ];
      for (const loader of loaders) {
        try { owsSdk = loader(); break; } catch {}
      }
      if (!owsSdk) throw new Error('OWS SDK not installed. Run: npm install -g @open-wallet-standard/core');
      const exported: string = owsSdk.exportWallet(config.ows.walletName, config.ows.passphrase ?? undefined);
      let keyHex: string;
      try {
        const parsed = JSON.parse(exported);
        keyHex = parsed.secp256k1 ?? parsed;
      } catch {
        keyHex = exported;
      }
      const pk = (keyHex.startsWith('0x') ? keyHex : '0x' + keyHex) as `0x${string}`;
      _resolvedAccount = privateKeyToAccount(pk);
      return _resolvedAccount;
    }

    const rawKey = config.privateKey;
    if (!rawKey) throw new Error('No key configured. Run: moly setup');
    const pk = (rawKey.startsWith('0x') ? rawKey : '0x' + rawKey) as `0x${string}`;
    _resolvedAccount = privateKeyToAccount(pk);
    return _resolvedAccount;
  }

  function getWallet() {
    if (_wallet) return _wallet;
    const account = resolveAccount();
    _wallet = createWalletClient({
      account,
      chain: viemChain,
      transport: http(rpcUrl),
    });
    return _wallet;
  }

  function getAddress(): `0x${string}` {
    return resolveAccount().address;
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
    const account = resolveAccount();
    const cfg = L2_CHAINS[chain];
    const wallet = createWalletClient({ account, chain: L2_VIEM_CHAINS[chain], transport: http(cfg.defaultRpc) });
    _l2Wallets[chain] = wallet;
    return wallet;
  }

  return {
    config,
    chainAddresses: chainCfg,
    publicClient,
    get sdk() { return getSdk(); },
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
  chain_scope?: ChainScope;
}): MolyConfig {
  const current = loadConfig();

  if (patch.network !== undefined) current.network = patch.network;
  if (patch.mode !== undefined) current.mode = patch.mode;
  if (patch.rpc !== undefined) current.rpc = patch.rpc;
  if (patch.model !== undefined && current.ai) current.ai.model = patch.model;
  if (patch.chain_scope !== undefined) current.chainScope = patch.chain_scope;

  saveConfig(current);
  _runtime = null; // force rebuild on next getRuntime()
  return current;
}
