---
description: Connect Moly to Claude Code
---

# Claude Code Setup

## Add to Project Settings

Create or edit `.claude.json` in your project root:

```json
{
  "mcpServers": {
    "lido": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/moly/mcp/src/index.ts"],
      "env": {
        "LIDO_MODE": "simulation",
        "PRIVATE_KEY": "0xYourPrivateKey",
        "HOODI_RPC_URL": "https://hoodi.drpc.org"
      }
    }
  }
}
```

> Replace `/absolute/path/to/moly` with the actual path on your system.

## Verify Connection

Start Claude Code:

```bash
claude
```

Then ask:

```
What tools do you have for Lido?
```

Claude should list all 13 Lido tools.

## Example Conversations

### Check Balance
```
You: What's the balance for 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18?
Claude: [calls get_balance] Shows ETH, stETH, wstETH balances on Hoodi testnet.
```

### Stake ETH
```
You: Stake 0.1 ETH
Claude: [calls stake_eth] Simulation shows ~0.1 stETH expected, estimated gas 82,431.
         Want me to execute for real? (requires live mode)
```

### Governance
```
You: Show me the latest governance proposals
Claude: [calls get_proposals] Lists 5 most recent Lido DAO proposals with voting status.
```

## Live Mode

To enable real transactions, update the env:

```json
{
  "env": {
    "LIDO_MODE": "live",
    "PRIVATE_KEY": "0xYourFundedPrivateKey"
  }
}
```

> **Warning:** Live mode on mainnet uses real ETH. Start with testnet.

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| "PRIVATE_KEY env var is required" | Add `PRIVATE_KEY` to env block |
| Server not found | Check the absolute path in `args` |
| Tools not showing | Restart Claude Code after config change |
| RPC errors | Check network connectivity, try alternative RPC |

---

Next: [Claude Desktop Setup](claude-desktop.md)
