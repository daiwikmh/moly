# Lido Skill — Agent Mental Model

> Read this before calling any Lido MCP tools. It gives you the mental model to act safely and correctly.

---

## What is Lido?

Lido is a liquid staking protocol on Ethereum. You deposit ETH, receive **stETH** (staked ETH) in return, and earn Ethereum validator rewards — without locking up your ETH or running a validator yourself. Your stETH can be withdrawn back to ETH via the withdrawal queue.

---

## stETH — The Rebasing Token

**stETH rebases daily.** This means:
- Your stETH *balance increases automatically* each day as rewards accumulate
- You don't need to claim rewards — they appear directly in your wallet
- 1 stETH ≈ 1 ETH in value (it tracks ETH 1:1 plus accrued rewards over time)
- Current APR: ~3–4% annually (check `get_balance` for live rate)

**Important for integrations:** Because stETH rebases, some DeFi protocols (AMMs, lending) can't handle it natively. Use wstETH instead.

---

## wstETH — The Non-Rebasing Wrapper

**wstETH (wrapped stETH)** solves the rebase problem:
- Fixed balance — your wstETH count never changes
- Value grows instead: 1 wstETH becomes worth more stETH over time
- Better for DeFi: Aave, Uniswap v3, Curve all support wstETH natively
- Same underlying position — wrapping/unwrapping is lossless

**When to use wstETH:**
- Providing liquidity in DeFi
- Using staked ETH as collateral
- Transferring staked position across chains (bridges prefer wstETH)

**When to use stETH:**
- Watching your rewards grow in a wallet
- Simple staking without DeFi activity

---

## Staking Flow

```
ETH → stake_eth → stETH (rebasing, earning daily)
stETH → wrap_steth → wstETH (fixed balance, growing value)
wstETH → unwrap_wsteth → stETH
stETH → request_withdrawal → (queue) → claim_withdrawals → ETH
```

---

## Withdrawal Queue Mechanics

Withdrawals are **not instant**. Here's how they work:

1. `request_withdrawal` — burns your stETH, mints an ERC-721 NFT (your queue position)
2. Validators exit to cover the withdrawal — can take **hours to days**
3. Once finalized, `get_withdrawal_status` shows `isFinalized: true`
4. `claim_withdrawals` — burns your NFT, receives ETH

**Limits per request:** min 0.1 stETH, max 1000 stETH
**Large withdrawals:** split into multiple 1000 stETH requests

---

## Safe Staking Patterns

1. **Always dry_run first** — especially on mainnet. Check gas estimates and expected outputs before broadcasting.
2. **Check balance before staking** — ensure sufficient ETH for both the stake amount and gas.
3. **Don't withdraw immediately** — the withdrawal queue adds overhead. Only withdraw if you need ETH back.
4. **Wrap for DeFi** — if the user plans to use stETH in a DeFi protocol, wrap to wstETH first.
5. **Governance requires LDO** — voting on proposals requires LDO tokens, not stETH. Check LDO balance before attempting.

---

## Governance (Lido DAO / Aragon)

Lido is governed by LDO token holders via Aragon Voting:
- Proposals are called "votes" — each has a numeric ID
- Voting requires LDO tokens (snapshot at the proposal's snapshot block)
- Options: YEA (support) or NAY (against)
- Proposals pass if: support > threshold AND quorum is met

**Flow:** `get_proposals` → `get_proposal(id)` → `cast_vote(id, true/false)`

---

## Modes

| Mode | Network | Writes | Use When |
|------|---------|--------|----------|
| `simulation` | Holesky testnet | dry_run by default | Development, testing, demos |
| `live` | Mainnet | Real transactions | Production, actual staking |

In simulation mode, all write tools simulate by default. Pass `dry_run: false` explicitly to broadcast on Holesky.

---

## Tool Reference

| Tool | Type | Description |
|------|------|-------------|
| `get_balance` | read | ETH/stETH/wstETH balances + APR |
| `get_rewards` | read | Reward history over N days |
| `get_conversion_rate` | read | stETH ↔ wstETH rate |
| `stake_eth` | write | Stake ETH → stETH |
| `request_withdrawal` | write | Queue withdrawal stETH → ETH |
| `claim_withdrawals` | write | Claim finalized withdrawals |
| `get_withdrawal_requests` | read | List pending request IDs |
| `get_withdrawal_status` | read | Check finalization status |
| `wrap_steth` | write | Wrap stETH → wstETH |
| `unwrap_wsteth` | write | Unwrap wstETH → stETH |
| `get_proposals` | read | List DAO governance proposals |
| `get_proposal` | read | Get single proposal details |
| `cast_vote` | write | Vote on a DAO proposal |
