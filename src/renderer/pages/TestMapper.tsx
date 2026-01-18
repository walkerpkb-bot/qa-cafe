import React from 'react';

interface TestMapperProps {
  project: string | null;
}

function TestMapper({ project }: TestMapperProps) {
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
        <p className="page-description">Analyze code paths, entry points, and flow tracing</p>
      </header>

      <div className="card">
        <h3 className="card-title">Project</h3>
        <p>{project}</p>
        <button className="btn btn-primary" style={{ marginTop: '16px' }}>
          Run Analysis
        </button>
      </div>

      <div className="card">
        <h3 className="card-title">Output</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Run analysis to see results...</p>
      </div>
    </div>
  );
}

export default TestMapper;
