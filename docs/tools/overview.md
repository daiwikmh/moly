---
description: All 13 Lido tools — what they do and when to use them
---

# Tools Overview

Moly exposes 13 tools that cover the full Lido lifecycle: querying data, staking, wrapping, withdrawals, and governance.

## Tool Categories

```
       READ (7 tools)                    WRITE (6 tools)
  ┌─────────────────────┐         ┌──────────────────────────┐
  │ get_balance          │         │ stake_eth                │
  │ get_rewards          │         │ request_withdrawal       │
  │ get_conversion_rate  │         │ claim_withdrawals        │
  │ get_withdrawal_req   │         │ wrap_steth               │
  │ get_withdrawal_stat  │         │ unwrap_wsteth            │
  │ get_proposals        │         │ cast_vote                │
  │ get_proposal         │         │                          │
  └─────────────────────┘         └──────────────────────────┘
         Free to call                Dry-run in simulation
                                     Real tx in live mode
```

## Dry-Run Behavior

| Mode | Write Tool Behavior |
| --- | --- |
| **Simulation** | Always dry-run. Returns estimates, gas costs, expected outputs. |
| **Live** | Executes real transactions (MCP server only). Dashboard always shows estimates. |

## Staking Flow

```
ETH ──stake_eth──► stETH ──wrap_steth──► wstETH
                     │                       │
                     │                  unwrap_wsteth
                     │                       │
                     ▼                       ▼
              request_withdrawal ──► queue ──► claim_withdrawals ──► ETH
```

## Common Patterns

### Check & Stake
1. `get_balance` — see current holdings
2. `stake_eth` — stake available ETH
3. `get_balance` — verify stETH received

### Wrap for DeFi
1. `get_conversion_rate` — check current rate
2. `wrap_steth` — convert stETH to wstETH
3. `get_balance` — verify wstETH balance

### Withdraw
1. `request_withdrawal` — enter the queue
2. `get_withdrawal_requests` — get request IDs
3. `get_withdrawal_status` — check if finalized
4. `claim_withdrawals` — claim ETH

---

Next: [Read Tools](read-tools.md)
