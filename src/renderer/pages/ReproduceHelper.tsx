import React, { useState, useEffect } from 'react';
import { hasApiKey } from '../services/claude';
import { Link } from 'react-router-dom';

interface Props {
  project: string | null;
}

interface Bug {
  id: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  environment: string;
  createdAt: number;
}

interface Session {
  id: string;
  startTime: number;
  endTime?: number;
  entries: {
    id: string;
    type: 'text' | 'voice' | 'screenshot';
    content: string;
    timestamp: number;
  }[];
}

interface ReproSteps {
  bugId: string;
  generatedSteps: string[];
  environment: string;
  prerequisites: string[];
  notes: string;
  timestamp: number;
}

const getBugsKey = (project: string) => `qa-cafe-bugs-${project}`;
const getSessionsKey = (project: string) => `qa-cafe-sessions-${project}`;
const getReproKey = (project: string) => `qa-cafe-repro-${project}`;

function ReproduceHelper({ project }: Props) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedBugId, setSelectedBugId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [reproSteps, setReproSteps] = useState<ReproSteps | null>(null);
  const [savedRepros, setSavedRepros] = useState<Record<string, ReproSteps>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedSteps, setEditedSteps] = useState<string[]>([]);

  // Load data
  useEffect(() => {
    if (project) {
      const bugsData = localStorage.getItem(getBugsKey(project));
      if (bugsData) {
        try {
          setBugs(JSON.parse(bugsData));
        } catch {
          setBugs([]);
        }
      } else {
        setBugs([]);
      }

      const sessionsData = localStorage.getItem(getSessionsKey(project));
      if (sessionsData) {
        try {
          setSessions(JSON.parse(sessionsData));
        } catch {
          setSessions([]);
        }
      } else {
        setSessions([]);
      }

      const reproData = localStorage.getItem(getReproKey(project));
      if (reproData) {
        try {
          setSavedRepros(JSON.parse(reproData));
        } catch {
          setSavedRepros({});
        }
      } else {
        setSavedRepros({});
      }
    }
  }, [project]);

  // Save repros
  useEffect(() => {
    if (project && Object.keys(savedRepros).length > 0) {
      localStorage.setItem(getReproKey(project), JSON.stringify(savedRepros));
    }
  }, [savedRepros, project]);

  // Load saved repro when bug selected
  useEffect(() => {
    if (selectedBugId && savedRepros[selectedBugId]) {
      setReproSteps(savedRepros[selectedBugId]);
    } else {
      setReproSteps(null);
    }
    setEditing(false);
  }, [selectedBugId, savedRepros]);

  const generateReproSteps = async () => {
    if (!project || !selectedBugId || !hasApiKey()) return;

    const bug = bugs.find(b => b.id === selectedBugId);
    if (!bug) return;

    setLoading(true);
    setError(null);

    try {
      // Build context
      let sessionContext = '';
      if (selectedSessionId) {
        const session = sessions.find(s => s.id === selectedSessionId);
        if (session) {
          const textEntries = session.entries.filter(e => e.type === 'text');
          sessionContext = `\n\n## Related Session Notes (${new Date(session.startTime).toLocaleString()})\n${textEntries.map(e => `- ${e.content}`).join('\n')}`;
        }
      }

      const prompt = `Based on the following bug report, generate clear, numbered reproduction steps that a tester can follow exactly.

## Bug Report
**Title:** ${bug.title}
**Severity:** ${bug.severity}
**Description:** ${bug.description}
**Original Steps:** ${bug.stepsToReproduce || 'Not provided'}
**Expected:** ${bug.expectedResult}
**Actual:** ${bug.actualResult}
**Environment:** ${bug.environment || 'Not specified'}
${sessionContext}

Generate a JSON response with this structure:
{
  "prerequisites": ["List of things that must be true before starting", "e.g. logged in as admin, data exists"],
  "steps": ["Step 1: Exact action to take", "Step 2: Next action", "Step 3: etc."],
  "environment": "Required environment setup",
  "notes": "Any additional notes about edge cases or reliability"
}

Make steps specific and actionable. Include expected intermediate results where helpful.`;

      const response = await window.electronAPI.callClaude({
        apiKey: localStorage.getItem('claude_api_key') || '',
        messages: [{ role: 'user', content: prompt }],
        system: 'You are a QA engineer creating precise bug reproduction steps. Be specific and detailed. Always respond with valid JSON.',
        maxTokens: 2048,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const newRepro: ReproSteps = {
          bugId: selectedBugId,
          generatedSteps: parsed.steps || [],
          environment: parsed.environment || bug.environment || '',
          prerequisites: parsed.prerequisites || [],
          notes: parsed.notes || '',
          timestamp: Date.now(),
        };
        setReproSteps(newRepro);
        setSavedRepros(prev => ({ ...prev, [selectedBugId]: newRepro }));
      } else {
        setError('Could not parse response');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = () => {
    if (reproSteps) {
      setEditedSteps([...reproSteps.generatedSteps]);
      setEditing(true);
    }
  };

  const saveEdits = () => {
    if (reproSteps && selectedBugId) {
      const updated = { ...reproSteps, generatedSteps: editedSteps, timestamp: Date.now() };
      setReproSteps(updated);
      setSavedRepros(prev => ({ ...prev, [selectedBugId]: updated }));
      setEditing(false);
    }
  };

  const addStep = () => {
    setEditedSteps(prev => [...prev, '']);
  };

  const removeStep = (index: number) => {
    setEditedSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, value: string) => {
    setEditedSteps(prev => prev.map((s, i) => i === index ? value : s));
  };

  const exportRepro = () => {
    if (!reproSteps) return;
    const bug = bugs.find(b => b.id === selectedBugId);

    const markdown = `# Bug Reproduction Steps

## Bug: ${bug?.title}
**Severity:** ${bug?.severity}
**ID:** ${bug?.id}

## Environment
${reproSteps.environment || 'Not specified'}

## Prerequisites
${reproSteps.prerequisites.length > 0 ? reproSteps.prerequisites.map(p => `- ${p}`).join('\n') : 'None'}

## Steps to Reproduce
${reproSteps.generatedSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Expected Result
${bug?.expectedResult}

## Actual Result
${bug?.actualResult}

${reproSteps.notes ? `## Notes\n${reproSteps.notes}` : ''}

---
Generated: ${new Date(reproSteps.timestamp).toLocaleString()}
`;

    navigator.clipboard.writeText(markdown);
    alert('Reproduction steps copied to clipboard!');
  };

  const selectedBug = bugs.find(b => b.id === selectedBugId);

  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🔄</div>
          <h2 className="empty-state-title">Reproduce Helper</h2>
          <p>Select a project to generate reproduction steps.</p>
        </div>
      </div>
    );
  }

  if (bugs.length === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">Reproduce Helper</h1>
          <p className="page-description">Generate detailed reproduction steps from bug reports</p>
        </header>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🐛</div>
            <h2 className="empty-state-title">No Bugs Found</h2>
            <p>Create some bugs in Bug Writer first.</p>
            <Link to="/bug-writer" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Go to Bug Writer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hasApiKey()) {
    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">Reproduce Helper</h1>
          <p className="page-description">Generate detailed reproduction steps from bug reports</p>
        </header>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔑</div>
            <h2 className="empty-state-title">API Key Required</h2>
            <p>Configure your Claude API key to generate repro steps.</p>
            <Link to="/settings" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Go to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Reproduce Helper</h1>
        <p className="page-description">Generate detailed reproduction steps from bug reports</p>
      </header>

      {/* Bug Selection */}
      <div className="card">
        <h3 className="card-title">Select Bug</h3>
        <select
          value={selectedBugId}
          onChange={(e) => setSelectedBugId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            marginTop: '12px',
          }}
        >
          <option value="">Select a bug...</option>
          {bugs.map(bug => (
            <option key={bug.id} value={bug.id}>
              [{bug.severity}] {bug.title}
            </option>
          ))}
        </select>

        {sessions.length > 0 && (
          <>
            <h4 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '0.9rem' }}>
              Related Session (optional)
            </h4>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            >
              <option value="">No session context</option>
              {sessions.filter(s => s.endTime).map(session => (
                <option key={session.id} value={session.id}>
                  {new Date(session.startTime).toLocaleString()} ({session.entries.length} entries)
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Adding session context helps generate more accurate repro steps.
            </p>
          </>
        )}
      </div>

      {/* Selected Bug Details */}
      {selectedBug && (
        <div className="card">
          <h3 className="card-title">Bug Details</h3>
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedBug.title}</span>
              <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                backgroundColor: selectedBug.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' :
                  selectedBug.severity === 'high' ? 'rgba(251, 191, 36, 0.2)' :
                  selectedBug.severity === 'medium' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                color: selectedBug.severity === 'critical' ? '#ef4444' :
                  selectedBug.severity === 'high' ? '#fbbf24' :
                  selectedBug.severity === 'medium' ? '#60a5fa' : '#94a3b8',
              }}>
                {selectedBug.severity}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>{selectedBug.description}</p>
            {selectedBug.stepsToReproduce && (
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.85rem' }}>Original Steps:</strong>
                <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                  {selectedBug.stepsToReproduce}
                </p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              className="btn btn-primary"
              onClick={generateReproSteps}
              disabled={loading}
            >
              {loading ? 'Generating...' : reproSteps ? 'Regenerate Steps' : 'Generate Repro Steps'}
            </button>
            {reproSteps && (
              <button className="btn btn-secondary" onClick={exportRepro}>
                Export
              </button>
            )}
          </div>
        </div>
      )}

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
            <span>Analyzing bug and generating reproduction steps...</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Reproduction Steps */}
      {reproSteps && !loading && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Reproduction Steps</h3>
            {!editing ? (
              <button className="btn btn-secondary" onClick={startEditing} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                Edit Steps
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" onClick={saveEdits} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  Save
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Environment */}
          {reproSteps.environment && (
            <div style={{ marginTop: '16px' }}>
              <strong style={{ fontSize: '0.85rem' }}>Environment:</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {reproSteps.environment}
              </p>
            </div>
          )}

          {/* Prerequisites */}
          {reproSteps.prerequisites.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <strong style={{ fontSize: '0.85rem' }}>Prerequisites:</strong>
              <ul style={{ margin: '8px 0 0 20px', fontSize: '0.9rem' }}>
                {reproSteps.prerequisites.map((p, i) => (
                  <li key={i} style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Steps */}
          <div style={{ marginTop: '16px' }}>
            <strong style={{ fontSize: '0.85rem' }}>Steps:</strong>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {editedSteps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)', minWidth: '24px' }}>{i + 1}.</span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => updateStep(i, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                      }}
                    />
                    <button
                      onClick={() => removeStep(i)}
                      style={{
                        padding: '6px 10px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={addStep}
                  style={{
                    padding: '8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  + Add Step
                </button>
              </div>
            ) : (
              <ol style={{ margin: '12px 0 0 20px', fontSize: '0.9rem' }}>
                {reproSteps.generatedSteps.map((step, i) => (
                  <li key={i} style={{ marginBottom: '8px', paddingLeft: '8px' }}>{step}</li>
                ))}
              </ol>
            )}
          </div>

          {/* Notes */}
          {reproSteps.notes && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(96, 165, 250, 0.1)',
              borderRadius: '8px',
              borderLeft: '3px solid #60a5fa',
            }}>
              <strong style={{ fontSize: '0.85rem', color: '#60a5fa' }}>Notes:</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {reproSteps.notes}
              </p>
            </div>
          )}

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '16px' }}>
            Generated: {new Date(reproSteps.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

export default ReproduceHelper;
