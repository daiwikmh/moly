# Moly — Lido MCP Server Architecture

## Overview

Moly is a Model Context Protocol (MCP) server that makes Lido's stETH staking, position management, and governance natively callable by any AI agent. Point Claude Code or Cursor at it and stake ETH from a conversation — no custom integration code.

```
┌─────────────────────┐     stdio      ┌──────────────────┐     JSON-RPC     ┌──────────────┐
│  AI Agent           │◄──────────────►│  Lido MCP Server │◄───────────────►│  Ethereum    │
│  (Claude / Cursor)  │                │  (Bun + TS)      │                 │  (Holesky /  │
│                     │                │                   │                 │   Mainnet)   │
└─────────────────────┘                └──────────────────┘                 └──────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │  Lido SDK    │
                                       │  + viem      │
                                       └──────────────┘
```

## Modes

The server operates in one of two modes, set via `LIDO_MODE` env var:

| Mode | Network | Chain ID | Write Behavior |
|------|---------|----------|----------------|
| `simulation` | Holesky testnet | 17000 | All writes default to `dry_run: true` |
| `live` | Ethereum mainnet | 1 | Writes broadcast real transactions |

In simulation mode, every write tool simulates by default. You must explicitly pass `dry_run: false` to broadcast on Holesky. In live mode, `dry_run` defaults to `false` — pass `true` to simulate before committing.

## Project Structure

```
mcp/
├── src/
│   ├── index.ts              # MCP server entry — tool registration + stdio transport
│   ├── config.ts             # Mode switch, chain config, RPC URLs
│   ├── sdk.ts                # LidoSDK + viem PublicClient initialization
│   ├── wallet.ts             # Private key → viem WalletClient + address helper
│   └── tools/
│       ├── balance.ts        # get_balance, get_rewards
│       ├── stake.ts          # stake_eth
│       ├── unstake.ts        # request_withdrawal, claim_withdrawals, get_withdrawal_*
│       ├── wrap.ts           # wrap_steth, unwrap_wsteth, get_conversion_rate
│       └── governance.ts     # get_proposals, get_proposal, cast_vote
├── lido.skill.md             # Agent mental model — read before acting
├── package.json
├── tsconfig.json
└── .env.example
```

## Core Modules

### `config.ts`
Reads `LIDO_MODE` and resolves chain, RPC URL, and referral address. Single source of truth for network configuration. Throws on invalid mode.

### `sdk.ts`
Lazy-initializes the `LidoSDK` instance with a viem `PublicClient`. Shared across all tools. The SDK handles contract address resolution per chain.

### `wallet.ts`
Converts `PRIVATE_KEY` env var into a viem `WalletClient`. Only initialized when a write operation is actually executed (not on dry_run). Exposes `getAddress()` for read operations that default to the configured wallet.

## Tools

### Read Operations (no gas, no signing)

| Tool | Input | Output | Source |
|------|-------|--------|--------|
| `get_balance` | `address?` | ETH, stETH, wstETH balances | `sdk.core.balanceETH`, `sdk.steth.balance`, `sdk.wsteth.balance` |
| `get_rewards` | `address?`, `days?` | Reward history + totals | `sdk.rewards.getRewardsFromChain` |
| `get_conversion_rate` | — | stETH↔wstETH rates | `sdk.core.convertStethToWsteth/convertWstethToSteth` |
| `get_withdrawal_requests` | `address?` | Pending request NFT IDs | `sdk.withdrawals.getWithdrawalRequests` |
| `get_withdrawal_status` | `request_ids[]` | Finalization + claim status per ID | `sdk.withdrawals.getWithdrawalStatus` |
| `get_proposals` | `count?` | Recent DAO proposals with vote tallies | Aragon Voting contract `getVote` |
| `get_proposal` | `proposal_id` | Single proposal detail | Aragon Voting contract `getVote` |

### Write Operations (support `dry_run`)

| Tool | Input | On-chain Action | Dry Run Returns |
|------|-------|-----------------|-----------------|
| `stake_eth` | `amount_eth`, `dry_run?` | Calls `submit()` on Lido stETH contract | Estimated gas, expected stETH |
| `request_withdrawal` | `amount_steth`, `dry_run?` | Burns stETH, mints withdrawal NFT | Queue info, limits |
| `claim_withdrawals` | `request_ids[]`, `dry_run?` | Burns NFTs, receives ETH | Finalization check |
| `wrap_steth` | `amount_steth`, `dry_run?` | Wraps stETH → wstETH | Expected wstETH output |
| `unwrap_wsteth` | `amount_wsteth`, `dry_run?` | Unwraps wstETH → stETH | Expected stETH output |
| `cast_vote` | `proposal_id`, `support`, `dry_run?` | Votes YEA/NAY on Aragon proposal | Proposal state + requirements |

## dry_run Implementation

Every write tool follows the same pattern:

```
shouldDryRun = simulation mode ? (dry_run !== false) : !!dry_run

if shouldDryRun:
  → estimate gas via viem eth_call / estimateContractGas
  → return { simulated: true, estimated_gas, expected_output, note }

else:
  → sign and broadcast via WalletClient / LidoSDK
  → return { simulated: false, txHash, actual_output }
```

This means:
- **Simulation mode**: safe by default, opt-in to real Holesky transactions
- **Live mode**: real transactions by default, opt-in to dry run simulation

## Contract Addresses

### Mainnet (Chain ID: 1)
| Contract | Address |
|----------|---------|
| stETH (Lido) | `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84` |
| wstETH | `0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0` |
| Aragon Voting | `0x2e59A20f205bB85a89C53f1936454680651E618e` |

### Holesky (Chain ID: 17000)
| Contract | Address |
|----------|---------|
| stETH (Lido) | `0x3F1c547b21f65e10480dE3ad8E19fAAC46C95034` |
| wstETH | `0x8d09a4502Cc8Cf1547aD300E066060D043f6982D` |
| Aragon Voting | `0xDA7d2573Df555002503F29aA4003e398d28cc00f` |

## Transport

The server uses **stdio** transport — the standard for MCP servers integrated with Claude Code, Cursor, and other agent harnesses. No HTTP server, no ports, no CORS.

### Claude Code Configuration

```json
{
  "mcpServers": {
    "lido": {
      "command": "bun",
      "args": ["run", "/path/to/moly/mcp/src/index.ts"],
      "env": {
        "LIDO_MODE": "simulation",
        "PRIVATE_KEY": "0x...",
        "HOLESKY_RPC_URL": "https://..."
      }
    }
  }
}
```

## Data Flow Example: Staking ETH

```
User: "Stake 0.5 ETH"
         │
         ▼
   Claude calls stake_eth(amount_eth: "0.5")
         │
         ▼
   config.isSimulation? → dry_run = true
         │
         ▼
   viem.estimateContractGas(Lido.submit, value: 0.5 ETH)
         │
         ▼
   Returns: { simulated: true, estimatedGas: "52341", expectedStETH: "0.5" }
         │
         ▼
   Claude: "Simulation shows staking 0.5 ETH would yield ~0.5 stETH
            with ~52,341 gas. Want me to execute for real?"
         │
         ▼
   User: "Yes"
         │
         ▼
   Claude calls stake_eth(amount_eth: "0.5", dry_run: false)
         │
         ▼
   LidoSDK.stake.stakeEth(value: 0.5 ETH) → broadcasts tx
         │
         ▼
   Returns: { simulated: false, txHash: "0x...", stethReceived: "0.4998" }
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server framework + stdio transport |
| `@lidofinance/lido-ethereum-sdk` | Lido protocol interactions (stake, withdraw, wrap, rewards) |
| `viem` | Ethereum client (PublicClient for reads, WalletClient for writes) |
| `zod` | Tool parameter validation (bundled with MCP SDK) |
