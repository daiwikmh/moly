---
description: End-to-end guide — stake ETH from a conversation
---

# Stake ETH from a Conversation

This guide walks through the complete flow of staking ETH using Moly — from setup to seeing stETH in your wallet.

## Prerequisites

- Moly MCP server installed and configured
- A funded wallet (test ETH on Hoodi, or real ETH on mainnet)
- Claude Code, Claude Desktop, or Cursor with the MCP server connected

## Step 1: Check Your Balance

Start a conversation with Claude:

```
You:  What's my balance?
```

Claude calls `get_balance` and shows:

```
Balance on Hoodi Testnet:
  ETH:    2.5000
  stETH:  0.0000
  wstETH: 0.0000
```

## Step 2: Simulate the Stake

```
You:  Simulate staking 1 ETH
```

Claude calls `stake_eth` in simulation mode:

```
Simulation Result:
  Action:        stake
  Amount:        1.0 ETH
  Expected stETH: ~1.0
  Estimated Gas:  82,431
  Mode:          simulation (dry-run)
```

## Step 3: Execute for Real

If you're in simulation mode, switch to live:

```
You:  Switch to live mode and stake 1 ETH
```

Or update your MCP config to `LIDO_MODE=live` and restart.

Claude calls `stake_eth` in live mode:

```
Transaction Broadcast:
  Action:     stake
  Amount:     1.0 ETH
  TX Hash:    0x7a8b9c...
  stETH Received: 0.9999
  Shares:     0.8543
```

## Step 4: Verify

```
You:  Check my balance again
```

```
Balance on Hoodi Testnet:
  ETH:    1.4997  (minus gas)
  stETH:  0.9999
  wstETH: 0.0000
```

## Step 5: Watch Rewards

stETH rebases daily. Your balance will grow over time:

```
You:  Show my reward history for the last 7 days
```

Claude calls `get_rewards` and shows accumulated rewards.

---

## Using the Dashboard

You can also simulate staking from the Moly dashboard:

1. Open [http://localhost:3000](http://localhost:3000)
2. Set **Network** to Testnet (Hoodi) or Mainnet
3. Set **Mode** to Simulation
4. Type: _"Simulate staking 0.5 ETH"_
5. See the result card with gas estimate and expected output

> The dashboard always dry-runs. For real execution, use the MCP server.

---

## Safety Checklist

- [ ] Start on **testnet** (Hoodi) before mainnet
- [ ] **Simulate first** — always dry-run before live execution
- [ ] Check balance covers **amount + gas**
- [ ] Verify the **network** in the response matches your intent

---

Next: [Wrap & Unwrap Guide](wrap-unwrap.md)
