---
description: Managing private keys and wallets for the MCP server
---

# Private Key & Wallets

## Why a Private Key?

The MCP server needs a private key to:

- **Sign transactions** in live mode (staking, wrapping, withdrawals, voting)
- **Derive your address** for balance queries and withdrawal lookups

In **simulation mode**, the private key is used to derive your address for reads but no transactions are actually broadcast.

## Setting Up

### 1. Generate a Test Wallet

For testnet, create a dedicated test wallet:

```bash
# Using cast (foundry)
cast wallet new

# Or using any Ethereum wallet (MetaMask, etc.)
```

Save the private key (starts with `0x`, 64 hex characters).

### 2. Fund the Wallet

For Hoodi testnet, get test ETH from faucets:

- Search for "Hoodi testnet faucet" or check the Ethereum Foundation resources
- You need test ETH for gas fees and staking

### 3. Configure

Add to your MCP config (`.env`, `.claude.json`, or client config):

```env
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Security Best Practices

| Do | Don't |
| --- | --- |
| Use dedicated test wallets for development | Use your main wallet's private key |
| Keep keys in `.env` files (gitignored) | Commit keys to version control |
| Use testnet for development | Start with mainnet |
| Rotate keys if exposed | Reuse compromised keys |

## Per-Client Configuration

Each MCP client has its own way to pass the private key:

### Claude Code / Desktop / Cursor

Pass it in the `env` block of the MCP config:

```json
{
  "env": {
    "PRIVATE_KEY": "0x..."
  }
}
```

The key is passed as an environment variable to the server process. It's **not** sent to the AI model — it stays in the server process.

### Direct CLI

```bash
PRIVATE_KEY=0x... LIDO_MODE=live bun run mcp/src/index.ts
```

## What the Server Does with Your Key

1. **Derives address** — uses `privateKeyToAccount()` from viem
2. **Creates wallet client** — only when a write operation is requested in live mode
3. **Signs transactions** — the key never leaves the local process
4. **No network exposure** — the key is never sent over HTTP; only signed transactions are broadcast

---

Next: [Dashboard Overview](../dashboard/overview.md)
