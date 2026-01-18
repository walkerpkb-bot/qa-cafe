import React from 'react';

interface Props { project: string | null; }

function RegressionRunner({ project }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Regression Runner</h1>
        <p className="page-description">Guided manual retesting of previously broken paths</p>
      </header>
      <div className="card">
        <h3 className="card-title">Fixes to Verify</h3>
        <p style={{ color: 'var(--text-secondary)' }}>No fixed bugs pending verification...</p>
      </div>
      <div className="card">
        <h3 className="card-title">Regression Watch</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Areas previously broken that should be re-checked...</p>
      </div>
    </div>
  );
}

export default RegressionRunner;
