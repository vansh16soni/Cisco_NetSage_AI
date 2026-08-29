// src/pages/CorrectionLog.js
import React, { useEffect, useState } from 'react';
import { getCorrectionLogs } from '../api/client';
import { Link } from 'react-router-dom';
import Badge from '../components/Badge';

export default function CorrectionLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCorrectionLogs().then(setLogs).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Responsible AI Log</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Every time a human corrects (edits or rejects) an AI diagnosis, the original AI
        output, the corrected human version, and the reason are recorded here permanently.
      </p>

      {logs.length === 0 && <div className="card"><p>No corrections logged yet.</p></div>}

      {logs.map((log) => (
        <div className="card" key={log._id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>
              {log.case ? <Link to={`/cases/${log.case._id}`}>{log.case.title}</Link> : 'Unknown case'}
            </h3>
            <Badge value={log.correctionType} />
          </div>

          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <div>
              <label>Original AI Root Cause</label>
              <p>{log.originalAIOutput?.rootCause}</p>
              <label>Original Confidence</label>
              <p>{Math.round((log.originalAIOutput?.confidence || 0) * 100)}%</p>
            </div>
            <div>
              <label>Corrected Human Version</label>
              <p>{log.correctedHumanVersion?.rootCause}</p>
              <label>Reason for Correction</label>
              <p>{log.reasonForCorrection}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
