---
description: Get Moly running in under 2 minutes
---

# Quick Start

## 1. Start the Dashboard

```bash
cd moly
cp .env.example .env.local
# Edit .env.local and add your OPENROUTER_API_KEY

bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the Moly chat interface with a sidebar showing protocol stats.

## 2. Try the Chat

Click one of the suggestion buttons or type:

```
What is the balance for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?
```

The AI will call `get_balance` and show ETH/stETH/wstETH balances inline.

## 3. Toggle Networks

Use the header toggles:

| Toggle | Left | Right |
| --- | --- | --- |
| **Network** | Testnet (Hoodi) | Mainnet (Ethereum) |
| **Mode** | Simulation (dry-run) | Live (real txs) |

The chain pill shows which network is active.

## 4. Start the MCP Server

In a separate terminal:

```bash
cd moly/mcp
cp .env.example .env
# Edit .env — add PRIVATE_KEY for live mode

bun install
bun run dev
```

## 5. Connect to Claude Code

```bash
claude
```

Then in Claude Code, the MCP server is automatically available if configured in your project settings (see [Claude Code Setup](../mcp-server/claude-code.md)).

Try:

```
Stake 0.1 ETH on Hoodi testnet
```

---

## What's Next?

- [MCP Server Configuration](../mcp-server/configuration.md) — detailed server setup
- [Tools Reference](../tools/overview.md) — all 13 tools explained
- [Stake ETH Guide](../guides/stake-eth.md) — full staking walkthrough
