import React from 'react';

interface Props { project: string | null; }

function RiskRadar({ project }: Props) {
  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h2 className="empty-state-title">Risk Radar</h2>
          <p>Select a project to identify high-risk areas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Risk Radar</h1>
        <p className="page-description">Flag high-priority and high-risk areas for focused testing</p>
      </header>
      <div className="card">
        <h3 className="card-title">Risk Analysis</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Run Test Mapper first to analyze risks...</p>
      </div>
    </div>
  );
}

export default RiskRadar;
