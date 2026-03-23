#!/usr/bin/env node
import {
  loadConfig,
  saveConfig
} from "./chunk-P6VFMSPM.js";

// src/server/runtime.ts
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { mainnet, base, arbitrum } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { LidoSDK } from "@lidofinance/lido-ethereum-sdk";
import { createRequire } from "module";
import { join } from "path";
import { homedir } from "os";

// src/config/types.ts
var L2_CHAINS = {
  base: {
    chainId: 8453,
    name: "Base",
    defaultRpc: "https://mainnet.base.org",
    wstETH: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452"
  },
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    defaultRpc: "https://arb1.arbitrum.io/rpc",
    wstETH: "0x5979D7b546E38E9Ab8049dCFAc0B5D35A8De3f6e"
  }
};
var CHAIN_CONFIG = {
  hoodi: {
    chainId: 560048,
    stETH: "0x3508A952176b3c15387C97BE809eaffB1982176a",
    wstETH: "0x7E99eE3C66636DE415D2d7C880938F2f40f94De4",
    voting: "0x49B3512c44891bef83F8967d075121Bd1b07a01B",
    defaultRpc: "https://hoodi.drpc.org",
    name: "Hoodi Testnet"
  },
  mainnet: {
    chainId: 1,
    stETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    voting: "0x2e59A20f205bB85a89C53f1936454680651E618e",
    defaultRpc: "https://eth.llamarpc.com",
    name: "Ethereum Mainnet"
  }
};

// src/server/runtime.ts
var _require = createRequire(import.meta.url);
var hoodi = defineChain({
  id: 560048,
  name: "Hoodi Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://hoodi.drpc.org"] } }
});
var L2_VIEM_CHAINS = { base, arbitrum };
var _runtime = null;
function buildRuntime() {
  const config = loadConfig();
  const chainCfg = CHAIN_CONFIG[config.network];
  const rpcUrl = config.rpc ?? chainCfg.defaultRpc;
  const viemChain = config.network === "mainnet" ? mainnet : hoodi;
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(rpcUrl)
  });
  let _sdk = null;
  function getSdk() {
    if (_sdk) return _sdk;
    const sdkOpts = {
      chainId: chainCfg.chainId,
      rpcProvider: publicClient
    };
    try {
      sdkOpts.web3Provider = getWallet();
    } catch {
    }
    _sdk = new LidoSDK(sdkOpts);
    return _sdk;
  }
  let _wallet = null;
  let _resolvedAccount = null;
  function resolveAccount() {
    if (_resolvedAccount) return _resolvedAccount;
    if (config.ows) {
      let owsSdk;
      const loaders = [
        () => _require("@open-wallet-standard/core"),
        () => createRequire(join(homedir(), ".moly", "package.json"))("@open-wallet-standard/core"),
        () => createRequire(join(homedir(), ".nvm", "versions", "node", process.version, "lib", "node_modules", "package.json"))("@open-wallet-standard/core")
      ];
      for (const loader of loaders) {
        try {
          owsSdk = loader();
          break;
        } catch {
        }
      }
      if (!owsSdk) throw new Error("OWS SDK not installed. Run: npm install -g @open-wallet-standard/core");
      const exported = owsSdk.exportWallet(config.ows.walletName, config.ows.passphrase ?? void 0);
      let keyHex;
      try {
        const parsed = JSON.parse(exported);
        keyHex = parsed.secp256k1 ?? parsed;
      } catch {
        keyHex = exported;
      }
      const pk2 = keyHex.startsWith("0x") ? keyHex : "0x" + keyHex;
      _resolvedAccount = privateKeyToAccount(pk2);
      return _resolvedAccount;
    }
    const rawKey = config.privateKey;
    if (!rawKey) throw new Error("No key configured. Run: moly setup");
    const pk = rawKey.startsWith("0x") ? rawKey : "0x" + rawKey;
    _resolvedAccount = privateKeyToAccount(pk);
    return _resolvedAccount;
  }
  function getWallet() {
    if (_wallet) return _wallet;
    const account = resolveAccount();
    _wallet = createWalletClient({
      account,
      chain: viemChain,
      transport: http(rpcUrl)
    });
    return _wallet;
  }
  function getAddress() {
    return resolveAccount().address;
  }
  const _l2Clients = {};
  const _l2Wallets = {};
  function getL2PublicClient(chain) {
    if (_l2Clients[chain]) return _l2Clients[chain];
    const cfg = L2_CHAINS[chain];
    const client = createPublicClient({ chain: L2_VIEM_CHAINS[chain], transport: http(cfg.defaultRpc) });
    _l2Clients[chain] = client;
    return client;
  }
  function getL2Wallet(chain) {
    if (_l2Wallets[chain]) return _l2Wallets[chain];
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
    get sdk() {
      return getSdk();
    },
    getWallet,
    getAddress,
    getL2PublicClient,
    getL2Wallet,
    reload() {
      _runtime = null;
    }
  };
}
function getRuntime() {
  if (!_runtime) _runtime = buildRuntime();
  return _runtime;
}
function applySettingsUpdate(patch) {
  const current = loadConfig();
  if (patch.network !== void 0) current.network = patch.network;
  if (patch.mode !== void 0) current.mode = patch.mode;
  if (patch.rpc !== void 0) current.rpc = patch.rpc;
  if (patch.model !== void 0 && current.ai) current.ai.model = patch.model;
  if (patch.chain_scope !== void 0) current.chainScope = patch.chain_scope;
  saveConfig(current);
  _runtime = null;
  return current;
}

export {
  L2_CHAINS,
  getRuntime,
  applySettingsUpdate
};
