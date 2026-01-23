import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TestMapper from './pages/TestMapper';
import TestCaseGenerator from './pages/TestCaseGenerator';
import SessionLogger from './pages/SessionLogger';
import CoverageTracker from './pages/CoverageTracker';
import BugWriter from './pages/BugWriter';
import ComparisonTool from './pages/ComparisonTool';
import ReproduceHelper from './pages/ReproduceHelper';
import SummaryGenerator from './pages/SummaryGenerator';
import RegressionRunner from './pages/RegressionRunner';
import Settings from './pages/Settings';
import QAAssistant from './pages/QAAssistant';

function App() {
  const [currentProject, setCurrentProject] = useState<string | null>(null);

  return (
    <div className="app">
      <Sidebar currentProject={currentProject} onProjectChange={setCurrentProject} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard project={currentProject} />} />
          <Route path="/qa-assistant" element={<QAAssistant project={currentProject} />} />

          {/* Phase 1: Pre-Test */}
          <Route path="/test-mapper" element={<TestMapper project={currentProject} />} />
          <Route path="/test-case-generator" element={<TestCaseGenerator project={currentProject} />} />

          {/* Phase 2: During Test */}
          <Route path="/session-logger" element={<SessionLogger project={currentProject} />} />
          <Route path="/coverage-tracker" element={<CoverageTracker project={currentProject} />} />
          <Route path="/bug-writer" element={<BugWriter project={currentProject} />} />

          {/* Phase 3: Reporting/Regression */}
          <Route path="/comparison-tool" element={<ComparisonTool project={currentProject} />} />
          <Route path="/reproduce-helper" element={<ReproduceHelper project={currentProject} />} />
          <Route path="/summary-generator" element={<SummaryGenerator project={currentProject} />} />
          <Route path="/regression-runner" element={<RegressionRunner project={currentProject} />} />

          {/* Settings */}
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
