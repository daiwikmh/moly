---
description: Configure environment variables for the dashboard and MCP server
---

# Environment Variables

## Dashboard (`.env.local`)

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | — | API key from [openrouter.ai](https://openrouter.ai/keys) |
| `HOODI_RPC_URL` | No | `https://hoodi.drpc.org` | Hoodi testnet RPC |
| `MAINNET_RPC_URL` | No | `https://eth.llamarpc.com` | Ethereum mainnet read RPC |
| `MAINNET_WRITE_RPC_URL` | No | Alchemy URL | Mainnet RPC for write estimations |

### Example `.env.local`

```env
OPENROUTER_API_KEY=sk-or-v1-abc123...

# Optional: override RPCs
HOODI_RPC_URL=https://hoodi.drpc.org
MAINNET_RPC_URL=https://eth.llamarpc.com
```

---

## MCP Server (`mcp/.env`)

Create a `.env` file inside the `mcp/` directory:

```bash
cp mcp/.env.example mcp/.env
```

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `LIDO_MODE` | No | `simulation` | `simulation` (dry-run) or `live` (real txs) |
| `PRIVATE_KEY` | For live mode | — | Wallet private key with `0x` prefix |
| `HOLESKY_RPC_URL` | No | Public RPC | _Deprecated — use Hoodi_ |
| `HOODI_RPC_URL` | No | `https://hoodi.drpc.org` | Hoodi testnet RPC |
| `MAINNET_RPC_URL` | No | `https://eth.llamarpc.com` | Mainnet RPC |
| `REFERRAL_ADDRESS` | No | `0x000...000` | Referral for staking rewards |

### Example `mcp/.env`

```env
LIDO_MODE=simulation
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
HOODI_RPC_URL=https://hoodi.drpc.org
```

> **Warning:** The private key above is a well-known test key. Never use it for real funds. Always use dedicated test wallets for testnet operations.

---

## Security Notes

1. **Never commit `.env` files** — they're already in `.gitignore`
2. **Use test wallets** — create a dedicated wallet for testnet/development
3. **Rotate keys** — if a key is ever exposed, rotate immediately
4. **MCP server private key** — only needed for `live` mode with real transactions

---

Next: [Quick Start](quick-start.md)
