/**
 * Test Mapper - Code path analysis tool
 *
 * Analyzes a codebase to identify:
 * - Entry points and main flows
 * - State assumptions
 * - Error handlers
 * - TODOs and potential issues
 */

import { analyzeCode } from '../llm/claude';

export interface CodeFlow {
  name: string;
  entryPoint: string;
  path: string[];
  assumptions: string[];
  errorHandlers: string[];
  issues: string[];
}

export interface MapperResult {
  flows: CodeFlow[];
  todos: { file: string; line: number; text: string }[];
  configIssues: string[];
  missingDependencies: string[];
  summary: string;
}

const MAPPER_PROMPT = `You are analyzing code for a QA toolkit. Identify:

1. Entry points (main functions, route handlers, exports)
2. The flow of execution from each entry point
3. State assumptions (where code assumes something exists without checking)
4. Error handling (try/catch, error callbacks, etc.)
5. TODOs, FIXMEs, and potential issues
6. Configuration references (env vars, config files)

Respond in JSON format with this structure:
{
  "flows": [{ "name": "", "entryPoint": "", "path": [], "assumptions": [], "errorHandlers": [], "issues": [] }],
  "todos": [{ "file": "", "line": 0, "text": "" }],
  "configIssues": [],
  "missingDependencies": [],
  "summary": ""
}`;

export async function analyzeProject(files: { path: string; content: string }[]): Promise<MapperResult> {
  // Combine files for analysis (in reality, would chunk large codebases)
  const codeContext = files
    .map(f => `// File: ${f.path}\n${f.content}`)
    .join('\n\n---\n\n');

  const response = await analyzeCode(codeContext, MAPPER_PROMPT);

  try {
    return JSON.parse(response);
  } catch {
    // If JSON parsing fails, return a basic structure with the raw response
    return {
      flows: [],
      todos: [],
      configIssues: [],
      missingDependencies: [],
      summary: response,
    };
  }
}
