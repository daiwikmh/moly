---
description: AI-native staking interface for Lido on Ethereum
---

# Welcome to Moly

<div align="center">

**Moly** is an open-source MCP server and agentic dashboard that lets you interact with the [Lido](https://lido.fi) liquid staking protocol through natural language.

_Stake ETH. Wrap stETH. Vote on proposals. All from a conversation._

</div>

---

## What is Moly?

Moly is an AI-native interface to Lido with three deployment options:

| Component | What it does | When to use |
| --- | --- | --- |
| **CLI (`@moly-mcp/lido`)** | Terminal-first staking with setup wizard, activity ledger, alerts, and policy bounds | Default choice — local automation, full control |
| **MCP Server** | Model Context Protocol server for embedding in custom agent setups | When CLI doesn't fit your workflow |
| **Dashboard** | Next.js web app with embedded AI chat and real-time data | When you prefer a browser interface |

## Why Moly?

Traditional DeFi requires switching between block explorers, protocol UIs, and wallets. Moly collapses that into a single conversation:

```
You:   "Stake 0.5 ETH on Hoodi testnet"
Moly:  Calling stake_eth...
       Simulated: 0.5 ETH → ~0.5 stETH
       Estimated gas: 82,431
       Ready to execute? Use MCP server in live mode.
```

## Supported Chains

| Network | Chain | Chain ID | Status |
| --- | --- | --- | --- |
| Testnet | **Hoodi** | 560048 | Active |
| Mainnet | **Ethereum** | 1 | Active |

> **Note:** Holesky testnet is deprecated. Moly uses Hoodi for all testnet operations.

## Quick Start

1. **[Installation](setup/installation.md)** — `npx @moly-mcp/lido` in under 2 minutes
2. **[Quick Start](setup/quick-start.md)** — Run the CLI and stake your first ETH
3. **[Tools Reference](tools/overview.md)** — All 17 tools with parameters and examples

## Using Other Deployment Methods

- **[MCP Server Setup](mcp-server/overview.md)** — Embed in custom agent setups
- **[Dashboard](dashboard/overview.md)** — Web browser interface

---

## For AI Agents

Agents can automatically discover and use Moly via:

- **`/skill`** — Web-readable skill document with mental model and workflows
- **`/api/skill`** — Raw markdown endpoint (Content-Type: text/markdown) for agent integration
- **All tools** — 28 Lido tools exposed via MCP with dry_run safety by default

Agents should read the skill document first to understand Lido mechanics, governance, withdrawal queue, safe patterns, and policy bounds.

## Built With

| Tech | Role |
| --- | --- |
| [Bun](https://bun.sh) | MCP server runtime |
| [Model Context Protocol](https://modelcontextprotocol.io) | AI tool interface |
| [Lido SDK](https://docs.lido.fi/integrations/sdk) | Protocol interactions |
| [viem](https://viem.sh) | Ethereum client |
| [Next.js 16](https://nextjs.org) | Dashboard framework |
| [Vercel AI SDK v6](https://sdk.vercel.ai) | Chat streaming |
| [OpenRouter](https://openrouter.ai) | LLM gateway |
