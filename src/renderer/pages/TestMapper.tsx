import React, { useState, useEffect } from 'react';
import { analyzeCode, hasApiKey } from '../services/claude';
import { Link } from 'react-router-dom';

// Cache key helper
const getCacheKey = (project: string) => `qa-cafe-testmapper-${project}`;

interface TestMapperProps {
  project: string | null;
}

interface AnalysisResult {
  flows: {
    name: string;
    entryPoint: string;
    description: string;
    steps: string[];
  }[];
  stateAssumptions: {
    location: string;
    assumption: string;
    risk: 'low' | 'medium' | 'high';
  }[];
  issues: {
    type: string;
    location: string;
    description: string;
    severity: 'info' | 'warning' | 'error';
  }[];
  summary: string;
}

const ANALYSIS_PROMPT = `Analyze this codebase and identify:

1. **User Flows**: Main entry points and the paths users take through the application
2. **State Assumptions**: Places where code assumes something exists without checking (user logged in, data loaded, etc.)
3. **Potential Issues**: TODOs, empty error handlers, hardcoded values, missing validations

Respond with this exact JSON structure:
{
  "flows": [
    {
      "name": "Flow name",
      "entryPoint": "file:line or function name",
      "description": "What this flow does",
      "steps": ["Step 1", "Step 2", "..."]
    }
  ],
  "stateAssumptions": [
    {
      "location": "file:line",
      "assumption": "What is assumed",
      "risk": "low|medium|high"
    }
  ],
  "issues": [
    {
      "type": "TODO|empty-handler|hardcoded|validation|other",
      "location": "file:line",
      "description": "Description of the issue",
      "severity": "info|warning|error"
    }
  ],
  "summary": "Brief overall summary of the codebase quality and testability"
}

Be thorough but concise. Focus on things that would matter for QA testing.`;

function TestMapper({ project }: TestMapperProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [filesScanned, setFilesScanned] = useState(0);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  // Load cached results when project changes
  useEffect(() => {
    if (project) {
      try {
        const cached = localStorage.getItem(getCacheKey(project));
        if (cached) {
          const { result: cachedResult, filesScanned: cachedFiles, timestamp } = JSON.parse(cached);
          setResult(cachedResult);
          setFilesScanned(cachedFiles);
          setCachedAt(new Date(timestamp).toLocaleString());
        } else {
          setResult(null);
          setFilesScanned(0);
          setCachedAt(null);
        }
      } catch {
        // Invalid cache, ignore
      }
    }
  }, [project]);

  // Save results to cache
  const saveToCache = (analysisResult: AnalysisResult, files: number) => {
    if (project) {
      const cacheData = {
        result: analysisResult,
        filesScanned: files,
        timestamp: Date.now(),
      };
      localStorage.setItem(getCacheKey(project), JSON.stringify(cacheData));
      setCachedAt(new Date().toLocaleString());
    }
  };

  const clearCache = () => {
    if (project) {
      localStorage.removeItem(getCacheKey(project));
      setResult(null);
      setFilesScanned(0);
      setCachedAt(null);
    }
  };

  const runAnalysis = async () => {
    if (!project) return;

    if (!hasApiKey()) {
      setError('No API key configured. Go to Settings to add your Claude API key.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Read project files
      const files = await window.electronAPI.readProjectFiles(project, 30);
      setFilesScanned(files.length);

      if (files.length === 0) {
        setError('No code files found in this directory.');
        setLoading(false);
        return;
      }

      // Call Claude to analyze
      const response = await analyzeCode(files, ANALYSIS_PROMPT);

      // Parse JSON response
      try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setResult(parsed);
          saveToCache(parsed, files.length);
        } else {
          setError('Could not parse analysis result. Raw response saved.');
          console.log('Raw response:', response);
        }
      } catch (parseError) {
        setError('Failed to parse JSON response. Check console for raw output.');
        console.log('Raw response:', response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🗺️</div>
          <h2 className="empty-state-title">Test Mapper</h2>
          <p>Select a project to analyze code paths.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Test Mapper</h1>
        <p className="page-description">Analyze code paths, entry points, and identify potential issues</p>
      </header>

      <div className="card">
        <h3 className="card-title">Project</h3>
        <p style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{project}</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : result ? 'Re-run Analysis' : 'Run Analysis'}
          </button>
          {result && (
            <button
              className="btn btn-secondary"
              onClick={clearCache}
              disabled={loading}
            >
              Clear Cache
            </button>
          )}
          {filesScanned > 0 && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {filesScanned} files scanned
              {cachedAt && <span> • Cached {cachedAt}</span>}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--accent)', backgroundColor: 'rgba(233, 69, 96, 0.1)' }}>
          <p style={{ color: 'var(--accent)' }}>{error}</p>
          {error.includes('API key') && (
            <Link to="/settings" className="btn btn-secondary" style={{ marginTop: '12px', display: 'inline-block' }}>
              Go to Settings
            </Link>
          )}
        </div>
      )}

      {loading && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="spinner" style={{
              width: '24px',
              height: '24px',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span>Analyzing codebase with Claude...</span>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {result && (
        <>
          {/* Summary */}
          <div className="card">
            <h3 className="card-title">Summary</h3>
            <p>{result.summary}</p>
          </div>

          {/* User Flows */}
          <div className="card">
            <h3 className="card-title">User Flows ({result.flows.length})</h3>
            {result.flows.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No distinct flows identified.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {result.flows.map((flow, i) => (
                  <div key={i} style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{flow.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Entry: <code>{flow.entryPoint}</code>
                    </div>
                    <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{flow.description}</p>
                    {flow.steps.length > 0 && (
                      <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                        {flow.steps.map((step, j) => (
                          <li key={j} style={{ marginBottom: '4px' }}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* State Assumptions */}
          <div className="card">
            <h3 className="card-title">State Assumptions ({result.stateAssumptions.length})</h3>
            {result.stateAssumptions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No risky state assumptions found.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 12px' }}>Location</th>
                    <th style={{ padding: '8px 12px' }}>Assumption</th>
                    <th style={{ padding: '8px 12px' }}>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stateAssumptions.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {item.location}
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: '0.9rem' }}>{item.assumption}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          backgroundColor: item.risk === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                                          item.risk === 'medium' ? 'rgba(251, 191, 36, 0.2)' :
                                          'rgba(74, 222, 128, 0.2)',
                          color: item.risk === 'high' ? '#ef4444' :
                                 item.risk === 'medium' ? '#fbbf24' : '#4ade80',
                        }}>
                          {item.risk}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Issues */}
          <div className="card">
            <h3 className="card-title">Issues Found ({result.issues.length})</h3>
            {result.issues.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No issues flagged.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.issues.map((issue, i) => (
                  <div key={i} style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${
                      issue.severity === 'error' ? '#ef4444' :
                      issue.severity === 'warning' ? '#fbbf24' : '#60a5fa'
                    }`,
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        backgroundColor: 'var(--bg-secondary)',
                        textTransform: 'uppercase',
                      }}>
                        {issue.type}
                      </span>
                      <code style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {issue.location}
                      </code>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{issue.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default TestMapper;
