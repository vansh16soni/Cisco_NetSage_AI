// src/pages/CorrectionLog.js
import React, { useEffect, useState } from 'react';
import { getCorrectionLogs } from '../api/client';
import { Link } from 'react-router-dom';
import Badge from '../components/Badge';
import { Bot, UserCheck } from 'lucide-react';

export default function CorrectionLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCorrectionLogs().then(setLogs).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading Responsible AI audit trail...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Responsible AI Audit Log</h1>
          <p className="page-subtitle">
            Every time a human engineer modifies or rejects an AI diagnosis, the original model inference, the human correction, and the documented justification are permanently archived.
          </p>
        </div>
      </div>

      {logs.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <p>No human corrections or overrides logged yet.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {logs.map((log) => {
          const caseId = log.case?.id || log.case?._id;
          return (
            <div className="card" key={log.id || log._id} style={{ borderLeft: '4px solid #38bdf8' }}>
              <div className="card-header">
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                    {caseId ? (
                      <Link to={`/cases/${caseId}`} style={{ color: '#fff' }}>
                        {log.case.title}
                      </Link>
                    ) : (
                      'Unknown Case'
                    )}
                  </h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {log.case?.conceptTag && <span className="badge pending">{log.case.conceptTag}</span>}
                    {log.case?.severity && <Badge value={log.case.severity} />}
                    {log.createdAt && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <Badge value={log.correctionType} />
              </div>

              {/* Side-by-side AI vs Human comparison */}
              <div className="grid grid-2" style={{ marginTop: 8 }}>
                {/* Original AI Inference */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: '12px', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
                    <Bot size={15} />
                    <span>Original AI Hypothesis</span>
                  </div>

                  <label>Original Root Cause</label>
                  <p style={{ color: '#cbd5e1', fontSize: '13px', margin: '0 0 8px 0' }}>
                    {log.originalAIOutput?.rootCause || 'N/A'}
                  </p>

                  <label>Initial Model Confidence</label>
                  <p style={{ color: '#38bdf8', fontWeight: 600, margin: '0 0 8px 0' }}>
                    {Math.round((log.originalAIOutput?.confidence || 0) * 100)}%
                  </p>

                  {log.originalAIOutput?.evidence && (
                    <>
                      <label>Quoted Evidence</label>
                      <pre className="show-output" style={{ fontSize: '11.5px', margin: 0 }}>
                        {log.originalAIOutput.evidence}
                      </pre>
                    </>
                  )}
                </div>

                {/* Corrected Human Version */}
                <div style={{
                  background: 'rgba(56, 189, 248, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 8,
                  padding: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontSize: '12px', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
                    <UserCheck size={15} />
                    <span>Human Reviewer Correction</span>
                  </div>

                  <label>Corrected Root Cause</label>
                  <p style={{ color: '#fff', fontWeight: 600, fontSize: '13.5px', margin: '0 0 8px 0' }}>
                    {log.correctedHumanVersion?.rootCause || log.correctionType}
                  </p>

                  <label>Documented Reason for Override</label>
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    color: '#fbbf24',
                    fontSize: '12.5px',
                    margin: '0 0 8px 0'
                  }}>
                    {log.reasonForCorrection || 'No justification entered.'}
                  </div>

                  {log.correctedHumanVersion?.fixSteps && (
                    <>
                      <label>Corrected Fix Steps</label>
                      <div style={{ fontSize: '12.5px', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                        {log.correctedHumanVersion.fixSteps}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
