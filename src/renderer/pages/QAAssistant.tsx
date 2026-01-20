import React, { useState, useRef, useEffect } from 'react';
import { hasApiKey } from '../services/claude';
import { Link } from 'react-router-dom';

interface QAAssistantProps {
  project: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are a friendly, experienced QA engineer and mentor. You're helping someone learn how to test software effectively.

Your role:
- Explain testing concepts in clear, accessible terms
- When asked about code, explain what it does and HOW to test it
- Suggest specific test cases, edge cases, and things that could go wrong
- Be educational - explain the "why" behind testing approaches
- If the user seems unfamiliar with a concept (like "state management" or "API routes"), explain it first
- Use analogies and examples from everyday life when helpful
- Be encouraging and supportive

When analyzing code:
- Identify the main purpose and user-facing functionality
- Point out areas that are risky or commonly buggy
- Suggest both functional tests (does it work?) and edge case tests (what could break?)
- Explain testing priorities - what to test first and why

Remember: The user may come from a games/video games QA background, so relating concepts to game testing when relevant can be helpful (e.g., "state management is like tracking player inventory" or "API calls are like network requests for multiplayer sync").`;

function QAAssistant({ project }: QAAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load conversation from localStorage on mount
    try {
      const saved = localStorage.getItem('qa-cafe-assistant-messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState(() => {
    // Load draft from localStorage on mount
    return localStorage.getItem('qa-cafe-assistant-draft') || '';
  });
  const [loading, setLoading] = useState(false);
  const [projectContext, setProjectContext] = useState<string | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save draft input to localStorage
  useEffect(() => {
    localStorage.setItem('qa-cafe-assistant-draft', input);
  }, [input]);

  // Save conversation to localStorage
  useEffect(() => {
    localStorage.setItem('qa-cafe-assistant-messages', JSON.stringify(messages));
  }, [messages]);

  // Load project context when project changes
  useEffect(() => {
    if (project) {
      loadProjectContext();
    } else {
      setProjectContext(null);
      setContextLoaded(false);
    }
  }, [project]);

  const loadProjectContext = async () => {
    if (!project) return;

    try {
      const files = await window.electronAPI.readProjectFiles(project, 20);
      const context = files
        .map(f => `// File: ${f.path}\n${f.content}`)
        .join('\n\n---\n\n');
      setProjectContext(context);
      setContextLoaded(true);
    } catch (err) {
      console.error('Failed to load project context:', err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!hasApiKey()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Build the full prompt with context
      let fullPrompt = userMessage;
      if (projectContext && messages.length === 0) {
        // Include project context on first message
        fullPrompt = `I'm looking at a codebase and need help understanding how to test it.\n\nHere's the code:\n\n${projectContext}\n\n---\n\nMy question: ${userMessage}`;
      }

      // Build conversation history for Claude
      const conversationHistory: Message[] = [
        ...messages,
        { role: 'user', content: fullPrompt }
      ];

      const response = await window.electronAPI.callClaude({
        apiKey: localStorage.getItem('claude_api_key') || '',
        messages: conversationHistory,
        system: SYSTEM_PROMPT,
        maxTokens: 2048,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!hasApiKey()) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <h2 className="empty-state-title">QA Assistant</h2>
          <p>Configure your Claude API key to start chatting.</p>
          <Link to="/settings" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 0 }}>
      {/* Header */}
      <header className="page-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">QA Assistant</h1>
            <p className="page-description">
              Ask anything about testing this codebase
              {project && contextLoaded && (
                <span style={{ color: 'var(--success)', marginLeft: '8px' }}>
                  • Project loaded
                </span>
              )}
            </p>
          </div>
          {messages.length > 0 && (
            <button className="btn btn-secondary" onClick={clearChat}>
              Clear Chat
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            gap: '16px',
          }}>
            <div style={{ fontSize: '3rem' }}>🤖</div>
            <div>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>How can I help you test this project?</p>
              <p style={{ fontSize: '0.9rem' }}>
                Try asking things like:
              </p>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxWidth: '400px',
            }}>
              {[
                "What does this codebase do?",
                "Where should I start testing?",
                "What are the riskiest parts?",
                "How do I test the user flows?",
                "What edge cases should I look for?",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '0.9rem',
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: msg.role === 'user'
                    ? 'var(--accent)'
                    : 'var(--bg-tertiary)',
                  color: msg.role === 'user'
                    ? 'white'
                    : 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.5',
                }}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px 32px 24px',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
      }}>
        {!project && (
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            Select a project to get context-aware testing advice
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about testing this codebase..."
            disabled={loading}
            rows={2}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-end', padding: '12px 24px' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default QAAssistant;
