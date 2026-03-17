---
description: The Moly web dashboard — agentic chat meets DeFi data
---

# Dashboard Overview

The Moly dashboard is a Next.js web app that combines an AI chat interface with real-time Lido protocol data.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  Header: Moly │ [Testnet ⟷ Mainnet] [Sim ⟷ Live] │
├────────────────────────────┬────────────────────────┤
│                            │  Sidebar (320px)       │
│   Chat Panel               │  - Track address       │
│   (primary surface)        │  - Balances            │
│                            │  - Protocol stats      │
│   AI messages + tool       │  - Governance          │
│   results rendered         │                        │
│   inline as cards          │  (collapsible)         │
│                            │                        │
│   ┌──────────────────────┐ │                        │
│   │  Type a message...   │ │                        │
│   └──────────────────────┘ │                        │
└────────────────────────────┴────────────────────────┘
```

## Features

| Feature | Description |
| --- | --- |
| **AI Chat** | Talk to Moly — it calls tools and shows results inline |
| **Tool Result Cards** | Balances, proposals, and simulations render as styled cards |
| **Mode Toggle** | Switch between Simulation (dry-run) and Live |
| **Network Toggle** | Switch between Testnet (Hoodi) and Mainnet (Ethereum) |
| **Sidebar** | Track addresses, view protocol stats, browse governance |
| **Collapsible** | Sidebar collapses to maximize chat space |

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS + custom CSS variables |
| AI | Vercel AI SDK v6 + OpenRouter |
| Model | `nvidia/nemotron-3-super-120b-a12b:free` |
| Chain Data | viem (raw RPC calls, no Lido SDK) |

## Why No Lido SDK in the Dashboard?

The Lido SDK requires Bun and has Node.js compatibility issues. The dashboard uses raw viem contract calls for all 13 tool functions, keeping the dashboard purely Node.js-compatible while the MCP server uses the full Lido SDK.

---

Next: [Chat Interface](chat.md)
