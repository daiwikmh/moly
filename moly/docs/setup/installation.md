---
description: Clone and install Moly
---

# Installation

## Clone the Repository

```bash
git clone https://github.com/your-org/moly.git
cd moly
```

## Install Dashboard Dependencies

```bash
bun install
```

## Install MCP Server Dependencies

```bash
cd mcp
bun install
cd ..
```

## Verify Installation

```bash
# Dashboard
bun run dev
# → http://localhost:3000

# MCP Server (in another terminal)
cd mcp && bun run dev
# → "Lido MCP server started (simulation mode)"
```

## Project Structure

```
moly/
├── app/                     # Next.js dashboard
│   ├── api/chat/            # AI chat endpoint
│   ├── api/lido/            # REST API for sidebar
│   ├── components/          # UI components
│   ├── context/             # React contexts
│   └── hooks/               # Custom hooks
├── lib/
│   ├── lido-config.ts       # Chain & contract config
│   └── lido.ts              # 13 tool functions
├── mcp/                     # MCP server (standalone)
│   └── src/
│       ├── index.ts          # Server entry
│       ├── config.ts         # Mode config
│       ├── sdk.ts            # Lido SDK init
│       ├── wallet.ts         # Private key wallet
│       └── tools/            # Tool implementations
├── docs/                    # This documentation
└── package.json
```

---

Next: [Environment Variables](environment-variables.md)
