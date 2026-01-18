import React from 'react';

interface Props { project: string | null; }

function BugWriter({ project }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Bug Writer</h1>
        <p className="page-description">Document issues and push to issue trackers</p>
      </header>
      <div className="card">
        <h3 className="card-title">Quick Bug Report</h3>
        <textarea
          placeholder="Describe the bug... (e.g., 'login fails when email has a plus sign')"
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            resize: 'vertical'
          }}
        />
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button className="btn btn-primary">Structure with AI</button>
          <button className="btn btn-secondary">Push to JIRA</button>
          <button className="btn btn-secondary">Push to GitHub</button>
        </div>
      </div>
    </div>
  );
}

export default BugWriter;
