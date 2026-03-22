# Moly CLI Commands Reference

## Setup and Config

```bash
# first run: interactive wizard then server
npx @moly-mcp/lido

# re-run setup wizard
moly setup

# print current config (keys redacted)
moly config

# delete config and start fresh
moly reset

# force-start MCP server (for AI client configs)
moly --server
```

## Position

```bash
# cross-chain position summary (ETH + Base + Arbitrum)
moly position

# specific address
moly position 0xYourAddress
```

## Monitor (Alert Daemon)

```bash
# start background daemon (30s polling)
moly monitor start

# check daemon PID, uptime, last check, active alert count
moly monitor status

# stop the daemon
moly monitor stop
```

## Alerts

```bash
# create alerts
moly alert add balance_below 1.0
moly alert add balance_above 100
moly alert add reward_rate_below 0.01
moly alert add reward_rate_above 0.1
moly alert add withdrawal_ready
moly alert add proposal_new
moly alert add conversion_rate_above 1.2
moly alert add conversion_rate_below 1.1
moly alert add reward_delta 0.001
moly alert add governance_expiring

# webhook channel instead of telegram
moly alert add balance_below 5.0 --channel webhook

# list all alerts
moly alert list

# remove by ID
moly alert remove <alert-id>

# configure notification channels
moly alert channels --telegram-token <bot-token> --telegram-chat <chat-id>
moly alert channels --webhook-url https://example.com/hook
```

## Bounds (Policy Limits)

```bash
# show current bounds
moly bounds
moly bounds show

# set individual bounds
moly bounds set --max-stake-per-tx 1.0
moly bounds set --max-daily-stake 10
moly bounds set --min-eth-reserve 0.5
moly bounds set --auto-restake-threshold 0.01
moly bounds set --governance-auto-vote true

# combine flags
moly bounds set --max-stake-per-tx 2.0 --max-daily-stake 20 --min-eth-reserve 0.3

# reset to defaults
moly bounds reset
```

## Ledger (Activity Log)

```bash
# list recent entries (default 50)
moly ledger list

# filter by tool name
moly ledger list --tool stake_eth

# filter by date
moly ledger list --since 2025-01-01

# limit results
moly ledger list --tool stake_eth --since 2025-06-01 --limit 10

# aggregate stats
moly ledger stats
moly ledger stats --since 2025-01-01

# export
moly ledger export --format json
moly ledger export --format csv
```

## MCP Server Integration

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

## MCP Tools (28 total)

### Read
- `get_balance` - ETH, stETH, wstETH balances
- `get_rewards` - staking reward history
- `get_conversion_rate` - stETH/wstETH exchange rate
- `get_withdrawal_requests` - pending withdrawal IDs
- `get_withdrawal_status` - finalization status
- `get_proposals` - Lido DAO proposals
- `get_proposal` - single proposal detail
- `get_total_position` - cross-chain aggregated position
- `get_bounds` - current policy bounds
- `get_trade_history` - query activity ledger
- `get_staking_summary` - aggregate ledger stats
- `get_settings` - current config (redacted)

### Write (all support dry_run, gated by bounds)
- `stake_eth` - stake ETH for stETH
- `request_withdrawal` - enter withdrawal queue
- `claim_withdrawals` - claim finalized withdrawals
- `wrap_steth` - wrap stETH to wstETH
- `unwrap_wsteth` - unwrap wstETH to stETH
- `cast_vote` - vote on DAO proposal
- `set_bounds` - update policy bounds
- `update_settings` - change mode/network/RPC

### Bridge (mainnet only, L2 to L1 via LI.FI)
- `get_l2_balance` - ETH and wstETH balances on Base or Arbitrum
- `get_bridge_quote` - quote for bridging to Ethereum L1
- `bridge_to_ethereum` - bridge ETH or wstETH from L2 to L1 (supports dry_run)
- `get_bridge_status` - check status of an in-progress bridge tx

### Alerts
- `set_alert` - create alert rule
- `list_alerts` - list all alerts
- `remove_alert` - remove alert by ID
- `configure_alert_channels` - set telegram/webhook config
