---
description: The collapsible sidebar — balances, stats, and governance at a glance
---

# Sidebar & Data

The sidebar provides a traditional dashboard view alongside the chat. It shows live protocol data and tracked address balances.

## Sections

### Track Address

Enter an Ethereum address (0x...) to track its balances. Press Enter or click **Go**.

The sidebar will display:

- **ETH Balance** — native Ether
- **stETH Balance** — liquid staking token
- **wstETH Balance** — wrapped staking token

Balances auto-refresh every 30 seconds.

### Protocol Stats

Always visible, shows:

| Stat | Description |
| --- | --- |
| Total Staked | Total ETH staked in Lido on the current network |
| stETH per wstETH | Current conversion rate |
| Network | Active network name |

### Governance

Lists the 5 most recent Lido DAO proposals with:

- Proposal ID
- Status badge (Open / Executed / Closed)
- Vote percentages (Yea / Nay)

## Collapsing

Click the **arrow button** in the sidebar header to collapse it. A floating button appears on the right edge to expand it again. This maximizes the chat panel width.

## Data Source

The sidebar fetches from `/api/lido` with query parameters:

```
GET /api/lido?action=stats&mode=simulation&network=testnet&chainId=hoodi
GET /api/lido?action=proposals&count=5&mode=simulation&network=testnet&chainId=hoodi
GET /api/lido?action=balances&address=0x...&mode=simulation&network=testnet&chainId=hoodi
```

These use the same `lib/lido.ts` functions as the chat tools, ensuring consistent data.

---

Next: [Tools Overview](../tools/overview.md)
