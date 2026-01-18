/**
 * Claude API service for the renderer process
 * Uses Electron IPC to call API from main process (avoids CORS)
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Get API key from localStorage
export function getApiKey(): string | null {
  return localStorage.getItem('claude_api_key');
}

export function setApiKey(key: string): void {
  localStorage.setItem('claude_api_key', key);
}

export function hasApiKey(): boolean {
  const key = getApiKey();
  return !!key && key.startsWith('sk-ant-');
}

// Call Claude API via Electron main process
export async function callClaude(
  messages: Message[],
  options: {
    model?: string;
    maxTokens?: number;
    system?: string;
  } = {}
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured. Go to Settings to add your Claude API key.');
  }

  return window.electronAPI.callClaude({
    apiKey,
    messages,
    model: options.model,
    maxTokens: options.maxTokens,
    system: options.system,
  });
}

// Analyze code with Claude
export async function analyzeCode(
  files: { path: string; content: string }[],
  prompt: string
): Promise<string> {
  // Build context from files
  const codeContext = files
    .map(f => `// File: ${f.path}\n${f.content}`)
    .join('\n\n---\n\n');

  const fullPrompt = `${prompt}\n\nHere are the code files to analyze:\n\n${codeContext}`;

  return callClaude(
    [{ role: 'user', content: fullPrompt }],
    {
      system: 'You are a senior QA engineer and code analyst. Analyze code thoroughly and provide structured, actionable insights. Always respond with valid JSON when asked for JSON output.',
      maxTokens: 4096,
    }
  );
}
