import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { config } from './config.js';
import { registerTools } from './tools/index.js';

export function createServer() {
  const modeNote = config.isSimulation
    ? 'SIMULATION MODE (Holesky) — write operations are dry_run by default'
    : 'LIVE MODE (Mainnet) — real transactions will be broadcast';

  const server = new McpServer({
    name: 'lido-mcp',
    version: '0.1.0',
  });

  registerTools(server, modeNote);

  return { server, modeNote };
}
