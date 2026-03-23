# Moly — Synthesis Hackathon Submission

## Core Fields

**teamUUID:** 902a0b8552374b439be7470795c6355f

**name:** Moly

**description:**
Moly is an open-source MCP server and CLI that gives any AI agent full access to the Lido staking protocol. One npm package, 28 tools: stake ETH, manage withdrawals, wrap/unwrap stETH, vote on governance, monitor positions across L1 and L2, set alerts and safety bounds. Works with Claude, Cursor, Windsurf, or any MCP-compatible client. Wallet keys stay local via OWS encrypted vault.

**problemStatement:**
AI agents today cannot interact with DeFi protocols without developers writing custom integration code for each protocol and each agent. A user who wants their AI assistant to stake ETH, check rewards, or vote on governance has to build that bridge themselves. Moly eliminates this gap for Lido: install one package, run the setup wizard, and any MCP-compatible AI agent can stake, unstake, wrap, govern, bridge, and monitor positions through natural language. No custom code, no API wrappers, no protocol expertise required.

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
  "teamUUID": "902a0b8552374b439be7470795c6355f",
  "name": "Moly",
  "description": "Moly is an open-source MCP server and CLI that gives any AI agent full access to the Lido staking protocol. One npm package, 28 tools: stake ETH, manage withdrawals, wrap/unwrap stETH, vote on governance, monitor positions across L1 and L2, set alerts and safety bounds. Works with Claude, Cursor, Windsurf, or any MCP-compatible client. Wallet keys stay local via OWS encrypted vault.",
  "problemStatement": "AI agents today cannot interact with DeFi protocols without developers writing custom integration code for each protocol and each agent. A user who wants their AI assistant to stake ETH, check rewards, or vote on governance has to build that bridge themselves. Moly eliminates this gap for Lido: install one package, run the setup wizard, and any MCP-compatible AI agent can stake, unstake, wrap, govern, bridge, and monitor positions through natural language. No custom code, no API wrappers, no protocol expertise required.",
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
  "conversationLog": "NEEDS_LOG",
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

teamUUID: 902a0b8552374b439be7470795c6355f
participantID: 98213291c8d340358b1a013785d5579d
apiKey: sk-synth-673b0ed8a6f3afd33aed75cee3800f0946a648ff9adf3b42
