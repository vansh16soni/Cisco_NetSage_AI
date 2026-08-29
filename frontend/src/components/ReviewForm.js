// src/components/ReviewForm.js
import React, { useState } from 'react';
import { editDiagnosis } from '../api/client';
import { useAppContext } from '../context/AppContext';

const OSI_LAYERS = ['Layer 1', 'Layer 2', 'Layer 3', 'Layer 3/4', 'Layer 4', 'Layer 7'];

export default function ReviewForm({ diagnosis, onCancel, onSaved }) {
  const { reviewerName, showToast } = useAppContext();
  const [form, setForm] = useState({
    rootCause: diagnosis.rootCause,
    confidence: diagnosis.confidence,
    evidence: diagnosis.evidence,
    nextCommand: diagnosis.nextCommand,
    fixSteps: diagnosis.fixSteps,
    osiLayer: diagnosis.osiLayer
  });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    if (!reason.trim()) {
      showToast('Please explain why you edited this diagnosis.', 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await editDiagnosis(diagnosis._id, { ...form, reason, reviewerName });
      showToast('Diagnosis updated and correction logged.');
      onSaved(result.diagnosis);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save edit', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label>Root Cause</label>
      <textarea rows={2} value={form.rootCause} onChange={(e) => update('rootCause', e.target.value)} />

      <label>OSI Layer</label>
      <select value={form.osiLayer} onChange={(e) => update('osiLayer', e.target.value)}>
        {OSI_LAYERS.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>

      <label>Confidence (0 - 1)</label>
      <input
        type="number" min="0" max="1" step="0.05"
        value={form.confidence}
        onChange={(e) => update('confidence', Number(e.target.value))}
      />

      <label>Evidence</label>
      <textarea rows={2} value={form.evidence} onChange={(e) => update('evidence', e.target.value)} />

      <label>Next Command</label>
      <textarea rows={2} value={form.nextCommand} onChange={(e) => update('nextCommand', e.target.value)} />

      <label>Fix Steps</label>
      <textarea rows={3} value={form.fixSteps} onChange={(e) => update('fixSteps', e.target.value)} />

      <label>Reason for edit (required, feeds Responsible AI log)</label>
      <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button onClick={handleSave} disabled={busy}>Save Edit</button>
        <button className="secondary" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}
