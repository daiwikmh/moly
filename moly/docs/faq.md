---
description: Frequently asked questions
---

# FAQ

## General

### What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is an open standard for connecting AI models to external tools and data sources. Moly uses MCP to give AI clients access to Lido protocol operations.

### Is Moly a wallet?

No. Moly is a tool interface. The MCP server can sign transactions using a provided private key, but it's not a wallet application. Think of it as a programmatic bridge between AI and Lido.

### Is it safe?

- **Simulation mode** is completely safe — no transactions are ever broadcast
- **Live mode** executes real transactions — use with appropriate caution
- The dashboard never holds private keys
- The MCP server keeps your key in-process (never sent over HTTP)

---

## Dashboard

### Why does the dashboard say "dry run" even in Live mode?

The dashboard itself cannot broadcast transactions (no private key). It shows dry-run estimates to help you understand what _would_ happen. For real execution, use the MCP server via Claude Code, Desktop, or Cursor.

### Which LLM does the dashboard use?

`nvidia/nemotron-3-super-120b-a12b:free` via OpenRouter. It's a free model. You can change it in `app/api/chat/route.ts`.

### Can I use a different model?

Yes. Edit `app/api/chat/route.ts` and change the model string:

```typescript
model: openrouter.chat('your-preferred-model'),
```

Any OpenRouter-compatible model works. Models with good tool-use support (Claude, GPT-4, etc.) will perform best.

### The chat shows "Invalid Responses API request"

This happens if the code uses `openrouter('model')` instead of `openrouter.chat('model')`. The `.chat()` method forces the Chat Completions API, which OpenRouter supports. The default uses OpenAI's Responses API, which OpenRouter doesn't.

---

## MCP Server

### Do I need a private key for simulation mode?

The MCP server requires a private key even in simulation mode (to derive your address for balance queries). You can use any test key.

### Can I use the MCP server without the dashboard?

Yes. The MCP server is completely standalone. Connect it to any MCP-compatible client and use it directly from a conversation.

### What's the difference between the dashboard tools and MCP server tools?

| Feature | Dashboard | MCP Server |
| --- | --- | --- |
| Runtime | Node.js (Next.js) | Bun |
| Chain library | Raw viem calls | Lido SDK + viem |
| Read operations | Full support | Full support |
| Write operations | Dry-run only | Dry-run or real |
| Reward history | Placeholder | Full SDK support |
| Withdrawal data | Placeholder | Full SDK support |

---

## Chains

### Why not Holesky?

Holesky testnet has been deprecated. The Ethereum community has migrated to Hoodi as the primary testnet. Lido has deployed contracts on Hoodi.

### Will L2 chains be supported?

Not yet. Lido's wstETH exists on several L2s (Optimism, Arbitrum, Base, etc.) but Moly currently only supports Hoodi testnet and Ethereum mainnet. L2 support may be added in the future.

---

## Troubleshooting

### RPC errors (403, timeout)

Try alternative RPCs:

```env
HOODI_RPC_URL=https://hoodi.drpc.org
MAINNET_RPC_URL=https://eth.llamarpc.com
```

Public RPCs have rate limits. For production use, get a dedicated RPC from Alchemy, Infura, or similar.

### "PRIVATE_KEY env var is required"

Add a private key to your MCP configuration. Even for simulation mode, a key is needed to derive the wallet address.

### TypeScript errors after updating

```bash
bun install
npx tsc --noEmit
```

If using AI SDK v6, make sure you're using `inputSchema` (not `parameters`) and `stepCountIs` (not `maxSteps`).

---

_Have a question not covered here? Open an issue on GitHub._
