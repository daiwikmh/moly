# Moly — Synthesis Hackathon Submission

## Core Fields

**teamUUID:** 389b73ae3678415fb433f8f4fdab74bf

**name:** Moly

**description:**
Moly is an open-source MCP server and CLI that gives any AI agent full access to the Lido staking protocol. One npm package, 28 tools: stake ETH, manage withdrawals, wrap/unwrap stETH, vote on governance, monitor positions across L1 and L2, set alerts and safety bounds. Works with Claude, Cursor, Windsurf, or any MCP-compatible client. Wallet keys stay local via OWS encrypted vault.

Workflow:

![Moly Workflow](https://moly-lido.vercel.app/WORKFLOW.png)

```
User / AI Agent
      │
      │  natural language
      ▼
  Moly CLI  ──────────────────────────────────────────────────────────┐
  (stdio MCP server)                                                   │
      │                                                                │
      ├── read tools (balance, rewards, proposals) ──► viem eth_call ──► Lido contracts
      │                                                                │
      └── write tools (stake, withdraw, wrap, vote)                   │
              │                                                        │
              ▼                                                        │
        OWS Vault (~/.ows/)                                           │
        AES-256-GCM encrypted                                         │
              │  exportWallet() → secp256k1 key                       │
              ▼                                                        │
        viem walletClient ──────────────────────────────────────────► Lido contracts
                                                                       │
                                                              Hoodi Testnet / Mainnet
```

CLI on top of OWS: the `moly` binary wraps the OWS vault entirely — `moly setup` imports or generates a key into the encrypted vault, and every tool call resolves the signing key from the vault at runtime. The private key never touches disk in plaintext. Users can also run `moly stake 0.1`, `moly balance`, `moly proposals` directly from the terminal without any AI agent involved.

**problemStatement:**
There is currently no institutional-grade MCP server that both protects your wallet and handles the full complexity of Lido protocol interactions. Existing integrations are either REST API wrappers relabelled as MCP with no real wallet security, or raw key setups that expose private keys on disk. Neither satisfies the bar for agents managing real ETH at scale. Moly solves this: wallet keys are secured in an AES-256-GCM encrypted OWS vault and never touch disk in plaintext, while the full Lido surface — staking, withdrawals, wrapping, governance, cross-chain bridging, position monitoring, and alerts — is exposed as 28 callable MCP tools with dry-run support on every write operation. Any MCP-compatible AI agent can stake, unstake, wrap, govern, and monitor Lido positions through natural language with no custom code required.

**repoURL:** https://github.com/daiwikmh/moly

**trackUUIDs:**
- 4b98c9cf6e9b42dfbb500a648884e2ab (Lido MCP 1st Place)
- e4652595629f4c24a6b662d1bec18071 (Lido MCP 2nd Place)
- 31a29fcaf67741d48801208e36196881 (Vault Position Monitor + Alert Agent 1st Place)

**deployedURL:** https://moly-lido.vercel.app

**videoURL:** https://youtu.be/Y22JoTdWLtI

**coverImageURL:** https://moly-lido.vercel.app/molylanding.png

**pictures:**
- https://moly-lido.vercel.app/molylanding.png
- https://moly-lido.vercel.app/molyfeatures.png
- https://moly-lido.vercel.app/molyconfig.png
- https://moly-lido.vercel.app/molyterminal.png
- https://moly-lido.vercel.app/stakemoly.png
- https://moly-lido.vercel.app/WORKFLOW.png

---

## conversationLog

This project was built entirely through human-agent collaboration using Claude Code (claude-sonnet-4-6 / claude-opus-4-6) as the agent harness. The developer (Daiwik Maheshwari, blockchain dev at @unrealai) directed the agent across multiple sessions from architecture through to submission.

### Phase 1 — Architecture & Scaffolding
The developer defined the goal: a Lido MCP server that lets any AI agent stake ETH, manage positions, and vote on governance through natural language with no custom integration code. The agent helped design a three-package monorepo: CLI (@moly-mcp/lido), a Bun MCP server, and a Next.js dashboard. The CLI was chosen as the primary product since it runs locally with a real wallet, while the dashboard would be simulation-only.

### Phase 2 — CLI Package
The agent built the CLI from scratch:
- Setup wizard using @clack/prompts covering network (Hoodi testnet / Ethereum mainnet), mode (simulation / live), RPC, wallet (raw private key or OWS encrypted vault), and AI provider
- Config stored at ~/.moly/config.json (chmod 600)
- MCP server via stdio transport using @modelcontextprotocol/sdk
- 28 tools: balance, rewards, stake, withdraw, claim, wrap, unwrap, conversion rate, proposals, vote, L2 balance, bridge quote, bridge, bridge status, alerts, bounds, ledger, position, settings, wallet
- Direct viem contract calls to Lido's deployed contracts on Hoodi testnet and Ethereum mainnet (no mock data)
- All write tools support dry_run/simulation mode
- Interactive terminal chat mode with agentic loop (Anthropic / OpenRouter / Gemini)

### Phase 3 — OWS Wallet Integration
Integrated @open-wallet-standard/core for encrypted key storage. Key challenges solved with agent help:
- SDK API discovery: createWallet(name, passphrase?), importWalletPrivateKey(name, keyHex, passphrase?), exportWallet() returns JSON string with {secp256k1, ed25519} keys (not a plain hex key)
- Auto-install of OWS SDK into ~/.moly/ when user selects OWS in wizard
- Runtime fallback search: local require → ~/.moly/node_modules → nvm global

### Phase 4 — Dashboard & Docs
- Next.js app with landing page (dark theme, Instrument Serif / JetBrains Mono), dashboard, and docs site
- Dashboard uses Vercel AI SDK v6 with OpenRouter for simulation-only agent chat
- Docs cover CLI setup, MCP config for Claude/Cursor/Windsurf, tools reference, architecture
- /api/skill endpoint serves lido.skill.md as raw markdown for agent consumption
- Agent skill file covers Lido mechanics, rebasing, wstETH vs stETH, safe patterns, all 28 tools

### Phase 5 — Bug Fixes & Polish
Multiple iterations fixing real issues discovered during live testing on Hoodi testnet:
- Lido SDK "Web3 Provider not defined" — fixed by passing wallet client to SDK at init time
- Lido SDK "Account type undefined not supported" — bypassed SDK for stakeEth, using wallet.writeContract() directly against the stETH submit() function
- OWS exportWallet() returns JSON string not plain hex — parse and extract secp256k1 key
- Private key normalization — ensure 0x prefix in all paths
- npm init -y fails with ".moly" as package name — replaced with writeFileSync for package.json
- npx stale cache causing old binary to run — switched to versioned installs

### Phase 6 — CLI Commands
Added direct CLI commands so users can interact with Lido without the agent terminal:
moly balance, moly stake, moly withdraw, moly wrap, moly unwrap, moly rate, moly proposals, moly vote, moly wallet, moly rewards, moly withdrawals, moly claim
All support --dry-run flag. Tested locally against Hoodi testnet before publishing.

### Versions Published
1.0.x through 1.2.1 published to npm as @moly-mcp/lido across the hackathon period.

### Live Demo
Stake of 0.01 ETH executed on Hoodi testnet:
txHash: 0xaa4f58a777147b40638a6aee62dc7f0bc3658e82094c8bfd5c2866c8342eb99e
network: Hoodi Testnet, mode: live

---

## submissionMetadata

**agentFramework:** other

**agentFrameworkOther:** Custom agentic loop with direct provider API calls (Anthropic, OpenRouter, Gemini) in the CLI terminal; Vercel AI SDK for the web dashboard chat

**agentHarness:** claude-code

**model:** claude-sonnet-4-6

**skills:**
- lido.skill.md (Lido staking mental model, protocol patterns, tool reference)

**tools:**
- @lidofinance/lido-ethereum-sdk
- viem
- @modelcontextprotocol/sdk
- @open-wallet-standard/core
- @clack/prompts
- better-sqlite3
- zod
- LI.FI REST API
- OpenRouter
- Next.js
- Vercel AI SDK
- tsup

**intention:** continuing

**intentionNotes:** Moly is being developed as a long-term open-source tool for AI-native DeFi access. Post-hackathon plans include expanding to more protocols beyond Lido, adding multi-sig support, and publishing to MCP registries for broader agent adoption.

**helpfulResources:**
- https://moly-lido.vercel.app/docs
- https://docs.lido.fi
- https://docs.lido.fi/deployed-contracts
- https://github.com/lidofinance/lido-ethereum-sdk
- https://docs.lido.fi/guides/steth-integration-guide
- https://docs.lido.fi/contracts/withdrawal-queue-erc721
- https://docs.lido.fi/contracts/lido-dao
- https://openwallet.sh
- https://modelcontextprotocol.io

**helpfulSkills:**
- name: lido.skill.md
  reason: Provided the agent with Lido protocol mental model (rebasing, wstETH vs stETH, safe staking patterns) so it could make informed decisions during tool calls

**moltbookPostURL:** [OPTIONAL]

---

## Pre-publish Checklist

- [x] name set
- [x] description filled
- [x] problemStatement filled
- [x] repoURL set and public
- [x] trackUUIDs assigned
- [x] deployedURL set
- [x] videoURL recorded and linked
- [x] conversationLog complete
- [x] submissionMetadata complete
- [ ] Self-custody transfer completed
- [ ] Team admin publishes

---

## API Payload (ready to POST /projects)

```json
{
  "teamUUID": "389b73ae3678415fb433f8f4fdab74bf",
  "name": "Moly",
  "description": "Moly is an open-source MCP server and CLI that gives any AI agent full access to the Lido staking protocol. One npm package, 28 tools: stake ETH, manage withdrawals, wrap/unwrap stETH, vote on governance, monitor positions across L1 and L2, set alerts and safety bounds. Works with Claude, Cursor, Windsurf, or any MCP-compatible client. Wallet keys stay local via OWS encrypted vault. The moly CLI wraps the OWS vault entirely — setup imports or generates a key into AES-256-GCM encrypted storage, and every write tool resolves the signing key from the vault at runtime. Private key never touches disk in plaintext. Users can also call tools directly from the terminal (moly stake, moly balance, moly proposals) without any AI agent.",
  "problemStatement": "There is currently no institutional-grade MCP server that both protects your wallet and handles the full complexity of Lido protocol interactions. Existing integrations are either REST API wrappers relabelled as MCP with no real wallet security, or raw key setups that expose private keys on disk. Neither satisfies the bar for agents managing real ETH at scale. Moly solves this: wallet keys are secured in an AES-256-GCM encrypted OWS vault and never touch disk in plaintext, while the full Lido surface — staking, withdrawals, wrapping, governance, cross-chain bridging, position monitoring, and alerts — is exposed as 28 callable MCP tools with dry-run support on every write operation. Any MCP-compatible AI agent can stake, unstake, wrap, govern, and monitor Lido positions through natural language with no custom code required.",
  "repoURL": "https://github.com/daiwikmh/moly",
  "trackUUIDs": [
    "4b98c9cf6e9b42dfbb500a648884e2ab",
    "e4652595629f4c24a6b662d1bec18071",
    "31a29fcaf67741d48801208e36196881"
  ],
  "deployedURL": "https://moly-lido.vercel.app",
  "coverImageURL": "https://moly-lido.vercel.app/molylanding.png",
  "pictures": "https://moly-lido.vercel.app/molylanding.png https://moly-lido.vercel.app/molyfeatures.png https://moly-lido.vercel.app/molyconfig.png https://moly-lido.vercel.app/molyterminal.png https://moly-lido.vercel.app/stakemoly.png",
  "videoURL": "https://youtu.be/Y22JoTdWLtI",
  "conversationLog": "Built through human-agent collaboration using Claude Code across multiple sessions. Phase 1: architecture and monorepo scaffolding (CLI + Bun MCP server + Next.js dashboard). Phase 2: CLI package with 28 Lido tools via stdio MCP, setup wizard, simulation and live modes. Phase 3: OWS wallet integration — discovered SDK returns JSON string from exportWallet(), fixed auto-install path, importWalletPrivateKey API. Phase 4: Dashboard, docs site, skill document, /api/skill endpoint. Phase 5: Bug fixes on Hoodi testnet — Lido SDK web3Provider error bypassed with direct viem writeContract, private key normalization, npm name validation. Phase 6: Direct CLI commands (moly stake, moly balance, etc.) tested locally before publish. Versions 1.0.x through 1.2.1 published to npm. Live stake of 0.01 ETH on Hoodi confirmed: 0xaa4f58a777147b40638a6aee62dc7f0bc3658e82094c8bfd5c2866c8342eb99e",
  "submissionMetadata": {
    "agentFramework": "other",
    "agentFrameworkOther": "Custom agentic loop with direct provider API calls (Anthropic, OpenRouter, Gemini) in the CLI terminal; Vercel AI SDK for the web dashboard chat",
    "agentHarness": "claude-code",
    "model": "claude-sonnet-4-6",
    "skills": ["lido.skill.md"],
    "tools": [
      "@lidofinance/lido-ethereum-sdk",
      "viem",
      "@modelcontextprotocol/sdk",
      "@open-wallet-standard/core",
      "@clack/prompts",
      "better-sqlite3",
      "zod",
      "LI.FI REST API",
      "OpenRouter",
      "Next.js",
      "Vercel AI SDK",
      "tsup"
    ],
    "intention": "continuing",
    "intentionNotes": "Moly is being developed as a long-term open-source tool for AI-native DeFi access. Post-hackathon plans include expanding to more protocols beyond Lido, adding multi-sig support, and publishing to MCP registries for broader agent adoption.",
    "helpfulResources": [
      "https://docs.lido.fi",
      "https://docs.lido.fi/deployed-contracts",
      "https://github.com/lidofinance/lido-ethereum-sdk",
      "https://docs.lido.fi/guides/steth-integration-guide",
      "https://docs.lido.fi/contracts/withdrawal-queue-erc721",
      "https://docs.lido.fi/contracts/lido-dao",
      "https://openwallet.sh",
      "https://modelcontextprotocol.io"
    ],
    "helpfulSkills": [
      {
        "name": "lido.skill.md",
        "reason": "Provided the agent with Lido protocol mental model (rebasing, wstETH vs stETH, safe staking patterns) so it could make informed decisions during tool calls"
      }
    ]
  }
}
```

---

## IDs (do not share publicly)

teamUUID: 389b73ae3678415fb433f8f4fdab74bf
teamName: justaguy
inviteCode: bb7e8136eca1
role: admin
participantID: 98213291c8d340358b1a013785d5579d
apiKey: [redacted — use from memory]
