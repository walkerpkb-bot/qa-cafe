import React from 'react';

interface Props { project: string | null; }

function QuickReference({ project }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Quick Reference</h1>
        <p className="page-description">Pull up context on demand while testing</p>
      </header>
      <div className="card">
        <input
          type="text"
          placeholder="Ask about the codebase..."
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '1rem'
          }}
        />
      </div>
      <div className="card">
        <h3 className="card-title">Results</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Ask a question to search docs and code...</p>
      </div>
    </div>
  );
}

export default QuickReference;
