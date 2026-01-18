import React from 'react';

interface Props { project: string | null; }

function TestCaseGenerator({ project }: Props) {
  if (!project) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h2 className="empty-state-title">Test Case Generator</h2>
          <p>Select a project to generate test cases.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Test Case Generator</h1>
        <p className="page-description">Build test plans from code analysis</p>
      </header>
      <div className="card">
        <h3 className="card-title">Generate Test Cases</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Run Test Mapper first to generate test cases...</p>
      </div>
    </div>
  );
}

export default TestCaseGenerator;
