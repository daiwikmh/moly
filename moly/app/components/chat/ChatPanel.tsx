'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useMode } from '../../context/ModeContext';
import { ToolResultCard } from './ToolResultCard';
import { useRef, useEffect, useState, useMemo } from 'react';

export function ChatPanel() {
  const { mode, network, chainId } = useMode();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/chat',
    body: { mode, network, chainId },
  }), [mode, network, chainId]);

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const fillInput = (text: string) => setInput(text);

  return (
    <div className="chat-panel">
      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-title">Moly</div>
            <div className="chat-empty-sub">Ask about Lido staking, balances, governance, or simulate transactions.</div>
            <div className="chat-suggestions">
              <button className="chat-suggestion" onClick={() => fillInput('What is the balance for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?')}>
                Check vitalik.eth balance
              </button>
              <button className="chat-suggestion" onClick={() => fillInput('Simulate staking 0.1 ETH')}>
                Simulate staking 0.1 ETH
              </button>
              <button className="chat-suggestion" onClick={() => fillInput('Show recent governance proposals')}>
                Show governance proposals
              </button>
              <button className="chat-suggestion" onClick={() => fillInput('What is the stETH/wstETH conversion rate?')}>
                stETH/wstETH conversion rate
              </button>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-role">{msg.role === 'user' ? 'You' : 'Moly'}</div>

            {msg.parts?.map((part, i) => {
              if (part.type === 'text' && part.text) {
                return <div key={i} className="chat-msg-text">{part.text}</div>;
              }
              if (part.type === 'tool-invocation') {
                const inv = part as any;
                if (inv.state === 'result') {
                  return <ToolResultCard key={i} toolName={inv.toolName} result={inv.result} />;
                }
                if (inv.state === 'call' || inv.state === 'partial-call') {
                  return (
                    <div key={i} className="tool-calling">
                      Calling {inv.toolName}...
                    </div>
                  );
                }
              }
              return null;
            })}
          </div>
        ))}

        {isLoading && messages.length > 0 && (
          <div className="chat-loading">
            <span className="chat-loading-dot" />
            <span className="chat-loading-dot" />
            <span className="chat-loading-dot" />
          </div>
        )}

        {error && (
          <div className="chat-error">
            Error: {error.message}
          </div>
        )}
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          className="chat-input"
          placeholder="Ask about Lido staking, balances, governance..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button className="chat-send" type="submit" disabled={isLoading || !input.trim()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
