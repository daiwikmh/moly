---
description: Connect Moly to Cursor IDE
---

# Cursor Setup

## Add MCP Config

Create `.cursor/mcp.json` in your project root:

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

## Enable MCP in Cursor

1. Open Cursor Settings (`Cmd/Ctrl + ,`)
2. Search for "MCP"
3. Ensure MCP is enabled
4. Restart Cursor

## Verify

Open the Cursor chat (Agent mode) and ask:

```
What Lido tools are available?
```

Cursor should discover and list the 13 Lido tools.

## Example Usage

```
You: Check the stETH balance for 0x742d35Cc...
Cursor: [calls get_balance tool]
        Balance on Hoodi testnet:
        ETH:    1.5000
        stETH:  0.8234
        wstETH: 0.7100
```

---

Next: [Private Key & Wallets](wallets.md)
