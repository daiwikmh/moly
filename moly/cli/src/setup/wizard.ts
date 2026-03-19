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
} from '@clack/prompts';
import { saveConfig, getConfigPath } from '../config/store.js';
import type { MolyConfig, Network, Mode, AiProvider, AiClient } from '../config/types.js';

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
  const entry = `"moly": { "command": "npx", "args": ["@moly/lido", "--server"] }`;
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
  intro('  Moly — Lido MCP Server  ⬡');

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

  // ── Private key ───────────────────────────────────────────────────
  let privateKey: string | null = null;
  const wantsKey = check(
    await confirm({
      message: 'Add a private key?  (needed for Live mode — stored locally with chmod 600)',
      initialValue: mode === 'live',
    })
  );
  if (wantsKey) {
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
    ai,
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
