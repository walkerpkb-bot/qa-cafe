import React from 'react';

interface Props { project: string | null; }

function ReproduceHelper({ project }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Reproduce Helper</h1>
        <p className="page-description">Reconstruct bug reproduction steps from session data</p>
      </header>
      <div className="card">
        <h3 className="card-title">Select Bug or Session</h3>
        <p style={{ color: 'var(--text-secondary)' }}>No bugs or sessions recorded yet...</p>
      </div>
      <div className="card">
        <h3 className="card-title">Reproduction Steps</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Select a bug to generate repro steps...</p>
      </div>
    </div>
  );
}

export default ReproduceHelper;
