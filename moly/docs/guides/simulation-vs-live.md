---
description: Understanding when to simulate and when to go live
---

# Simulation vs Live Mode

## The Two Modes

### Simulation Mode

```
LIDO_MODE=simulation
```

- **Default mode** — safe for exploration
- All write tools return **dry-run results**: gas estimates, expected outputs, notes
- No transactions are broadcast to any chain
- Read tools work normally (real on-chain data)
- Works on both testnet and mainnet

### Live Mode

```
LIDO_MODE=live
PRIVATE_KEY=0x...
```

- Write tools **execute real transactions**
- Requires a funded wallet with sufficient ETH for gas
- Works on both testnet and mainnet
- **Dashboard always dry-runs** — live execution only via MCP server

## Decision Flow

```
Want to explore / demo / learn?
  └──► Use Simulation mode

Ready to test with real (test) transactions?
  └──► Switch to Live + Testnet (Hoodi)

Confident and ready for mainnet?
  └──► Switch to Live + Mainnet
        ⚠️  Uses real ETH
```

## Best Practices

### Always Simulate First

Even in live mode, you can dry-run before executing:

```
You:  Simulate staking 1 ETH (don't execute yet)
Claude: [dry-run result with gas estimate]

You:  Looks good. Now execute it.
Claude: [broadcasts transaction]
```

### Start on Testnet

The progression should be:

1. **Simulation + Testnet** — learn the tools
2. **Live + Testnet** — test real transactions with test ETH
3. **Simulation + Mainnet** — verify mainnet data/estimates
4. **Live + Mainnet** — real operations with real funds

### Check the Response

Every tool response includes:

| Field | What to check |
| --- | --- |
| `simulated` | `true` = dry-run, `false` = real tx |
| `network` | Confirms which chain was used |
| `mode` | Confirms simulation or live |
| `txHash` | Only present for real transactions |

## Dashboard vs MCP Server

| Capability | Dashboard | MCP Server |
| --- | --- | --- |
| Read operations | Yes | Yes |
| Dry-run simulations | Yes | Yes |
| Real transactions | No | Yes (live mode) |
| Private key required | No | Yes (live mode) |

The dashboard is designed for **exploration and visualization**. The MCP server is for **execution**.

---

Next: [Supported Chains](../chains.md)
