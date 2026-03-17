---
description: The Moly MCP server — 13 Lido tools over stdio
---

# MCP Server Overview

The Moly MCP server exposes the Lido protocol as 13 tools via the [Model Context Protocol](https://modelcontextprotocol.io). Any MCP-compatible AI client can use these tools to interact with Lido.

## How It Works

```
┌─────────────┐     stdio      ┌──────────────┐     RPC      ┌────────────┐
│  AI Client   │ ◄──────────► │  Moly MCP     │ ◄──────────► │  Ethereum   │
│  (Claude,    │   JSON-RPC    │  Server       │   eth_call   │  (Hoodi /   │
│   Cursor)    │               │  (Bun + TS)   │              │   Mainnet)  │
└─────────────┘               └──────────────┘              └────────────┘
```

## Key Features

| Feature | Description |
| --- | --- |
| **13 Tools** | Balance queries, staking, wrapping, withdrawals, governance |
| **Dual Mode** | Simulation (dry-run) and Live (real transactions) |
| **Multi-Chain** | Hoodi testnet and Ethereum mainnet |
| **Dry-Run Default** | Simulation mode dry-runs all writes unless explicitly overridden |
| **stdio Transport** | Standard MCP stdio transport — works with all clients |

## Tools at a Glance

### Read Tools (7)
| Tool | Description |
| --- | --- |
| `get_balance` | ETH, stETH, wstETH balances |
| `get_rewards` | Staking reward history |
| `get_conversion_rate` | stETH/wstETH exchange rate |
| `get_withdrawal_requests` | Pending withdrawal IDs |
| `get_withdrawal_status` | Finalization status |
| `get_proposals` | DAO governance proposals |
| `get_proposal` | Single proposal details |

### Write Tools (6)
| Tool | Description |
| --- | --- |
| `stake_eth` | Stake ETH to receive stETH |
| `request_withdrawal` | Queue stETH withdrawal |
| `claim_withdrawals` | Claim finalized withdrawals |
| `wrap_steth` | Wrap stETH to wstETH |
| `unwrap_wsteth` | Unwrap wstETH to stETH |
| `cast_vote` | Vote on DAO proposal |

## Runtime

- **Bun** — fast TypeScript runtime, required for the Lido SDK
- **Dependencies:** `@modelcontextprotocol/sdk`, `@lidofinance/lido-ethereum-sdk`, `viem`

---

Next: [Configuration](configuration.md)
