import {
  intro,
  outro,
  select,
  text,
  password,
  confirm,
  note,
  cancel,
  isCancel,
  spinner,
} from '@clack/prompts';
import { saveConfig, getConfigPath } from '../config/store.js';
import type { MolyConfig, Network, Mode, AiProvider, AiClient, ChainScope, OwsConfig } from '../config/types.js';

function bail(value: unknown): never {
  cancel('Setup cancelled.');
  process.exit(0);
}

function check<T>(value: T | symbol): T {
  if (isCancel(value)) bail(value);
  return value as T;
}

// AI client config snippets
function clientSnippet(client: AiClient): string | null {
  const entry = `"moly": { "command": "npx", "args": ["@moly-mcp/lido", "--server"] }`;
  switch (client) {
    case 'claude-desktop':
      return (
        'Add to ~/Library/Application Support/Claude/claude_desktop_config.json\n' +
        '(macOS) or %APPDATA%\\Claude\\claude_desktop_config.json (Windows):\n\n' +
        `{\n  "mcpServers": {\n    ${entry}\n  }\n}`
      );
    case 'cursor':
      return (
        'Add to ~/.cursor/mcp.json (global) or .cursor/mcp.json (project):\n\n' +
        `{\n  "mcpServers": {\n    ${entry}\n  }\n}`
      );
    case 'windsurf':
      return (
        'Add to ~/.codeium/windsurf/mcp_config.json:\n\n' +
        `{\n  "mcpServers": {\n    ${entry}\n  }\n}`
      );
    default:
      return null;
  }
}

const CLAUDE_MODELS = [
  { value: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6  (fast, capable — recommended)' },
  { value: 'claude-opus-4-6', label: 'claude-opus-4-6    (most capable)' },
  { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5-20251001  (fastest, cheapest)' },
  { value: '__custom__', label: 'Enter custom model ID' },
];

const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash  (fast, recommended)' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro    (capable)' },
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash  (fast)' },
  { value: '__custom__', label: 'Enter custom model ID' },
];

const OPENROUTER_MODELS = [
  { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'nvidia/nemotron-3-super-120b-a12b:free  (default, free)' },
  { value: 'anthropic/claude-sonnet-4-6', label: 'anthropic/claude-sonnet-4-6' },
  { value: 'anthropic/claude-opus-4-6', label: 'anthropic/claude-opus-4-6' },
  { value: 'google/gemini-2.0-flash', label: 'google/gemini-2.0-flash' },
  { value: 'openai/gpt-4o', label: 'openai/gpt-4o' },
  { value: '__custom__', label: 'Enter custom model ID (any OpenRouter slug)' },
];

async function pickModel(provider: AiProvider): Promise<string> {
  const models =
    provider === 'anthropic' ? CLAUDE_MODELS :
      provider === 'google' ? GEMINI_MODELS :
        OPENROUTER_MODELS;

  const picked = check(
    await select({
      message: 'Model?',
      options: models,
    })
  ) as string;

  if (picked === '__custom__') {
    return check(
      await text({ message: 'Enter model ID:', placeholder: 'provider/model-name' })
    ) as string;
  }
  return picked;
}

export async function runWizard(): Promise<{ cfg: MolyConfig; terminalMode: boolean }> {
  intro('  Moly  -  Lido MCP Server');

  // ── Network ──────────────────────────────────────────────────────
  const network = check(
    await select({
      message: 'Which network?',
      options: [
        { value: 'hoodi', label: 'Hoodi Testnet  (chain 560048 — safe for testing)' },
        { value: 'mainnet', label: 'Ethereum Mainnet  (chain 1 — real assets)' },
      ],
    })
  ) as Network;

  // ── Chain scope ─────────────────────────────────────────────────────
  let chainScope: ChainScope = 'ethereum';
  if (network === 'mainnet') {
    chainScope = check(
      await select({
        message: 'Chain scope?',
        options: [
          { value: 'ethereum', label: 'Ethereum only  (L1 staking, governance, wrapping)' },
          { value: 'all', label: 'All chains  (L1 + Base/Arbitrum bridging via LI.FI)' },
        ],
      })
    ) as ChainScope;
  }

  // ── Custom RPC ────────────────────────────────────────────────────
  const rpcInput = check(
    await text({
      message: 'Custom RPC URL?  (optional — leave blank to use public RPC)',
      placeholder: 'https://...',
    })
  ) as string;
  const rpc = rpcInput?.trim() || null;

  // ── Mode ──────────────────────────────────────────────────────────
  const mode = check(
    await select({
      message: 'Mode?',
      options: [
        { value: 'simulation', label: 'Simulation  (dry-run — estimates only, nothing sent)' },
        { value: 'live', label: 'Live  (real on-chain transactions)' },
      ],
    })
  ) as Mode;

  // ── Key source ──────────────────────────────────────────────────
  let privateKey: string | null = null;
  let ows: OwsConfig | null = null;

  const keySource = check(
    await select({
      message: 'Key source?  (needed for Live mode)',
      options: [
        { value: 'ows', label: 'OWS Wallet  (encrypted via Open Wallet Standard)' },
        { value: 'raw', label: 'Raw private key  (stored in ~/.moly/config.json, chmod 600)' },
        { value: 'none', label: 'None / Skip' },
      ],
    })
  ) as string;

  if (keySource === 'ows') {
    let owsSdk: any = null;
    let wallets: Array<any> = [];

    const { createRequire } = await import('module');
    const { homedir } = await import('os');
    const { join } = await import('path');
    const owsDir = join(homedir(), '.moly');

    // try local require, then ~/.moly, then global
    const searchPaths = [
      () => createRequire(import.meta.url)('@open-wallet-standard/core'),
      () => createRequire(join(owsDir, 'package.json'))('@open-wallet-standard/core'),
      () => createRequire(join(homedir(), '.nvm', 'versions', 'node', process.version, 'lib', 'node_modules', 'package.json'))('@open-wallet-standard/core'),
    ];

    for (const loader of searchPaths) {
      try { owsSdk = loader(); break; } catch {}
    }

    if (!owsSdk) {
      const s = spinner();
      s.start('Installing @open-wallet-standard/core...');
      try {
        const { execSync } = await import('child_process');
        const { mkdirSync, existsSync, writeFileSync } = await import('fs');
        if (!existsSync(owsDir)) mkdirSync(owsDir, { recursive: true });
        if (!existsSync(join(owsDir, 'package.json'))) {
          writeFileSync(join(owsDir, 'package.json'), '{"name":"moly-deps","private":true}');
        }
        execSync('npm install @open-wallet-standard/core', { stdio: 'pipe', cwd: owsDir });
        s.stop('OWS SDK installed.');
        owsSdk = createRequire(join(owsDir, 'package.json'))('@open-wallet-standard/core');
      } catch (installErr: any) {
        s.stop('Auto-install failed: ' + installErr.message);
        note('Could not install OWS SDK automatically.\nFalling back to raw key storage.', 'OWS not available');
      }
    }

    if (owsSdk) {
      try { wallets = owsSdk.listWallets(); } catch {}
    }

    if (owsSdk && wallets.length > 0) {
      const evmAddr = (w: any) => w.accounts?.find((a: any) => a.chainId === 'evm')?.address ?? '';
      const walletAction = check(
        await select({
          message: 'OWS wallet?',
          options: [
            ...wallets.map((w: any) => ({
              value: w.name,
              label: `${w.name}  (${evmAddr(w).slice(0, 10)}...)`,
            })),
            { value: '__import__', label: 'Import existing private key into new wallet' },
            { value: '__create__', label: 'Create new wallet' },
          ],
        })
      ) as string;

      if (walletAction === '__import__' || walletAction === '__create__') {
        const wName = check(
          await text({ message: 'Wallet name:', placeholder: 'moly', initialValue: 'moly' })
        ) as string;
        const pp = check(
          await password({ message: 'Passphrase (encrypts the vault):', mask: '*' })
        ) as string;

        try {
          if (walletAction === '__import__') {
            const pk = check(
              await password({ message: 'Private key (0x...):', mask: '*' })
            ) as string;
            owsSdk.importWalletPrivateKey(wName.trim() || 'moly', pk.trim(), pp.trim() || undefined);
          } else {
            owsSdk.createWallet(wName.trim() || 'moly', pp.trim() || undefined);
          }
          ows = { walletName: wName.trim() || 'moly', passphrase: pp.trim() };
        } catch (err: any) {
          note('OWS operation failed: ' + err.message + '\nFalling back to raw key.', 'Fallback');
          const pk = check(
            await password({ message: 'Private key (0x...):', mask: '*' })
          ) as string;
          const t = pk.trim(); privateKey = t ? (t.startsWith('0x') ? t : '0x' + t) : null;
        }
      } else {
        const passphrase = check(
          await password({ message: 'OWS passphrase:', mask: '*' })
        ) as string;
        ows = { walletName: walletAction, passphrase: passphrase.trim() };
      }

    } else if (owsSdk && wallets.length === 0) {
      const walletAction = check(
        await select({
          message: 'No wallets found. What would you like to do?',
          options: [
            { value: 'import', label: 'Import existing private key' },
            { value: 'create', label: 'Generate new wallet' },
          ],
        })
      ) as string;

      const walletName = check(
        await text({ message: 'Wallet name:', placeholder: 'moly', initialValue: 'moly' })
      ) as string;

      const passphrase = check(
        await password({ message: 'Passphrase (encrypts the vault):', mask: '*' })
      ) as string;

      try {
        if (walletAction === 'import') {
          const pk = check(
            await password({ message: 'Private key (0x...):', mask: '*' })
          ) as string;
          owsSdk.importWalletPrivateKey(walletName.trim() || 'moly', pk.trim(), passphrase.trim() || undefined);
        } else {
          owsSdk.createWallet(walletName.trim() || 'moly', passphrase.trim() || undefined);
        }
        ows = { walletName: walletName.trim() || 'moly', passphrase: passphrase.trim() };
      } catch (err: any) {
        note('OWS operation failed: ' + err.message + '\nFalling back to raw key.', 'Fallback');
        const pk = check(
          await password({ message: 'Private key (0x...):', mask: '*' })
        ) as string;
        const t = pk.trim(); privateKey = t ? (t.startsWith('0x') ? t : '0x' + t) : null;
      }
    }
  } else if (keySource === 'raw') {
    const pk = check(
      await password({
        message: 'Private key (0x...):',
        mask: '*',
      })
    ) as string;
    const trimmed = pk.trim();
    privateKey = trimmed ? (trimmed.startsWith('0x') ? trimmed : '0x' + trimmed) : null;
  }

  // ── AI Provider ───────────────────────────────────────────────────
  const providerChoice = check(
    await select({
      message: 'AI Provider?  (optional — used for built-in chat + config snippet)',
      options: [
        { value: 'openrouter', label: 'OpenRouter  (access any model with one key)' },
        { value: 'anthropic', label: 'Anthropic  (Claude)' },
        { value: 'google', label: 'Google  (Gemini)' },
        { value: 'none', label: 'None / Skip' },

      ],
    })
  ) as string;

  let ai: MolyConfig['ai'] = null;
  if (providerChoice !== 'none') {
    const provider = providerChoice as AiProvider;

    const apiKey = check(
      await password({
        message: 'API Key:',
        mask: '*',
      })
    ) as string;

    const model = await pickModel(provider);

    ai = { provider, apiKey: apiKey.trim(), model };
  }

  // ── AI Client snippet ─────────────────────────────────────────────
  const clientChoice = check(
    await select({
      message: 'Which AI client are you using?  (for config snippet)',
      options: [
        { value: 'Integrated Terminal', label: 'Moly Environment' },
        { value: 'claude-desktop', label: 'Claude Desktop' },
        { value: 'cursor', label: 'Cursor' },
        { value: 'windsurf', label: 'Windsurf / Codeium' },
      ],
    })
  ) as string;

  // ── Save ──────────────────────────────────────────────────────────
  const cfg: MolyConfig = {
    network,
    mode,
    rpc,
    privateKey,
    ows,
    ai,
    chainScope,
    setupComplete: true,
  };

  saveConfig(cfg);

  note(`Config saved → ${getConfigPath()}`, 'Saved');

  const snippet = clientSnippet(clientChoice as AiClient);
  if (snippet) {
    note(snippet, 'Add to your AI client config');
  }

  // If AI is configured and no AI client chosen, terminal becomes the client
  const terminalMode = ai !== null && clientChoice === 'Integrated Terminal';

  if (terminalMode) {
    outro(`Launching Moly Terminal...  ${mode} · ${network} · ready`);
  } else {
    outro(`Starting Moly MCP Server...  ${mode} · ${network} · ready`);
  }

  return { cfg, terminalMode };
}
