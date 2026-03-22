import React from "react";
import { CopyButton } from "@/app/components/docs/CopyButton";

export interface DocPage {
  title: string;
  description: string;
  content: React.ReactNode;
}

export interface DocSection {
  title: string;
  pages: { slug: string; title: string }[];
}

export const NAV: DocSection[] = [
  {
    title: "Getting Started",
    pages: [
      { slug: "", title: "Overview" },
      { slug: "setup", title: "Installation" },
      { slug: "configuration", title: "Configuration" },
      { slug: "architecture", title: "Architecture" },
    ],
  },
  {
    title: "MCP Server",
    pages: [
      { slug: "mcp-server", title: "Overview" },
      { slug: "mcp-server/connect", title: "Connect Any Agent" },
      { slug: "mcp-server/code-samples", title: "Code Samples" },
    ],
  },
  {
    title: "CLI Package",
    pages: [
      { slug: "cli", title: "npx @moly-mcp/lido" },
      { slug: "cli/setup", title: "Setup Wizard" },
      { slug: "cli/configuration", title: "Configuration Reference" },
    ],
  },
  {
    title: "Tools Reference",
    pages: [
      { slug: "tools", title: "All Tools" },
      { slug: "tools/read", title: "Read Tools" },
      { slug: "tools/write", title: "Write Tools" },
      { slug: "tools/governance", title: "Governance" },
      { slug: "tools/bridge", title: "Bridge (L2)" },
      { slug: "tools/management", title: "Bounds, Alerts & Ledger" },
    ],
  },
  {
    title: "Guides",
    pages: [
      { slug: "guides/stake-eth", title: "Stake ETH" },
      { slug: "guides/wrap-unwrap", title: "Wrap & Unwrap" },
      { slug: "guides/withdrawals", title: "Withdrawals" },
      { slug: "guides/governance", title: "Governance Voting" },
    ],
  },
  {
    title: "Reference",
    pages: [
      { slug: "chains", title: "Supported Chains" },
      { slug: "faq", title: "FAQ" },
    ],
  },
];

/* ── helpers ── */
const Code = ({ children }: { children: string }) => (
  <code className="docs-inline-code">{children}</code>
);
const Pre = ({ children, title }: { children: string; title?: string }) => (
  <div className="docs-codeblock">
    {title && <div className="docs-codeblock-title">{title}</div>}
    <CopyButton text={children} />
    <pre><code>{children}</code></pre>
  </div>
);
const Table = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
  <table className="docs-table">
    <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
  </table>
);
const Callout = ({ type, children }: { type: "info" | "warning" | "tip"; children: React.ReactNode }) => (
  <div className={`docs-callout docs-callout-${type}`}>
    <span className="docs-callout-icon">{type === "info" ? "ℹ" : type === "warning" ? "⚠" : "💡"}</span>
    <div>{children}</div>
  </div>
);
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="docs-h2">{children}</h2>;
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="docs-h3">{children}</h3>;
const P = ({ children }: { children: React.ReactNode }) => <p className="docs-p">{children}</p>;
const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="docs-ul">{items.map((item, i) => <li key={i}>{item}</li>)}</ul>
);

/* ── pages ── */
export const PAGES: Record<string, DocPage> = {
  "": {
    title: "Moly Documentation",
    description: "AI-native Lido staking interface — MCP server + chat dashboard",
    content: (
      <>
        <P>Moly is an open-source project that brings the Lido staking protocol to AI assistants via the Model Context Protocol (MCP). Point any MCP-compatible AI tool at the hosted server and start interacting with Lido — no installation required.</P>

        <H2>Quickstart</H2>
        <P>Add the Moly MCP server to your AI tool. No cloning, no dependencies:</P>
        <Pre title="Claude Code / Cursor / Claude Desktop">{`{
  "mcpServers": {
    "moly": {
      "type": "http",
      "url": "https://moly-lido.vercel.app/api/mcp"
    }
  }
}`}</Pre>
        <P>That&apos;s it. Your AI assistant now has 13 Lido tools — balances, staking, wrapping, withdrawals, and governance. Defaults to simulation mode on Hoodi testnet (safe, no real funds).</P>

        <Callout type="tip">Want mainnet or live mode? Add <a href="/docs/mcp-server">custom headers</a> to configure.</Callout>

        <H2>What You Get</H2>
        <Table headers={["Feature", "Description"]} rows={[
          ["28 Tools", "Balance, staking, wrapping, withdrawals, governance, bridging, alerts, bounds, ledger"],
          ["Dual Mode", "Simulation (dry-run) and Live (real transactions)"],
          ["Multi-Chain", "Hoodi testnet and Ethereum mainnet"],
          ["Hosted Server", "HTTP MCP endpoint — just add the URL, zero setup"],
          ["Chat Dashboard", "Web UI with AI agent at moly-lido.vercel.app"],
          ["Self-Hostable", "Clone and run locally with Bun for full control"],
        ]} />

        <H2>Architecture</H2>
        <Pre>{`┌─────────────┐    HTTP/stdio    ┌──────────────┐     RPC      ┌────────────┐
│  AI Client   │ ◄─────────────► │  Moly MCP     │ ◄──────────► │  Ethereum   │
│  (Claude,    │   MCP protocol   │  Server       │   eth_call   │  (Hoodi /   │
│   Cursor)    │                  │  (Next.js)    │              │   Mainnet)  │
└─────────────┘                  └──────────────┘              └────────────┘

┌──────────────────────────────────────────────┐
│  Moly Dashboard (moly-lido.vercel.app)         │
│  ┌────────────────────┬─────────────────────┐ │
│  │  Chat Panel        │  Sidebar            │ │
│  │  AI agent + tools  │  Balances / Stats   │ │
│  └────────────────────┴─────────────────────┘ │
└──────────────────────────────────────────────┘`}</Pre>

        <H2>Quick Links</H2>
        <UL items={[
          <><a href="/docs/mcp-server">MCP Server</a> — configuration, custom headers, self-hosting</>,
          <><a href="/docs/mcp-server/claude-code">Claude Code Setup</a> — detailed walkthrough</>,
          <><a href="/docs/tools">Tools Reference</a> — all tools documented</>,
          <><a href="/docs/guides/stake-eth">Stake ETH Guide</a> — your first staking interaction</>,
          <><a href="/docs/cli">CLI Package</a> — run a local MCP server with npx</>,
        ]} />
      </>
    ),
  },

  setup: {
    title: "Getting Started",
    description: "Connect to Moly in under a minute",
    content: (
      <>
        <P>Moly is a hosted service — there is nothing to install. Just add the MCP server URL to your AI agent and start interacting with Lido.</P>

        <H2>Step 1: Add the MCP Server</H2>
        <P>Add this to your agent&apos;s MCP config file (see <a href="/docs/mcp-server/connect">Connect Any Agent</a> for where each agent stores its config):</P>
        <Pre title="MCP Config">{`{
  "mcpServers": {
    "moly": {
      "type": "http",
      "url": "https://moly-lido.vercel.app/api/mcp"
    }
  }
}`}</Pre>

        <H2>Step 2: Restart Your Agent</H2>
        <P>Most agents require a restart after config changes. After restarting, the 13 Lido tools will be available.</P>

        <H2>Step 3: Try It</H2>
        <Pre>{`What's the stETH balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18?`}</Pre>
        <Pre>{`Simulate staking 0.1 ETH`}</Pre>
        <Pre>{`Show me recent governance proposals`}</Pre>

        <H2>Dashboard</H2>
        <P>You can also use Moly through the web dashboard at <strong>moly-lido.vercel.app</strong> — it has an AI chat interface with the same 17 tools built in, plus a sidebar showing live balances and protocol stats.</P>

        <H2>Defaults</H2>
        <Table headers={["Setting", "Default", "Change via"]} rows={[
          ["Mode", "Simulation (dry-run)", "x-lido-mode header"],
          ["Network", "Testnet (Hoodi)", "x-lido-network header"],
          ["Chain", "Auto from network", "x-lido-chain header"],
        ]} />
        <Callout type="info">Simulation mode is completely safe — no real transactions are sent. See <a href="/docs/configuration">Configuration</a> to customize.</Callout>
      </>
    ),
  },

  configuration: {
    title: "Configuration",
    description: "Configure modes, networks, and environment variables",
    content: (
      <>
        <H2>Environment Variables</H2>
        <Pre title=".env">{`LIDO_MODE=simulation          # "simulation" or "live"
PRIVATE_KEY=0x...             # Your wallet private key
HOODI_RPC_URL=https://eth-hoodi.g.alchemy.com/v2/9GGes9QipD09NUv7CJue2
MAINNET_RPC_URL=https://eth.llamarpc.com
REFERRAL_ADDRESS=0x0000000000000000000000000000000000000000`}</Pre>
        <H2>Modes</H2>
        <H3>Simulation (Default)</H3>
        <UL items={[
          "All write operations return dry-run results",
          "Shows estimated gas, expected outputs, and notes",
          <>Pass <Code>dry_run: false</Code> explicitly to broadcast on testnet</>,
          "Safe for testing and demos",
        ]} />
        <H3>Live</H3>
        <UL items={[
          "Write operations execute real transactions",
          "Requires a funded wallet with a private key",
          <>Pass <Code>dry_run: true</Code> to simulate before broadcasting</>,
          "Use with caution on mainnet",
        ]} />
        <H2>Mode × Network Matrix</H2>
        <Table headers={["Mode", "Testnet (Hoodi)", "Mainnet (Ethereum)"]} rows={[
          ["Simulation", "Dry-run on Hoodi", "Dry-run on mainnet"],
          ["Live", "Real txs on Hoodi (safe)", "Real txs on mainnet (real funds)"],
        ]} />
        <Callout type="warning">Live mode on mainnet uses real ETH. Always start with Hoodi testnet.</Callout>
      </>
    ),
  },

  architecture: {
    title: "Architecture",
    description: "How Moly works under the hood",
    content: (
      <>
        <P>Moly is a single Next.js app deployed on Vercel that serves three things: the MCP server, the chat dashboard, and these docs.</P>
        <H2>Request Flow</H2>
        <Pre>{`AI Agent                    Moly (Vercel)               Ethereum
  │                            │                            │
  │── MCP POST /api/mcp ──────►│                            │
  │                            │── eth_call (viem) ─────────►│
  │                            │◄── balance data ───────────│
  │◄── tool result ────────────│                            │
  │                            │                            │`}</Pre>
        <H2>Endpoints</H2>
        <Table headers={["Endpoint", "Purpose"]} rows={[
          ["/api/mcp", "MCP server — 13 Lido tools via Streamable HTTP"],
          ["/api/chat", "AI chat — Vercel AI SDK + OpenRouter"],
          ["/api/lido", "Data API — sidebar balances and stats"],
          ["/docs", "Documentation (this site)"],
          ["/llms.txt", "Machine-readable tool reference for AI agents"],
          ["/", "Chat dashboard UI"],
        ]} />
        <H2>Stack</H2>
        <UL items={[
          <><strong>Next.js</strong> — app framework, deployed on Vercel</>,
          <><strong>viem</strong> — raw Ethereum contract calls (no SDK dependencies)</>,
          <><strong>@modelcontextprotocol/sdk</strong> — MCP server with Streamable HTTP transport</>,
          <><strong>Vercel AI SDK v6</strong> — chat endpoint with tool calling</>,
          <><strong>OpenRouter</strong> — LLM gateway for the dashboard chat</>,
        ]} />
        <H2>How Tools Work</H2>
        <P>All tools use raw viem contract calls against Lido&apos;s deployed contracts. Read tools call <Code>eth_call</Code> directly. Write tools return simulation results (gas estimates, expected outputs) — the hosted server never holds private keys and never broadcasts transactions.</P>
        <P>Configuration (mode, network, chain) is passed via HTTP headers on each MCP request, making the server fully stateless.</P>
      </>
    ),
  },

  "mcp-server": {
    title: "MCP Server",
    description: "Connect AI tools to Lido via the Model Context Protocol",
    content: (
      <>
        <P>The Moly MCP server integrates with the Lido protocol to provide staking, wrapping, withdrawals, and governance functionality across Hoodi testnet and Ethereum mainnet via the Model Context Protocol (MCP).</P>
        <P>MCP is a standard protocol for AI model integration, allowing AI tools like Claude, Cursor, Windsurf, and VS Code Copilot to access external tools and data sources directly.</P>
        <Callout type="info">Write tools return simulation results by default. In simulation mode, no transactions are broadcast — you get gas estimates and expected outputs safely.</Callout>

        <H2>Quickstart</H2>
        <P>Add the hosted Moly MCP server to your AI tool. No installation required:</P>
        <Pre title="MCP Config">{`{
  "mcpServers": {
    "moly": {
      "type": "http",
      "url": "https://moly-lido.vercel.app/api/mcp"
    }
  }
}`}</Pre>
        <P>Your AI assistant now has access to all 13 Lido tools. Try asking:</P>
        <Pre>{`What's the stETH balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18?`}</Pre>

        <H2>Configuration via Headers</H2>
        <P>Customize behavior by adding headers to the MCP config:</P>
        <Pre title="With custom headers">{`{
  "mcpServers": {
    "moly": {
      "type": "http",
      "url": "https://moly-lido.vercel.app/api/mcp",
      "headers": {
        "x-lido-mode": "simulation",
        "x-lido-network": "mainnet"
      }
    }
  }
}`}</Pre>
        <Table headers={["Header", "Values", "Default"]} rows={[
          ["x-lido-mode", "simulation, live", "simulation"],
          ["x-lido-network", "testnet, mainnet", "testnet"],
          ["x-lido-chain", "hoodi, ethereum", "auto from network"],
        ]} />

        <H2>Tools (17)</H2>
        <H3>Read Tools (7)</H3>
        <Table headers={["Tool", "Description"]} rows={[
          ["get_balance", "ETH, stETH, wstETH balances"],
          ["get_rewards", "Staking reward history"],
          ["get_conversion_rate", "stETH/wstETH exchange rate"],
          ["get_withdrawal_requests", "Pending withdrawal IDs"],
          ["get_withdrawal_status", "Finalization status"],
          ["get_proposals", "DAO governance proposals"],
          ["get_proposal", "Single proposal details"],
        ]} />
        <H3>Write Tools (6)</H3>
        <Table headers={["Tool", "Description"]} rows={[
          ["stake_eth", "Stake ETH → stETH"],
          ["request_withdrawal", "Queue stETH withdrawal"],
          ["claim_withdrawals", "Claim finalized withdrawals"],
          ["wrap_steth", "Wrap stETH → wstETH"],
          ["unwrap_wsteth", "Unwrap wstETH → stETH"],
          ["cast_vote", "Vote on DAO proposal"],
        ]} />
        <H3>Bridge Tools (4, mainnet only)</H3>
        <Table headers={["Tool", "Description"]} rows={[
          ["get_l2_balance", "ETH and wstETH balances on Base or Arbitrum"],
          ["get_bridge_quote", "Quote for bridging to Ethereum L1 via LI.FI"],
          ["bridge_to_ethereum", "Bridge ETH or wstETH from L2 to L1 (supports dry_run)"],
          ["get_bridge_status", "Check status of in-progress bridge transaction"],
        ]} />

        <H2>Verify</H2>
        <P>After adding the config, ask your AI assistant:</P>
        <Pre>{`What Lido tools are available?`}</Pre>
        <P>It should list all available tools. Then try:</P>
        <Pre>{`What's the stETH balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18?`}</Pre>
      </>
    ),
  },

  "mcp-server/connect": {
    title: "Connect Any Agent",
    description: "Add Moly to Claude, Cursor, Windsurf, VS Code Copilot, or any MCP client",
    content: (
      <>
        <P>Moly uses the standard MCP HTTP transport. Any agent or tool that supports MCP can connect with a single URL — no installation, no dependencies, no API keys.</P>

        <H2>Universal Config</H2>
        <P>Add this to your agent&apos;s MCP configuration:</P>
        <Pre title="MCP Config (works everywhere)">{`{
  "mcpServers": {
    "moly": {
      "type": "http",
      "url": "https://moly-lido.vercel.app/api/mcp"
    }
  }
}`}</Pre>
        <Callout type="tip">That&apos;s it. Your agent now has 13 Lido tools. Defaults to simulation mode on Hoodi testnet — completely safe.</Callout>

        <H2>Where to Put the Config</H2>
        <Table headers={["Agent", "Config File"]} rows={[
          ["Claude Code", ".claude.json in project root"],
          ["Claude Desktop (macOS)", "~/Library/Application Support/Claude/claude_desktop_config.json"],
          ["Claude Desktop (Windows)", "%APPDATA%\\Claude\\claude_desktop_config.json"],
          ["Claude Desktop (Linux)", "~/.config/Claude/claude_desktop_config.json"],
          ["Cursor", ".cursor/mcp.json in project root"],
          ["Windsurf", ".windsurf/mcp.json in project root"],
          ["VS Code Copilot", ".vscode/mcp.json in project root"],
          ["Other MCP clients", "Check your client's MCP documentation"],
        ]} />

        <H2>Configure Mode & Network</H2>
        <P>Add headers to switch from defaults:</P>
        <Pre title="Example: mainnet + live mode">{`{
  "mcpServers": {
    "moly": {
      "type": "http",
      "url": "https://moly-lido.vercel.app/api/mcp",
      "headers": {
        "x-lido-mode": "live",
        "x-lido-network": "mainnet"
      }
    }
  }
}`}</Pre>
        <Table headers={["Header", "Values", "Default"]} rows={[
          ["x-lido-mode", "simulation, live", "simulation"],
          ["x-lido-network", "testnet, mainnet", "testnet"],
          ["x-lido-chain", "hoodi, ethereum", "auto from network"],
        ]} />

        <H2>Verify</H2>
        <P>After adding the config, restart your agent and ask:</P>
        <Pre>{`What Lido tools are available?`}</Pre>
        <P>You should see all available tools. Then try:</P>
        <Pre>{`What's the stETH balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18?`}</Pre>

        <H2>Example Conversations</H2>
        <Pre title="Check Balance">{`You: What's the balance for 0x742d35Cc...?
Agent: [calls get_balance] Shows ETH, stETH, wstETH on Hoodi testnet.`}</Pre>
        <Pre title="Stake ETH">{`You: Stake 0.1 ETH
Agent: [calls stake_eth] Simulation: ~0.1 stETH expected, gas 82,431.`}</Pre>
        <Pre title="Governance">{`You: Show me the latest governance proposals
Agent: [calls get_proposals] Lists 5 most recent votes with status.`}</Pre>
        <Pre title="Multi-step">{`You: Check my balance, then wrap half my stETH
Agent: [calls get_balance] → [calls wrap_steth]
       Shows balance, then simulates the wrap.`}</Pre>

        <H2>Troubleshooting</H2>
        <Table headers={["Issue", "Fix"]} rows={[
          ["Tools not showing", "Restart your agent after config change"],
          ["Connection refused", "Check the URL has no typos"],
          ["Timeout errors", "RPC may be slow — retry in a moment"],
          ["Agent doesn't support HTTP MCP", "Check if your agent needs a different transport format"],
        ]} />
      </>
    ),
  },

  "mcp-server/code-samples": {
    title: "Code Samples",
    description: "Build agents that connect to the Moly MCP server programmatically",
    content: (
      <>
        <P>Three ways to connect to Moly programmatically. All examples point to the hosted server at <Code>https://moly-lido.vercel.app/api/mcp</Code>.</P>

        <H2>Anthropic API (MCP Connector)</H2>
        <P>The simplest approach. Anthropic handles the MCP connection — no MCP client library needed.</P>
        <Pre title="TypeScript">{`import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.beta.messages.create(
  {
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    mcp_servers: [
      {
        type: "url",
        url: "https://moly-lido.vercel.app/api/mcp",
        name: "moly",
      },
    ],
    messages: [
      {
        role: "user",
        content: "What's the stETH balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18?",
      },
    ],
    tools: [{ type: "mcp_toolset" }],
  },
  {
    betas: ["mcp-client-2025-11-20"],
  }
);

console.log(response.content);`}</Pre>
        <Callout type="tip">Pass <Code>x-lido-mode</Code> and <Code>x-lido-network</Code> headers in the <Code>mcp_servers</Code> entry to configure mode and network per-request.</Callout>

        <H2>Vercel AI SDK</H2>
        <P>Use the Vercel AI SDK&apos;s MCP client with any model.</P>
        <Pre title="TypeScript">{`import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createMCPClient } from "ai";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcpClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(
    new URL("https://moly-lido.vercel.app/api/mcp")
  ),
});

const tools = await mcpClient.tools();

const { text } = await generateText({
  model: anthropic("claude-sonnet-4-5-20250929"),
  tools,
  maxSteps: 5,
  prompt: "Simulate staking 0.1 ETH and show me the gas estimate",
});

console.log(text);
await mcpClient.close();`}</Pre>

        <H2>MCP SDK (TypeScript)</H2>
        <P>Use the MCP SDK directly for full control over tool calls.</P>
        <Pre title="TypeScript">{`import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://moly-lido.vercel.app/api/mcp")
);

const client = new Client({
  name: "my-agent",
  version: "1.0.0",
});
await client.connect(transport);

// List all available tools
const { tools } = await client.listTools();
console.log("Available tools:", tools.map((t) => t.name));

// Get stETH balance
const balance = await client.callTool({
  name: "get_balance",
  arguments: { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18" },
});
console.log("Balance:", balance.content);

// Simulate staking
const stake = await client.callTool({
  name: "stake_eth",
  arguments: { amount_eth: "0.1" },
});
console.log("Stake simulation:", stake.content);

await client.close();`}</Pre>

        <H2>Configure Mode & Network</H2>
        <P>Add custom headers to the transport to change defaults:</P>
        <Pre title="With headers (MCP SDK)">{`const transport = new StreamableHTTPClientTransport(
  new URL("https://moly-lido.vercel.app/api/mcp"),
  {
    requestInit: {
      headers: {
        "x-lido-mode": "simulation",
        "x-lido-network": "mainnet",
      },
    },
  }
);`}</Pre>
        <Table headers={["Header", "Values", "Default"]} rows={[
          ["x-lido-mode", "simulation, live", "simulation"],
          ["x-lido-network", "testnet, mainnet", "testnet"],
          ["x-lido-chain", "hoodi, ethereum", "auto from network"],
        ]} />
        <Callout type="warning">Live mode with a private key can broadcast real transactions. Always validate with simulation first.</Callout>
      </>
    ),
  },

  dashboard: {
    title: "Dashboard",
    description: "The Moly web dashboard — chat + sidebar",
    content: (
      <>
        <P>The Moly dashboard is a Next.js app with a two-panel layout: a primary chat interface on the left and a collapsible data sidebar on the right.</P>
        <Pre>{`┌──────────────────────────┬──────────────────┐
│                          │  Sidebar (320px) │
│   Chat Panel             │  - Balances      │
│   (primary surface)      │  - Protocol info │
│                          │  - Governance    │
│   [AI messages + tool    │                  │
│    results rendered       │  (collapsible)   │
│    inline as cards]      │                  │
│                          │                  │
│   ┌────────────────────┐ │                  │
│   │  Type a message... │ │                  │
│   └────────────────────┘ │                  │
└──────────────────────────┴──────────────────┘`}</Pre>
        <H2>Running Locally</H2>
        <Pre title="Terminal">{`bun install
bun run dev
# → http://localhost:3000`}</Pre>
        <P>The dashboard needs an <Code>OPENROUTER_API_KEY</Code> in <Code>.env.local</Code> for the chat AI to work.</P>
        <H2>Header Controls</H2>
        <UL items={[
          <><strong>Network toggle</strong> — switch between Hoodi testnet and Ethereum mainnet</>,
          <><strong>Mode toggle</strong> — switch between Simulation (dry-run) and Live</>,
          <><strong>Chain pill</strong> — shows current chain ID</>,
        ]} />
      </>
    ),
  },

  "dashboard/chat": {
    title: "Chat Interface",
    description: "How the AI chat works in the dashboard",
    content: (
      <>
        <P>The chat panel is the primary interaction surface. It connects to an AI agent that has access to all 13 Lido tools.</P>
        <H2>How It Works</H2>
        <UL items={[
          <>You type a message like <Code>What&apos;s the balance for 0x...?</Code></>,
          "The AI agent decides which tool(s) to call",
          "Tool results render inline as formatted cards",
          "The agent summarizes the results in natural language",
        ]} />
        <H2>Tool Result Cards</H2>
        <P>When the agent calls a tool, the result is displayed as a styled card:</P>
        <UL items={[
          <><strong>Balance cards</strong> — 3-column grid showing ETH, stETH, wstETH</>,
          <><strong>Simulation cards</strong> — dashed yellow border, showing gas estimates and expected outputs</>,
          <><strong>Proposal cards</strong> — list with vote counts and status badges</>,
          <><strong>Generic cards</strong> — key-value pairs for other tool results</>,
        ]} />
        <H2>Multi-Step Reasoning</H2>
        <P>The agent can chain up to 5 tool calls per message. For example:</P>
        <Pre>{`You: Compare my stETH and wstETH holdings, then show the conversion rate

Agent: [calls get_balance] → [calls get_conversion_rate]
       Shows both results and explains the relationship.`}</Pre>
        <H2>Stack</H2>
        <UL items={[
          <>Vercel AI SDK v6 with <Code>streamText</Code></>,
          "OpenRouter as the LLM gateway",
          "nvidia/nvidia/nemotron-3-nano-30b-a3b:free",
          "Tools defined with Zod schemas",
        ]} />
      </>
    ),
  },

  "dashboard/modes": {
    title: "Modes & Networks",
    description: "Understanding simulation vs live, testnet vs mainnet",
    content: (
      <>
        <P>The dashboard has two independent toggles in the header:</P>
        <H2>Mode: Simulation vs Live</H2>
        <H3>Simulation (Default)</H3>
        <UL items={[
          "All write operations return dry-run results",
          "Shows what would happen: gas cost, expected output, contract interactions",
          "No private key needed, no real funds at risk",
          "Yellow indicator in the header",
        ]} />
        <H3>Live</H3>
        <UL items={[
          "Write operations would execute real transactions",
          "The dashboard always runs as dry-run (no server-side private key)",
          "For real transactions, use the MCP server with Claude Code or Cursor",
          "Green indicator in the header",
        ]} />
        <Callout type="info">The dashboard never holds a private key. Live mode in the dashboard still shows simulation results. For real transactions, connect the MCP server to Claude Code.</Callout>
        <H2>Network: Testnet vs Mainnet</H2>
        <Table headers={["Network", "Chain", "Chain ID", "Description"]} rows={[
          ["Testnet", "Hoodi", "560048", "Safe for testing, free test ETH"],
          ["Mainnet", "Ethereum", "1", "Real ETH, real transactions"],
        ]} />
        <H2>Combining Mode × Network</H2>
        <Table headers={["", "Testnet (Hoodi)", "Mainnet (Ethereum)"]} rows={[
          ["Simulation", "Dry-run on Hoodi", "Dry-run on Mainnet"],
          ["Live (MCP only)", "Real txs on Hoodi (safe)", "Real txs on Mainnet (real ETH)"],
        ]} />
      </>
    ),
  },

  tools: {
    title: "Tools Reference",
    description: "All Lido tools available in Moly",
    content: (
      <>
        <P>Moly exposes 17 tools via the MCP server and 28 total across the CLI. The dashboard exposes the same 17 MCP tools (13 Lido core + 4 bridge). The CLI adds settings, bounds, ledger, position, and alert tools on top.</P>
        <H2>Read Tools (7)</H2>
        <Table headers={["Tool", "Parameters", "Returns"]} rows={[
          ["get_balance", "address?", "ETH, stETH, wstETH balances"],
          ["get_rewards", "address?, days?", "Reward history with APR"],
          ["get_conversion_rate", "(none)", "stETH ↔ wstETH rate"],
          ["get_withdrawal_requests", "address?", "Pending request IDs"],
          ["get_withdrawal_status", "request_ids", "Status per request"],
          ["get_proposals", "count?", "Recent DAO proposals"],
          ["get_proposal", "proposal_id", "Full proposal details"],
        ]} />
        <H2>Write Tools (6)</H2>
        <Table headers={["Tool", "Parameters", "Returns"]} rows={[
          ["stake_eth", "amount_eth, dry_run?", "stETH received, gas estimate"],
          ["request_withdrawal", "amount_steth, dry_run?", "Request ID, queue position"],
          ["claim_withdrawals", "request_ids, dry_run?", "ETH claimed"],
          ["wrap_steth", "amount_steth, dry_run?", "wstETH received"],
          ["unwrap_wsteth", "amount_wsteth, dry_run?", "stETH received"],
          ["cast_vote", "proposal_id, support, dry_run?", "Vote confirmation"],
        ]} />
        <Callout type="info">In simulation mode, all write tools automatically run as dry-run. Pass <Code>dry_run: false</Code> to override (MCP server only).</Callout>
        <H2>Bridge Tools (4, mainnet only)</H2>
        <P>Bridge ETH or wstETH from Base/Arbitrum to Ethereum L1 via the LI.FI protocol. These tools only work on mainnet.</P>
        <Table headers={["Tool", "Parameters", "Returns"]} rows={[
          ["get_l2_balance", "source_chain, address?", "ETH and wstETH balances on the L2"],
          ["get_bridge_quote", "source_chain, token, amount, to_token?", "Quote with estimated output, duration, fees"],
          ["bridge_to_ethereum", "source_chain, token, amount, to_token?, dry_run?", "Bridge tx hash (or simulation result)"],
          ["get_bridge_status", "tx_hash, source_chain", "Bridge progress: pending, in-progress, complete"],
        ]} />
        <Callout type="tip">Typical bridge flow: check balance with <Code>get_l2_balance</Code>, get a quote with <Code>get_bridge_quote</Code>, execute with <Code>bridge_to_ethereum</Code>, then track with <Code>get_bridge_status</Code>. Bridges take 1-20 minutes.</Callout>
        <H2>Settings Tools (2)</H2>
        <Table headers={["Tool", "Parameters", "Returns"]} rows={[
          ["get_settings", "(none)", "Current mode, network, RPC (keys redacted)"],
          ["update_settings", "network?, mode?, rpc?, model?", "Updated config"],
        ]} />
        <H2>Bounds Tools (2)</H2>
        <P>Policy bounds gate all write operations. The agent cannot exceed these limits.</P>
        <Table headers={["Tool", "Parameters", "Returns"]} rows={[
          ["get_bounds", "(none)", "Current limits: max stake per tx, daily cap, gas reserve, governance auto-vote"],
          ["set_bounds", "maxStakePerTx?, maxDailyStake?, minEthReserve?, autoRestakeThreshold?, governanceAutoVote?", "Updated bounds"],
        ]} />
        <H2>Position Tool (1)</H2>
        <Table headers={["Tool", "Parameters", "Returns"]} rows={[
          ["get_total_position", "address?", "Cross-chain aggregated position: ETH + stETH + wstETH across Ethereum, Base, Arbitrum"],
        ]} />
        <H2>Ledger Tools (2)</H2>
        <P>Every tool execution is logged to a SQLite ledger for auditability.</P>
        <Table headers={["Tool", "Parameters", "Returns"]} rows={[
          ["get_trade_history", "tool?, since?, limit?", "Filtered activity log entries"],
          ["get_staking_summary", "since?", "Aggregate stats: total ops, staked ETH, errors"],
        ]} />
        <H2>Alert Tools (4)</H2>
        <P>Configure alerts that trigger via Telegram or webhook when conditions are met. Requires the monitor daemon running (<Code>moly monitor start</Code>).</P>
        <Table headers={["Tool", "Parameters", "Returns"]} rows={[
          ["set_alert", "condition, threshold?, channel?", "Created alert with ID"],
          ["list_alerts", "(none)", "All configured alerts"],
          ["remove_alert", "id", "Removal confirmation"],
          ["configure_alert_channels", "telegram_token?, telegram_chat_id?, webhook_url?", "Updated channel config"],
        ]} />
      </>
    ),
  },

  "tools/read": {
    title: "Read Tools",
    description: "Query balances, rewards, rates, and status",
    content: (
      <>
        <H2>get_balance</H2>
        <P>Returns ETH, stETH, and wstETH balances for an address.</P>
        <Pre title="Parameters">{`{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
}`}</Pre>
        <Pre title="Response">{`{
  "eth": "1.5000",
  "steth": "0.8234",
  "wsteth": "0.7100",
  "chain": "Hoodi Testnet"
}`}</Pre>

        <H2>get_rewards</H2>
        <P>Returns staking reward history for an address.</P>
        <Pre title="Parameters">{`{ "address": "0x..." }`}</Pre>

        <H2>get_conversion_rate</H2>
        <P>Returns the current stETH/wstETH exchange rate. No parameters needed.</P>
        <Pre title="Response">{`{
  "steth_per_wsteth": "1.1547",
  "wsteth_per_steth": "0.8660"
}`}</Pre>

        <H2>get_withdrawal_requests</H2>
        <P>Returns pending withdrawal request IDs for an address.</P>

        <H2>get_withdrawal_status</H2>
        <P>Returns finalization status for specific request IDs.</P>
        <Pre title="Parameters">{`{ "request_ids": [1, 2, 3] }`}</Pre>
      </>
    ),
  },

  "tools/write": {
    title: "Write Tools",
    description: "Staking, wrapping, and withdrawal operations",
    content: (
      <>
        <Callout type="warning">Write tools execute real transactions in live mode. Always test with simulation first.</Callout>
        <H2>stake_eth</H2>
        <P>Stakes ETH and receives stETH in return.</P>
        <Pre title="Parameters">{`{
  "amount": "0.1",
  "dry_run": true
}`}</Pre>
        <Pre title="Simulation Response">{`{
  "simulation": true,
  "expected_steth": "~0.1",
  "estimated_gas": 82431,
  "note": "Dry-run: no transaction was broadcast"
}`}</Pre>

        <H2>request_withdrawal</H2>
        <P>Queues stETH for withdrawal. The withdrawal process takes 1-5 days to finalize.</P>
        <Pre title="Parameters">{`{ "amount": "0.5", "dry_run": true }`}</Pre>

        <H2>claim_withdrawals</H2>
        <P>Claims ETH from finalized withdrawal requests.</P>
        <Pre title="Parameters">{`{ "request_ids": [1, 2], "dry_run": true }`}</Pre>

        <H2>wrap_steth</H2>
        <P>Wraps stETH into wstETH (non-rebasing wrapper for DeFi).</P>
        <Pre title="Parameters">{`{ "amount": "1.0", "dry_run": true }`}</Pre>

        <H2>unwrap_wsteth</H2>
        <P>Unwraps wstETH back to stETH.</P>
        <Pre title="Parameters">{`{ "amount": "1.0", "dry_run": true }`}</Pre>
      </>
    ),
  },

  "tools/governance": {
    title: "Governance Tools",
    description: "Query and vote on Lido DAO proposals",
    content: (
      <>
        <H2>get_proposals</H2>
        <P>Returns recent DAO governance proposals with vote counts and status.</P>
        <Pre title="Parameters">{`{
  "limit": 5,
  "offset": 0
}`}</Pre>
        <Pre title="Response">{`{
  "proposals": [
    {
      "id": 180,
      "status": "Executed",
      "yea": "52340000.00",
      "nay": "0.00",
      "voting_power": "72.3%"
    }
  ]
}`}</Pre>

        <H2>get_proposal</H2>
        <P>Returns full details for a single proposal.</P>
        <Pre title="Parameters">{`{ "proposal_id": 180 }`}</Pre>

        <H2>cast_vote</H2>
        <P>Casts a vote on an active governance proposal.</P>
        <Pre title="Parameters">{`{
  "proposal_id": 180,
  "support": true,
  "dry_run": true
}`}</Pre>
        <Callout type="info">Voting requires holding LDO tokens. The vote weight equals your LDO balance at the proposal snapshot block.</Callout>
      </>
    ),
  },

  "tools/bridge": {
    title: "Bridge Tools",
    description: "Bridge ETH and wstETH from L2 to Ethereum L1",
    content: (
      <>
        <Callout type="warning">Bridge tools only work on mainnet. They use the LI.FI protocol to route cross-chain transfers. Testnets are not supported.</Callout>

        <H2>get_l2_balance</H2>
        <P>Returns ETH and wstETH balances on an L2 chain. Use this before bridging to check available funds.</P>
        <Pre title="Parameters">{`{
  "source_chain": "base",
  "address": "0x..."
}`}</Pre>
        <Pre title="Response">{`{
  "address": "0x...",
  "chain": "Base",
  "chainId": 8453,
  "balances": { "ETH": "0.5", "wstETH": "1.2" }
}`}</Pre>

        <H2>get_bridge_quote</H2>
        <P>Gets a quote for bridging tokens from an L2 to Ethereum L1. Requires a configured wallet address for routing.</P>
        <Pre title="Parameters">{`{
  "source_chain": "arbitrum",
  "token": "wstETH",
  "amount": "0.5",
  "to_token": "ETH"
}`}</Pre>
        <Pre title="Response">{`{
  "sourceChain": "Arbitrum One",
  "token": "wstETH",
  "amount": "0.5",
  "toToken": "ETH",
  "toAmount": "0.5742",
  "estimatedDuration": "3 min",
  "tool": "across"
}`}</Pre>

        <H2>bridge_to_ethereum</H2>
        <P>Executes a bridge transaction from Base or Arbitrum to Ethereum L1. Requires a private key. In simulation mode, returns a quote without broadcasting.</P>
        <Pre title="Parameters">{`{
  "source_chain": "base",
  "token": "ETH",
  "amount": "0.1",
  "dry_run": true
}`}</Pre>
        <Callout type="info">For wstETH bridging, the tool handles ERC-20 approval automatically before sending the bridge transaction.</Callout>

        <H2>get_bridge_status</H2>
        <P>Checks the status of an in-progress bridge transaction. Use the tx hash returned by bridge_to_ethereum.</P>
        <Pre title="Parameters">{`{
  "tx_hash": "0xabc...",
  "source_chain": "base"
}`}</Pre>
        <Pre title="Response">{`{
  "txHash": "0xabc...",
  "sourceChain": "Base",
  "status": "DONE",
  "sending": { "txHash": "0xabc...", "amount": "100000000000000000" },
  "receiving": { "txHash": "0xdef...", "amount": "99500000000000000" }
}`}</Pre>
        <Callout type="tip">Bridges typically take 1-20 minutes. Poll with get_bridge_status until status is DONE.</Callout>
      </>
    ),
  },

  "tools/management": {
    title: "Bounds, Alerts & Ledger",
    description: "Policy bounds, alert monitoring, position tracking, and activity ledger",
    content: (
      <>
        <H2>Policy Bounds</H2>
        <P>Bounds gate all write operations. The agent cannot exceed these limits, preventing runaway transactions.</P>

        <H3>get_bounds</H3>
        <P>Returns the current policy bounds.</P>
        <Pre title="Response">{`{
  "maxStakePerTx": 10,
  "maxDailyStake": 50,
  "minEthReserve": 0.5,
  "autoRestakeThreshold": 0.05,
  "governanceAutoVote": false
}`}</Pre>

        <H3>set_bounds</H3>
        <P>Updates one or more policy bounds. Only pass the fields you want to change.</P>
        <Pre title="Parameters">{`{
  "maxStakePerTx": 2.0,
  "minEthReserve": 0.3,
  "governanceAutoVote": true
}`}</Pre>
        <Callout type="info">If <Code>governanceAutoVote</Code> is false, the agent cannot call <Code>cast_vote</Code>. Set it to true to allow autonomous voting.</Callout>

        <H2>Cross-chain Position</H2>

        <H3>get_total_position</H3>
        <P>Returns an aggregated position across Ethereum mainnet, Base, and Arbitrum, all converted to ETH equivalent.</P>
        <Pre title="Parameters">{`{ "address": "0x..." }`}</Pre>

        <H2>Alerts</H2>
        <P>Alerts fire via Telegram or webhook when conditions are met. Requires the monitor daemon (<Code>moly monitor start</Code>).</P>

        <H3>set_alert</H3>
        <P>Creates a new alert rule. Supported conditions:</P>
        <Table headers={["Condition", "Threshold", "Fires when"]} rows={[
          ["balance_below", "ETH amount", "ETH balance drops below threshold"],
          ["balance_above", "ETH amount", "ETH balance rises above threshold"],
          ["reward_rate_below", "Rate", "Staking reward rate drops below threshold"],
          ["reward_rate_above", "Rate", "Staking reward rate rises above threshold"],
          ["withdrawal_ready", "None", "Any pending withdrawal is finalized"],
          ["proposal_new", "None", "A new governance proposal is created"],
          ["conversion_rate_above", "Rate", "stETH/wstETH rate exceeds threshold"],
          ["conversion_rate_below", "Rate", "stETH/wstETH rate drops below threshold"],
          ["reward_delta", "ETH amount", "Reward change exceeds threshold"],
          ["governance_expiring", "None", "A governance vote is about to expire"],
        ]} />
        <Pre title="Parameters">{`{
  "condition": "balance_below",
  "threshold": 1.0,
  "channel": "telegram"
}`}</Pre>

        <H3>list_alerts / remove_alert</H3>
        <P><Code>list_alerts</Code> returns all configured alerts. <Code>remove_alert</Code> takes an alert ID to delete it.</P>

        <H3>configure_alert_channels</H3>
        <P>Sets up Telegram or webhook notification channels.</P>
        <Pre title="Parameters">{`{
  "telegram_token": "123456:ABC...",
  "telegram_chat_id": "-100123456",
  "webhook_url": "https://example.com/hook"
}`}</Pre>

        <H2>Activity Ledger</H2>
        <P>Every tool execution is logged to a SQLite database for auditability.</P>

        <H3>get_trade_history</H3>
        <P>Query the ledger with optional filters by tool name, date range, and result limit.</P>
        <Pre title="Parameters">{`{
  "tool": "stake_eth",
  "since": "2026-01-01",
  "limit": 20
}`}</Pre>

        <H3>get_staking_summary</H3>
        <P>Returns aggregate stats: total operations, total ETH staked, error count.</P>
        <Pre title="Parameters">{`{ "since": "2026-01-01" }`}</Pre>
      </>
    ),
  },

  "guides/stake-eth": {
    title: "Stake ETH",
    description: "Step-by-step guide to staking ETH through Moly",
    content: (
      <>
        <P>This guide walks through staking ETH for stETH using both the dashboard chat and the MCP server.</P>
        <H2>Via Dashboard Chat</H2>
        <P>Open the dashboard and type in the chat:</P>
        <Pre>{`Simulate staking 0.1 ETH`}</Pre>
        <P>The agent will call <Code>stake_eth</Code> with <Code>dry_run: true</Code> and show:</P>
        <UL items={[
          "Expected stETH output (~0.1 stETH)",
          "Estimated gas cost",
          "A note that no transaction was broadcast",
        ]} />
        <H2>Via MCP Server (Claude Code)</H2>
        <P>With the MCP server connected to Claude Code:</P>
        <Pre>{`You: Stake 0.1 ETH on Hoodi testnet
Claude: I'll stake 0.1 ETH for you.
        [calls stake_eth with amount: "0.1"]
        Transaction sent! Hash: 0xabc...
        Expected stETH: ~0.1
        Gas used: 82,431`}</Pre>
        <Callout type="tip">Always test with simulation mode first. Switch to live mode only when you are ready to execute real transactions.</Callout>
        <H2>What Happens When You Stake</H2>
        <UL items={[
          "Your ETH is sent to the Lido staking contract",
          "You receive stETH (a rebasing liquid staking token) in return",
          "stETH balance grows daily as staking rewards accrue",
          "You can use stETH in DeFi, wrap it to wstETH, or withdraw back to ETH",
        ]} />
      </>
    ),
  },

  "guides/wrap-unwrap": {
    title: "Wrap & Unwrap",
    description: "Convert between stETH and wstETH",
    content: (
      <>
        <H2>Why Wrap?</H2>
        <P>stETH is a rebasing token — its balance changes daily as rewards accrue. Some DeFi protocols prefer a non-rebasing token. wstETH (wrapped stETH) solves this: its balance stays constant while its value increases.</P>
        <H2>Wrap stETH → wstETH</H2>
        <Pre>{`You: Wrap 1 stETH to wstETH
Agent: [calls wrap_steth]
       Simulation: ~0.866 wstETH expected
       Gas estimate: 65,000`}</Pre>
        <H2>Unwrap wstETH → stETH</H2>
        <Pre>{`You: Unwrap 0.5 wstETH
Agent: [calls unwrap_wsteth]
       Simulation: ~0.577 stETH expected
       Gas estimate: 62,000`}</Pre>
        <H2>Conversion Rate</H2>
        <P>Check the current rate any time:</P>
        <Pre>{`You: What's the stETH to wstETH conversion rate?
Agent: [calls get_conversion_rate]
       1 wstETH = 1.1547 stETH
       1 stETH  = 0.8660 wstETH`}</Pre>
      </>
    ),
  },

  "guides/withdrawals": {
    title: "Withdrawals",
    description: "Request and claim ETH withdrawals",
    content: (
      <>
        <P>Lido withdrawals are a two-step process: request, then claim after finalization.</P>
        <H2>Step 1: Request Withdrawal</H2>
        <Pre>{`You: Request withdrawal of 0.5 stETH
Agent: [calls request_withdrawal]
       Request ID: 12345
       Estimated wait: 1-5 days`}</Pre>
        <H2>Step 2: Check Status</H2>
        <Pre>{`You: Check status of withdrawal request 12345
Agent: [calls get_withdrawal_status]
       Request #12345: Pending (not yet finalized)`}</Pre>
        <H2>Step 3: Claim</H2>
        <P>Once the request is finalized:</P>
        <Pre>{`You: Claim withdrawal 12345
Agent: [calls claim_withdrawals]
       Claimed 0.5 ETH from request #12345`}</Pre>
        <Callout type="info">Withdrawal finalization depends on Ethereum&apos;s validator exit queue. Typical wait is 1-5 days but can be longer during high demand.</Callout>
      </>
    ),
  },

  "guides/governance": {
    title: "Governance Voting",
    description: "Participate in Lido DAO governance",
    content: (
      <>
        <H2>View Proposals</H2>
        <Pre>{`You: Show me recent governance proposals
Agent: [calls get_proposals]
       #180 - Executed  | Yea: 52.3M | Nay: 0
       #179 - Executed  | Yea: 48.1M | Nay: 1.2M
       #178 - Rejected  | Yea: 12.0M | Nay: 35.5M`}</Pre>
        <H2>Get Proposal Details</H2>
        <Pre>{`You: Tell me more about proposal #180
Agent: [calls get_proposal]
       Proposal #180: Update Oracle Quorum
       Status: Executed
       Created: 2024-01-15
       Votes: 52.3M Yea / 0 Nay (72.3% participation)`}</Pre>
        <H2>Cast a Vote</H2>
        <Pre>{`You: Vote yes on proposal #181
Agent: [calls cast_vote]
       Simulation: Vote "Yea" on proposal #181
       Requires: LDO tokens in your wallet`}</Pre>
        <Callout type="info">Voting requires LDO governance tokens. Your voting power equals your LDO balance at the proposal&apos;s snapshot block.</Callout>
      </>
    ),
  },

  chains: {
    title: "Supported Chains",
    description: "Networks supported by Moly",
    content: (
      <>
        <H2>Hoodi Testnet</H2>
        <Table headers={["Property", "Value"]} rows={[
          ["Chain ID", "560048"],
          ["RPC", "https://eth-hoodi.g.alchemy.com/v2/9GGes9QipD09NUv7CJue2"],
          ["Explorer", "https://hoodi.etherscan.io"],
          ["Purpose", "Testing — free test ETH"],
        ]} />
        <H3>Contract Addresses</H3>
        <Table headers={["Contract", "Address"]} rows={[
          ["stETH", "0x3508A952..."],
          ["wstETH", "0x7E99eE3C..."],
          ["Withdrawal Queue", "0xfe56573..."],
          ["Voting (Aragon)", "0x49B3512c..."],
        ]} />

        <H2>Ethereum Mainnet</H2>
        <Table headers={["Property", "Value"]} rows={[
          ["Chain ID", "1"],
          ["RPC", "https://eth-mainnet.g.alchemy.com/v2/..."],
          ["Explorer", "https://etherscan.io"],
          ["Purpose", "Production — real ETH"],
        ]} />
        <H3>Contract Addresses</H3>
        <Table headers={["Contract", "Address"]} rows={[
          ["stETH", "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"],
          ["wstETH", "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"],
          ["Withdrawal Queue", "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1"],
          ["Voting (Aragon)", "0x2e59A20f205bB85a89C53f1936454680651E618e"],
        ]} />
        <Callout type="warning">Always verify contract addresses against the official Lido documentation at docs.lido.fi/deployed-contracts.</Callout>
      </>
    ),
  },

  faq: {
    title: "FAQ",
    description: "Frequently asked questions about Moly",
    content: (
      <>
        <H2>General</H2>
        <H3>What is Moly?</H3>
        <P>Moly is an open-source project that makes the Lido staking protocol accessible through AI assistants. It includes an MCP server (17 tools over stdio) and a web dashboard with an AI chat interface.</P>
        <H3>Is Moly safe to use?</H3>
        <P>In simulation mode (the default), all write operations are dry-runs — no real transactions are sent. The dashboard never holds private keys. Only the MCP server in live mode can send real transactions.</P>
        <H3>Which AI models does it work with?</H3>
        <P>The MCP server works with any MCP-compatible client: Claude Code, Claude Desktop, Cursor, and others. The dashboard uses OpenRouter and can work with any model available there.</P>

        <H2>Technical</H2>
        <H3>Why does the MCP server need Bun?</H3>
        <P>The Lido SDK has dependencies that require the Bun runtime. The dashboard avoids this by using raw viem contract calls instead.</P>
        <H3>Can I use the dashboard without OpenRouter?</H3>
        <P>The chat feature requires an OpenRouter API key. The sidebar data (balances, stats) works without it since those are direct RPC calls.</P>
        <H3>Why are governance proposals sometimes empty?</H3>
        <P>The Hoodi testnet may not have active governance contracts deployed. Governance features work best on Ethereum mainnet.</P>

        <H2>Troubleshooting</H2>
        <H3>Chat says &quot;Failed to fetch&quot;</H3>
        <P>Check that your <Code>OPENROUTER_API_KEY</Code> is set in <Code>.env.local</Code> and restart the dev server.</P>
        <H3>Balances show 0 for everything</H3>
        <P>Make sure you are checking an address that has funds on the selected network. On Hoodi testnet, you may need to get test ETH first.</P>
        <H3>MCP server won&apos;t start</H3>
        <P>Ensure Bun is installed (<Code>bun --version</Code>), the <Code>PRIVATE_KEY</Code> env var is set, and you are running from the <Code>mcp/</Code> directory.</P>
      </>
    ),
  },

  // ── CLI Package ──────────────────────────────────────────────────────────

  "cli": {
    title: "npx @moly-mcp/lido",
    description: "Zero-config Lido MCP Server you can run instantly with npx — no local setup required.",
    content: (
      <>
        <H2>What is it?</H2>
        <P>
          <Code>@moly-mcp/lido</Code> is a standalone npm package that runs a full Lido MCP server on your machine.
          Any MCP-compatible AI client (Claude Desktop, Cursor, Windsurf) can connect to it and interact with
          Lido staking, withdrawals, wrapping, and governance — without you writing a single line of code.
        </P>

        <Callout type="tip">
          The private key and API keys are stored locally in <Code>~/.moly/config.json</Code> (chmod 600).
          They never leave your machine.
        </Callout>

        <H2>Quick start</H2>
        <Pre title="Terminal">{`# Run once — wizard launches on first use
npx @moly-mcp/lido`}</Pre>
        <P>The interactive wizard walks you through network, mode, optional private key, and AI provider selection. When done it prints the exact config snippet to paste into your AI client.</P>

        <H2>Commands</H2>
        <Table
          headers={["Command", "Description"]}
          rows={[
            ["npx @moly-mcp/lido", "First run: wizard → MCP server. Subsequent runs: start server directly"],
            ["moly setup", "Re-run the full setup wizard"],
            ["moly config", "Print current configuration (keys redacted)"],
            ["moly reset", "Delete ~/.moly/config.json and start fresh"],
            ["npx @moly-mcp/lido --server", "Force-start MCP server (use this in AI client configs)"],
          ]}
        />

        <H2>Add to your AI client</H2>
        <H3>Claude Desktop</H3>
        <Pre title="~/Library/Application Support/Claude/claude_desktop_config.json">{`{
  "mcpServers": {
    "moly": {
      "command": "npx",
      "args": ["@moly-mcp/lido", "--server"]
    }
  }
}`}</Pre>
        <H3>Cursor</H3>
        <Pre title="~/.cursor/mcp.json">{`{
  "mcpServers": {
    "moly": {
      "command": "npx",
      "args": ["@moly-mcp/lido", "--server"]
    }
  }
}`}</Pre>
        <H3>Windsurf</H3>
        <Pre title="~/.codeium/windsurf/mcp_config.json">{`{
  "mcpServers": {
    "moly": {
      "command": "npx",
      "args": ["@moly-mcp/lido", "--server"]
    }
  }
}`}</Pre>

        <H2>Available tools</H2>
        <P>Once connected, your AI client has access to all 17 MCP tools:</P>
        <Table
          headers={["Tool", "Type", "Description"]}
          rows={[
            ["get_balance", "Read", "ETH, stETH, wstETH balances"],
            ["get_rewards", "Read", "Staking reward history over N days"],
            ["get_conversion_rate", "Read", "stETH ↔ wstETH exchange rate"],
            ["get_withdrawal_requests", "Read", "Pending withdrawal NFT IDs"],
            ["get_withdrawal_status", "Read", "Finalization status per request"],
            ["get_proposals", "Read", "Recent Lido DAO proposals"],
            ["get_proposal", "Read", "Single proposal details"],
            ["get_total_position", "Read", "Cross-chain aggregated position (ETH + Base + Arbitrum)"],
            ["get_bounds", "Read", "Current policy bounds"],
            ["get_trade_history", "Read", "Query activity ledger with filters"],
            ["get_staking_summary", "Read", "Aggregate ledger stats"],
            ["get_settings", "Read", "Current mode, network, RPC"],
            ["stake_eth", "Write", "Stake ETH → receive stETH"],
            ["request_withdrawal", "Write", "Enter Lido withdrawal queue"],
            ["claim_withdrawals", "Write", "Claim finalized withdrawals"],
            ["wrap_steth", "Write", "stETH → wstETH"],
            ["unwrap_wsteth", "Write", "wstETH → stETH"],
            ["cast_vote", "Write", "Vote on Lido DAO proposal"],
            ["set_bounds", "Write", "Update policy bounds"],
            ["update_settings", "Write", "Change mode/network/RPC mid-conversation"],
            ["get_l2_balance", "Bridge", "L2 balances on Base or Arbitrum (mainnet only)"],
            ["get_bridge_quote", "Bridge", "Quote for bridging to Ethereum L1"],
            ["bridge_to_ethereum", "Bridge", "Bridge ETH/wstETH from L2 to L1"],
            ["get_bridge_status", "Bridge", "Track in-progress bridge transaction"],
            ["set_alert", "Alert", "Create alert rule"],
            ["list_alerts", "Alert", "List all configured alerts"],
            ["remove_alert", "Alert", "Remove alert by ID"],
            ["configure_alert_channels", "Alert", "Set Telegram/webhook notification config"],
          ]}
        />
        <Callout type="info">
          All write tools support <Code>dry_run</Code>. In simulation mode, dry_run defaults to true — nothing is ever broadcast unless you explicitly set it to false and switch to live mode. Bridge tools only work on mainnet.
        </Callout>
      </>
    ),
  },

  "cli/setup": {
    title: "Setup Wizard",
    description: "What the interactive setup wizard asks and how to reconfigure.",
    content: (
      <>
        <H2>First run</H2>
        <P>On first run (<Code>npx @moly-mcp/lido</Code>), the wizard guides you through five steps:</P>

        <H3>1. Network</H3>
        <P>Choose between <strong>Hoodi Testnet</strong> (chain 560048, safe for testing) and <strong>Ethereum Mainnet</strong> (chain 1, real assets). You can switch later with <Code>update_settings</Code> or <Code>moly setup</Code>.</P>

        <H3>2. Custom RPC (optional)</H3>
        <P>Leave blank to use the default public RPC for your chosen network. Provide your own if you have an Alchemy, Infura, or private node URL.</P>
        <Table
          headers={["Network", "Default RPC"]}
          rows={[
            ["Hoodi Testnet", "https://hoodi.drpc.org"],
            ["Ethereum Mainnet", "https://eth.llamarpc.com"],
          ]}
        />

        <H3>3. Mode</H3>
        <Table
          headers={["Mode", "Behavior"]}
          rows={[
            ["Simulation", "All write tools dry_run by default — gas estimates only, nothing sent"],
            ["Live", "Real transactions broadcast — requires private key"],
          ]}
        />

        <H3>4. Private key (optional)</H3>
        <P>
          Only required for Live mode. Stored in <Code>~/.moly/config.json</Code> with <Code>chmod 600</Code>
          — readable only by your OS user. Never transmitted, never logged.
        </P>
        <Callout type="warning">
          Private key can only be added or changed via <Code>moly setup</Code>. The <Code>update_settings</Code> MCP
          tool intentionally cannot touch it.
        </Callout>

        <H3>5. AI provider (optional)</H3>
        <P>Choose your provider and model. This stores the API key locally for future use.</P>
        <Table
          headers={["Provider", "Supported models"]}
          rows={[
            ["Anthropic (Claude)", "claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5-20251001, custom"],
            ["Google (Gemini)", "gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash, custom"],
            ["OpenRouter", "Any OpenRouter model slug (e.g. anthropic/claude-sonnet-4-6)"],
          ]}
        />

        <H2>Reconfigure anytime</H2>
        <Pre title="Terminal">{`# Full wizard
moly setup

# Show current config (keys redacted)
moly config

# Start fresh
moly reset`}</Pre>

        <H2>Change settings mid-conversation</H2>
        <P>The <Code>update_settings</Code> MCP tool lets your AI agent change mode, network, or RPC without leaving the chat:</P>
        <Pre title="Example prompts">{`"Switch to live mode"
"Change network to mainnet"
"Use RPC https://my-node.example.com"
"Switch back to simulation"`}</Pre>
      </>
    ),
  },

  "cli/configuration": {
    title: "Configuration Reference",
    description: "Full reference for ~/.moly/config.json schema and environment.",
    content: (
      <>
        <H2>Config file</H2>
        <P>All settings live in <Code>~/.moly/config.json</Code>. The file is created on first run with permissions <Code>chmod 600</Code> (owner read/write only).</P>

        <Pre title="~/.moly/config.json schema">{`{
  "network": "hoodi" | "mainnet",
  "mode": "simulation" | "live",
  "rpc": "https://custom.rpc" | null,
  "privateKey": "0x..." | null,
  "ai": {
    "provider": "anthropic" | "google" | "openrouter" | null,
    "apiKey": "sk-...",
    "model": "claude-sonnet-4-6"
  } | null,
  "setupComplete": true
}`}</Pre>

        <H2>Fields</H2>
        <Table
          headers={["Field", "Type", "Description"]}
          rows={[
            ["network", '"hoodi" | "mainnet"', "Which chain to connect to"],
            ["mode", '"simulation" | "live"', "Simulation = dry_run default. Live = real transactions."],
            ["rpc", "string | null", "Custom RPC URL. null = use network default."],
            ["privateKey", "string | null", "0x-prefixed private key. Required for live write transactions."],
            ["ai.provider", "string | null", "anthropic, google, or openrouter"],
            ["ai.apiKey", "string", "API key for chosen provider"],
            ["ai.model", "string", "Model ID (e.g. claude-sonnet-4-6)"],
          ]}
        />

        <H2>Chain addresses</H2>
        <Table
          headers={["Contract", "Hoodi Testnet", "Ethereum Mainnet"]}
          rows={[
            ["Chain ID", "560048", "1"],
            ["stETH", "0x3508A952...176a", "0xae7ab965...84"],
            ["wstETH", "0x7E99eE3C...De4", "0x7f39C581...a0"],
            ["Voting", "0x49B3512c...01B", "0x2e59A20f...8e"],
          ]}
        />

        <Callout type="warning">
          Holesky testnet is deprecated and not supported. Use Hoodi for all testnet operations.
        </Callout>

        <H2>Security model</H2>
        <P>The private key and AI API keys are stored only in <Code>~/.moly/config.json</Code> on your local machine. They are:</P>
        <ul>
          <li>Never printed to stdout or stderr</li>
          <li>Never sent to any remote server by Moly</li>
          <li>Never changeable via the MCP <Code>update_settings</Code> tool</li>
          <li>Only accessible to your OS user (chmod 600)</li>
        </ul>
        <P>To rotate your private key or API key, run <Code>moly setup</Code> and re-enter them.</P>
      </>
    ),
  },
};
