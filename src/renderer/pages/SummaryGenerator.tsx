import React, { useState, useEffect } from 'react';
import { hasApiKey } from '../services/claude';
import { Link } from 'react-router-dom';

interface Props {
  project: string | null;
}

interface ReportOptions {
  includeCoverage: boolean;
  includeBugs: boolean;
  includeRisks: boolean;
  includeSessions: boolean;
  includeRecommendations: boolean;
  audienceLevel: 'executive' | 'technical' | 'full';
}

interface ProjectData {
  testMapper: { summary: string; flows: unknown[]; issues: unknown[]; stateAssumptions: unknown[] } | null;
  testPlan: { testCases: unknown[]; coverage: string } | null;
  coverage: { statuses: Record<string, { status: string }> } | null;
  bugs: { id: string; title: string; severity: string }[];
  sessions: { id: string; startTime: number; entries: unknown[] }[];
}

function SummaryGenerator({ project }: Props) {
  const [options, setOptions] = useState<ReportOptions>({
    includeCoverage: true,
    includeBugs: true,
    includeRisks: true,
    includeSessions: false,
    includeRecommendations: true,
    audienceLevel: 'executive',
  });
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [report, setReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load all project data
  useEffect(() => {
    if (project) {
      const testMapper = localStorage.getItem(`qa-cafe-testmapper-${project}`);
      const testPlan = localStorage.getItem(`qa-cafe-testplan-${project}`);
      const coverage = localStorage.getItem(`qa-cafe-coverage-${project}`);
      const bugs = localStorage.getItem(`qa-cafe-bugs-${project}`);
      const sessions = localStorage.getItem(`qa-cafe-sessions-${project}`);

      setProjectData({
        testMapper: testMapper ? JSON.parse(testMapper).result : null,
        testPlan: testPlan ? JSON.parse(testPlan) : null,
        coverage: coverage ? JSON.parse(coverage) : null,
        bugs: bugs ? JSON.parse(bugs) : [],
        sessions: sessions ? JSON.parse(sessions) : [],
      });
    }
  }, [project]);

  const hasData = projectData && (
    projectData.testMapper ||
    projectData.testPlan ||
    projectData.coverage ||
    projectData.bugs.length > 0 ||
    projectData.sessions.length > 0
  );

  const calculateStats = () => {
    if (!projectData) return null;

    const testCases = projectData.testPlan?.testCases || [];
    const statuses = projectData.coverage?.statuses || {};

    const total = testCases.length;
    const passed = testCases.filter((tc: { id: string }) => statuses[tc.id]?.status === 'passed').length;
    const failed = testCases.filter((tc: { id: string }) => statuses[tc.id]?.status === 'failed').length;
    const blocked = testCases.filter((tc: { id: string }) => statuses[tc.id]?.status === 'blocked').length;
    const executed = passed + failed + blocked + testCases.filter((tc: { id: string }) => statuses[tc.id]?.status === 'skipped').length;

    const bugsBySeverity = {
      critical: projectData.bugs.filter(b => b.severity === 'critical').length,
      high: projectData.bugs.filter(b => b.severity === 'high').length,
      medium: projectData.bugs.filter(b => b.severity === 'medium').length,
      low: projectData.bugs.filter(b => b.severity === 'low').length,
    };

    return {
      total,
      passed,
      failed,
      blocked,
      executed,
      passRate: executed > 0 ? Math.round((passed / executed) * 100) : 0,
      progress: total > 0 ? Math.round((executed / total) * 100) : 0,
      totalBugs: projectData.bugs.length,
      bugsBySeverity,
      issues: projectData.testMapper?.issues?.length || 0,
      sessions: projectData.sessions.length,
    };
  };

  const generateReport = async () => {
    if (!project || !hasApiKey() || !projectData) return;

    setLoading(true);
    setError(null);

    try {
      const stats = calculateStats();

      // Build context for Claude
      let context = `Generate a QA summary report for the project.

## Audience Level: ${options.audienceLevel}
${options.audienceLevel === 'executive' ? 'Keep it brief, focus on business impact and risks. Use bullet points.' : ''}
${options.audienceLevel === 'technical' ? 'Include technical details about issues found.' : ''}
${options.audienceLevel === 'full' ? 'Comprehensive report with all details.' : ''}

## Project Data:
`;

      if (options.includeCoverage && stats) {
        context += `
### Test Coverage
- Total test cases: ${stats.total}
- Executed: ${stats.executed} (${stats.progress}%)
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Blocked: ${stats.blocked}
- Pass rate: ${stats.passRate}%
`;
      }

      if (options.includeBugs && projectData.bugs.length > 0) {
        context += `
### Bugs Found (${projectData.bugs.length} total)
- Critical: ${stats?.bugsBySeverity.critical || 0}
- High: ${stats?.bugsBySeverity.high || 0}
- Medium: ${stats?.bugsBySeverity.medium || 0}
- Low: ${stats?.bugsBySeverity.low || 0}

Bug details:
${projectData.bugs.map(b => `- [${b.severity.toUpperCase()}] ${b.title}`).join('\n')}
`;
      }

      if (options.includeRisks && projectData.testMapper) {
        context += `
### Code Analysis Findings
- ${projectData.testMapper.issues?.length || 0} potential issues identified
- ${projectData.testMapper.stateAssumptions?.length || 0} state assumptions found
- ${projectData.testMapper.flows?.length || 0} user flows mapped

Summary: ${projectData.testMapper.summary}
`;
      }

      if (options.includeSessions && projectData.sessions.length > 0) {
        const completedSessions = projectData.sessions.filter((s: { endTime?: number }) => s.endTime);
        context += `
### Testing Sessions
- ${completedSessions.length} completed test sessions
- Total entries recorded: ${projectData.sessions.reduce((acc, s) => acc + s.entries.length, 0)}
`;
      }

      context += `
${options.includeRecommendations ? '\nInclude a "Recommendations" section with actionable next steps based on findings.' : ''}

Generate a well-structured markdown report. Use headers, bullet points, and tables where appropriate.`;

      const response = await window.electronAPI.callClaude({
        apiKey: localStorage.getItem('claude_api_key') || '',
        messages: [{ role: 'user', content: context }],
        system: 'You are a QA lead creating professional test reports. Write clear, actionable reports appropriate for the audience level specified.',
        maxTokens: 4096,
      });

      setReport(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = calculateStats();

  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h2 className="empty-state-title">Summary Generator</h2>
          <p>Select a project to generate reports.</p>
        </div>
      </div>
    );
  }

  if (!hasApiKey()) {
    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">Summary Generator</h1>
          <p className="page-description">Generate stakeholder-ready reports</p>
        </header>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔑</div>
            <h2 className="empty-state-title">API Key Required</h2>
            <p>Configure your Claude API key to generate reports.</p>
            <Link to="/settings" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Go to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">Summary Generator</h1>
          <p className="page-description">Generate stakeholder-ready reports</p>
        </header>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h2 className="empty-state-title">No Data Available</h2>
            <p>Run some tests and gather data first.</p>
            <Link to="/test-mapper" className="btn btn-primary" style={{ marginTop: '16px' }}>
              Start with Test Mapper
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Summary Generator</h1>
        <p className="page-description">Generate stakeholder-ready reports from your QA data</p>
      </header>

      {/* Data Overview */}
      <div className="card">
        <h3 className="card-title">Available Data</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginTop: '16px',
        }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats?.total || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Test Cases</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#4ade80' }}>{stats?.passRate || 0}%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pass Rate</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#ef4444' }}>{stats?.totalBugs || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Bugs</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fbbf24' }}>{stats?.issues || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Code Issues</div>
          </div>
          <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats?.sessions || 0}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sessions</div>
          </div>
        </div>
      </div>

      {/* Report Options */}
      <div className="card">
        <h3 className="card-title">Report Options</h3>

        <div style={{ marginTop: '16px' }}>
          <strong style={{ fontSize: '0.9rem' }}>Audience Level</strong>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {(['executive', 'technical', 'full'] as const).map(level => (
              <button
                key={level}
                onClick={() => setOptions(prev => ({ ...prev, audienceLevel: level }))}
                style={{
                  padding: '8px 16px',
                  backgroundColor: options.audienceLevel === level ? 'var(--accent)' : 'var(--bg-tertiary)',
                  border: 'none',
                  borderRadius: '6px',
                  color: options.audienceLevel === level ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {options.audienceLevel === 'executive' && 'Brief summary focusing on business impact and risks'}
            {options.audienceLevel === 'technical' && 'Detailed report with technical specifics'}
            {options.audienceLevel === 'full' && 'Comprehensive report with all available data'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
          <strong style={{ fontSize: '0.9rem' }}>Include Sections</strong>
          {[
            { key: 'includeCoverage', label: 'Test Coverage Stats', enabled: !!stats?.total },
            { key: 'includeBugs', label: 'Bug Summary', enabled: (stats?.totalBugs || 0) > 0 },
            { key: 'includeRisks', label: 'Risk Assessment', enabled: !!projectData?.testMapper },
            { key: 'includeSessions', label: 'Session Details', enabled: (stats?.sessions || 0) > 0 },
            { key: 'includeRecommendations', label: 'Recommendations', enabled: true },
          ].map(({ key, label, enabled }) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: enabled ? 1 : 0.5,
                cursor: enabled ? 'pointer' : 'not-allowed',
              }}
            >
              <input
                type="checkbox"
                checked={options[key as keyof ReportOptions] as boolean}
                onChange={(e) => enabled && setOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                disabled={!enabled}
                style={{ cursor: enabled ? 'pointer' : 'not-allowed' }}
              />
              {label}
              {!enabled && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(no data)</span>}
            </label>
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={generateReport}
          disabled={loading}
          style={{ marginTop: '20px' }}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
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
            <span>Generating stakeholder report...</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Generated Report */}
      {report && !loading && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ margin: 0 }}>Generated Report</h3>
            <button
              className="btn btn-secondary"
              onClick={copyToClipboard}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              maxHeight: '600px',
              overflow: 'auto',
            }}
          >
            {report}
          </div>
        </div>
      )}
    </div>
  );
}

export default SummaryGenerator;
