import React from 'react';

interface Props { project: string | null; }

function ComparisonTool({ project }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Comparison Tool</h1>
        <p className="page-description">Compare changes between builds or sessions</p>
      </header>
      <div className="card">
        <h3 className="card-title">Select Versions to Compare</h3>
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
          <select className="btn btn-secondary" style={{ flex: 1 }}>
            <option>Select baseline...</option>
          </select>
          <span style={{ color: 'var(--text-secondary)', alignSelf: 'center' }}>vs</span>
          <select className="btn btn-secondary" style={{ flex: 1 }}>
            <option>Select current...</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '16px' }}>Compare</button>
      </div>
    </div>
  );
}

export default ComparisonTool;
