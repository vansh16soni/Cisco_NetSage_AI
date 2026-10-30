// src/components/DiagnosisPanel.js
import React, { useState } from 'react';
import Badge from './Badge';
import ReviewForm from './ReviewForm';
import { acceptDiagnosis, rejectDiagnosis } from '../api/client';
import { useAppContext } from '../context/AppContext';
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Edit3,
  XCircle,
  Copy,
  Check,
  Terminal,
  Layers
} from 'lucide-react';

export default function DiagnosisPanel({ diagnosis, onUpdated }) {
  const { reviewerName, showToast, isAdmin, openAuthModal } = useAppContext();
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'reject'
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);

  if (!diagnosis) return null;

  async function handleAccept() {
    setBusy(true);
    try {
      const result = await acceptDiagnosis(diagnosis._id || diagnosis.id, { reviewerName });
      showToast('Diagnosis accepted and logged.');
      if (onUpdated) onUpdated(result.diagnosis || { ...diagnosis, status: 'Accepted' });
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to accept diagnosis', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      showToast('A reason is required to reject.', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await rejectDiagnosis(diagnosis._id || diagnosis.id, { reason: rejectReason, reviewerName });
      showToast('Diagnosis rejected and logged to Responsible AI Log.');
      if (onUpdated) onUpdated(result.diagnosis || { ...diagnosis, status: 'Rejected' });
      setMode('view');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reject diagnosis', 'error');
    } finally {
      setBusy(false);
    }
  }

  const handleCopyFix = () => {
    navigator.clipboard.writeText(diagnosis.fixSteps || '');
    setCopiedFix(true);
    showToast('Fix instructions copied to clipboard.');
    setTimeout(() => setCopiedFix(false), 2000);
  };

  const confidencePct = Math.round((diagnosis.confidence || 0) * 100);
  const adjustedPct = diagnosis.ruleAdjustedConfidence != null
    ? Math.round(diagnosis.ruleAdjustedConfidence * 100)
    : null;

  return (
    <div className="card" style={{ border: '1px solid rgba(56, 189, 248, 0.3)' }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={20} color="#38bdf8" />
          <h3 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>Step 3: AI Diagnosis & Rule Corroboration</h3>
        </div>
        <Badge value={diagnosis.status} />
      </div>

      {mode === 'view' && (
        <>
          {/* Dual Confidence Gauge */}
          <div className="gauge-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Confidence Corroboration
              </span>
              <div style={{ fontSize: '13px' }}>
                <strong style={{ color: '#38bdf8' }}>{confidencePct}% Raw AI</strong>
                {adjustedPct !== null && (
                  <span style={{ color: adjustedPct >= confidencePct ? '#34d399' : '#fbbf24', marginLeft: 8 }}>
                    &rarr; <strong>{adjustedPct}% Rule-Adjusted</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="gauge-row">
              <div className="gauge-bar-track">
                <div
                  className={`gauge-bar-fill ${
                    (adjustedPct || confidencePct) > 75
                      ? 'high'
                      : (adjustedPct || confidencePct) > 45
                      ? 'medium'
                      : 'low'
                  }`}
                  style={{ width: `${adjustedPct || confidencePct}%` }}
                />
              </div>
            </div>

            {adjustedPct !== null && adjustedPct !== confidencePct && (
              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }}>
                {adjustedPct > confidencePct
                  ? 'Deterministic rule checks corroborated the AI hypothesis, boosting confidence.'
                  : 'Deterministic rule checks found contradictions, penalizing the AI raw confidence.'}
              </div>
            )}
          </div>

          {/* Root Cause & OSI Layer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start', marginBottom: 14 }}>
            <div>
              <label>Identified Root Cause</label>
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)'
              }}>
                {diagnosis.rootCause}
              </div>
            </div>
            <div>
              <label>OSI Layer</label>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 8,
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: '13px'
              }}>
                <Layers size={14} />
                <span>{diagnosis.osiLayer}</span>
              </div>
            </div>
          </div>

          {/* Evidence Quote */}
          {diagnosis.evidence && (
            <div style={{ marginBottom: 14 }}>
              <label>CLI Evidence Excerpt</label>
              <pre className="show-output" style={{ borderLeft: '3px solid #38bdf8', margin: 0 }}>
                {diagnosis.evidence}
              </pre>
            </div>
          )}

          {/* Next Command */}
          {diagnosis.nextCommand && (
            <div style={{ marginBottom: 14 }}>
              <label>Recommended Next Diagnostic Command</label>
              <div style={{
                background: '#080d1a',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Terminal size={14} color="#34d399" />
                <span>$ {diagnosis.nextCommand}</span>
              </div>
            </div>
          )}

          {/* Remediation & Fix Steps with Copy Button */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ margin: 0 }}>Step-by-Step Remediation Plan</label>
              <button
                className="secondary"
                onClick={handleCopyFix}
                style={{ padding: '3px 8px', fontSize: '11.5px', height: '24px' }}
              >
                {copiedFix ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                <span>{copiedFix ? 'Copied' : 'Copy Remediation'}</span>
              </button>
            </div>
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: '13.5px',
              color: '#cbd5e1',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {diagnosis.fixSteps}
            </div>
          </div>

          {/* Rule Checker Findings */}
          {diagnosis.ruleFindings && diagnosis.ruleFindings.length > 0 && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fbbf24', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                <ShieldAlert size={14} />
                <span>Deterministic Rule Checker Findings ({diagnosis.ruleFindings.length})</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '12.5px', color: '#cbd5e1' }}>
                {diagnosis.ruleFindings.map((f, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <Badge value={f.severity} /> <strong>{f.type}</strong>: {f.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Human Review Actions */}
          {diagnosis.status === 'Pending' ? (
            <div style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: 8,
              padding: 14,
              marginTop: 18
            }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: 10 }}>
                Human Reviewer Decision
              </div>
              {isAdmin ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn success" onClick={handleAccept} disabled={busy}>
                    <CheckCircle2 size={15} />
                    <span>Accept Diagnosis</span>
                  </button>
                  <button className="btn secondary" onClick={() => setMode('edit')} disabled={busy}>
                    <Edit3 size={15} />
                    <span>Edit Diagnosis</span>
                  </button>
                  <button className="btn outline-danger" onClick={() => setMode('reject')} disabled={busy}>
                    <XCircle size={15} />
                    <span>Reject Diagnosis</span>
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 6
                }}>
                  <span style={{ fontSize: '12.5px', color: '#fbbf24' }}>
                    Administrator privileges required to Accept, Edit, or Reject AI diagnoses.
                  </span>
                  <button
                    onClick={openAuthModal}
                    className="btn secondary"
                    style={{ padding: '5px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border)',
              marginTop: 14
            }}>
              <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                Diagnosis status: <strong style={{ color: '#fff' }}>{diagnosis.status}</strong>
              </span>
              <button
                className="btn secondary"
                onClick={() => setMode('edit')}
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                <Edit3 size={13} />
                <span>Modify Review</span>
              </button>
            </div>
          )}
        </>
      )}

      {mode === 'edit' && (
        <ReviewForm
          diagnosis={diagnosis}
          onCancel={() => setMode('view')}
          onSaved={(updated) => {
            if (onUpdated) onUpdated(updated);
            setMode('view');
          }}
        />
      )}

      {mode === 'reject' && (
        <div style={{ background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fb7185', fontWeight: 600, marginBottom: 8 }}>
            <XCircle size={18} />
            <span>Document Rejection Reason (Required for Responsible AI Log)</span>
          </div>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why the AI diagnosis is incorrect or misleading..."
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn danger" onClick={handleReject} disabled={busy}>
              Confirm Rejection & Log
            </button>
            <button className="btn secondary" onClick={() => setMode('view')} disabled={busy}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
