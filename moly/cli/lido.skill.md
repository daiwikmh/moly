---
name: lido-staking
description: >
  Lido liquid staking protocol operations: stake ETH, manage stETH/wstETH positions,
  withdrawals, governance voting, L2 bridging, alerts, and cross-chain position tracking.
tags: [staking, defi, ethereum, lido, governance, liquid-staking]
---

# Lido Staking Skill

## Overview

Lido is the largest liquid staking protocol on Ethereum. Users deposit ETH and receive stETH, a liquid token that represents their staked ETH plus accrued rewards. Moly is a terminal assistant and MCP server for managing Lido positions.

## Prerequisites

- Wallet configured with ETH (via `moly setup`)
- Network set to `mainnet` (production) or `hoodi` (testnet)
- For governance: LDO tokens at the snapshot block

## Wallet & Configuration

### Deployment modes

There are three ways to use Moly. Each has different wallet access:

| Mode | Wallet Access | Write Ops |
|------|--------------|-----------|
| CLI (`npx @moly-mcp/lido`) | Full — private key via setup wizard or OWS vault | Yes, live or simulation |
| MCP server via CLI (`--server`) | Full — same private key configured in CLI | Yes, live or simulation |
| Hosted HTTP endpoint (`https://moly-lido.vercel.app/api/mcp`) | None — no private key on server | Simulation only (dry_run forced) |

If you are an agent using the hosted endpoint, all write tools return simulated estimates. No real transactions can be broadcast. To execute real transactions, the user must run `npx @moly-mcp/lido` locally and point you at the local MCP server.

### Setting up via CLI (for real transactions)

The user runs the setup wizard once:

```
npx @moly-mcp/lido
```

This prompts for: network, mode, RPC URL, private key (or OWS encrypted vault), and AI provider. Config is saved to `~/.moly/config.json` (chmod 600).

To add Moly as a local MCP server in Claude Desktop / Cursor / Windsurf after setup:

```json
{
  "mcpServers": {
    "moly": {
      "command": "npx",
      "args": ["@moly-mcp/lido", "--server"]
    }
  }
}
```

### Changing settings mid-session

Use `update_settings` to switch network or mode without restarting:

```
update_settings({ network: "mainnet", mode: "live" })
update_settings({ network: "hoodi", mode: "simulation" })
update_settings({ rpc: "https://my-rpc.example.com" })
```

Private key and API keys cannot be changed via tool — only via `moly setup`.

### Checking current config

Use `get_settings` to see active network, mode, RPC, and AI model. Private key and API keys are never exposed.

## Key Concepts

### Rebasing Mechanics

stETH is a rebasing token. Your balance increases daily as the Lido oracle reports new rewards from validators. If you hold 10 stETH today and the daily reward rate is 0.01%, tomorrow you hold 10.001 stETH. This happens automatically with no transaction needed. The oracle typically reports once per day.

1 stETH always represents 1 ETH of underlying staked value plus accumulated rewards.

### wstETH vs stETH

| Property | stETH | wstETH |
|----------|-------|--------|
| Rebasing | Yes, balance grows daily | No, value grows instead |
| DeFi compatible | Some protocols struggle with rebasing | Works everywhere |
| Bridging | Cannot bridge to L2 | Bridges to Base, Arbitrum |
| Tax | Each rebase is a taxable event in some jurisdictions | Value accrues silently |

Use stETH when: holding on mainnet and you want to see rewards grow visually.
Use wstETH when: using DeFi, bridging to L2, or preferring simpler tax accounting.

The conversion rate only goes up over time. Today 1 wstETH might equal 1.18 stETH; next year it will be higher.

### Withdrawal Queue

Process: request withdrawal -> enter queue -> finalization -> claim ETH.

- Minimum: 0.1 stETH per request
- Maximum: 1000 stETH per request
- Expected wait: 1-5 days (depends on validator exit queue)
- Each request gets an NFT ID used to track and claim
- Use `get_withdrawal_requests` to list your pending IDs
- Use `get_withdrawal_status` to check if finalized
- Use `claim_withdrawals` when finalized

### L2 Bridging

wstETH exists on Base (0xc1CB...) and Arbitrum (0x5979...). Moly bridges via LI.FI:
- `get_l2_balance` checks L2 holdings
- `get_bridge_quote` estimates fees and duration
- `bridge_to_ethereum` executes the bridge (1-20 min)
- `get_bridge_status` tracks in-flight bridges

To stake from L2: bridge to Ethereum first, then stake.

## Safe Patterns

- Always keep `minEthReserve` ETH unstaked for gas (default 0.5 ETH)
- Respect `maxStakePerTx` to limit single-transaction exposure
- Use simulation mode (`moly setup` -> simulation) to preview before going live
- In live mode, all write tools default to `dry_run: true` unless explicitly set to false
- Check gas prices before large transactions
- Never stake your entire ETH balance

## Governance

Lido DAO uses Aragon Voting. Key facts:
- Voting power requires LDO tokens held at the snapshot block
- Voting window is typically 72 hours
- Quorum requirements vary by vote type
- `executesIfDecided` means some votes execute immediately when quorum + majority are met
- Use `get_proposals` to list recent votes
- Use `get_proposal` for details on a specific vote
- Use `cast_vote` with `support: true` (YEA) or `support: false` (NAY)

## Policy Bounds

Moly enforces human-set bounds before any write operation:
- `maxStakePerTx`: Max ETH per single stake (default 10)
- `maxDailyStake`: Rolling daily cap (default 50)
- `minEthReserve`: ETH to keep unstaked for gas (default 0.5)
- `governanceAutoVote`: Whether the agent can vote autonomously (default false)

Set bounds: `moly bounds set --max-stake-per-tx 1.0 --min-eth-reserve 0.5`
View bounds: `moly bounds show`

## Commands

```
moly setup                  Interactive setup wizard
moly config                 View current configuration
moly position [address]     Cross-chain position summary
moly bounds show|set|reset  Policy bounds management
moly ledger list|stats|export  Activity audit trail
moly monitor start|status|stop  Position monitoring daemon
moly alert add|list|remove|channels|daemon  Alert management
```

## Tools

| Tool | Description |
|------|-------------|
| get_balance | ETH, stETH, wstETH balances |
| get_rewards | Staking reward history |
| get_conversion_rate | stETH/wstETH exchange rate |
| get_total_position | Cross-chain aggregated position |
| stake_eth | Stake ETH to receive stETH |
| request_withdrawal | Enter the withdrawal queue |
| claim_withdrawals | Claim finalized withdrawals |
| get_withdrawal_requests | List pending withdrawal IDs |
| get_withdrawal_status | Check finalization status |
| wrap_steth | Convert stETH to wstETH |
| unwrap_wsteth | Convert wstETH to stETH |
| get_proposals | List Lido DAO proposals |
| get_proposal | Detail on a specific proposal |
| cast_vote | Vote on a proposal (requires LDO) |
| get_l2_balance | L2 chain balances |
| get_bridge_quote | Bridge fee estimate |
| bridge_to_ethereum | Execute L2 to L1 bridge |
| get_bridge_status | Track bridge transaction |
| get_bounds | Current policy bounds |
| set_bounds | Update policy bounds |
| get_trade_history | Query activity ledger |
| get_staking_summary | Aggregate staking stats |
| set_alert | Create monitoring alert |
| list_alerts | View all alerts |
| remove_alert | Delete an alert |

## Workflow Examples

**Stake 0.5 ETH:**
1. Check balance with `get_balance`
2. Call `stake_eth` with `amount_eth: "0.5"` and `dry_run: true` first
3. If simulation looks good, call again with `dry_run: false`

**Bridge from Base then stake:**
1. `get_l2_balance` on Base to check wstETH
2. `bridge_to_ethereum` from Base
3. `get_bridge_status` to wait for completion
4. `unwrap_wsteth` if you want stETH, or stake additional ETH

**Monitor position:**
1. `moly bounds set --max-stake-per-tx 1.0 --min-eth-reserve 0.5`
2. `moly alert add balance_below 1.0 --channel telegram`
3. `moly alert add withdrawal_ready --channel telegram`
4. `moly monitor start`

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Insufficient balance | Not enough ETH/stETH | Check `get_balance` first |
| Gas estimation failed | Network congestion or bad params | Retry or increase gas |
| Withdrawal not finalized | Still in queue | Wait and check `get_withdrawal_status` |
| LDO required | No LDO for governance voting | Acquire LDO tokens |
| Bridge tools only work on mainnet | Testnet selected | Switch to mainnet in config |
| Bounds violation | Amount exceeds policy | Adjust bounds or reduce amount |
