import React, { useState, useEffect } from 'react';

interface Props {
  project: string | null;
}

interface CoverageSnapshot {
  id: string;
  name: string;
  timestamp: number;
  statuses: Record<string, {
    status: 'pending' | 'passed' | 'failed' | 'blocked' | 'skipped';
    notes?: string;
  }>;
  stats: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
  };
}

interface TestCase {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

const getSnapshotsKey = (project: string) => `qa-cafe-snapshots-${project}`;
const getCoverageKey = (project: string) => `qa-cafe-coverage-${project}`;
const getTestPlanKey = (project: string) => `qa-cafe-testplan-${project}`;

function ComparisonTool({ project }: Props) {
  const [snapshots, setSnapshots] = useState<CoverageSnapshot[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [baselineId, setBaselineId] = useState<string>('');
  const [currentId, setCurrentId] = useState<string>('');
  const [comparison, setComparison] = useState<{
    regressions: string[];
    improvements: string[];
    unchanged: string[];
    newTests: string[];
  } | null>(null);
  const [snapshotName, setSnapshotName] = useState('');

  // Load snapshots and test cases
  useEffect(() => {
    if (project) {
      const saved = localStorage.getItem(getSnapshotsKey(project));
      if (saved) {
        try {
          setSnapshots(JSON.parse(saved));
        } catch {
          setSnapshots([]);
        }
      } else {
        setSnapshots([]);
      }

      const testPlanData = localStorage.getItem(getTestPlanKey(project));
      if (testPlanData) {
        try {
          const parsed = JSON.parse(testPlanData);
          setTestCases(parsed.testCases || []);
        } catch {
          setTestCases([]);
        }
      }
    }
  }, [project]);

  // Save snapshots
  useEffect(() => {
    if (project && snapshots.length > 0) {
      localStorage.setItem(getSnapshotsKey(project), JSON.stringify(snapshots));
    }
  }, [snapshots, project]);

  const createSnapshot = () => {
    if (!project || !snapshotName.trim()) return;

    const coverageData = localStorage.getItem(getCoverageKey(project));
    if (!coverageData) {
      alert('No coverage data to snapshot. Run some tests first.');
      return;
    }

    try {
      const coverage = JSON.parse(coverageData);
      const statuses = coverage.statuses || {};

      // Calculate stats
      const stats = {
        total: testCases.length,
        passed: testCases.filter(tc => statuses[tc.id]?.status === 'passed').length,
        failed: testCases.filter(tc => statuses[tc.id]?.status === 'failed').length,
        blocked: testCases.filter(tc => statuses[tc.id]?.status === 'blocked').length,
        skipped: testCases.filter(tc => statuses[tc.id]?.status === 'skipped').length,
      };

      const snapshot: CoverageSnapshot = {
        id: Date.now().toString(),
        name: snapshotName.trim(),
        timestamp: Date.now(),
        statuses,
        stats,
      };

      setSnapshots(prev => [...prev, snapshot]);
      setSnapshotName('');
    } catch {
      alert('Failed to create snapshot');
    }
  };

  const deleteSnapshot = (id: string) => {
    if (confirm('Delete this snapshot?')) {
      setSnapshots(prev => prev.filter(s => s.id !== id));
      if (baselineId === id) setBaselineId('');
      if (currentId === id) setCurrentId('');
    }
  };

  const runComparison = () => {
    if (!baselineId || !currentId) return;

    const baseline = snapshots.find(s => s.id === baselineId);
    const current = snapshots.find(s => s.id === currentId);

    if (!baseline || !current) return;

    const regressions: string[] = [];
    const improvements: string[] = [];
    const unchanged: string[] = [];
    const newTests: string[] = [];

    testCases.forEach(tc => {
      const baseStatus = baseline.statuses[tc.id]?.status || 'pending';
      const currStatus = current.statuses[tc.id]?.status || 'pending';

      if (baseStatus === 'pending' && currStatus !== 'pending') {
        newTests.push(tc.id);
      } else if (baseStatus === 'passed' && (currStatus === 'failed' || currStatus === 'blocked')) {
        regressions.push(tc.id);
      } else if ((baseStatus === 'failed' || baseStatus === 'blocked') && currStatus === 'passed') {
        improvements.push(tc.id);
      } else if (baseStatus === currStatus) {
        unchanged.push(tc.id);
      }
    });

    setComparison({ regressions, improvements, unchanged, newTests });
  };

  const getTestCase = (id: string) => testCases.find(tc => tc.id === id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return '#4ade80';
      case 'failed': return '#ef4444';
      case 'blocked': return '#fbbf24';
      case 'skipped': return '#94a3b8';
      default: return '#64748b';
    }
  };

  const exportComparison = () => {
    if (!comparison) return;

    const baseline = snapshots.find(s => s.id === baselineId);
    const current = snapshots.find(s => s.id === currentId);

    const markdown = `# Test Comparison Report
**Project:** ${project}
**Generated:** ${new Date().toLocaleString()}

## Comparing
- **Baseline:** ${baseline?.name} (${new Date(baseline?.timestamp || 0).toLocaleString()})
- **Current:** ${current?.name} (${new Date(current?.timestamp || 0).toLocaleString()})

## Summary
| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Passed | ${baseline?.stats.passed} | ${current?.stats.passed} | ${(current?.stats.passed || 0) - (baseline?.stats.passed || 0)} |
| Failed | ${baseline?.stats.failed} | ${current?.stats.failed} | ${(current?.stats.failed || 0) - (baseline?.stats.failed || 0)} |
| Blocked | ${baseline?.stats.blocked} | ${current?.stats.blocked} | ${(current?.stats.blocked || 0) - (baseline?.stats.blocked || 0)} |

## Regressions (${comparison.regressions.length})
${comparison.regressions.length > 0 ? comparison.regressions.map(id => {
  const tc = getTestCase(id);
  return `- **${id}**: ${tc?.name} [${tc?.priority}]`;
}).join('\n') : 'None - no tests regressed'}

## Improvements (${comparison.improvements.length})
${comparison.improvements.length > 0 ? comparison.improvements.map(id => {
  const tc = getTestCase(id);
  return `- **${id}**: ${tc?.name} [${tc?.priority}]`;
}).join('\n') : 'None'}

## Newly Tested (${comparison.newTests.length})
${comparison.newTests.length > 0 ? comparison.newTests.map(id => {
  const tc = getTestCase(id);
  return `- **${id}**: ${tc?.name} [${tc?.priority}]`;
}).join('\n') : 'None'}
`;

    navigator.clipboard.writeText(markdown);
    alert('Comparison report copied to clipboard!');
  };

  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <h2 className="empty-state-title">Comparison Tool</h2>
          <p>Select a project to compare test runs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Comparison Tool</h1>
        <p className="page-description">Compare test results between runs to find regressions</p>
      </header>

      {/* Create Snapshot */}
      <div className="card">
        <h3 className="card-title">Create Snapshot</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
          Save current coverage results as a snapshot to compare later.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Snapshot name (e.g., v1.2.0, Sprint 5, Pre-release)"
            style={{
              flex: 1,
              padding: '10px 14px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '1rem',
            }}
          />
          <button
            className="btn btn-primary"
            onClick={createSnapshot}
            disabled={!snapshotName.trim()}
          >
            Save Snapshot
          </button>
        </div>
      </div>

      {/* Saved Snapshots */}
      {snapshots.length > 0 && (
        <div className="card">
          <h3 className="card-title">Saved Snapshots ({snapshots.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {[...snapshots].reverse().map(snapshot => (
              <div
                key={snapshot.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{snapshot.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {new Date(snapshot.timestamp).toLocaleString()} •
                    <span style={{ color: '#4ade80' }}> {snapshot.stats.passed} passed</span>,
                    <span style={{ color: '#ef4444' }}> {snapshot.stats.failed} failed</span>,
                    <span style={{ color: '#fbbf24' }}> {snapshot.stats.blocked} blocked</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteSnapshot(snapshot.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compare */}
      {snapshots.length >= 2 && (
        <div className="card">
          <h3 className="card-title">Compare Snapshots</h3>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'center' }}>
            <select
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            >
              <option value="">Select baseline...</option>
              {snapshots.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>vs</span>
            <select
              value={currentId}
              onChange={(e) => setCurrentId(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
              }}
            >
              <option value="">Select current...</option>
              {snapshots.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={runComparison}
              disabled={!baselineId || !currentId || baselineId === currentId}
            >
              Compare
            </button>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Comparison Results</h3>
            <button className="btn btn-secondary" onClick={exportComparison} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
              Export Report
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            marginTop: '16px',
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#ef4444' }}>{comparison.regressions.length}</div>
              <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>Regressions</div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(74, 222, 128, 0.1)',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid rgba(74, 222, 128, 0.3)',
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#4ade80' }}>{comparison.improvements.length}</div>
              <div style={{ fontSize: '0.85rem', color: '#4ade80' }}>Improvements</div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(96, 165, 250, 0.1)',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid rgba(96, 165, 250, 0.3)',
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: '#60a5fa' }}>{comparison.newTests.length}</div>
              <div style={{ fontSize: '0.85rem', color: '#60a5fa' }}>Newly Tested</div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{comparison.unchanged.length}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Unchanged</div>
            </div>
          </div>

          {/* Regressions Detail */}
          {comparison.regressions.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: '#ef4444', marginBottom: '12px' }}>Regressions (tests that started failing)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {comparison.regressions.map(id => {
                  const tc = getTestCase(id);
                  const baseline = snapshots.find(s => s.id === baselineId);
                  const current = snapshots.find(s => s.id === currentId);
                  return (
                    <div
                      key={id}
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #ef4444',
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{id}: {tc?.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span style={{ color: getStatusColor(baseline?.statuses[id]?.status || 'pending') }}>
                          {baseline?.statuses[id]?.status || 'pending'}
                        </span>
                        {' → '}
                        <span style={{ color: getStatusColor(current?.statuses[id]?.status || 'pending') }}>
                          {current?.statuses[id]?.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Improvements Detail */}
          {comparison.improvements.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ color: '#4ade80', marginBottom: '12px' }}>Improvements (tests that started passing)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {comparison.improvements.map(id => {
                  const tc = getTestCase(id);
                  const baseline = snapshots.find(s => s.id === baselineId);
                  const current = snapshots.find(s => s.id === currentId);
                  return (
                    <div
                      key={id}
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(74, 222, 128, 0.1)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #4ade80',
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{id}: {tc?.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span style={{ color: getStatusColor(baseline?.statuses[id]?.status || 'pending') }}>
                          {baseline?.statuses[id]?.status || 'pending'}
                        </span>
                        {' → '}
                        <span style={{ color: getStatusColor(current?.statuses[id]?.status || 'pending') }}>
                          {current?.statuses[id]?.status || 'pending'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {snapshots.length < 2 && (
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            {snapshots.length === 0
              ? 'Create at least 2 snapshots from Coverage Tracker to compare test runs.'
              : 'Create one more snapshot to start comparing test runs.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default ComparisonTool;
