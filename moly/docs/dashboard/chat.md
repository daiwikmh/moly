---
description: The AI chat interface — talk to Lido
---

# Chat Interface

The chat panel is the primary surface of the Moly dashboard. It uses the Vercel AI SDK v6 to stream responses from an LLM that has access to all 13 Lido tools.

## How It Works

```
User types message
       │
       ▼
DefaultChatTransport → POST /api/chat
       │                     │
       │                     ├─ convertToModelMessages()
       │                     ├─ streamText() with 13 tools
       │                     └─ toUIMessageStreamResponse()
       │
       ▼
useChat() renders messages + tool results
```

## Sending Messages

Type your query in the input field and press Enter or click the send button. Example queries:

| Query | What Happens |
| --- | --- |
| "Balance for 0x..." | Calls `get_balance`, shows card with ETH/stETH/wstETH |
| "Simulate staking 1 ETH" | Calls `stake_eth`, shows gas estimate |
| "Show governance proposals" | Calls `get_proposals`, lists recent votes |
| "What's the stETH/wstETH rate?" | Calls `get_conversion_rate`, shows exchange rate |
| "Wrap 0.5 stETH" | Calls `wrap_steth`, shows expected wstETH output |

## Suggestion Buttons

When the chat is empty, four suggestion buttons appear:

- **Check vitalik.eth balance** — queries a well-known address
- **Simulate staking 0.1 ETH** — dry-run staking
- **Show governance proposals** — recent DAO votes
- **stETH/wstETH conversion rate** — current rate

Click any to pre-fill the input.

## Tool Result Cards

When the AI calls a tool, the result renders as a styled card:

- **Balance cards** — grid showing ETH, stETH, wstETH with network info
- **Proposal cards** — list with ID, status badge, vote percentages
- **Simulation cards** — dashed yellow border, showing estimates and notes
- **JSON fallback** — for any tool result without special rendering

## Multi-Step Tool Calls

The AI can chain up to 5 tool calls in one response. For example:

```
You: "Check my balance and show the conversion rate"
Moly: [calls get_balance] → shows balance card
      [calls get_conversion_rate] → shows rate card
      "Your balance on Hoodi is... and the current rate is..."
```

## Mode Awareness

The chat sends the current `mode`, `network`, and `chainId` with every request. Switching toggles in the header affects which chain the AI queries and whether writes are simulated.

---

Next: [Mode & Network Toggles](modes.md)
