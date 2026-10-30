// src/pages/RuleChecker.js
import React, { useState } from 'react';
import { checkShowOutputs } from '../api/client';
import Badge from '../components/Badge';
import CiscoTerminal from '../components/CiscoTerminal';
import {
  ShieldCheck,
  CheckCircle2,
  Play,
  Plus,
  Trash2,
  Terminal,
  Zap
} from 'lucide-react';

const PRESETS = [
  {
    name: 'Administratively Down Interface',
    command: 'show ip interface brief',
    output: `Interface                  IP-Address      OK? Method Status                Protocol
FastEthernet0/1            192.168.10.1    YES manual up                    up      
GigabitEthernet0/0         10.0.0.1        YES manual administratively down down    
Serial0/0/0                unassigned      YES unset  down                  down`
  },
  {
    name: 'Missing Default Route',
    command: 'show ip route',
    output: `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
Gateway of last resort is not set

      192.168.10.0/24 is variably subnetted, 2 subnets, 2 masks
C        192.168.10.0/24 is directly connected, GigabitEthernet0/0/0
L        192.168.10.1/32 is directly connected, GigabitEthernet0/0/0`
  },
  {
    name: 'ACL Blocking All Traffic',
    command: 'show access-lists',
    output: `Extended IP access list 101
    10 deny ip any any (142 matches)`
  }
];

export default function RuleCheckerPage() {
  const [command, setCommand] = useState('show ip interface brief');
  const [output, setOutput] = useState('');
  const [entries, setEntries] = useState([]);
  const [findings, setFindings] = useState(null);
  const [busy, setBusy] = useState(false);

  function addEntry() {
    if (!output.trim()) return;
    setEntries((e) => [...e, { command: command.trim() || 'show ip route', output: output.trim() }]);
    setCommand('show ip route');
    setOutput('');
  }

  function loadPreset(preset) {
    setEntries([{ command: preset.command, output: preset.output }]);
    setFindings(null);
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Deterministic Rule Checker</h1>
          <p className="page-subtitle">
            Non-AI, 100% deterministic safety net that parses raw Cisco CLI syntax for duplicate IPs, subnet mismatches, down interfaces, and route omissions.
          </p>
        </div>
      </div>

      {/* Preset Quick-Load Bar */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>
            <Zap size={15} />
            <span>Demo Test Scenarios:</span>
          </div>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              className="secondary"
              onClick={() => loadPreset(p)}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="workbench-container">
        {/* Left Column: Command Entry */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Terminal size={16} color="#38bdf8" />
              <span>Input Cisco CLI Output</span>
            </div>
          </div>

          <label>Command Name</label>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g. show ip interface brief"
          />

          <label>Raw Output</label>
          <textarea
            rows={6}
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder="Paste raw text output from Cisco Packet Tracer device..."
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
          />

          <div style={{ marginTop: 12 }}>
            <button className="btn secondary" onClick={addEntry} style={{ fontSize: '12.5px' }}>
              <Plus size={13} />
              <span>Add Command to Batch</span>
            </button>
          </div>

          {entries.length > 0 && (
            <div style={{ marginTop: 16, background: 'rgba(15, 23, 42, 0.6)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ margin: 0 }}>Queued Outputs ({entries.length})</label>
                <button
                  type="button"
                  className="outline-danger"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  onClick={() => { setEntries([]); setFindings(null); }}
                >
                  Clear All
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entries.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#090e1c',
                      padding: '6px 10px',
                      borderRadius: 6,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px'
                    }}
                  >
                    <span style={{ color: '#38bdf8' }}>$ {e.command}</span>
                    <button
                      type="button"
                      className="outline-danger"
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                      onClick={() => setEntries(entries.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              className="btn"
              onClick={runCheck}
              disabled={busy || entries.length === 0}
              style={{ width: '100%', padding: '11px' }}
            >
              <Play size={15} />
              <span>{busy ? 'Running Deterministic Parser...' : 'Run Deterministic Safety Check'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Findings & Terminal Preview */}
        <div>
          {entries.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <CiscoTerminal showOutputs={entries} title="Terminal Preview" />
            </div>
          )}

          {findings && (
            <div className="card" style={{
              borderColor: findings.length === 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'
            }}>
              <div className="card-header">
                <div className="card-title">
                  <ShieldCheck size={18} color={findings.length === 0 ? '#34d399' : '#f43f5e'} />
                  <span>Rule Checker Findings ({findings.length})</span>
                </div>
                <Badge value={findings.length === 0 ? 'Low' : 'High'} />
              </div>

              {findings.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#34d399', padding: '10px 0' }}>
                  <CheckCircle2 size={20} />
                  <span>No syntax or configuration anomalies flagged in this output batch.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {findings.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: 12
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Badge value={f.severity} />
                        <strong style={{ color: '#fff', fontSize: '13px' }}>{f.type}</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                        {f.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
