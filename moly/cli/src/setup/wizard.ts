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
import { generatePrivateKey } from 'viem/accounts';

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
    let wallets: Array<{ id: string; name: string; chain: string; address: string }> = [];

    try {
      const { createRequire } = await import('module');
      const _req = createRequire(import.meta.url);
      owsSdk = _req('@open-wallet-standard/core');
      wallets = owsSdk.listWallets();
    } catch {
      note('OWS SDK not found. Install it first:\ncurl -fsSL https://openwallet.sh/install.sh | bash\nnpm install @open-wallet-standard/core\nFalling back to raw key storage.', 'OWS not available');
    }

    if (owsSdk && wallets.length > 0) {
      const walletName = check(
        await select({
          message: 'Which OWS wallet?',
          options: wallets.map((w) => ({
            value: w.name,
            label: `${w.name}  (${w.address.slice(0, 8)}...)`,
          })),
        })
      ) as string;

      const passphrase = check(
        await password({
          message: 'OWS passphrase:',
          mask: '*',
        })
      ) as string;

      ows = { walletName, passphrase: passphrase.trim() };

    } else if (owsSdk && wallets.length === 0) {
      note('No OWS wallets found. Creating one for you...', 'New OWS wallet');

      const walletName = check(
        await text({ message: 'Wallet name:', placeholder: 'moly', initialValue: 'moly' })
      ) as string;

      const passphrase = check(
        await password({ message: 'Set a passphrase (used to encrypt the key):', mask: '*' })
      ) as string;

      const s = spinner();
      s.start('Generating wallet...');
      try {
        const privateKey = generatePrivateKey();
        owsSdk.createWallet(walletName.trim() || 'moly', passphrase.trim(), privateKey);
        s.stop('Wallet created.');
        ows = { walletName: walletName.trim() || 'moly', passphrase: passphrase.trim() };
      } catch (err: any) {
        s.stop('Auto-create failed: ' + err.message);
        note('Falling back to raw private key storage.', 'Fallback');
        const pk = check(
          await password({ message: 'Enter or paste a private key (0x...) — or generate one:', mask: '*' })
        ) as string;
        privateKey = pk.trim() || null;
      }
    }
  } else if (keySource === 'raw') {
    const pk = check(
      await password({
        message: 'Private key (0x...):',
        mask: '*',
      })
    ) as string;
    privateKey = pk.trim() || null;
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
