# Moly — Lido MCP Dashboard

AI-native staking dashboard for the Lido liquid staking protocol. Chat with an AI agent to query balances, simulate staking, and explore governance — all powered by Lido on-chain data.

## Quick Start

```bash
# Dashboard
cp .env.example .env.local
# Add your OPENROUTER_API_KEY to .env.local
bun install
bun run dev
```

Open http://localhost:3000

## MCP Server (for Claude Code / Cursor)

The MCP server runs separately and supports real transactions (with a private key).

```bash
cd mcp
cp .env.example .env
# Add your PRIVATE_KEY and LIDO_MODE to .env
bun install
bun run dev
```

### Claude Code Config

Add to your `.claude.json` or project settings:

```json
{
  "mcpServers": {
    "lido": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/moly/mcp/src/index.ts"],
      "env": {
        "LIDO_MODE": "simulation",
        "PRIVATE_KEY": "0x...",
        "HOLESKY_RPC_URL": "https://ethereum-holesky-rpc.publicnode.com"
      }
    }
  }
}
```

### Claude Desktop Config

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lido": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/moly/mcp/src/index.ts"],
      "env": {
        "LIDO_MODE": "simulation",
        "PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

### Cursor Config

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "lido": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/moly/mcp/src/index.ts"],
      "env": {
        "LIDO_MODE": "simulation",
        "PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

## Architecture

```
moly/
├── app/                    # Next.js dashboard
│   ├── api/chat/           # AI chat endpoint (Vercel AI SDK → OpenRouter)
│   ├── api/lido/           # REST API for sidebar data
│   ├── components/chat/    # Chat UI components
│   ├── components/sidebar/ # Sidebar with balances, stats, governance
│   └── context/            # Mode context (simulation/live)
├── lib/
│   ├── lido-config.ts      # Mode-aware chain/RPC config
│   └── lido.ts             # 13 Lido tool functions (raw viem calls)
└── mcp/                    # Standalone MCP server (Bun + Lido SDK)
    └── src/
        ├── index.ts        # MCP server entry
        └── tools/          # Tool implementations
```

## Tools

| Tool | Type | Description |
|------|------|-------------|
| `get_balance` | read | ETH/stETH/wstETH balances |
| `get_rewards` | read | Reward history |
| `get_conversion_rate` | read | stETH/wstETH exchange rate |
| `get_withdrawal_requests` | read | Pending withdrawal IDs |
| `get_withdrawal_status` | read | Check finalization status |
| `get_proposals` | read | List DAO governance proposals |
| `get_proposal` | read | Single proposal details |
| `stake_eth` | write | Stake ETH → stETH |
| `request_withdrawal` | write | Queue stETH → ETH withdrawal |
| `claim_withdrawals` | write | Claim finalized withdrawals |
| `wrap_steth` | write | Wrap stETH → wstETH |
| `unwrap_wsteth` | write | Unwrap wstETH → stETH |
| `cast_vote` | write | Vote on a DAO proposal |

Dashboard write operations are always dry-run simulations. Real transactions require the MCP server.
