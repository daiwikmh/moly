---
description: Configure the Moly MCP server for different modes and chains
---

# Configuration

## Environment Variables

The MCP server reads configuration from environment variables. These can be set in `mcp/.env` or passed directly when launching.

```env
# Required for live mode
LIDO_MODE=simulation          # "simulation" or "live"
PRIVATE_KEY=0x...             # Your wallet private key

# Optional RPC overrides
HOODI_RPC_URL=https://hoodi.drpc.org
MAINNET_RPC_URL=https://eth.llamarpc.com

# Optional
REFERRAL_ADDRESS=0x0000000000000000000000000000000000000000
```

## Modes

### Simulation Mode (Default)

```env
LIDO_MODE=simulation
```

- All write operations return **dry-run results** by default
- Shows estimated gas, expected outputs, and notes
- Pass `dry_run: false` explicitly to broadcast on testnet
- **Safe for testing and demos**

### Live Mode

```env
LIDO_MODE=live
PRIVATE_KEY=0xYourPrivateKey
```

- Write operations execute **real transactions**
- Requires a funded wallet (ETH for gas + staking amount)
- Pass `dry_run: true` to simulate before broadcasting
- **Use with caution on mainnet**

## Mode × Network Matrix

| Mode | Testnet (Hoodi) | Mainnet (Ethereum) |
| --- | --- | --- |
| **Simulation** | Dry-run estimates on Hoodi | Dry-run estimates on mainnet |
| **Live** | Real txs on Hoodi (safe) | Real txs on mainnet (real funds) |

## Starting the Server

```bash
cd mcp
bun run dev
```

Output:
```
Lido MCP server started (simulation mode)
Network: Hoodi (560048)
Tools: 13 registered
Transport: stdio
```

## Passing Config via CLI

You can override environment variables when launching:

```bash
LIDO_MODE=live PRIVATE_KEY=0x... bun run mcp/src/index.ts
```

Or when configuring in an AI client, pass them in the `env` block (see client-specific guides).

---

Next: [Claude Code Setup](claude-code.md)
