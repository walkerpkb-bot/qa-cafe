import React, { useState, useEffect } from 'react';
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

interface TestCaseStatus {
  id: string;
  status: 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';
  notes?: string;
  timestamp?: number;
}

interface CoverageData {
  statuses: Record<string, TestCaseStatus>;
  lastUpdated: number;
}

const getTestPlanKey = (project: string) => `qa-cafe-testplan-${project}`;
const getCoverageKey = (project: string) => `qa-cafe-coverage-${project}`;

function CoverageTracker({ project }: Props) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [coverage, setCoverage] = useState<CoverageData>({ statuses: {}, lastUpdated: 0 });
  const [filter, setFilter] = useState<'all' | 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});

  // Load test cases and coverage data
  useEffect(() => {
    if (project) {
      // Load test cases
      const testPlanData = localStorage.getItem(getTestPlanKey(project));
      if (testPlanData) {
        try {
          const parsed = JSON.parse(testPlanData);
          setTestCases(parsed.testCases || []);
        } catch {
          setTestCases([]);
        }
      } else {
        setTestCases([]);
      }

      // Load coverage data
      const coverageData = localStorage.getItem(getCoverageKey(project));
      if (coverageData) {
        try {
          setCoverage(JSON.parse(coverageData));
        } catch {
          setCoverage({ statuses: {}, lastUpdated: 0 });
        }
      } else {
        setCoverage({ statuses: {}, lastUpdated: 0 });
      }
    }
  }, [project]);

  // Save coverage data
  useEffect(() => {
    if (project && coverage.lastUpdated > 0) {
      localStorage.setItem(getCoverageKey(project), JSON.stringify(coverage));
    }
  }, [coverage, project]);

  const updateStatus = (testId: string, status: TestCaseStatus['status']) => {
    setCoverage(prev => ({
      statuses: {
        ...prev.statuses,
        [testId]: {
          id: testId,
          status,
          notes: prev.statuses[testId]?.notes,
          timestamp: Date.now(),
        },
      },
      lastUpdated: Date.now(),
    }));
  };

  const updateNote = (testId: string, note: string) => {
    setCoverage(prev => ({
      statuses: {
        ...prev.statuses,
        [testId]: {
          ...prev.statuses[testId],
          id: testId,
          status: prev.statuses[testId]?.status || 'pending',
          notes: note,
          timestamp: Date.now(),
        },
      },
      lastUpdated: Date.now(),
    }));
  };

  const getStatus = (testId: string): TestCaseStatus['status'] => {
    return coverage.statuses[testId]?.status || 'pending';
  };

  const getNote = (testId: string): string => {
    return coverage.statuses[testId]?.notes || '';
  };

  // Calculate statistics
  const stats = {
    total: testCases.length,
    pending: testCases.filter(tc => getStatus(tc.id) === 'pending').length,
    passed: testCases.filter(tc => getStatus(tc.id) === 'passed').length,
    failed: testCases.filter(tc => getStatus(tc.id) === 'failed').length,
    blocked: testCases.filter(tc => getStatus(tc.id) === 'blocked').length,
    skipped: testCases.filter(tc => getStatus(tc.id) === 'skipped').length,
  };

  const executed = stats.passed + stats.failed + stats.blocked + stats.skipped;
  const passRate = executed > 0 ? Math.round((stats.passed / executed) * 100) : 0;
  const progress = stats.total > 0 ? Math.round((executed / stats.total) * 100) : 0;

  // Get unique categories
  const categories = ['all', ...new Set(testCases.map(tc => tc.category))];

  // Filter test cases
  const filteredCases = testCases.filter(tc => {
    const status = getStatus(tc.id);
    if (filter !== 'all' && status !== filter) return false;
    if (categoryFilter !== 'all' && tc.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && tc.priority !== priorityFilter) return false;
    return true;
  });

  const resetCoverage = () => {
    if (confirm('Reset all coverage data? This cannot be undone.')) {
      setCoverage({ statuses: {}, lastUpdated: Date.now() });
    }
  };

  const exportCoverage = () => {
    const markdown = `# Test Coverage Report
**Project:** ${project}
**Generated:** ${new Date().toLocaleString()}

## Summary
- **Total Test Cases:** ${stats.total}
- **Executed:** ${executed} (${progress}%)
- **Passed:** ${stats.passed}
- **Failed:** ${stats.failed}
- **Blocked:** ${stats.blocked}
- **Skipped:** ${stats.skipped}
- **Pending:** ${stats.pending}
- **Pass Rate:** ${passRate}%

## Results by Category
${categories.filter(c => c !== 'all').map(cat => {
  const catCases = testCases.filter(tc => tc.category === cat);
  const catPassed = catCases.filter(tc => getStatus(tc.id) === 'passed').length;
  const catFailed = catCases.filter(tc => getStatus(tc.id) === 'failed').length;
  return `### ${cat}
- Total: ${catCases.length}
- Passed: ${catPassed}
- Failed: ${catFailed}`;
}).join('\n\n')}

## Failed Test Cases
${testCases.filter(tc => getStatus(tc.id) === 'failed').map(tc => {
  const note = getNote(tc.id);
  return `### ${tc.id}: ${tc.name}
- **Priority:** ${tc.priority}
- **Category:** ${tc.category}
- **Description:** ${tc.description}
${note ? `- **Notes:** ${note}` : ''}`;
}).join('\n\n') || 'None'}

## Blocked Test Cases
${testCases.filter(tc => getStatus(tc.id) === 'blocked').map(tc => {
  const note = getNote(tc.id);
  return `### ${tc.id}: ${tc.name}
- **Priority:** ${tc.priority}
- **Category:** ${tc.category}
${note ? `- **Reason:** ${note}` : ''}`;
}).join('\n\n') || 'None'}

## Detailed Results
| ID | Name | Priority | Category | Status | Notes |
|----|------|----------|----------|--------|-------|
${testCases.map(tc => {
  const status = getStatus(tc.id);
  const note = getNote(tc.id);
  return `| ${tc.id} | ${tc.name} | ${tc.priority} | ${tc.category} | ${status} | ${note || '-'} |`;
}).join('\n')}
`;

    navigator.clipboard.writeText(markdown);
    alert('Coverage report copied to clipboard!');
  };

  const getStatusColor = (status: TestCaseStatus['status']) => {
    switch (status) {
      case 'passed': return { bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' };
      case 'failed': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
      case 'blocked': return { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' };
      case 'skipped': return { bg: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8' };
      default: return { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
    }
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
          <div className="empty-state-icon">📊</div>
          <h2 className="empty-state-title">Coverage Tracker</h2>
          <p>Select a project to track test coverage.</p>
        </div>
      </div>
    );
  }

  if (testCases.length === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">Coverage Tracker</h1>
          <p className="page-description">Track what you've tested and what's remaining</p>
        </header>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <h2 className="empty-state-title">No Test Cases</h2>
            <p>Generate test cases first to track coverage.</p>
            <Link to="/test-case-generator" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Go to Test Case Generator
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Coverage Tracker</h1>
        <p className="page-description">Track what you've tested and what's remaining</p>
      </header>

      {/* Progress Overview */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Test Coverage</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={exportCoverage} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
              Export Report
            </button>
            <button
              className="btn btn-secondary"
              onClick={resetCoverage}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          height: '24px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
        }}>
          {stats.passed > 0 && (
            <div style={{ width: `${(stats.passed / stats.total) * 100}%`, height: '100%', backgroundColor: '#4ade80' }} />
          )}
          {stats.failed > 0 && (
            <div style={{ width: `${(stats.failed / stats.total) * 100}%`, height: '100%', backgroundColor: '#ef4444' }} />
          )}
          {stats.blocked > 0 && (
            <div style={{ width: `${(stats.blocked / stats.total) * 100}%`, height: '100%', backgroundColor: '#fbbf24' }} />
          )}
          {stats.skipped > 0 && (
            <div style={{ width: `${(stats.skipped / stats.total) * 100}%`, height: '100%', backgroundColor: '#94a3b8' }} />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <span>{executed} / {stats.total} executed ({progress}%)</span>
          <span>Pass Rate: {passRate}%</span>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginTop: '20px',
        }}>
          {[
            { label: 'Pending', count: stats.pending, color: '#64748b' },
            { label: 'Passed', count: stats.passed, color: '#4ade80' },
            { label: 'Failed', count: stats.failed, color: '#ef4444' },
            { label: 'Blocked', count: stats.blocked, color: '#fbbf24' },
            { label: 'Skipped', count: stats.skipped, color: '#94a3b8' },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                padding: '12px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                border: filter === stat.label.toLowerCase() ? `2px solid ${stat.color}` : '2px solid transparent',
              }}
              onClick={() => setFilter(filter === stat.label.toLowerCase() as typeof filter ? 'all' : stat.label.toLowerCase() as typeof filter)}
            >
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: stat.color }}>{stat.count}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 500 }}>Filters:</span>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
            }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Showing {filteredCases.length} of {stats.total}
          </span>
        </div>
      </div>

      {/* Test Cases List */}
      <div className="card">
        <h3 className="card-title">Test Cases</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          {filteredCases.map(tc => {
            const status = getStatus(tc.id);
            const statusStyle = getStatusColor(status);
            const priorityStyle = getPriorityColor(tc.priority);
            const isExpanded = expandedId === tc.id;
            const note = noteInput[tc.id] ?? getNote(tc.id);

            return (
              <div
                key={tc.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${statusStyle.color}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : tc.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 500 }}>{tc.id}: {tc.name}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        backgroundColor: priorityStyle.bg,
                        color: priorityStyle.color,
                      }}>
                        {tc.priority}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}>
                        {tc.category}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                      {tc.description}
                    </p>
                  </div>

                  {/* Status Buttons */}
                  <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                    {(['passed', 'failed', 'blocked', 'skipped'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(tc.id, status === s ? 'pending' : s)}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: status === s ? getStatusColor(s).bg : 'var(--bg-secondary)',
                          border: status === s ? `1px solid ${getStatusColor(s).color}` : '1px solid var(--border)',
                          borderRadius: '4px',
                          color: status === s ? getStatusColor(s).color : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: status === s ? 600 : 400,
                        }}
                      >
                        {s === 'passed' && 'Pass'}
                        {s === 'failed' && 'Fail'}
                        {s === 'blocked' && 'Block'}
                        {s === 'skipped' && 'Skip'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                    {tc.preconditions.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ fontSize: '0.85rem' }}>Preconditions:</strong>
                        <ul style={{ margin: '4px 0 0 20px', fontSize: '0.85rem' }}>
                          {tc.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Steps:</strong>
                      <ol style={{ margin: '4px 0 0 20px', fontSize: '0.85rem' }}>
                        {tc.steps.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s}</li>)}
                      </ol>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Expected Result:</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--success)' }}>
                        {tc.expectedResult}
                      </p>
                    </div>

                    {/* Notes */}
                    <div>
                      <strong style={{ fontSize: '0.85rem' }}>Notes:</strong>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input
                          type="text"
                          value={note}
                          onChange={(e) => setNoteInput(prev => ({ ...prev, [tc.id]: e.target.value }))}
                          onBlur={() => {
                            updateNote(tc.id, note);
                            setNoteInput(prev => {
                              const { [tc.id]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateNote(tc.id, note);
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="Add a note (e.g., failure reason, blocker details)..."
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CoverageTracker;
