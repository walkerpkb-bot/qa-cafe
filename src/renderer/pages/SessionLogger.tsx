import React from 'react';

interface Props { project: string | null; }

function SessionLogger({ project }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Session Logger</h1>
        <p className="page-description">Capture observations mid-test without breaking flow</p>
      </header>
      <div className="card">
        <h3 className="card-title">Quick Capture</h3>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button className="btn btn-primary">🎤 Voice Note</button>
          <button className="btn btn-secondary">⌨️ Text Note</button>
          <button className="btn btn-secondary">📸 Screenshot</button>
        </div>
      </div>
      <div className="card">
        <h3 className="card-title">Session Timeline</h3>
        <p style={{ color: 'var(--text-secondary)' }}>No observations yet...</p>
      </div>
    </div>
  );
}

export default SessionLogger;
