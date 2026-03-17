---
description: Understanding the Mode and Network toggles
---

# Mode & Network Toggles

The Moly header has two independent toggles that control how the dashboard behaves.

## Network Toggle

```
[ Testnet ── ○ ── Mainnet ]
```

| Setting | Chain | Chain ID | RPC |
| --- | --- | --- | --- |
| **Testnet** | Hoodi | 560048 | `https://hoodi.drpc.org` |
| **Mainnet** | Ethereum | 1 | `https://eth.llamarpc.com` |

Switching the network changes which blockchain the dashboard reads data from and which contracts it interacts with.

## Mode Toggle

```
[ Simulation ── ○ ── Live ]
```

| Setting | Write Behavior | Use Case |
| --- | --- | --- |
| **Simulation** | All writes are **dry-run** — no real transactions | Testing, demos, exploration |
| **Live** | Writes show **real estimates** — execution via MCP server | Pre-flight checks before real txs |

> **Important:** The dashboard itself never broadcasts transactions, even in Live mode. It shows what _would_ happen. Real execution requires the MCP server with a private key.

## The Matrix

These toggles are **independent**. All four combinations are valid:

| Network | Mode | What You Get |
| --- | --- | --- |
| Testnet + Simulation | Dry-run estimates on Hoodi contracts | Safe playground |
| Testnet + Live | Real estimates on Hoodi | Pre-flight for testnet txs |
| Mainnet + Simulation | Dry-run estimates on mainnet contracts | See real mainnet data safely |
| Mainnet + Live | Real estimates on mainnet | Pre-flight for mainnet txs |

## Chain Pill

The colored pill next to the toggles shows the active chain:

- **Yellow** `Hoodi` — testnet active
- **Green** `Ethereum` — mainnet active

## How It Flows

```
Toggle change
     │
     ├─ Updates ModeContext (React state)
     │
     ├─ Sidebar refetches data with new network/chainId
     │
     └─ Next chat message includes new mode/network/chainId
        in the request body to /api/chat
```

---

Next: [Sidebar & Data](sidebar.md)
