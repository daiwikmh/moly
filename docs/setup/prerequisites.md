---
description: What you need before installing Moly
---

# Prerequisites

## Required

| Dependency | Version | Why |
| --- | --- | --- |
| **Bun** | v1.0+ | Runtime for both MCP server and dashboard |
| **Node.js** | v18+ | Required by Next.js |
| **Git** | Any | Clone the repo |

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

## For the Dashboard

| Dependency | Why |
| --- | --- |
| **OpenRouter API Key** | Powers the AI chat (free models available) |

Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys). The default model (`nvidia/nemotron-3-super-120b-a12b`) is free.

## For the MCP Server (Live Mode)

| Dependency | Why |
| --- | --- |
| **Ethereum Private Key** | Signs transactions in live mode |
| **Hoodi Testnet ETH** | For testnet staking (get from faucets) |

> **Security:** Never commit private keys. Use `.env` files and keep them in `.gitignore`.

## For AI Clients

You'll need at least one MCP-compatible client:

| Client | Setup Guide |
| --- | --- |
| Claude Code | [claude-code.md](../mcp-server/claude-code.md) |
| Claude Desktop | [claude-desktop.md](../mcp-server/claude-desktop.md) |
| Cursor | [cursor.md](../mcp-server/cursor.md) |

---

Next: [Installation](installation.md)
