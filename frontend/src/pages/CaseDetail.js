// src/pages/CaseDetail.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCase, runDiagnosis } from '../api/client';
import Badge from '../components/Badge';
import DiagnosisPanel from '../components/DiagnosisPanel';
import TopologyMap from '../components/TopologyMap';
import CiscoTerminal from '../components/CiscoTerminal';
import VerificationPanel from '../components/VerificationPanel';
import { useAppContext } from '../context/AppContext';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Terminal,
  Activity
} from 'lucide-react';

export default function CaseDetail() {
  const { id } = useParams();
  const { showToast } = useAppContext();
  const [caseDoc, setCaseDoc] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningDiagnosis, setRunningDiagnosis] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getCase(id)
      .then((data) => {
        setCaseDoc(data.case);
        setDiagnosis(data.diagnosis);
      })
      .catch((err) => {
        showToast(err.response?.data?.detail || 'Failed to load case', 'error');
      })
      .finally(() => setLoading(false));
  }, [id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRunDiagnosis() {
    setRunningDiagnosis(true);
    try {
      const result = await runDiagnosis(id);
      setDiagnosis(result);
      showToast('AI diagnosis generated successfully.');
    } catch (err) {
      showToast(err.response?.data?.detail || err.response?.data?.error || 'AI diagnosis failed - check API key configuration', 'error');
    } finally {
      setRunningDiagnosis(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
        <p>Loading troubleshooting case details...</p>
      </div>
    );
  }

  if (!caseDoc) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3>Case Not Found</h3>
        <p style={{ color: '#94a3b8' }}>The requested network troubleshooting case could not be located.</p>
        <Link to="/" className="btn secondary">&larr; Return to Case Library</Link>
      </div>
    );
  }

  // Determine current active stepper stage
  const currentStep = !diagnosis ? 2 : (diagnosis.status === 'Pending' ? 3 : 4);

  return (
    <div>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px', color: '#94a3b8' }}>
          <ArrowLeft size={14} />
          <span>Back to Case Library</span>
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge value={caseDoc.severity} />
          <span className="badge pending">{caseDoc.conceptTag}</span>
          <span className="badge pending">{caseDoc.osiLayer}</span>
          {diagnosis && <Badge value={diagnosis.status} />}
        </div>
      </div>

      <h1 className="page-title" style={{ fontSize: '24px', marginBottom: 16 }}>
        {caseDoc.title}
      </h1>

      {/* 4-Stage Progressive Workflow Stepper */}
      <div className="workflow-stepper">
        <div className={`step-item ${currentStep >= 1 ? 'completed' : ''}`}>
          <div className="step-number">{currentStep > 1 ? '✓' : '1'}</div>
          <span>1. Symptom & Topology</span>
        </div>
        <div className="step-divider" />

        <div className={`step-item ${currentStep >= 2 ? (currentStep > 2 ? 'completed' : 'active') : ''}`}>
          <div className="step-number">{currentStep > 2 ? '✓' : '2'}</div>
          <span>2. CLI Evidence</span>
        </div>
        <div className="step-divider" />

        <div className={`step-item ${currentStep >= 3 ? (currentStep > 3 ? 'completed' : 'active') : ''}`}>
          <div className="step-number">{currentStep > 3 ? '✓' : '3'}</div>
          <span>3. Dual Diagnosis & Review</span>
        </div>
        <div className="step-divider" />

        <div className={`step-item ${currentStep === 4 ? 'active' : ''}`}>
          <div className="step-number">4</div>
          <span>4. Lab Fix Verification</span>
        </div>
      </div>

      {/* 2-Column Responsive Diagnostic Workbench */}
      <div className="workbench-container">
        {/* Left Column: Context, React Flow Topology, CLI Evidence */}
        <div>
          {/* Step 1: Symptom Observation */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={16} color="#38bdf8" />
                <span>Step 1: Network Symptom & Environment</span>
              </div>
            </div>
            <label>Observed Symptom</label>
            <p style={{
              fontSize: '14.5px',
              color: '#f8fafc',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              margin: '0 0 14px 0'
            }}>
              {caseDoc.symptom}
            </p>
          </div>

          {/* React Flow Interactive Topology Map */}
          <TopologyMap
            topologyNotes={caseDoc.topologyNotes}
            conceptTag={caseDoc.conceptTag}
            osiLayer={caseDoc.osiLayer}
            diagnosis={diagnosis}
          />

          {/* Step 2: Syntax-Highlighted Cisco Terminal */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Terminal size={16} color="#38bdf8" />
                <span>Step 2: Cisco IOS Command Evidence ({caseDoc.showOutputs?.length || 0})</span>
              </div>
            </div>
            <CiscoTerminal showOutputs={caseDoc.showOutputs} title={`CLI Outputs: ${caseDoc.title}`} />
          </div>
        </div>

        {/* Right Column: AI Diagnosis, Confidence Gauge, Review & Verification */}
        <div>
          {!diagnosis ? (
            <div className="card" style={{
              textAlign: 'center',
              padding: '36px 24px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.75) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#38bdf8'
              }}>
                <Sparkles size={26} />
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#fff' }}>Run AI Diagnostic Engine</h3>
              <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: '0 auto 20px auto', maxWidth: 380 }}>
                Synthesizes the observed symptom, topology notes, and CLI show command output with deterministic rule checks to pinpoint the root cause.
              </p>
              <button
                className="btn"
                onClick={handleRunDiagnosis}
                disabled={runningDiagnosis}
                style={{ padding: '10px 24px', fontSize: '14px' }}
              >
                {runningDiagnosis ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
                <span>{runningDiagnosis ? 'Analyzing Network State...' : 'Run Dual AI Diagnosis'}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Diagnosis & Review Panel */}
              <DiagnosisPanel
                diagnosis={diagnosis}
                onUpdated={(updatedDiag) => {
                  setDiagnosis(updatedDiag);
                }}
              />

              {/* Close-the-loop Verification Panel */}
              <VerificationPanel
                caseDoc={caseDoc}
                onVerified={(res) => {
                  setCaseDoc({ ...caseDoc, lastVerification: res });
                }}
              />

              {/* Re-run Diagnosis Button */}
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button
                  className="btn secondary"
                  onClick={handleRunDiagnosis}
                  disabled={runningDiagnosis}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  <RefreshCw size={13} className={runningDiagnosis ? 'spin' : ''} />
                  <span>{runningDiagnosis ? 'Re-diagnosing...' : 'Re-run AI Diagnosis'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
