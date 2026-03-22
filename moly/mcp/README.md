# @moly-mcp/lido

MCP server for Lido — stake, unstake, wrap, bridge, and govern directly from any MCP-compatible AI client (Claude Desktop, Cursor, etc.).

Runs on Bun. Supports Holesky testnet (simulation mode) and Ethereum mainnet (live mode).

---

## Tools

| Tool | Description |
|---|---|
| `get_balance` | ETH, stETH, wstETH balances + staking APR |
| `get_rewards` | Reward history over N days |
| `get_conversion_rate` | Current stETH / wstETH exchange rate |
| `stake_eth` | Stake ETH to receive stETH |
| `request_withdrawal` | Queue stETH withdrawal back to ETH |
| `claim_withdrawals` | Claim finalized withdrawal requests |
| `get_withdrawal_requests` | List pending withdrawal request IDs |
| `get_withdrawal_status` | Check finalization status of requests |
| `wrap_steth` | Wrap stETH into wstETH |
| `unwrap_wsteth` | Unwrap wstETH back to stETH |
| `get_proposals` | List recent Lido DAO governance proposals |
| `get_proposal` | Get details on a specific proposal |
| `cast_vote` | Vote YEA / NAY on a DAO proposal |
| `get_l2_balance` | ETH + wstETH balances on Base or Arbitrum |
| `get_bridge_quote` | Quote for bridging from L2 to L1 via LI.FI |
| `bridge_to_ethereum` | Execute L2 to L1 bridge via LI.FI |
| `get_bridge_status` | Track an in-progress bridge transaction |

---

## Modes

| Mode | Network | Default for write ops |
|---|---|---|
| `simulation` | Holesky testnet | `dry_run: true` (no real txs) |
| `live` | Ethereum mainnet | `dry_run: false` (real txs) |

Set `LIDO_MODE=simulation` (default) to experiment safely. Set `LIDO_MODE=live` for mainnet.

---

## Setup

**1. Copy env file**

```bash
cp .env.example .env
```

**2. Fill in `.env`**

```env
LIDO_MODE=simulation         # or "live" for mainnet
PRIVATE_KEY=0x...            # wallet private key
HOLESKY_RPC_URL=...          # optional, has public fallback
MAINNET_RPC_URL=...          # optional, has public fallback
REFERRAL_ADDRESS=0x...       # optional
```

**3. Install dependencies**

```bash
bun install
```

**4. Run**

```bash
bun run start
```

---

## Claude Desktop Config

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lido": {
      "command": "bunx",
      "args": ["@moly-mcp/lido"],
      "env": {
        "LIDO_MODE": "simulation",
        "PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

---

## Source Structure

```
src/
  index.ts          entry point
  server.ts         MCP server setup
  config.ts         env config + chain constants
  sdk.ts            Lido SDK singleton
  wallet.ts         viem wallet + L2 client helpers
  tools/
    index.ts        tool registration
    balance.ts      get_balance, get_rewards
    stake.ts        stake_eth
    unstake.ts      request_withdrawal, claim_withdrawals, get_withdrawal_*
    wrap.ts         wrap_steth, unwrap_wsteth, get_conversion_rate
    governance.ts   get_proposals, get_proposal, cast_vote
    bridge.ts       get_l2_balance, get_bridge_*, bridge_to_ethereum
```

---

## License

MIT
