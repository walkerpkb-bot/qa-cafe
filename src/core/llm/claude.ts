/**
 * Claude API integration for QA Cafe
 * Handles all LLM interactions
 */

import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function initClaude(apiKey: string): void {
  client = new Anthropic({ apiKey });
}

export async function analyzeCode(code: string, prompt: string): Promise<string> {
  if (!client) {
    throw new Error('Claude API not initialized. Call initClaude first.');
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${prompt}\n\n\`\`\`\n${code}\n\`\`\``,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response format');
}

export async function chat(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  if (!client) {
    throw new Error('Claude API not initialized. Call initClaude first.');
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages,
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }
  throw new Error('Unexpected response format');
}
