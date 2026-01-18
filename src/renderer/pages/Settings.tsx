import React from 'react';

function Settings() {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-description">Configure QA Cafe</p>
      </header>

      <div className="card">
        <h3 className="card-title">Claude API</h3>
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            API Key
          </label>
          <input
            type="password"
            placeholder="sk-ant-..."
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
      </div>

      <div className="card">
        <h3 className="card-title">Integrations</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <button className="btn btn-secondary">Connect JIRA</button>
          <button className="btn btn-secondary">Connect GitHub</button>
          <button className="btn btn-secondary">Connect Linear</button>
          <button className="btn btn-secondary">Connect TestRail</button>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Session Logger</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" defaultChecked /> Enable voice capture
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" defaultChecked /> Enable screenshot hotkey
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" defaultChecked /> Enable keyboard shortcuts
          </label>
        </div>
      </div>
    </div>
  );
}

export default Settings;
