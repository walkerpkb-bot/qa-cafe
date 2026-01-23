import React, { useState, useEffect } from 'react';
import { hasApiKey } from '../services/claude';
import { Link } from 'react-router-dom';

interface Props {
  project: string | null;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface GeneratedTestPlan {
  testCases: TestCase[];
  coverage: string;
  notes: string;
}

const GENERATION_PROMPT = `Based on the following code analysis, generate a comprehensive test plan with specific test cases.

For each user flow and potential issue identified, create test cases that cover:
1. Happy path (normal usage)
2. Edge cases (boundary conditions, empty states, max values)
3. Error cases (invalid input, network failures, permission denied)
4. State-related tests (based on the state assumptions identified)

Respond with this exact JSON structure:
{
  "testCases": [
    {
      "id": "TC001",
      "name": "Short descriptive name",
      "description": "What this test verifies",
      "preconditions": ["User is logged in", "Data exists"],
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expectedResult": "What should happen",
      "priority": "high|medium|low",
      "category": "Flow name or area being tested"
    }
  ],
  "coverage": "Brief summary of what these tests cover",
  "notes": "Any important testing notes or assumptions"
}

Generate 10-20 test cases that would give good coverage. Prioritize based on risk and user impact.`;

function TestCaseGenerator({ project }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testPlan, setTestPlan] = useState<GeneratedTestPlan | null>(null);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if Test Mapper results exist
  useEffect(() => {
    if (project) {
      const cacheKey = `qa-cafe-testmapper-${project}`;
      const cached = localStorage.getItem(cacheKey);
      setHasAnalysis(!!cached);

      // Also check for cached test plan
      const testPlanKey = `qa-cafe-testplan-${project}`;
      const cachedPlan = localStorage.getItem(testPlanKey);
      if (cachedPlan) {
        try {
          setTestPlan(JSON.parse(cachedPlan));
        } catch {
          // Invalid cache
        }
      } else {
        setTestPlan(null);
      }
    }
  }, [project]);

  const generateTestCases = async () => {
    if (!project || !hasApiKey()) return;

    const cacheKey = `qa-cafe-testmapper-${project}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
      setError('No Test Mapper analysis found. Run Test Mapper first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { result } = JSON.parse(cached);

      // Build context from Test Mapper results
      const analysisContext = `
## Code Analysis Summary
${result.summary}

## User Flows (${result.flows.length})
${result.flows.map((f: { name: string; description: string; entryPoint: string; steps: string[] }) =>
  `### ${f.name}
- Entry: ${f.entryPoint}
- Description: ${f.description}
- Steps: ${f.steps.join(' → ')}`
).join('\n\n')}

## State Assumptions (${result.stateAssumptions.length})
${result.stateAssumptions.map((a: { location: string; assumption: string; risk: string }) =>
  `- [${a.risk.toUpperCase()}] ${a.location}: ${a.assumption}`
).join('\n')}

## Potential Issues (${result.issues.length})
${result.issues.map((i: { type: string; location: string; description: string; severity: string }) =>
  `- [${i.severity.toUpperCase()}] ${i.type} at ${i.location}: ${i.description}`
).join('\n')}
`;

      const response = await window.electronAPI.callClaude({
        apiKey: localStorage.getItem('claude_api_key') || '',
        messages: [{ role: 'user', content: `${GENERATION_PROMPT}\n\n---\n\n${analysisContext}` }],
        system: 'You are a senior QA engineer creating detailed test cases. Be specific and actionable. Always respond with valid JSON.',
        maxTokens: 4096,
      });

      // Parse response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setTestPlan(parsed);
        // Cache the test plan
        localStorage.setItem(`qa-cafe-testplan-${project}`, JSON.stringify(parsed));
      } else {
        setError('Could not parse test plan. Check console.');
        console.log('Raw response:', response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const clearTestPlan = () => {
    if (project) {
      localStorage.removeItem(`qa-cafe-testplan-${project}`);
      setTestPlan(null);
    }
  };

  const copyToClipboard = () => {
    if (!testPlan) return;

    const markdown = `# Test Plan

## Coverage
${testPlan.coverage}

## Notes
${testPlan.notes}

## Test Cases

${testPlan.testCases.map(tc => `### ${tc.id}: ${tc.name}
**Priority:** ${tc.priority} | **Category:** ${tc.category}

**Description:** ${tc.description}

**Preconditions:**
${tc.preconditions.map(p => `- ${p}`).join('\n')}

**Steps:**
${tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Expected Result:** ${tc.expectedResult}

---
`).join('\n')}`;

    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
      case 'medium': return { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' };
      case 'low': return { bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' };
      default: return { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
    }
  };

  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h2 className="empty-state-title">Test Case Generator</h2>
          <p>Select a project to generate test cases.</p>
        </div>
      </div>
    );
  }

  if (!hasApiKey()) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h2 className="empty-state-title">Test Case Generator</h2>
          <p>Configure your Claude API key to generate test cases.</p>
          <Link to="/settings" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Go to Settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Test Case Generator</h1>
        <p className="page-description">Generate test cases from code analysis</p>
      </header>

      <div className="card">
        <h3 className="card-title">Project</h3>
        <p style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{project}</p>

        {!hasAnalysis ? (
          <div style={{ marginTop: '16px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Run Test Mapper first to analyze the codebase.
            </p>
            <Link to="/test-mapper" className="btn btn-primary">
              Go to Test Mapper
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={generateTestCases}
              disabled={loading}
            >
              {loading ? 'Generating...' : testPlan ? 'Regenerate' : 'Generate Test Cases'}
            </button>
            {testPlan && (
              <>
                <button className="btn btn-secondary" onClick={copyToClipboard}>
                  {copied ? 'Copied!' : 'Copy as Markdown'}
                </button>
                <button className="btn btn-secondary" onClick={clearTestPlan}>
                  Clear
                </button>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {testPlan.testCases.length} test cases
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent)', backgroundColor: 'rgba(233, 69, 96, 0.1)' }}>
          <p style={{ color: 'var(--accent)' }}>{error}</p>
        </div>
      )}

      {loading && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span>Generating test cases from analysis...</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {testPlan && (
        <>
          {/* Coverage & Notes */}
          <div className="card">
            <h3 className="card-title">Coverage</h3>
            <p>{testPlan.coverage}</p>
            {testPlan.notes && (
              <>
                <h4 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '0.9rem' }}>Notes</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{testPlan.notes}</p>
              </>
            )}
          </div>

          {/* Test Cases */}
          <div className="card">
            <h3 className="card-title">Test Cases ({testPlan.testCases.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {testPlan.testCases.map((tc) => {
                const priorityStyle = getPriorityColor(tc.priority);
                return (
                  <div
                    key={tc.id}
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${priorityStyle.color}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{tc.id}: {tc.name}</span>
                        <span style={{
                          marginLeft: '12px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: priorityStyle.bg,
                          color: priorityStyle.color,
                        }}>
                          {tc.priority}
                        </span>
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}>
                        {tc.category}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>
                      {tc.description}
                    </p>

                    {tc.preconditions.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ fontSize: '0.85rem' }}>Preconditions:</strong>
                        <ul style={{ margin: '4px 0 0 20px', fontSize: '0.85rem' }}>
                          {tc.preconditions.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Steps:</strong>
                      <ol style={{ margin: '4px 0 0 20px', fontSize: '0.85rem' }}>
                        {tc.steps.map((s, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{s}</li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Expected Result:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--success)' }}>
                        {tc.expectedResult}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TestCaseGenerator;
