---
description: Connect Moly to Claude Desktop
---

# Claude Desktop Setup

## Locate Config File

| OS | Path |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

## Add Moly Server

Edit the config file and add:

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

## Restart Claude Desktop

After saving the config, fully restart Claude Desktop. The Lido tools should appear in the tools menu (hammer icon).

## Verify

Type in Claude Desktop:

```
List all Lido tools available
```

You should see 13 tools: `get_balance`, `stake_eth`, `wrap_steth`, etc.

## Usage Tips

- Claude Desktop will ask for **approval** before executing each tool call
- In simulation mode, all writes are safe dry-runs
- Switch to live mode only when you're ready to execute real transactions

---

Next: [Cursor Setup](cursor.md)
