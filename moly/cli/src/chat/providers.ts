import type { ToolDef } from './tools.js';
import type { AiProvider } from '../config/types.js';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AiResponse {
  text: string | null;
  toolCalls: ToolCall[];
  rawAssistantMessage: unknown; // provider-specific, for multi-turn
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: unknown;
}

// ── Anthropic ────────────────────────────────────────────────────────────────

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools: ToolDef[],
): Promise<AiResponse> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  const content = data.content as any[];

  const textBlock = content.find((b: any) => b.type === 'text');
  const toolUseBlocks = content.filter((b: any) => b.type === 'tool_use');

  return {
    text: textBlock?.text ?? null,
    toolCalls: toolUseBlocks.map((b: any) => ({
      id: b.id,
      name: b.name,
      args: b.input,
    })),
    rawAssistantMessage: { role: 'assistant', content },
  };
}

function anthropicToolResult(toolCallId: string, result: string): ChatMessage {
  return {
    role: 'user',
    content: [{ type: 'tool_result', tool_use_id: toolCallId, content: result }],
  };
}

// ── OpenRouter / OpenAI-compatible ───────────────────────────────────────────

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools: ToolDef[],
): Promise<AiResponse> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/daiwikmh/moly',
      'X-Title': 'Moly - Lido MCP',
    },
    body: JSON.stringify({
      model,
      messages,
      tools: tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  const msg = data.choices[0].message;

  return {
    text: msg.content ?? null,
    toolCalls: (msg.tool_calls ?? []).map((tc: any) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments ?? '{}'),
    })),
    rawAssistantMessage: { role: 'assistant', content: msg.content, tool_calls: msg.tool_calls },
  };
}

function openRouterToolResult(toolCallId: string, result: string): ChatMessage {
  return { role: 'tool' as any, content: result, ...(({ tool_call_id: toolCallId } as any)) };
}

// ── Google Gemini ────────────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools: ToolDef[],
): Promise<AiResponse> {
  const contents = (messages as any[]).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: Array.isArray(m.content)
      ? m.content
      : [{ text: m.content as string }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents,
        tools: [{
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  const parts: any[] = data.candidates?.[0]?.content?.parts ?? [];

  const textPart = parts.find((p) => p.text);
  const fnCalls = parts.filter((p) => p.functionCall);

  return {
    text: textPart?.text ?? null,
    toolCalls: fnCalls.map((p: any, i: number) => ({
      id: `gemini-${i}`,
      name: p.functionCall.name,
      args: p.functionCall.args ?? {},
    })),
    rawAssistantMessage: {
      role: 'model',
      parts,
    },
  };
}

function geminiToolResult(toolCallId: string, name: string, result: string): ChatMessage {
  return {
    role: 'user' as any,
    content: [{ functionResponse: { name, response: { output: result } } }],
  };
}

// ── Unified caller ────────────────────────────────────────────────────────────

export async function callAi(
  provider: AiProvider,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools: ToolDef[],
): Promise<AiResponse> {
  switch (provider) {
    case 'anthropic':   return callAnthropic(apiKey, model, messages, tools);
    case 'openrouter':  return callOpenRouter(apiKey, model, messages, tools);
    case 'google':      return callGemini(apiKey, model, messages, tools);
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function makeToolResultMessage(
  provider: AiProvider,
  toolCallId: string,
  toolName: string,
  result: string,
): ChatMessage {
  switch (provider) {
    case 'anthropic':   return anthropicToolResult(toolCallId, result);
    case 'openrouter':  return { role: 'tool' as any, content: result, ...({ tool_call_id: toolCallId } as any) };
    case 'google':      return geminiToolResult(toolCallId, toolName, result);
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}
