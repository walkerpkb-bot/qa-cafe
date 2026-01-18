import React from 'react';

interface Props { project: string | null; }

function CoverageTracker({ project }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Coverage Tracker</h1>
        <p className="page-description">Track what you've tested and what's remaining</p>
      </header>
      <div className="card">
        <h3 className="card-title">Test Coverage</h3>
        <div style={{
          height: '24px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginTop: '16px'
        }}>
          <div style={{
            width: '0%',
            height: '100%',
            backgroundColor: 'var(--success)',
            borderRadius: '12px'
          }} />
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>0 / 0 scenarios tested</p>
      </div>
      <div className="card">
        <h3 className="card-title">Remaining</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Generate test cases first...</p>
      </div>
    </div>
  );
}

export default CoverageTracker;
