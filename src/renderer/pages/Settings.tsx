import React, { useState, useEffect } from 'react';
import { getApiKey, setApiKey, hasApiKey } from '../services/claude';

function Settings() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(hasApiKey());
    const key = getApiKey();
    if (key) {
      // Show masked key
      setApiKeyInput('sk-ant-••••••••••••••••');
    }
  }, []);

  const handleSaveKey = () => {
    if (apiKeyInput && !apiKeyInput.includes('••••')) {
      setApiKey(apiKeyInput);
      setHasKey(true);
      setSaved(true);
      setApiKeyInput('sk-ant-••••••••••••••••');
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('claude_api_key');
    setApiKeyInput('');
    setHasKey(false);
  };

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
            API Key {hasKey && <span style={{ color: 'var(--success)' }}>✓ Configured</span>}
          </label>
          <input
            type="password"
            placeholder="sk-ant-api03-..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onFocus={() => {
              if (apiKeyInput.includes('••••')) {
                setApiKeyInput('');
              }
            }}
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
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={handleSaveKey}>
              {saved ? '✓ Saved!' : 'Save Key'}
            </button>
            {hasKey && (
              <button className="btn btn-secondary" onClick={handleClearKey}>
                Clear Key
              </button>
            )}
          </div>
          <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Get your API key from{' '}
            <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
              console.anthropic.com
            </a>
          </p>
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
