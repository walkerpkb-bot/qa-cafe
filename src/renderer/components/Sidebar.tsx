import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  currentProject: string | null;
  onProjectChange: (project: string | null) => void;
}

const tools = {
  'Pre-Test': [
    { path: '/test-mapper', name: 'Test Mapper', icon: '🗺️' },
    { path: '/spec-interrogator', name: 'Spec Interrogator', icon: '📋' },
    { path: '/test-case-generator', name: 'Test Case Gen', icon: '📝' },
    { path: '/risk-radar', name: 'Risk Radar', icon: '🎯' },
  ],
  'During Test': [
    { path: '/session-logger', name: 'Session Logger', icon: '📹' },
    { path: '/quick-reference', name: 'Quick Reference', icon: '🔍' },
    { path: '/coverage-tracker', name: 'Coverage Tracker', icon: '📊' },
    { path: '/bug-writer', name: 'Bug Writer', icon: '🐛' },
  ],
  'Reporting': [
    { path: '/comparison-tool', name: 'Comparison Tool', icon: '⚖️' },
    { path: '/reproduce-helper', name: 'Reproduce Helper', icon: '🔄' },
    { path: '/summary-generator', name: 'Summary Generator', icon: '📄' },
    { path: '/regression-runner', name: 'Regression Runner', icon: '🔁' },
  ],
};

function Sidebar({ currentProject, onProjectChange }: SidebarProps) {
  const handleSelectProject = async () => {
    const path = await window.electronAPI.selectDirectory();
    if (path) {
      onProjectChange(path);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">QA Cafe</h1>
      </div>

      <div className="project-selector">
        <button onClick={handleSelectProject} className="project-button">
          {currentProject ? (
            <>
              <span className="project-icon">📁</span>
              <span className="project-name">{currentProject.split('/').pop()}</span>
            </>
          ) : (
            <>
              <span className="project-icon">➕</span>
              <span className="project-name">Select Project</span>
            </>
          )}
        </button>
      </div>

      <nav className="nav">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🏠</span>
          Dashboard
        </NavLink>

        {Object.entries(tools).map(([phase, items]) => (
          <div key={phase} className="nav-section">
            <h3 className="nav-section-title">{phase}</h3>
            {items.map((tool) => (
              <NavLink
                key={tool.path}
                to={tool.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{tool.icon}</span>
                {tool.name}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⚙️</span>
          Settings
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
