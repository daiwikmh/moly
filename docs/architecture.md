---
description: How Moly is built — architecture and design decisions
---

# Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    AI Clients                             │
│   Claude Code  │  Claude Desktop  │  Cursor  │  Others   │
└───────┬────────┴────────┬─────────┴────┬─────┴──────────┘
        │ stdio           │ stdio        │ stdio
        ▼                 ▼              ▼
┌──────────────────────────────────────────────────────────┐
│                   Moly MCP Server                         │
│   Bun + TypeScript                                        │
│   @modelcontextprotocol/sdk                               │
│   @lidofinance/lido-ethereum-sdk + viem                   │
│   13 tools │ simulation/live mode │ Hoodi/Mainnet         │
└──────────────────────────┬───────────────────────────────┘
                           │ JSON-RPC (eth_call, eth_send)
                           ▼
┌──────────────────────────────────────────────────────────┐
│                     Ethereum                              │
│         Hoodi Testnet (560048)  │  Mainnet (1)            │
│         Lido contracts          │  Lido contracts         │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                   Moly Dashboard                          │
│   Next.js 16 + Tailwind + Vercel AI SDK v6                │
│   ┌─────────────────┐  ┌──────────────────────────┐      │
│   │  /api/chat       │  │  /api/lido               │      │
│   │  streamText +    │  │  REST endpoints          │      │
│   │  13 tool defs    │  │  stats, balances,        │      │
│   │  OpenRouter LLM  │  │  proposals               │      │
│   └────────┬─────────┘  └────────────┬─────────────┘      │
│            │                          │                    │
│            ▼                          ▼                    │
│   lib/lido.ts (raw viem calls, no Lido SDK)               │
│   lib/lido-config.ts (chain/contract definitions)         │
└──────────────────────────┬───────────────────────────────┘
                           │ eth_call
                           ▼
                       Ethereum RPCs
```

## Key Design Decisions

### 1. Separate Runtimes

The MCP server runs on **Bun** (required by the Lido SDK). The dashboard runs on **Node.js** (Next.js). They share no code at runtime.

**Why:** The Lido SDK has Bun-specific dependencies that don't work in Node.js. Rather than fight cross-runtime issues, the dashboard uses raw viem contract calls.

### 2. Dashboard Uses Raw viem

The dashboard's `lib/lido.ts` calls contracts directly using viem's `readContract` and `estimateContractGas`. It doesn't import the Lido SDK.

**Why:** Keeps the dashboard portable and avoids Bun dependency. The contract ABIs and addresses are hardcoded from Lido's deployed contracts documentation.

### 3. Mode and Network are Independent

- **Mode** (simulation/live) controls dry-run vs real execution
- **Network** (testnet/mainnet) controls which chain to target

These are orthogonal. You can simulate on mainnet or go live on testnet.

### 4. Dashboard Never Broadcasts

The dashboard has no private key. All write tools return simulation results. Real transactions require the MCP server.

**Why:** Security. A web dashboard should not hold private keys. The MCP server runs locally in a controlled environment.

### 5. AI SDK v6 Patterns

The dashboard uses Vercel AI SDK v6, which has significant API changes from v3/v4:

| v4 Pattern | v6 Pattern |
| --- | --- |
| `tool({ parameters })` | `{ inputSchema }` |
| `maxSteps: 5` | `stopWhen: stepCountIs(5)` |
| `toDataStreamResponse()` | `toUIMessageStreamResponse()` |
| `useChat({ api, body })` | `useChat({ transport: new DefaultChatTransport({ api, body }) })` |
| `input, handleInputChange` | Manual `useState` + `sendMessage({ text })` |
| `openai('model')` | `openai.chat('model')` for Chat Completions API |

## File Map

```
moly/
├── lib/
│   ├── lido-config.ts      # Chain defs, contract addresses, RPC config
│   └── lido.ts              # 13 tool functions (raw viem)
├── app/
│   ├── api/
│   │   ├── chat/route.ts    # AI chat: streamText + tools
│   │   └── lido/route.ts    # REST: balances, stats, proposals
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx       # useChat hook + message rendering
│   │   │   └── ToolResultCard.tsx  # Styled tool result cards
│   │   ├── sidebar/
│   │   │   └── Sidebar.tsx         # Collapsible data sidebar
│   │   ├── dashboard/
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── ProtocolStats.tsx
│   │   │   ├── StakingPanel.tsx
│   │   │   └── GovernancePanel.tsx
│   │   └── ui/
│   │       ├── Card.tsx
│   │       ├── Button.tsx
│   │       └── Badge.tsx
│   ├── context/
│   │   └── ModeContext.tsx   # mode + network + chainId state
│   ├── hooks/
│   │   └── useLido.ts       # Data fetching hook
│   ├── layout.tsx            # Root layout + ModeProvider
│   ├── page.tsx              # Two-panel layout
│   └── globals.css           # All styles
└── mcp/
    └── src/
        ├── index.ts          # MCP server entry
        ├── config.ts         # Mode/chain config
        ├── sdk.ts            # LidoSDK singleton
        ├── wallet.ts         # Private key wallet
        └── tools/
            ├── balance.ts
            ├── stake.ts
            ├── unstake.ts
            ├── wrap.ts
            └── governance.ts
```

---

Next: [FAQ](faq.md)
