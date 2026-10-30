// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import CaseList from './pages/CaseList';
import CaseDetail from './pages/CaseDetail';
import Dashboard from './pages/Dashboard';
import CorrectionLog from './pages/CorrectionLog';
import RuleCheckerPage from './pages/RuleChecker';
import CustomTroubleshooter from './pages/CustomTroubleshooter';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Sidebar />
          <div className="main">
            <Routes>
              <Route path="/" element={<CaseList />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/correction-log" element={<CorrectionLog />} />
              <Route path="/rule-checker" element={<RuleCheckerPage />} />
              <Route path="/custom-troubleshooter" element={<CustomTroubleshooter />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </div>
        </div>
        <Toast />
        <AuthModal />
      </BrowserRouter>
    </AppProvider>
  );
}
