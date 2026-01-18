import React from 'react';

interface Props { project: string | null; }

function SummaryGenerator({ project }: Props) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Summary Generator</h1>
        <p className="page-description">Generate stakeholder-ready reports from your QA session</p>
      </header>
      <div className="card">
        <h3 className="card-title">Report Options</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" defaultChecked /> Include coverage stats
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" defaultChecked /> Include bug summary
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" defaultChecked /> Include risk assessment
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" /> Include detailed findings
          </label>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '16px' }}>Generate Report</button>
      </div>
    </div>
  );
}

export default SummaryGenerator;
