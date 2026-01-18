import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TestMapper from './pages/TestMapper';
import SpecInterrogator from './pages/SpecInterrogator';
import TestCaseGenerator from './pages/TestCaseGenerator';
import RiskRadar from './pages/RiskRadar';
import SessionLogger from './pages/SessionLogger';
import QuickReference from './pages/QuickReference';
import CoverageTracker from './pages/CoverageTracker';
import BugWriter from './pages/BugWriter';
import ComparisonTool from './pages/ComparisonTool';
import ReproduceHelper from './pages/ReproduceHelper';
import SummaryGenerator from './pages/SummaryGenerator';
import RegressionRunner from './pages/RegressionRunner';
import Settings from './pages/Settings';

function App() {
  const [currentProject, setCurrentProject] = useState<string | null>(null);

  return (
    <div className="app">
      <Sidebar currentProject={currentProject} onProjectChange={setCurrentProject} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard project={currentProject} />} />

          {/* Phase 1: Pre-Test */}
          <Route path="/test-mapper" element={<TestMapper project={currentProject} />} />
          <Route path="/spec-interrogator" element={<SpecInterrogator project={currentProject} />} />
          <Route path="/test-case-generator" element={<TestCaseGenerator project={currentProject} />} />
          <Route path="/risk-radar" element={<RiskRadar project={currentProject} />} />

          {/* Phase 2: During Test */}
          <Route path="/session-logger" element={<SessionLogger project={currentProject} />} />
          <Route path="/quick-reference" element={<QuickReference project={currentProject} />} />
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
