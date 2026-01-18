import React from 'react';

interface Props {
  project: string | null;
}

function SpecInterrogator({ project }: Props) {
  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h2 className="empty-state-title">Spec Interrogator</h2>
          <p>Select a project to cross-reference docs with code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Spec Interrogator</h1>
        <p className="page-description">Cross-reference documentation with code to find gaps</p>
      </header>

      <div className="card">
        <h3 className="card-title">Documentation</h3>
        <button className="btn btn-secondary">Import Docs</button>
      </div>

      <div className="card">
        <h3 className="card-title">Gap Analysis</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Import docs and run Test Mapper first...</p>
      </div>
    </div>
  );
}

export default SpecInterrogator;
