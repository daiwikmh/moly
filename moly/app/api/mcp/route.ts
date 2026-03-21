import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import * as lido from "@/lib/lido";
import * as bridge from "@/lib/bridge";
import type { Mode, Network } from "@/lib/lido-config";

function createServer(mode: Mode, network: Network, chainId: string) {
  const server = new McpServer({
    name: "moly-lido",
    version: "1.0.0",
  });

  const ctx = { mode, network, chainId };

  // ─── Read Tools ─────────────────────────────────────────────

  server.tool(
    "get_balance",
    "Get ETH, stETH, and wstETH balances for an address",
    { address: z.string().describe("Ethereum address (0x...)") },
    async ({ address }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.getBalance(ctx, address), null, 2) }],
    })
  );

  server.tool(
    "get_rewards",
    "Get staking reward history for an address",
    {
      address: z.string().describe("Ethereum address"),
      days: z.number().optional().default(7).describe("Number of days to look back"),
    },
    async ({ address, days }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.getRewards(ctx, address, days), null, 2) }],
    })
  );

  server.tool(
    "get_conversion_rate",
    "Get the current stETH/wstETH exchange rate",
    {},
    async () => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.getConversionRate(ctx), null, 2) }],
    })
  );

  server.tool(
    "get_withdrawal_requests",
    "Get pending withdrawal request IDs for an address",
    { address: z.string().describe("Ethereum address") },
    async ({ address }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.getWithdrawalRequests(ctx, address), null, 2) }],
    })
  );

  server.tool(
    "get_withdrawal_status",
    "Get finalization status for withdrawal requests",
    { request_ids: z.array(z.string()).describe("Array of withdrawal request IDs") },
    async ({ request_ids }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.getWithdrawalStatus(ctx, request_ids), null, 2) }],
    })
  );

  server.tool(
    "get_proposals",
    "Get recent Lido DAO governance proposals",
    { count: z.number().optional().default(5).describe("Number of proposals to fetch") },
    async ({ count }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.getProposals(ctx, count), null, 2) }],
    })
  );

  server.tool(
    "get_proposal",
    "Get full details for a single governance proposal",
    { proposal_id: z.number().describe("Proposal ID") },
    async ({ proposal_id }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.getProposal(ctx, proposal_id), null, 2) }],
    })
  );

  // ─── Write Tools ────────────────────────────────────────────

  server.tool(
    "stake_eth",
    "Stake ETH to receive stETH. Returns simulation results with gas estimates.",
    {
      amount: z.string().describe("Amount of ETH to stake (e.g. '0.1')"),
      dry_run: z.boolean().optional().default(true).describe("Simulate without broadcasting"),
    },
    async ({ amount }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.stakeEth(ctx, amount), null, 2) }],
    })
  );

  server.tool(
    "request_withdrawal",
    "Queue stETH for withdrawal. Returns simulation results.",
    {
      amount: z.string().describe("Amount of stETH to withdraw"),
      dry_run: z.boolean().optional().default(true),
    },
    async ({ amount }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.requestWithdrawal(ctx, amount), null, 2) }],
    })
  );

  server.tool(
    "claim_withdrawals",
    "Claim ETH from finalized withdrawal requests",
    {
      request_ids: z.array(z.string()).describe("Finalized withdrawal request IDs"),
      dry_run: z.boolean().optional().default(true),
    },
    async ({ request_ids }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.claimWithdrawals(ctx, request_ids), null, 2) }],
    })
  );

  server.tool(
    "wrap_steth",
    "Wrap stETH into wstETH (non-rebasing wrapper for DeFi)",
    {
      amount: z.string().describe("Amount of stETH to wrap"),
      dry_run: z.boolean().optional().default(true),
    },
    async ({ amount }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.wrapSteth(ctx, amount), null, 2) }],
    })
  );

  server.tool(
    "unwrap_wsteth",
    "Unwrap wstETH back to stETH",
    {
      amount: z.string().describe("Amount of wstETH to unwrap"),
      dry_run: z.boolean().optional().default(true),
    },
    async ({ amount }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.unwrapWsteth(ctx, amount), null, 2) }],
    })
  );

  server.tool(
    "cast_vote",
    "Cast a vote on a Lido DAO governance proposal",
    {
      proposal_id: z.number().describe("Proposal ID to vote on"),
      support: z.boolean().describe("true = Yea, false = Nay"),
      dry_run: z.boolean().optional().default(true),
    },
    async ({ proposal_id, support }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await lido.castVote(ctx, proposal_id, support), null, 2) }],
    })
  );

  // ─── L2 Bridge Tools ─────────────────────────────────────────

  server.tool(
    "get_l2_balance",
    "Get ETH and wstETH balances on Base or Arbitrum (mainnet only)",
    {
      source_chain: z.enum(["base", "arbitrum"]).describe("L2 chain to query"),
      address: z.string().describe("Ethereum address (0x...)"),
    },
    async ({ source_chain, address }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await bridge.getL2Balance(ctx, source_chain, address), null, 2) }],
    })
  );

  server.tool(
    "get_bridge_quote",
    "Get a quote for bridging ETH or wstETH from L2 to Ethereum L1 via LI.FI (mainnet only)",
    {
      source_chain: z.enum(["base", "arbitrum"]).describe("L2 chain"),
      token: z.enum(["ETH", "wstETH"]).describe("Token to bridge"),
      amount: z.string().describe("Amount to bridge"),
      to_token: z.enum(["ETH", "wstETH"]).optional().describe("Token to receive on L1"),
    },
    async ({ source_chain, token, amount, to_token }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await bridge.getBridgeQuote(ctx, source_chain, token, amount, to_token), null, 2) }],
    })
  );

  server.tool(
    "bridge_to_ethereum",
    "Bridge ETH or wstETH from L2 to Ethereum L1 (dry run in dashboard)",
    {
      source_chain: z.enum(["base", "arbitrum"]).describe("L2 chain"),
      token: z.enum(["ETH", "wstETH"]).describe("Token to bridge"),
      amount: z.string().describe("Amount to bridge"),
      to_token: z.enum(["ETH", "wstETH"]).optional().describe("Token to receive on L1"),
    },
    async ({ source_chain, token, amount, to_token }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await bridge.bridgeToEthereum(ctx, source_chain, token, amount, to_token), null, 2) }],
    })
  );

  server.tool(
    "get_bridge_status",
    "Check the status of a bridge transaction (mainnet only)",
    {
      tx_hash: z.string().describe("Bridge tx hash on the L2"),
      source_chain: z.enum(["base", "arbitrum"]).describe("L2 chain the bridge was sent from"),
    },
    async ({ tx_hash, source_chain }) => ({
      content: [{ type: "text" as const, text: JSON.stringify(await bridge.getBridgeStatus(ctx, tx_hash, source_chain), null, 2) }],
    })
  );

  return server;
}

function parseConfig(req: Request) {
  const mode: Mode = (req.headers.get("x-lido-mode") ?? "simulation") === "live" ? "live" : "simulation";
  const network: Network = (req.headers.get("x-lido-network") ?? "testnet") === "mainnet" ? "mainnet" : "testnet";
  const chainId = req.headers.get("x-lido-chain") ?? (network === "testnet" ? "hoodi" : "ethereum");
  return { mode, network, chainId };
}

/**
 * Convert Web Request → Node IncomingMessage and capture ServerResponse output
 * so we can bridge Next.js App Router to the MCP SDK's Node-based transport.
 */
async function handleWithNodeCompat(
  webReq: Request,
  server: McpServer,
  transport: StreamableHTTPServerTransport,
) {
  const body = await webReq.text();
  const url = new URL(webReq.url);

  // Build a minimal Node IncomingMessage
  const socket = new Socket();
  const nodeReq = new IncomingMessage(socket);
  nodeReq.method = webReq.method;
  nodeReq.url = url.pathname + url.search;
  nodeReq.headers = Object.fromEntries(webReq.headers.entries());
  // Push the body so the SDK can read it
  nodeReq.push(body);
  nodeReq.push(null);

  // Create a ServerResponse that captures output
  const nodeRes = new ServerResponse(nodeReq);

  // Capture the written data
  const chunks: Buffer[] = [];
  let statusCode = 200;
  let responseHeaders: Record<string, string> = {};

  // Check if this is an SSE response (the transport may set content-type to text/event-stream)
  let isSSE = false;

  const origWriteHead = nodeRes.writeHead.bind(nodeRes);
  nodeRes.writeHead = function (code: number, ...args: any[]) {
    statusCode = code;
    // Parse headers from various arg positions
    const hdrs = typeof args[0] === "object" && !Array.isArray(args[0]) ? args[0] : args[1];
    if (hdrs) {
      for (const [k, v] of Object.entries(hdrs)) {
        responseHeaders[k.toLowerCase()] = String(v);
      }
    }
    if (responseHeaders["content-type"]?.includes("text/event-stream")) {
      isSSE = true;
    }
    return origWriteHead(code, ...args);
  } as any;

  const origWrite = nodeRes.write.bind(nodeRes);
  nodeRes.write = function (chunk: any, ...args: any[]) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return origWrite(chunk, ...args);
  } as any;

  const origEnd = nodeRes.end.bind(nodeRes);

  return new Promise<Response>((resolve) => {
    nodeRes.end = function (...args: any[]) {
      // Capture final chunk
      if (args[0] && typeof args[0] !== "function") {
        chunks.push(Buffer.isBuffer(args[0]) ? args[0] : Buffer.from(args[0]));
      }
      origEnd(...args);

      const responseBody = Buffer.concat(chunks);
      resolve(
        new Response(responseBody, {
          status: statusCode,
          headers: responseHeaders,
        })
      );
      return nodeRes;
    } as any;

    // Let the transport handle the request
    transport.handleRequest(nodeReq, nodeRes, JSON.parse(body || "{}"));
  });
}

export async function POST(req: Request) {
  const { mode, network, chainId } = parseConfig(req);

  const server = createServer(mode, network, chainId);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await server.connect(transport);

  try {
    return await handleWithNodeCompat(req, server, transport);
  } finally {
    await transport.close();
    await server.close();
  }
}

// Discovery endpoint — tells clients what this server offers
export async function GET() {
  return Response.json({
    name: "moly-lido",
    version: "1.0.0",
    description:
      "Lido staking protocol MCP server — 13 tools for balances, staking, wrapping, withdrawals, and governance. Defaults to simulation mode on Hoodi testnet.",
    tools: 17,
    transport: "streamable-http",
    quickstart: {
      config: {
        mcpServers: {
          moly: {
            type: "http",
            url: "https://your-domain.com/api/mcp",
          },
        },
      },
    },
    configuration: {
      headers: {
        "x-lido-mode": "simulation | live (default: simulation)",
        "x-lido-network": "testnet | mainnet (default: testnet)",
        "x-lido-chain": "hoodi | ethereum (auto-set from network)",
      },
    },
  });
}

export async function DELETE() {
  return new Response(null, { status: 200 });
}
