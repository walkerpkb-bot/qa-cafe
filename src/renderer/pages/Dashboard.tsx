import React from 'react';

interface DashboardProps {
  project: string | null;
}

function Dashboard({ project }: DashboardProps) {
  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">☕</div>
          <h2 className="empty-state-title">Welcome to QA Cafe</h2>
          <p>Select a project from the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Overview of your QA session</p>
      </header>

      <div className="card">
        <h3 className="card-title">Current Project</h3>
        <p>{project}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div className="card">
          <h3 className="card-title">Phase 1: Pre-Test</h3>
          <p style={{ color: 'var(--text-secondary)' }}>4 tools ready</p>
        </div>
        <div className="card">
          <h3 className="card-title">Phase 2: During Test</h3>
          <p style={{ color: 'var(--text-secondary)' }}>4 tools ready</p>
        </div>
        <div className="card">
          <h3 className="card-title">Phase 3: Reporting</h3>
          <p style={{ color: 'var(--text-secondary)' }}>4 tools ready</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
