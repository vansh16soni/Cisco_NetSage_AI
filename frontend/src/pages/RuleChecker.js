// src/pages/RuleChecker.js
import React, { useState } from 'react';
import { checkShowOutputs } from '../api/client';
import Badge from '../components/Badge';

export default function RuleCheckerPage() {
  const [command, setCommand] = useState('show ip route');
  const [output, setOutput] = useState('');
  const [entries, setEntries] = useState([]);
  const [findings, setFindings] = useState(null);
  const [busy, setBusy] = useState(false);

  function addEntry() {
    if (!output.trim()) return;
    setEntries((e) => [...e, { command, output }]);
    setCommand('');
    setOutput('');
  }

  async function runCheck() {
    setBusy(true);
    try {
      const result = await checkShowOutputs(entries);
      setFindings(result.findings);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2>Standalone Rule Checker</h2>
      <p style={{ color: 'var(--text-muted)' }}>
        Paste one or more raw `show` command outputs to run the deterministic rule checker
        independently of any AI diagnosis.
      </p>

      <div className="card">
        <label>Command</label>
        <input value={command} onChange={(e) => setCommand(e.target.value)} />
        <label>Output</label>
        <textarea rows={5} value={output} onChange={(e) => setOutput(e.target.value)} />
        <div style={{ marginTop: 10 }}>
          <button className="secondary" onClick={addEntry}>Add Command Output</button>
        </div>

        {entries.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <label>Queued Outputs ({entries.length})</label>
            {entries.map((e, i) => <div key={i}><code>$ {e.command}</code></div>)}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <button onClick={runCheck} disabled={busy || entries.length === 0}>
            {busy ? 'Checking...' : 'Run Rule Checker'}
          </button>
        </div>
      </div>

      {findings && (
        <div className="card">
          <h3>Findings ({findings.length})</h3>
          {findings.length === 0 && <p>No issues detected by the deterministic rule checker.</p>}
          <ul>
            {findings.map((f, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <Badge value={f.severity} /> <strong>{f.type}</strong>: {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
