---
description: Read-only tools for querying Lido data
---

# Read Tools

These tools query on-chain data without modifying state. They're free to call in any mode.

---

## `get_balance`

Get ETH, stETH, and wstETH balances for any Ethereum address.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | Yes | Ethereum address (0x...) |

**Returns:**

```json
{
  "address": "0x742d35Cc...",
  "network": "Hoodi Testnet",
  "chain": "hoodi",
  "balances": {
    "eth": "1.5000",
    "stETH": "0.8234",
    "wstETH": "0.7100"
  }
}
```

**Example prompt:** _"What's the balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18?"_

---

## `get_rewards`

Get staking reward history for an address.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | Yes | Ethereum address |
| `days` | number | No | Lookback period (default: 7) |

> **Note:** Full reward history requires the Lido SDK and is only available via the MCP server. The dashboard returns a placeholder.

---

## `get_conversion_rate`

Get the current stETH/wstETH exchange rate.

**Parameters:** None

**Returns:**

```json
{
  "network": "Hoodi Testnet",
  "1_stETH_in_wstETH": "0.8547",
  "1_wstETH_in_stETH": "1.1700",
  "note": "wstETH/stETH ratio increases over time as staking rewards accumulate."
}
```

**Example prompt:** _"What's the current stETH to wstETH conversion rate?"_

---

## `get_withdrawal_requests`

List pending withdrawal request IDs for an address.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `address` | string | Yes | Ethereum address |

> **Note:** Full withdrawal data requires the Lido SDK (MCP server).

---

## `get_withdrawal_status`

Check finalization status of specific withdrawal requests.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `request_ids` | string[] | Yes | Array of withdrawal request IDs |

---

## `get_proposals`

List recent Lido DAO governance proposals.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | number | No | Number of proposals (default: 5) |

**Returns:**

```json
{
  "network": "Ethereum Mainnet",
  "total": 178,
  "proposals": [
    {
      "id": 177,
      "open": false,
      "executed": true,
      "startDate": "2024-12-15T10:00:00.000Z",
      "yea": "51234567.89",
      "nay": "1234.56",
      "votingPower": "52000000.00"
    }
  ]
}
```

---

## `get_proposal`

Get detailed info about a specific proposal.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `proposal_id` | number | Yes | Proposal ID |

**Returns:** Full proposal data including support threshold, quorum requirement, and vote breakdown.

---

Next: [Write Tools](write-tools.md)
