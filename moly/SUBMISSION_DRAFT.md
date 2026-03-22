# Moly — Synthesis Submission Draft

> Fill in fields marked [TODO]. Do NOT submit until ready.

---

## Core Fields

**name:**
Moly — Lido MCP Server + CLI for AI Agents

**description:**
[TODO: elevator pitch — what it does and why it matters, 2-3 sentences]

**problemStatement:**
[TODO: specific real-world problem being solved and who is affected]

**repoURL:**
https://github.com/daiwikmh/moly

**trackUUIDs:**
[TODO: fetch from GET /catalog and paste the Lido track UUID here]

**deployedURL:**
[TODO: live demo link if any]

**videoURL:**
[TODO: demo walkthrough video link]

**coverImageURL:**
[TODO: cover/thumbnail image URL]

---

## conversationLog

[TODO: paste or link the full log of human-agent collaboration used during building]

---

## submissionMetadata

### Build Information

**agentFramework:** other

**agentFrameworkOther:**
Custom agentic loop with direct provider API calls (Anthropic, OpenRouter, Gemini) in the CLI; vercel-ai-sdk for the web dashboard

**agentHarness:** claude-code

**model:** claude-sonnet-4-6

**skills:**
[TODO: list agent skill identifiers actually loaded, e.g. web-search, lido bounty skill doc name]

**tools:**
- @lidofinance/lido-ethereum-sdk (v4.7.0)
- viem
- @modelcontextprotocol/sdk
- @clack/prompts
- better-sqlite3
- zod
- LI.FI REST API
- Anthropic API (direct fetch)
- OpenRouter
- Google Gemini API (direct fetch)
- @open-wallet-standard/core
- Next.js
- Vercel AI SDK
- Bun
- tsup

### Intention

**intention:**
[TODO: one of: continuing / exploring / one-time]

**intentionNotes:**
[TODO: optional — post-hackathon plans]

### Optional

**helpfulResources:**
[TODO: specific URLs actually consulted, e.g. https://docs.lido.fi/deployed-contracts]

**helpfulSkills:**
[TODO: objects with name + reason for especially impactful skills]

**moltbookPostURL:**
[TODO: URL of your Moltbook announcement post if made]

---

## Pre-publish Checklist

- [ ] All fields above filled
- [ ] Repo is public on GitHub
- [ ] conversationLog is complete and accurate
- [ ] skills/tools/resources reflect only what was actually used
- [ ] trackUUIDs verified via GET /catalog
- [ ] Self-custody transfer completed (all team members)
- [ ] Team admin ready to publish

---

## IDs (do not share publicly)

teamUUID: 902a0b8552374b439be7470795c6355f
participantID: 98213291c8d340358b1a013785d5579d
apiKey: sk-synth-673b0ed8a6f3afd33aed75cee3800f0946a648ff9adf3b42
