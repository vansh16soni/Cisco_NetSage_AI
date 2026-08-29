// src/components/DiagnosisPanel.js
import React, { useState } from 'react';
import Badge from './Badge';
import ReviewForm from './ReviewForm';
import { acceptDiagnosis, rejectDiagnosis } from '../api/client';
import { useAppContext } from '../context/AppContext';

export default function DiagnosisPanel({ diagnosis, onUpdated }) {
  const { reviewerName, showToast } = useAppContext();
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'reject'
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!diagnosis) return null;

  async function handleAccept() {
    setBusy(true);
    try {
      const result = await acceptDiagnosis(diagnosis._id, { reviewerName });
      showToast('Diagnosis accepted.');
      onUpdated(result.diagnosis);
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
      const result = await rejectDiagnosis(diagnosis._id, { reason: rejectReason, reviewerName });
      showToast('Diagnosis rejected and logged.');
      onUpdated(result.diagnosis);
      setMode('view');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to reject diagnosis', 'error');
    } finally {
      setBusy(false);
    }
  }

  const confidencePct = Math.round((diagnosis.confidence || 0) * 100);
  const adjustedPct = diagnosis.ruleAdjustedConfidence != null
    ? Math.round(diagnosis.ruleAdjustedConfidence * 100)
    : null;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>AI Diagnosis</h3>
        <Badge value={diagnosis.status} />
      </div>

      {mode === 'view' && (
        <>
          <label>Root Cause</label>
          <p>{diagnosis.rootCause}</p>

          <label>OSI Layer</label>
          <p>{diagnosis.osiLayer}</p>

          <label>Confidence</label>
          <p>
            {confidencePct}%
            {adjustedPct !== null && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                (rule-adjusted: {adjustedPct}%)
              </span>
            )}
          </p>

          <label>Evidence</label>
          <pre className="show-output">{diagnosis.evidence}</pre>

          <label>Next Command</label>
          <pre className="show-output">{diagnosis.nextCommand}</pre>

          <label>Fix Steps</label>
          <p>{diagnosis.fixSteps}</p>

          {diagnosis.ruleFindings && diagnosis.ruleFindings.length > 0 && (
            <>
              <label>Rule Checker Findings</label>
              <ul>
                {diagnosis.ruleFindings.map((f, i) => (
                  <li key={i}>
                    <Badge value={f.severity} /> <strong>{f.type}</strong>: {f.message}
                  </li>
                ))}
              </ul>
            </>
          )}

          {diagnosis.status === 'Pending' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={handleAccept} disabled={busy}>Accept</button>
              <button className="secondary" onClick={() => setMode('edit')} disabled={busy}>Edit</button>
              <button className="danger" onClick={() => setMode('reject')} disabled={busy}>Reject</button>
            </div>
          )}
        </>
      )}

      {mode === 'edit' && (
        <ReviewForm
          diagnosis={diagnosis}
          onCancel={() => setMode('view')}
          onSaved={(updated) => { onUpdated(updated); setMode('view'); }}
        />
      )}

      {mode === 'reject' && (
        <div>
          <label>Reason for rejection (required)</label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this diagnosis is wrong..."
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="danger" onClick={handleReject} disabled={busy}>Confirm Reject</button>
            <button className="secondary" onClick={() => setMode('view')} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
