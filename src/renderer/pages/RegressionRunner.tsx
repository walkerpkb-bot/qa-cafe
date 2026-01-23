import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  project: string | null;
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: string[];
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface Bug {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  stepsToReproduce: string;
}

interface RegressionItem {
  id: string;
  type: 'test' | 'bug';
  referenceId: string;
  name: string;
  priority: string;
  inSuite: boolean;
}

interface RegressionRun {
  id: string;
  timestamp: number;
  results: Record<string, 'passed' | 'failed' | 'skipped'>;
  notes: Record<string, string>;
}

const getTestPlanKey = (project: string) => `qa-cafe-testplan-${project}`;
const getCoverageKey = (project: string) => `qa-cafe-coverage-${project}`;
const getBugsKey = (project: string) => `qa-cafe-bugs-${project}`;
const getRegressionKey = (project: string) => `qa-cafe-regression-${project}`;

function RegressionRunner({ project }: Props) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [regressionItems, setRegressionItems] = useState<RegressionItem[]>([]);
  const [runs, setRuns] = useState<RegressionRun[]>([]);
  const [activeRun, setActiveRun] = useState<RegressionRun | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  // Load data
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
      }

      // Load coverage to find failed tests
      const coverageData = localStorage.getItem(getCoverageKey(project));
      let failedTestIds: string[] = [];
      if (coverageData) {
        try {
          const coverage = JSON.parse(coverageData);
          failedTestIds = Object.entries(coverage.statuses || {})
            .filter(([_, v]) => (v as { status: string }).status === 'failed')
            .map(([k]) => k);
        } catch {
          // ignore
        }
      }

      // Load bugs
      const bugsData = localStorage.getItem(getBugsKey(project));
      let loadedBugs: Bug[] = [];
      if (bugsData) {
        try {
          loadedBugs = JSON.parse(bugsData);
          setBugs(loadedBugs);
        } catch {
          setBugs([]);
        }
      }

      // Load saved regression suite
      const regressionData = localStorage.getItem(getRegressionKey(project));
      if (regressionData) {
        try {
          const saved = JSON.parse(regressionData);
          setRegressionItems(saved.items || []);
          setRuns(saved.runs || []);
        } catch {
          // Build initial items from failed tests and bugs
          buildInitialItems(testPlanData ? JSON.parse(testPlanData).testCases : [], failedTestIds, loadedBugs);
        }
      } else {
        buildInitialItems(testPlanData ? JSON.parse(testPlanData).testCases : [], failedTestIds, loadedBugs);
      }
    }
  }, [project]);

  const buildInitialItems = (tests: TestCase[], failedIds: string[], bugsList: Bug[]) => {
    const items: RegressionItem[] = [];

    // Add failed tests
    tests.filter(t => failedIds.includes(t.id)).forEach(t => {
      items.push({
        id: `test-${t.id}`,
        type: 'test',
        referenceId: t.id,
        name: t.name,
        priority: t.priority,
        inSuite: true,
      });
    });

    // Add bugs
    bugsList.forEach(b => {
      items.push({
        id: `bug-${b.id}`,
        type: 'bug',
        referenceId: b.id,
        name: b.title,
        priority: b.severity,
        inSuite: b.severity === 'critical' || b.severity === 'high',
      });
    });

    setRegressionItems(items);
  };

  // Save regression data
  useEffect(() => {
    if (project && (regressionItems.length > 0 || runs.length > 0)) {
      localStorage.setItem(getRegressionKey(project), JSON.stringify({
        items: regressionItems,
        runs,
      }));
    }
  }, [regressionItems, runs, project]);

  const toggleSuite = (id: string) => {
    setRegressionItems(prev => prev.map(item =>
      item.id === id ? { ...item, inSuite: !item.inSuite } : item
    ));
  };

  const suiteItems = regressionItems.filter(i => i.inSuite);

  const startRun = () => {
    const newRun: RegressionRun = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      results: {},
      notes: {},
    };
    setActiveRun(newRun);
    setCurrentIndex(0);
  };

  const recordResult = (result: 'passed' | 'failed' | 'skipped', note?: string) => {
    if (!activeRun) return;

    const currentItem = suiteItems[currentIndex];
    const updated = {
      ...activeRun,
      results: { ...activeRun.results, [currentItem.id]: result },
      notes: note ? { ...activeRun.notes, [currentItem.id]: note } : activeRun.notes,
    };
    setActiveRun(updated);

    if (currentIndex < suiteItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Run complete
      setRuns(prev => [...prev, updated]);
      setActiveRun(null);
    }
  };

  const cancelRun = () => {
    if (confirm('Cancel this regression run? Progress will be lost.')) {
      setActiveRun(null);
      setCurrentIndex(0);
    }
  };

  const getTestCase = (id: string) => testCases.find(t => t.id === id);
  const getBug = (id: string) => bugs.find(b => b.id === id);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };
      case 'high': return { bg: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24' };
      case 'medium': return { bg: 'rgba(96, 165, 250, 0.2)', color: '#60a5fa' };
      case 'low': return { bg: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' };
      default: return { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
    }
  };

  const currentItem = activeRun ? suiteItems[currentIndex] : null;

  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🔄</div>
          <h2 className="empty-state-title">Regression Runner</h2>
          <p>Select a project to run regression tests.</p>
        </div>
      </div>
    );
  }

  if (regressionItems.length === 0) {
    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">Regression Runner</h1>
          <p className="page-description">Guided manual retesting</p>
        </header>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <h2 className="empty-state-title">Nothing to Retest</h2>
            <p>No failed tests or bugs to verify. Run tests and log bugs first.</p>
            <Link to="/coverage-tracker" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Go to Coverage Tracker
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active run mode
  if (activeRun && currentItem) {
    const test = currentItem.type === 'test' ? getTestCase(currentItem.referenceId) : null;
    const bug = currentItem.type === 'bug' ? getBug(currentItem.referenceId) : null;
    const priorityStyle = getPriorityColor(currentItem.priority);

    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">Regression Run</h1>
          <p className="page-description">
            Item {currentIndex + 1} of {suiteItems.length}
          </p>
        </header>

        {/* Progress */}
        <div className="card">
          <div style={{
            height: '8px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${((currentIndex) / suiteItems.length) * 100}%`,
              height: '100%',
              backgroundColor: '#4ade80',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {Object.values(activeRun.results).filter(r => r === 'passed').length} passed,
              {' '}{Object.values(activeRun.results).filter(r => r === 'failed').length} failed
            </span>
            <button
              onClick={cancelRun}
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
              Cancel Run
            </button>
          </div>
        </div>

        {/* Current Item */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              backgroundColor: currentItem.type === 'test' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: currentItem.type === 'test' ? '#60a5fa' : '#ef4444',
            }}>
              {currentItem.type === 'test' ? 'Test Case' : 'Bug Verification'}
            </span>
            <span style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              backgroundColor: priorityStyle.bg,
              color: priorityStyle.color,
            }}>
              {currentItem.priority}
            </span>
          </div>

          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>{currentItem.name}</h3>

          {test && (
            <>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{test.description}</p>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '0.9rem' }}>Steps:</strong>
                <ol style={{ margin: '8px 0 0 20px', fontSize: '0.9rem' }}>
                  {test.steps.map((s, i) => (
                    <li key={i} style={{ marginBottom: '6px' }}>{s}</li>
                  ))}
                </ol>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                borderRadius: '8px',
                borderLeft: '3px solid #4ade80',
              }}>
                <strong style={{ fontSize: '0.85rem', color: '#4ade80' }}>Expected Result:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>{test.expectedResult}</p>
              </div>
            </>
          )}

          {bug && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ fontSize: '0.9rem' }}>Steps to Reproduce:</strong>
                <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {bug.stepsToReproduce || 'No steps recorded'}
                </p>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                borderRadius: '8px',
                borderLeft: '3px solid #4ade80',
              }}>
                <strong style={{ fontSize: '0.85rem', color: '#4ade80' }}>Verify:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                  This bug should now be fixed. Confirm the issue no longer occurs.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Result Buttons */}
        <div className="card">
          <h3 className="card-title">Record Result</h3>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              className="btn btn-primary"
              onClick={() => recordResult('passed')}
              style={{ flex: 1, backgroundColor: '#4ade80', padding: '16px' }}
            >
              Pass
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const note = prompt('Failure note (optional):');
                recordResult('failed', note || undefined);
              }}
              style={{ flex: 1, backgroundColor: '#ef4444', padding: '16px' }}
            >
              Fail
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => recordResult('skipped')}
              style={{ flex: 1, padding: '16px' }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal view
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Regression Runner</h1>
        <p className="page-description">Guided manual retesting of failed tests and bugs</p>
      </header>

      {/* Suite Overview */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ margin: 0 }}>Regression Suite</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowHistory(!showHistory)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
            <button
              className="btn btn-primary"
              onClick={startRun}
              disabled={suiteItems.length === 0}
            >
              Start Run ({suiteItems.length} items)
            </button>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
          Select items to include in your regression suite. These will be verified each run.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          {regressionItems.map(item => {
            const priorityStyle = getPriorityColor(item.priority);
            return (
              <div
                key={item.id}
                onClick={() => toggleSuite(item.id)}
                style={{
                  padding: '12px',
                  backgroundColor: item.inSuite ? 'rgba(96, 165, 250, 0.1)' : 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  borderLeft: item.inSuite ? '3px solid #60a5fa' : '3px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={item.inSuite}
                    onChange={() => {}}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    backgroundColor: item.type === 'test' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: item.type === 'test' ? '#60a5fa' : '#ef4444',
                  }}>
                    {item.type}
                  </span>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  backgroundColor: priorityStyle.bg,
                  color: priorityStyle.color,
                }}>
                  {item.priority}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Run History */}
      {showHistory && runs.length > 0 && (
        <div className="card">
          <h3 className="card-title">Run History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {[...runs].reverse().map(run => {
              const passed = Object.values(run.results).filter(r => r === 'passed').length;
              const failed = Object.values(run.results).filter(r => r === 'failed').length;
              const total = Object.keys(run.results).length;
              const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

              return (
                <div
                  key={run.id}
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {new Date(run.timestamp).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: '#4ade80' }}>{passed} passed</span>,
                        <span style={{ color: '#ef4444' }}> {failed} failed</span>,
                        {' '}{total - passed - failed} skipped
                      </div>
                    </div>
                    <div style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      backgroundColor: passRate >= 80 ? 'rgba(74, 222, 128, 0.2)' :
                        passRate >= 50 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: passRate >= 80 ? '#4ade80' :
                        passRate >= 50 ? '#fbbf24' : '#ef4444',
                      fontWeight: 600,
                    }}>
                      {passRate}%
                    </div>
                  </div>

                  {/* Show failures */}
                  {Object.entries(run.results).filter(([_, r]) => r === 'failed').length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '8px' }}>Failed Items:</div>
                      {Object.entries(run.results)
                        .filter(([_, r]) => r === 'failed')
                        .map(([id]) => {
                          const item = regressionItems.find(i => i.id === id);
                          return (
                            <div key={id} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              • {item?.name}
                              {run.notes[id] && <span style={{ fontStyle: 'italic' }}> - {run.notes[id]}</span>}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {runs.length === 0 && !showHistory && (
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            No regression runs yet. Start a run to verify fixes and track regressions.
          </p>
        </div>
      )}
    </div>
  );
}

export default RegressionRunner;
