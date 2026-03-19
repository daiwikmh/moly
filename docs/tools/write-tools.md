---
description: Write tools for staking, wrapping, and withdrawals
---

# Write Tools

These tools modify on-chain state. In **simulation mode**, they return dry-run estimates. In **live mode** (MCP server only), they execute real transactions.

> **Dashboard note:** The dashboard always shows dry-run results regardless of mode. Real transactions require the MCP server with a private key.

---

## `stake_eth`

Stake ETH to receive stETH.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `amount_eth` | string | Yes | Amount of ETH to stake |

**Simulation returns:**

```json
{
  "simulated": true,
  "network": "Hoodi Testnet",
  "action": "stake",
  "amountEth": "0.1",
  "estimatedGas": "82431",
  "expectedStETH": "0.1",
  "mode": "simulation",
  "note": "Dry run (simulation mode) — no transaction sent."
}
```

**Live returns (MCP server):**

```json
{
  "simulated": false,
  "action": "stake",
  "amountEth": "0.1",
  "txHash": "0xabc...",
  "stethReceived": "0.0999",
  "sharesReceived": "0.0854"
}
```

**Key points:**
- 1 ETH staked gives approximately 1 stETH
- stETH rebases daily — your balance grows automatically
- Minimum stake: any amount (gas must be covered)

---

## `request_withdrawal`

Queue a withdrawal of stETH back to ETH.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `amount_steth` | string | Yes | Amount of stETH to withdraw |

**Key points:**
- Minimum: 0.1 stETH per request
- Maximum: 1,000 stETH per request
- Withdrawal enters a queue — finalization takes hours to days
- You receive an ERC-721 NFT representing your queue position

---

## `claim_withdrawals`

Claim finalized withdrawals to receive ETH.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `request_ids` | string[] | Yes | Array of withdrawal request IDs |

**Prerequisites:** Withdrawals must be finalized (check with `get_withdrawal_status`).

---

## `wrap_steth`

Wrap stETH to wstETH (non-rebasing wrapper).

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `amount_steth` | string | Yes | Amount of stETH to wrap |

**Returns (simulation):**

```json
{
  "simulated": true,
  "network": "Hoodi Testnet",
  "action": "wrap_steth",
  "amountSteth": "1.0",
  "expectedWstETH": "0.8547"
}
```

**When to wrap:**
- Providing liquidity in DeFi (Aave, Uniswap, Curve)
- Using staked ETH as collateral
- Bridging staked position to L2s

---

## `unwrap_wsteth`

Unwrap wstETH back to stETH.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `amount_wsteth` | string | Yes | Amount of wstETH to unwrap |

**When to unwrap:**
- You want to see daily reward rebasing in your wallet
- You want to withdraw (withdrawal queue accepts stETH)

---

Next: [Governance Tools](governance-tools.md)
