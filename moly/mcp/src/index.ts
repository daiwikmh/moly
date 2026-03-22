#!/usr/bin/env bun
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

const { server, modeNote } = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Lido MCP server started — ${modeNote}`);
