import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { callAi, makeToolResultMessage, type ChatMessage } from './providers.js';
import { TOOL_DEFS, executeTool } from './tools.js';
import type { MolyConfig } from '../config/types.js';
import { checkBounds, recordStake } from '../bounds/enforce.js';
import { initLedger, logEntry } from '../ledger/store.js';

const R  = '\x1b[0m';
const B  = '\x1b[1m';
const D  = '\x1b[2m';
const CY = '\x1b[36m';
const GR = '\x1b[32m';
const YE = '\x1b[33m';
const BL = '\x1b[34m';
const RE = '\x1b[31m';
const MA = '\x1b[35m';

const LOGO = `
${CY}${B}  ███╗   ███╗ ██████╗ ██╗  ██╗   ██╗${R}
${CY}${B}  ████╗ ████║██╔═══██╗██║  ╚██╗ ██╔╝${R}
${CY}${B}  ██╔████╔██║██║   ██║██║   ╚████╔╝ ${R}
${CY}${B}  ██║╚██╔╝██║██║   ██║██║    ╚██╔╝  ${R}
${CY}${B}  ██║ ╚═╝ ██║╚██████╔╝███████╗██║   ${R}
${CY}${B}  ╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝   ${R}
${D}              powered by Lido${R}
`;

function ln(text = '') { process.stdout.write(text + '\n'); }

function saveTrade(toolName: string, args: Record<string, unknown>, result: string) {
  try {
    // extract tx_hash and amount from result if present
    let txHash: string | undefined;
    let amount: string | undefined;
    try {
      const parsed = JSON.parse(result);
      txHash = parsed.txHash ?? parsed.tx_hash;
      amount = args.amount_eth as string ?? args.amount_steth as string ?? args.amount as string;
    } catch { /* non-json result */ }

    logEntry({
      tool: toolName,
      args,
      result,
      tx_hash: txHash,
      amount,
      status: 'ok',
    });
  } catch {
    // non-fatal
  }
}

function printBanner(cfg: MolyConfig) {
  const modeLabel = cfg.mode === 'simulation'
    ? `${YE}● SIMULATION${R}`
    : `${RE}● LIVE${R}`;
  ln(LOGO);
  ln(`  ${modeLabel}  ${D}${cfg.network}  ·  ${cfg.ai?.model ?? ''}${R}`);
  ln(`  ${D}type "exit" to quit${R}`);
  ln(`  ${D}${'─'.repeat(48)}${R}`);
  ln();
}

const WRITE_TOOLS = new Set([
  'stake_eth', 'request_withdrawal', 'claim_withdrawals',
  'wrap_steth', 'unwrap_wsteth', 'cast_vote', 'bridge_to_ethereum',
]);

export async function startChatSession(cfg: MolyConfig) {
  if (!cfg.ai) {
    ln(`${RE}No AI provider configured. Run: moly setup${R}`);
    process.exit(1);
  }

  // init ledger db
  try { initLedger(); } catch { /* non-fatal */ }

  const { provider, apiKey, model } = cfg.ai;

  // load skill.md if available
  let skillContext = '';
  try {
    const skillPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../lido.skill.md');
    if (fs.existsSync(skillPath)) {
      skillContext = fs.readFileSync(skillPath, 'utf-8') + '\n\n';
    }
  } catch { /* non-fatal */ }

  const messages: ChatMessage[] = [
    {
      role: 'user',
      content:
        skillContext +
        `You are Moly, a terminal assistant for Lido Finance on ${cfg.network}. ` +
        `Mode: ${cfg.mode} (${cfg.mode === 'simulation' ? 'dry-run, nothing broadcast' : 'LIVE - real on-chain transactions'}). ` +
        `Chain scope: ${cfg.chainScope ?? 'ethereum'}. ` +
        `You can only do what your tools support: staking ETH, withdrawals, wrap/unwrap stETH/wstETH, balances, rewards, Lido DAO governance` +
        `${cfg.chainScope === 'all' ? ', and L2 bridging from Base/Arbitrum to Ethereum via LI.FI' : ''}. ` +
        `${cfg.chainScope === 'all' ? 'If the user wants to stake ETH from Base or Arbitrum, first check their L2 balance with get_l2_balance, then bridge to Ethereum with bridge_to_ethereum, then after bridging completes use stake_eth. Bridge takes 1-20 min, tell user to check with get_bridge_status. ' : ''}` +
        `If asked about anything outside those tools (e.g. Lido Vaults, validators, node operators, DeFi integrations), say clearly and briefly that it is not supported. ` +
        `IMPORTANT: This is a terminal. Never use markdown. No **bold**, no bullet points, no headers, no backticks. Plain text only. ` +
        `Be concise. For live transactions always confirm first.`,
    },
    {
      role: 'assistant',
      content: `Ready. I'm Moly on ${cfg.network} in ${cfg.mode} mode. What would you like to do?`,
    },
  ];

  printBanner(cfg);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const prompt = () =>
    new Promise<string>((resolve, reject) => {
      rl.question(`${B}${BL}you${R} › `, resolve);
      rl.once('close', () => reject(new Error('closed')));
    });

  while (true) {
    let input: string;
    try {
      input = (await prompt()).trim();
    } catch {
      break;
    }

    if (!input) continue;
    if (input === 'exit' || input === 'quit') {
      ln(`${D}Goodbye.${R}`);
      rl.close();
      process.exit(0);
    }

    messages.push({ role: 'user', content: input });

    try {
      while (true) {
        ln(`${D}  ⚙  thinking...${R}`);

        const response = await callAi(provider, apiKey, model, messages, TOOL_DEFS);
        messages.push(response.rawAssistantMessage as ChatMessage);

        if (response.toolCalls.length > 0) {
          const toolResults: ChatMessage[] = [];

          for (const tc of response.toolCalls) {
            ln(`${D}  ↳  ${MA}${tc.name}${R}${D} ${JSON.stringify(tc.args)}${R}`);

            // bounds enforcement for write tools
            if (WRITE_TOOLS.has(tc.name)) {
              try {
                const check = await checkBounds(tc.name, tc.args);
                if (!check.allowed) {
                  ln(`${RE}  ✕  BLOCKED: ${check.reason}${R}`);
                  toolResults.push(makeToolResultMessage(provider, tc.id, tc.name, JSON.stringify({ blocked: true, reason: check.reason })));
                  continue;
                }
              } catch { /* bounds check failed, allow through */ }
            }

            const result = await executeTool(tc.name, tc.args);
            ln(`${D}     ${result.slice(0, 300)}${result.length > 300 ? '…' : ''}${R}`);

            if (WRITE_TOOLS.has(tc.name)) {
              saveTrade(tc.name, tc.args, result);
              // track stake amount for daily limit
              if (tc.name === 'stake_eth' && tc.args.amount_eth) {
                try { recordStake(parseFloat(tc.args.amount_eth as string)); } catch {}
              }
            }

            toolResults.push(makeToolResultMessage(provider, tc.id, tc.name, result));
          }

          messages.push(...toolResults);

          if (response.text) {
            ln();
            ln(`${B}${GR}moly${R} › ${response.text}`);
            ln();
          }

          continue;
        }

        if (response.text) {
          ln();
          ln(`${B}${GR}moly${R} › ${response.text}`);
          ln();
        }
        break;
      }
    } catch (err: any) {
      ln(`${RE}Error: ${err.message}${R}`);
      messages.pop();
    }
  }

  rl.close();
}
