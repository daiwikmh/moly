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

Moly has two parts:

| Component | What it does |
| --- | --- |
| **MCP Server** | A Model Context Protocol server with 13 Lido tools. Point Claude, Cursor, or any MCP-compatible AI at it and stake ETH from a chat. |
| **Dashboard** | A Next.js web app with an embedded AI chat panel, real-time protocol data, and simulation support. |

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

## Quick Links

<table data-card-size="large" data-view="cards">
<thead><tr><th></th><th></th></tr></thead>
<tbody>
<tr><td><strong>Get Started</strong></td><td>Install Moly in under 2 minutes</td></tr>
<tr><td><strong>MCP Server Setup</strong></td><td>Connect Claude Code, Desktop, or Cursor</td></tr>
<tr><td><strong>Tools Reference</strong></td><td>All 13 tools with parameters and examples</td></tr>
<tr><td><strong>Stake ETH Guide</strong></td><td>End-to-end walkthrough</td></tr>
</tbody>
</table>

---

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
