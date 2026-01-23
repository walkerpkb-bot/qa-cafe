import React, { useState, useEffect } from 'react';
import { hasApiKey } from '../services/claude';
import { Link } from 'react-router-dom';

interface Props {
  project: string | null;
}

interface BugReport {
  id: string;
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  environment: string;
  createdAt: number;
  rawNotes?: string;
}

const getBugsKey = (project: string) => `qa-cafe-bugs-${project}`;

const STRUCTURE_PROMPT = `Convert the following bug description into a structured bug report. Extract or infer:
- A clear, concise title
- Detailed description
- Steps to reproduce (numbered list)
- Expected result
- Actual result
- Severity (critical/high/medium/low based on impact)
- Environment info if mentioned

Respond with this exact JSON structure:
{
  "title": "Brief descriptive title",
  "description": "Detailed description of the issue",
  "stepsToReproduce": ["Step 1", "Step 2", "Step 3"],
  "expectedResult": "What should happen",
  "actualResult": "What actually happens",
  "severity": "critical|high|medium|low",
  "environment": "Browser/OS/version info if mentioned, or 'Not specified'"
}`;

function BugWriter({ project }: Props) {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingBug, setEditingBug] = useState<BugReport | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form fields for manual entry
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [severity, setSeverity] = useState<BugReport['severity']>('medium');
  const [environment, setEnvironment] = useState('');

  // Load bugs when project changes
  useEffect(() => {
    if (project) {
      try {
        const saved = localStorage.getItem(getBugsKey(project));
        setBugs(saved ? JSON.parse(saved) : []);
      } catch {
        setBugs([]);
      }
    } else {
      setBugs([]);
    }
  }, [project]);

  // Save bugs when they change
  useEffect(() => {
    if (project && bugs.length > 0) {
      localStorage.setItem(getBugsKey(project), JSON.stringify(bugs));
    }
  }, [bugs, project]);

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setSteps('');
    setExpected('');
    setActual('');
    setSeverity('medium');
    setEnvironment('');
    setEditingBug(null);
  };

  const structureWithAI = async () => {
    if (!rawInput.trim() || !hasApiKey()) return;

    setLoading(true);
    try {
      const response = await window.electronAPI.callClaude({
        apiKey: localStorage.getItem('claude_api_key') || '',
        messages: [{ role: 'user', content: `${STRUCTURE_PROMPT}\n\nBug description:\n${rawInput}` }],
        system: 'You are a QA engineer structuring bug reports. Be precise and thorough. Always respond with valid JSON.',
        maxTokens: 1024,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setTitle(parsed.title || '');
        setDescription(parsed.description || '');
        setSteps(parsed.stepsToReproduce?.join('\n') || '');
        setExpected(parsed.expectedResult || '');
        setActual(parsed.actualResult || '');
        setSeverity(parsed.severity || 'medium');
        setEnvironment(parsed.environment || '');
        setShowForm(true);
      }
    } catch (err) {
      console.error('Failed to structure bug:', err);
      alert('Failed to structure bug. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveBug = () => {
    if (!title.trim()) return;

    const bug: BugReport = {
      id: editingBug?.id || Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      stepsToReproduce: steps.split('\n').filter(s => s.trim()),
      expectedResult: expected.trim(),
      actualResult: actual.trim(),
      severity,
      environment: environment.trim() || 'Not specified',
      createdAt: editingBug?.createdAt || Date.now(),
      rawNotes: rawInput.trim() || undefined,
    };

    if (editingBug) {
      setBugs(prev => prev.map(b => b.id === editingBug.id ? bug : b));
    } else {
      setBugs(prev => [...prev, bug]);
    }

    clearForm();
    setShowForm(false);
    setRawInput('');
  };

  const editBug = (bug: BugReport) => {
    setTitle(bug.title);
    setDescription(bug.description);
    setSteps(bug.stepsToReproduce.join('\n'));
    setExpected(bug.expectedResult);
    setActual(bug.actualResult);
    setSeverity(bug.severity);
    setEnvironment(bug.environment);
    setEditingBug(bug);
    setShowForm(true);
  };

  const deleteBug = (id: string) => {
    if (confirm('Delete this bug report?')) {
      setBugs(prev => prev.filter(b => b.id !== id));
      if (project) {
        const updated = bugs.filter(b => b.id !== id);
        if (updated.length === 0) {
          localStorage.removeItem(getBugsKey(project));
        }
      }
    }
  };

  const exportBug = (bug: BugReport) => {
    const markdown = `# ${bug.title}

**Severity:** ${bug.severity.toUpperCase()}
**Created:** ${new Date(bug.createdAt).toLocaleString()}
**Environment:** ${bug.environment}

## Description
${bug.description}

## Steps to Reproduce
${bug.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Expected Result
${bug.expectedResult}

## Actual Result
${bug.actualResult}
`;
    navigator.clipboard.writeText(markdown);
    alert('Bug report copied to clipboard!');
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return { bg: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' };
      case 'high': return { bg: 'rgba(249, 115, 22, 0.2)', color: '#f97316' };
      case 'medium': return { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' };
      case 'low': return { bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' };
      default: return { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
    }
  };

  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🐛</div>
          <h2 className="empty-state-title">Bug Writer</h2>
          <p>Select a project to document bugs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Bug Writer</h1>
        <p className="page-description">Document and structure bug reports</p>
      </header>

      {/* Quick Input */}
      {!showForm && (
        <div className="card">
          <h3 className="card-title">Quick Bug Report</h3>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="Describe the bug in your own words... (e.g., 'When I click submit with an empty form, nothing happens - should show validation errors')"
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            {hasApiKey() ? (
              <button
                className="btn btn-primary"
                onClick={structureWithAI}
                disabled={!rawInput.trim() || loading}
              >
                {loading ? 'Structuring...' : 'Structure with AI'}
              </button>
            ) : (
              <Link to="/settings" className="btn btn-primary">
                Add API Key
              </Link>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => { clearForm(); setShowForm(true); }}
            >
              Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* Structured Form */}
      {showForm && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              {editingBug ? 'Edit Bug Report' : 'New Bug Report'}
            </h3>
            <button
              onClick={() => { clearForm(); setShowForm(false); }}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1.2rem',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief, descriptive title"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as BugReport['severity'])}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Environment
                </label>
                <input
                  type="text"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="Browser, OS, version..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the issue"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Steps to Reproduce (one per line)
              </label>
              <textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="1. Go to login page&#10;2. Enter invalid email&#10;3. Click submit"
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Expected Result
                </label>
                <textarea
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  placeholder="What should happen"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Actual Result
                </label>
                <textarea
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  placeholder="What actually happens"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" onClick={saveBug} disabled={!title.trim()}>
                {editingBug ? 'Update Bug' : 'Save Bug'}
              </button>
              <button className="btn btn-secondary" onClick={() => { clearForm(); setShowForm(false); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug List */}
      {bugs.length > 0 && (
        <div className="card">
          <h3 className="card-title">Bug Reports ({bugs.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {[...bugs].reverse().map(bug => {
              const sevStyle = getSeverityColor(bug.severity);
              return (
                <div
                  key={bug.id}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${sevStyle.color}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{bug.title}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          backgroundColor: sevStyle.bg,
                          color: sevStyle.color,
                          textTransform: 'uppercase',
                        }}>
                          {bug.severity}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                        {bug.description.length > 150 ? bug.description.substring(0, 150) + '...' : bug.description}
                      </p>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Created {new Date(bug.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => exportBug(bug)}
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
                        Copy
                      </button>
                      <button
                        onClick={() => editBug(bug)}
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
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBug(bug.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          color: '#ef4444',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default BugWriter;
