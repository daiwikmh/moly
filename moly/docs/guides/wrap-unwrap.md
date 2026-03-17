---
description: Convert between stETH and wstETH
---

# Wrap & Unwrap stETH

## Why Wrap?

| stETH | wstETH |
| --- | --- |
| Rebasing — balance changes daily | Fixed balance — value grows |
| Some DeFi protocols can't handle it | Works everywhere in DeFi |
| Shows rewards directly in wallet | Better for collateral, LPing, bridging |

## Check the Rate First

```
You:  What's the stETH/wstETH conversion rate?
```

```
Conversion Rate:
  1 stETH = 0.8547 wstETH
  1 wstETH = 1.1700 stETH

  The ratio increases over time as staking rewards accumulate.
```

## Wrap stETH → wstETH

```
You:  Wrap 1 stETH to wstETH
```

**Simulation:**
```
Wrap Simulation:
  Input:    1.0 stETH
  Expected: 0.8547 wstETH
  Note:     Dry run — use MCP server to execute
```

**Live (MCP server):**
```
You:  Execute: wrap 1 stETH
Claude: Transaction 0xabc... broadcast.
        Wrapped 1.0 stETH → 0.8547 wstETH
```

## Unwrap wstETH → stETH

```
You:  Unwrap 0.5 wstETH
```

```
Unwrap Simulation:
  Input:    0.5 wstETH
  Expected: 0.5850 stETH
  Note:     Unwrapping gives rebasing stETH back
```

## When to Use Each

| Use stETH when... | Use wstETH when... |
| --- | --- |
| Holding in wallet | Depositing to Aave/Compound |
| Watching rewards grow | Providing LP on Uniswap/Curve |
| Planning to withdraw | Bridging to L2 (Arbitrum, Optimism) |
| Simple staking position | Using as collateral |

---

Next: [Governance Guide](governance.md)
