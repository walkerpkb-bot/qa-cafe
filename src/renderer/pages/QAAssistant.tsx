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

interface Memory {
  id: string;
  content: string;
  timestamp: number;
}

// Helper to get memory storage key for a project
const getMemoryKey = (project: string) => `qa-cafe-memories-${project}`;

// Prompt presets
const PROMPT_PRESETS: { name: string; prompt: string }[] = [
  { name: 'Default', prompt: SYSTEM_PROMPT },
  {
    name: 'Security Focus',
    prompt: `You are a security-focused QA engineer. When analyzing code:
- Look for authentication/authorization issues
- Identify input validation gaps
- Flag potential injection vulnerabilities (SQL, XSS, command)
- Check for sensitive data exposure
- Review error handling for information leakage
- Suggest security test cases and attack vectors

Be specific about what could go wrong and how to test for it.`
  },
  {
    name: 'API Testing',
    prompt: `You are an API testing specialist. When analyzing code:
- Identify all endpoints and their methods
- Map request/response schemas
- Suggest boundary testing for parameters
- Check error handling and status codes
- Look for rate limiting, authentication, versioning
- Recommend contract testing approaches

Focus on comprehensive API coverage.`
  },
  {
    name: 'Beginner Friendly',
    prompt: `You are a patient QA mentor teaching someone new to software testing.
- Explain every concept before using it
- Use simple analogies (like explaining to a friend)
- Break down complex ideas into small steps
- Celebrate good questions
- Never assume prior knowledge
- Focus on building confidence

Your goal is to help them learn, not just give answers.`
  },
];

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
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showMemories, setShowMemories] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(() => {
    return localStorage.getItem('qa-cafe-custom-prompt') || SYSTEM_PROMPT;
  });
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save custom prompt when it changes
  useEffect(() => {
    localStorage.setItem('qa-cafe-custom-prompt', customPrompt);
  }, [customPrompt]);

  // Load memories when project changes
  useEffect(() => {
    if (project) {
      try {
        const saved = localStorage.getItem(getMemoryKey(project));
        setMemories(saved ? JSON.parse(saved) : []);
      } catch {
        setMemories([]);
      }
    } else {
      setMemories([]);
    }
  }, [project]);

  // Save memories when they change
  useEffect(() => {
    if (project && memories.length > 0) {
      localStorage.setItem(getMemoryKey(project), JSON.stringify(memories));
    }
  }, [memories, project]);

  const addMemory = (content: string) => {
    const newMemory: Memory = {
      id: Date.now().toString(),
      content,
      timestamp: Date.now(),
    };
    setMemories(prev => [...prev, newMemory]);
  };

  const removeMemory = (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    if (project) {
      const updated = memories.filter(m => m.id !== id);
      if (updated.length === 0) {
        localStorage.removeItem(getMemoryKey(project));
      }
    }
  };

  const clearAllMemories = () => {
    setMemories([]);
    if (project) {
      localStorage.removeItem(getMemoryKey(project));
    }
  };

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
      setHasAnalysis(false);
    }
  }, [project]);

  const loadProjectContext = async () => {
    if (!project) return;

    try {
      // First, check if Test Mapper analysis exists for this project
      const cacheKey = `qa-cafe-testmapper-${project}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        // Use the structured analysis - much better context
        const { result } = JSON.parse(cached);
        const analysisContext = `
## Project Analysis (from Test Mapper)

### Summary
${result.summary}

### User Flows (${result.flows.length} identified)
${result.flows.map((f: { name: string; description: string; entryPoint: string; steps: string[] }) =>
  `**${f.name}**
- Entry point: ${f.entryPoint}
- Description: ${f.description}
- Steps: ${f.steps.join(' → ')}`
).join('\n\n')}

### State Assumptions (${result.stateAssumptions.length} identified)
${result.stateAssumptions.map((a: { location: string; assumption: string; risk: string }) =>
  `- [${a.risk.toUpperCase()}] ${a.location}: ${a.assumption}`
).join('\n')}

### Potential Issues (${result.issues.length} identified)
${result.issues.map((i: { type: string; location: string; description: string; severity: string }) =>
  `- [${i.severity.toUpperCase()}] ${i.type} at ${i.location}: ${i.description}`
).join('\n')}
`;
        setProjectContext(analysisContext);
        setHasAnalysis(true);
        setContextLoaded(true);
      } else {
        // Fall back to raw code if no analysis exists
        const files = await window.electronAPI.readProjectFiles(project, 20);
        const context = files
          .map(f => `// File: ${f.path}\n${f.content}`)
          .join('\n\n---\n\n');
        setProjectContext(context);
        setHasAnalysis(false);
        setContextLoaded(true);
      }
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
        if (hasAnalysis) {
          fullPrompt = `I'm looking at a codebase and need help understanding how to test it. I've already run an analysis that identified the main flows, assumptions, and issues.

${projectContext}

---

Based on this analysis, my question is: ${userMessage}`;
        } else {
          fullPrompt = `I'm looking at a codebase and need help understanding how to test it.

Here's the code:

${projectContext}

---

My question: ${userMessage}`;
        }
      }

      // Build conversation history for Claude
      const conversationHistory: Message[] = [
        ...messages,
        { role: 'user', content: fullPrompt }
      ];

      // Build system prompt with memories
      let systemPrompt = customPrompt;
      if (memories.length > 0) {
        const memoriesText = memories.map(m => `- ${m.content}`).join('\n');
        systemPrompt += `\n\n## Important Context (User's saved notes about this project)\n${memoriesText}\n\nUse these notes to provide more relevant and personalized guidance.`;
      }

      const response = await window.electronAPI.callClaude({
        apiKey: localStorage.getItem('claude_api_key') || '',
        messages: conversationHistory,
        system: systemPrompt,
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
                  • {hasAnalysis ? 'Analysis loaded' : 'Code loaded'}
                  {memories.length > 0 && ` • ${memories.length} memories`}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowPromptEditor(!showPromptEditor)}
            >
              ⚙️ Prompt
            </button>
            {project && memories.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowMemories(!showMemories)}
              >
                🧠 Memories ({memories.length})
              </button>
            )}
            {messages.length > 0 && (
              <button className="btn btn-secondary" onClick={clearChat}>
                Clear Chat
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Prompt Editor Panel */}
      {showPromptEditor && (
        <div style={{
          padding: '16px 32px',
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>System Prompt</h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PROMPT_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => setCustomPrompt(preset.prompt)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    backgroundColor: customPrompt === preset.prompt ? 'var(--accent)' : 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: customPrompt === preset.prompt ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={8}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            This prompt shapes how the assistant responds. Changes apply to new messages.
          </p>
        </div>
      )}

      {/* Memories Panel */}
      {showMemories && memories.length > 0 && (
        <div style={{
          padding: '16px 32px',
          backgroundColor: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Saved Memories</h4>
            <button
              onClick={clearAllMemories}
              style={{
                padding: '4px 8px',
                fontSize: '0.75rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Clear All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {memories.map(memory => (
              <div
                key={memory.id}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{memory.content}</span>
                <button
                  onClick={() => removeMemory(memory.id)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div style={{ maxWidth: '80%' }}>
                <div
                  style={{
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
                {msg.role === 'assistant' && project && (
                  <button
                    onClick={() => {
                      const snippet = msg.content.length > 200
                        ? msg.content.substring(0, 200) + '...'
                        : msg.content;
                      addMemory(snippet);
                    }}
                    style={{
                      marginTop: '4px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      opacity: 0.7,
                    }}
                    title="Save this insight for future sessions"
                  >
                    💾 Remember
                  </button>
                )}
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
