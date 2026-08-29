// src/pages/CaseDetail.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCase, runDiagnosis } from '../api/client';
import Badge from '../components/Badge';
import DiagnosisPanel from '../components/DiagnosisPanel';
import { useAppContext } from '../context/AppContext';

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
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleRunDiagnosis() {
    setRunningDiagnosis(true);
    try {
      const result = await runDiagnosis(id);
      setDiagnosis(result);
      showToast('AI diagnosis generated.');
    } catch (err) {
      showToast(err.response?.data?.error || 'AI diagnosis failed - check API key config', 'error');
    } finally {
      setRunningDiagnosis(false);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!caseDoc) return <p>Case not found.</p>;

  return (
    <div>
      <Link to="/">&larr; Back to cases</Link>
      <h2>{caseDoc.title}</h2>

      <div className="card">
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <Badge value={caseDoc.severity} />
          <span className="badge pending">{caseDoc.conceptTag}</span>
          <span className="badge pending">{caseDoc.osiLayer}</span>
        </div>

        <label>Symptom</label>
        <p>{caseDoc.symptom}</p>

        <label>Topology Notes</label>
        <p>{caseDoc.topologyNotes}</p>

        <label>Show Command Outputs</label>
        {caseDoc.showOutputs.map((so, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <code>$ {so.command}</code>
            <pre className="show-output">{so.output}</pre>
          </div>
        ))}
      </div>

      {!diagnosis && (
        <div className="card">
          <p>No diagnosis has been generated yet for this case.</p>
          <button onClick={handleRunDiagnosis} disabled={runningDiagnosis}>
            {runningDiagnosis ? 'Diagnosing...' : 'Run AI Diagnosis'}
          </button>
        </div>
      )}

      {diagnosis && (
        <>
          <DiagnosisPanel diagnosis={diagnosis} onUpdated={setDiagnosis} />
          {diagnosis.status !== 'Pending' && (
            <button className="secondary" onClick={handleRunDiagnosis} disabled={runningDiagnosis}>
              {runningDiagnosis ? 'Diagnosing...' : 'Re-run AI Diagnosis'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
