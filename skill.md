# Moly — Lido Liquid Staking Skill

**For AI agents:** This skill document provides the mental model and operational guidelines for interacting with Lido through Moly. Read this before calling any tools.

---

## What is Moly?

Moly is an AI-native interface to the Lido liquid staking protocol. It exposes 28 tools for staking, withdrawals, wrapping, governance, bridging, and monitoring — all designed for autonomous agent use.

Three deployment methods:
- **CLI** (`@moly-mcp/lido`) — primary, with setup wizard, ledger, alerts, bounds
- **MCP Server** — for embedding in custom agent setups
- **Dashboard** — web UI with agentic chat

---

## What is Lido?

Lido is the largest liquid staking protocol on Ethereum. You deposit ETH, receive **stETH** (staked ETH) in return, and earn validator rewards without locking up your funds or running a validator. Your stETH can be withdrawn back to ETH via an asynchronous withdrawal queue.

---

## Core Concepts

### stETH — The Rebasing Token

**stETH rebases daily.** Your balance increases automatically as Ethereum validator rewards accumulate:
- No claiming needed — rewards appear directly in your wallet each day
- 1 stETH ≈ 1 ETH in value (1:1 plus accrued daily rewards)
- Daily APR: ~3–4% annually (varies with validator participation)
- Oracle reports rewards once per day, typically around 12:00 UTC

**Why this matters for agents:**
- When you check balance tomorrow, your stETH count will be ~0.01% higher
- Rebasing makes stETH incompatible with some DeFi protocols (AMMs, lending pools)
- Use wstETH instead if you plan to use the position in DeFi

### wstETH — The Non-Rebasing Wrapper

**wstETH (wrapped stETH)** solves the rebase problem for DeFi:
- Fixed balance — your wstETH count never changes
- Growing value — 1 wstETH becomes worth more stETH over time
- DeFi compatible — Aave, Uniswap v3, Curve all support wstETH natively
- Lossless — wrapping/unwrapping preserves underlying position exactly

**Conversion flow:**
- 1 stETH → wrap → 1 wstETH (receives slightly less due to accrued rewards)
- 1 wstETH → unwrap → 1+ stETH (redeems more as value has grown)

**When to use:**
- **stETH:** Holding on mainnet, watching rewards grow visually, simple staking
- **wstETH:** DeFi activity, bridging to L2 (Base, Arbitrum), avoiding rebase tax events

---

## Staking Lifecycle

```
ETH → stake_eth → stETH (rebasing, earning daily)
      ↓
      wrap_steth → wstETH (fixed balance, growing value)
      ↓
      unwrap_wsteth → back to stETH
      ↓
      request_withdrawal → enter queue → finalized → claim_withdrawals → ETH
```

### Withdrawal Queue Mechanics

Withdrawals are **asynchronous and non-instant**:

1. **request_withdrawal** — burns your stETH, mints an ERC-721 NFT (queue position)
2. **Validator exits** — Lido coordinates validator exits to cover the withdrawal. Takes hours to days.
3. **Finalization** — Once enough validators have exited, `get_withdrawal_status` returns `isFinalized: true`
4. **claim_withdrawals** — burns your NFT, receives ETH

**Limits:**
- Minimum: 0.1 stETH per request
- Maximum: 1000 stETH per request
- Large withdrawals: split into multiple 1000 stETH requests
- Wait time: typically 1–5 days (depends on queue depth and validator exit rate)

---

## Governance (Lido DAO)

Lido is governed by **LDO token holders** via Aragon Voting:
- Proposals are called "votes" with numeric IDs
- Voting requires LDO tokens at the proposal's snapshot block
- Options: YEA (support) or NAY (against)
- Proposals pass if: support > threshold AND quorum is met

**Governance flow:**
```
get_proposals() → list all active proposals
get_proposal(id) → fetch details, voting window, thresholds
cast_vote(id, true/false) → YEA or NAY (requires LDO balance at snapshot)
```

**Key rule:** You must hold LDO tokens **at the proposal's snapshot block**, not just when you vote. Historical LDO balance matters.

---

## Deployment Modes

Moly supports two independent toggles:

### Mode: Simulation vs Live

| Mode | Network | Writes | Use When |
|------|---------|--------|----------|
| `simulation` | Hoodi Testnet (560048) | dry_run by default | Development, testing, demos, trying commands |
| `live` | Ethereum Mainnet (1) | Real transactions | Production, actual staking |

**Simulation behavior:**
- All write tools simulate by default
- You can see gas estimates and expected outputs without broadcasting
- Useful for testing agent logic before going live

**Live behavior:**
- Requires a private key
- Requires explicit permission (bounds + policy controls)
- Real transactions broadcast to Ethereum mainnet
- All operations logged to activity ledger

### Network: Hoodi Testnet vs Ethereum Mainnet

| Network | Chain ID | stETH Address | Use When |
|---------|----------|---------------|----------|
| **Hoodi Testnet** | 560048 | `0x3508A952...` | Testing without real funds |
| **Ethereum Mainnet** | 1 | `0xae7ab965...` | Production staking with real ETH |

Both toggles are independent — you can simulate on mainnet or go live on testnet.

---

## Safe Agent Patterns

**Always follow these patterns before taking action:**

1. **Always dry_run first** — especially on mainnet. Check gas estimates and expected outputs.
   ```
   stake_eth(amount="1.0", dry_run=true)  // see gas estimate first
   stake_eth(amount="1.0", dry_run=false) // then broadcast if OK
   ```

2. **Check balance before staking** — ensure sufficient ETH for both stake amount + gas fee.
   ```
   get_balance() // verify ETH balance >= stake amount + 0.01 ETH gas buffer
   ```

3. **Don't withdraw immediately** — the withdrawal queue adds 1–5 day overhead. Only request withdrawal if the agent/user actually needs ETH back.

4. **Wrap for DeFi** — if the position will be used in a DeFi protocol, wrap to wstETH first to avoid rebase issues.
   ```
   wrap_steth(amount_steth="10.0", dry_run=true)
   wrap_steth(amount_steth="10.0", dry_run=false) // then broadcast
   ```

5. **Governance requires LDO** — voting on proposals requires LDO tokens, not stETH. Check LDO balance before attempting to vote.
   ```
   get_balance(address) // check LDO field
   cast_vote(proposal_id=123, support=true) // will fail if no LDO
   ```

6. **Split large withdrawals** — requests over 1000 stETH will fail. Split into multiple 1000 stETH requests.
   ```
   request_withdrawal(amount_steth="5000", dry_run=true) // will fail
   // Instead:
   request_withdrawal(amount_steth="1000", dry_run=false)
   request_withdrawal(amount_steth="1000", dry_run=false)
   // ... up to 5000 total
   ```

---

## Tool Categories (28 total)

### Read Tools (Balance, Rewards, Status)

| Tool | Description | Params |
|------|-------------|--------|
| `get_balance` | ETH, stETH, wstETH balances + APR | `address` (optional) |
| `get_rewards` | Staking reward history | `address` (optional), `days` (1–365) |
| `get_conversion_rate` | stETH ↔ wstETH exchange rate | (none) |
| `get_total_position` | Cross-chain: ETH + stETH + wstETH across mainnet + Base + Arbitrum in ETH equivalent | `address` (optional) |
| `get_withdrawal_requests` | List pending withdrawal NFT IDs | `address` (optional) |
| `get_withdrawal_status` | Check finalization status per request ID | `request_ids` (array) |
| `get_proposals` | List recent Lido DAO governance proposals | `count` (1–20, default 5) |
| `get_proposal` | Detailed info on a specific proposal | `proposal_id` (integer) |
| `get_trade_history` | Query activity ledger with filters | `tool` (name), `since` (date), `limit` |
| `get_staking_summary` | Aggregate stats from ledger | `since` (date) |
| `get_settings` | Current mode, network, RPC (keys redacted) | (none) |
| `get_bounds` | Current policy bounds gating write operations | (none) |

### Write Tools (All support `dry_run`)

| Tool | Description | Key Params |
|------|-------------|-----------|
| `stake_eth` | Stake ETH → stETH (liquid staking) | `amount_eth`, `dry_run` |
| `request_withdrawal` | Queue withdrawal stETH → ETH | `amount_steth` (0.1–1000), `dry_run` |
| `claim_withdrawals` | Claim finalized withdrawals back to ETH | `request_ids` (array), `dry_run` |
| `wrap_steth` | Wrap stETH → wstETH (for DeFi) | `amount_steth`, `dry_run` |
| `unwrap_wsteth` | Unwrap wstETH → stETH (for rewards) | `amount_wsteth`, `dry_run` |
| `cast_vote` | Vote YEA/NAY on Lido DAO proposal | `proposal_id`, `support` (true=YEA, false=NAY), `dry_run` |
| `update_settings` | Change mode/network/RPC mid-conversation | `mode`, `network`, `rpc` |
| `set_bounds` | Update policy bounds (max stake, daily cap, gas reserve, auto-vote) | `maxStakePerTx`, `maxDailyStake`, etc. |

### Bridge Tools (Mainnet only, L2 → L1 via LI.FI)

| Tool | Description | Key Params |
|------|-------------|-----------|
| `get_l2_balance` | ETH and wstETH balances on Base or Arbitrum | `source_chain` (base\|arbitrum), `address` |
| `get_bridge_quote` | Quote for bridging ETH or wstETH L2 → L1 | `source_chain`, `token`, `amount` |
| `bridge_to_ethereum` | Execute bridge (requires private key) | `source_chain`, `token`, `amount`, `dry_run` |
| `get_bridge_status` | Check in-progress bridge tx status | `tx_hash`, `source_chain` |

### Alert Tools (CLI + Daemon)

| Tool | Description | Conditions |
|------|-------------|-----------|
| `set_alert` | Create alert | `balance_below`, `balance_above`, `reward_rate_below`, `reward_rate_above`, `withdrawal_ready`, `proposal_new`, `conversion_rate_above/below` |
| `list_alerts` | List all configured alerts | (none) |
| `remove_alert` | Delete an alert by ID | `id` |
| `configure_alert_channels` | Set Telegram or webhook notifications | `telegram_token`, `telegram_chat_id`, `webhook_url` |

---

## Policy Bounds (Safety Gates)

Write operations are gated by human-set bounds in `~/.moly/bounds.json`:

| Bound | Default | Purpose |
|-------|---------|---------|
| `maxStakePerTx` | 1.0 ETH | Reject stake_eth calls over this amount |
| `maxDailyStake` | 10 ETH | Reject if total staking today would exceed this |
| `minEthReserve` | 0.5 ETH | Reject if ETH balance would drop below this |
| `governanceAutoVote` | false | Allow agent to auto-vote on proposals (requires explicit opt-in) |
| `autoRestakeThreshold` | 0.01 ETH | Auto-restake rewards once this threshold is reached |

**Agent behavior:** Bounds are checked before any write operation. If a request violates bounds, the tool rejects it with a reason message.

---

## Activity Ledger

Every write operation is logged to `~/.moly/ledger.db` (SQLite):
- Tool name, timestamp, parameters, result, gas used
- Queryable by tool name, date range, limit
- Exportable to CSV/JSON for auditing
- Useful for tracking agent behavior and costs

**Example:**
```
moly ledger list --tool stake_eth --since 2026-03-01 --limit 10
moly ledger stats --since 2026-03-01
moly ledger export --format csv
```

---

## Security Model

- **Private keys** stored in `~/.moly/config.json` (chmod 600) or OWS encrypted vault (`~/.ows/wallets/`)
- **Keys never logged** — not printed, not sent to remote servers
- **API keys** stored alongside config, same protections
- **Simulation mode default** — nothing broadcasts unless explicitly set to live
- **update_settings tool** intentionally cannot change private keys (only via `moly setup`)
- **Policy bounds** — human-set limits gate all write operations before broadcast
- **Activity ledger** — audit trail for compliance

---

## Configuration Files

All stored in `~/.moly/`:

| File | Purpose | Permissions |
|------|---------|-------------|
| `config.json` | Network, mode, RPC, wallet, AI provider | chmod 600 |
| `bounds.json` | Policy bounds gating write operations | chmod 600 |
| `alerts.json` | Alert rules, daemon state, channel config | chmod 600 |
| `ledger.db` | SQLite activity ledger (all tool executions) | chmod 600 |

---

## Common Agent Workflows

### Workflow 1: Stake and Hold

```
1. get_balance() → check ETH available
2. stake_eth(amount_eth="0.5", dry_run=true) → see gas estimate
3. stake_eth(amount_eth="0.5", dry_run=false) → broadcast
4. Monitor get_balance() daily → see stETH balance grow
```

### Workflow 2: Stake for DeFi

```
1. get_balance() → check ETH
2. stake_eth(amount_eth="1.0", dry_run=true)
3. stake_eth(amount_eth="1.0", dry_run=false)
4. wrap_steth(amount_steth="1.0", dry_run=true)
5. wrap_steth(amount_steth="1.0", dry_run=false) → now ready for DeFi
```

### Workflow 3: Unstake and Withdraw

```
1. get_withdrawal_requests() → check pending requests
2. request_withdrawal(amount_steth="0.5", dry_run=true)
3. request_withdrawal(amount_steth="0.5", dry_run=false) → get NFT ID
4. (wait 1–5 days for finalization)
5. get_withdrawal_status(request_ids=["123", "124"]) → check finalization
6. claim_withdrawals(request_ids=["123"], dry_run=true)
7. claim_withdrawals(request_ids=["123"], dry_run=false) → receive ETH
```

### Workflow 4: Governance Voting

```
1. get_balance() → check LDO balance
2. get_proposals(count=10) → list active proposals
3. get_proposal(proposal_id=42) → read proposal details
4. cast_vote(proposal_id=42, support=true, dry_run=true)
5. cast_vote(proposal_id=42, support=true, dry_run=false) → vote recorded
```

---

## Troubleshooting

**"Insufficient ETH"**
- `stake_eth` failed due to low balance
- Solution: check `get_balance()`, ensure ETH ≥ (stake amount + 0.01 ETH gas buffer)

**"Bounds violation"**
- Request exceeds policy bounds (maxStakePerTx, maxDailyStake, minEthReserve)
- Solution: check `get_bounds()`, update with `set_bounds()` if needed

**"Governance requires LDO"**
- `cast_vote` failed because LDO balance is zero at proposal snapshot
- Solution: check `get_balance()` LDO field, acquire LDO before voting

**"Withdrawal not finalized"**
- `claim_withdrawals` failed because validators haven't exited yet
- Solution: check `get_withdrawal_status()`, wait 1–5 days, retry

**"Transaction dry run failed"**
- Simulation call failed — likely insufficient gas or invalid parameters
- Solution: check params, increase gas estimate, verify on testnet first

---

## Key Resources

- **Lido Docs:** https://docs.lido.fi
- **Lido Deployed Contracts:** https://docs.lido.fi/deployed-contracts
- **Lido SDK:** https://github.com/lidofinance/lido-ethereum-sdk
- **Lido Governance:** https://dao.lido.fi (Aragon interface)
- **Withdrawal Queue Spec:** https://docs.lido.fi/contracts/withdrawal-queue-erc721

---

## Agent Integration Checklist

Before deploying an agent to use Moly:

- [ ] Read this skill document fully
- [ ] Test on Hoodi Testnet first (simulation mode)
- [ ] Set up bounds in `~/.moly/bounds.json` (safety gates)
- [ ] Configure alerts if monitoring needed (Telegram or webhook)
- [ ] Run `moly setup` to configure wallet and mode
- [ ] Test a small dry_run workflow on mainnet (simulation mode)
- [ ] Review activity ledger (`moly ledger list`) to audit operations
- [ ] Deploy to live mode only after validation
- [ ] Monitor `moly monitor start` for ongoing alerts

---

**Last updated:** March 2026
**Moly Version:** 0.1.0+
