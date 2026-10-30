// src/pages/CustomTroubleshooter.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { diagnoseCustomCase, createCase } from '../api/client';
import { useAppContext } from '../context/AppContext';
import {
  Sparkles,
  Terminal,
  FileText,
  Plus,
  Trash2,
  Save,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function CustomTroubleshooter() {
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  // Inputs for Custom Case
  const [title, setTitle] = useState('');
  const [symptom, setSymptom] = useState('');
  const [topologyNotes, setTopologyNotes] = useState('');
  const [showOutputs, setShowOutputs] = useState([]);

  // Command input mode: 'single' | 'bulk'
  const [inputMode, setInputMode] = useState('single');
  const [bulkLog, setBulkLog] = useState('');

  // Temp state for single command output
  const [currentCommand, setCurrentCommand] = useState('show ip route');
  const [currentOutput, setCurrentOutput] = useState('');

  // Diagnosis results state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Save to Library state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveConcept, setSaveConcept] = useState('Routing');
  const [saveSeverity, setSaveSeverity] = useState('Medium');
  const [saveOsi, setSaveOsi] = useState('Layer 3');
  const [saveFault, setSaveFault] = useState('');
  const [saveFix, setSaveFix] = useState('');

  const commandPresets = [
    'show ip route',
    'show ip interface brief',
    'show access-lists',
    'show ip nat translations',
    'show running-config',
    'show vlan brief',
    'ipconfig'
  ];

  function addCommandOutput() {
    if (!currentCommand.trim() || !currentOutput.trim()) {
      showToast('Please specify both command and output.', 'warning');
      return;
    }
    setShowOutputs([...showOutputs, { command: currentCommand.trim(), output: currentOutput.trim() }]);
    setCurrentCommand('show ip route');
    setCurrentOutput('');
    showToast('Command output added to case.');
  }

  function handleBulkParse() {
    if (!bulkLog.trim()) {
      showToast('Please paste a terminal session log first.', 'warning');
      return;
    }

    const lines = bulkLog.split('\n');
    const parsed = [];
    let currentCmd = null;
    let currentLines = [];

    for (const line of lines) {
      // Matches Cisco prompts like "Router# show ip route", "SW1(config)# ...", "$ show ..."
      const promptMatch = line.match(/^(?:[A-Za-z0-9_.-]+(?:#|>|\(config[^)]*\)#)|\$)\s*(.+)$/);
      if (promptMatch) {
        if (currentCmd && currentLines.length > 0) {
          parsed.push({ command: currentCmd, output: currentLines.join('\n').trim() });
        }
        currentCmd = promptMatch[1].trim();
        currentLines = [];
      } else if (currentCmd) {
        currentLines.push(line);
      }
    }

    if (currentCmd && currentLines.length > 0) {
      parsed.push({ command: currentCmd, output: currentLines.join('\n').trim() });
    }

    if (parsed.length === 0) {
      // Fallback: If no prompt found, treat as one command
      parsed.push({
        command: 'show running-config',
        output: bulkLog.trim()
      });
    }

    setShowOutputs([...showOutputs, ...parsed]);
    setBulkLog('');
    setInputMode('single');
    showToast(`Parsed and imported ${parsed.length} CLI command(s) from session log!`);
  }

  function removeCommandOutput(index) {
    setShowOutputs(showOutputs.filter((_, i) => i !== index));
    showToast('Command output removed.');
  }

  async function handleDiagnose() {
    if (!symptom.trim() || !topologyNotes.trim()) {
      showToast('Symptom and Topology Notes are required.', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    setShowSaveForm(false);
    try {
      const data = await diagnoseCustomCase({
        symptom,
        topologyNotes,
        showOutputs
      });
      setResult(data);
      showToast('Diagnosis complete!');

      // Pre-fill save form
      setSaveTitle(title.trim() ? title : 'Custom Case: ' + symptom.slice(0, 30) + '...');
      setSaveFault(data.diagnosis?.rootCause || '');
      setSaveFix(data.diagnosis?.fixSteps || '');
      setSaveOsi(data.diagnosis?.osiLayer || 'Layer 3');

      // Auto-detect concept tag based on keywords
      const combinedText = (symptom + ' ' + topologyNotes).toLowerCase();
      let matchedConcept = 'Routing';
      const concepts = ['VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT', 'Wireless', 'Switchport', 'Trunking', 'Interface', 'STP'];
      for (const concept of concepts) {
        if (combinedText.includes(concept.toLowerCase())) {
          matchedConcept = concept;
          break;
        }
      }
      setSaveConcept(matchedConcept);
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveToLibrary() {
    if (!saveTitle.trim() || !saveFault.trim() || !saveFix.trim()) {
      showToast('Title, Expected Fault, and Known Fix are required.', 'warning');
      return;
    }

    try {
      await createCase({
        title: saveTitle,
        symptom,
        topologyNotes,
        showOutputs,
        expectedFault: saveFault,
        osiLayer: saveOsi,
        conceptTag: saveConcept,
        severity: saveSeverity,
        knownFix: saveFix
      });
      showToast('Case saved to the Case Library!', 'success');
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Custom Case Troubleshooter</h1>
          <p className="page-subtitle">
            Diagnose an arbitrary live Packet Tracer lab problem with simultaneous AI reasoning, deterministic rule checks, and case-library similarity search.
          </p>
        </div>
      </div>

      <div className="workbench-container">
        {/* INPUT FORM CARD */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FileText size={16} color="#38bdf8" />
              <span>1. Scenario Specifications</span>
            </div>
          </div>

          <label>Case Title (Optional - for saving later)</label>
          <input
            type="text"
            placeholder="e.g. PC-1 VLAN 10 Gateway Unreachable"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label>Symptom Description *</label>
          <textarea
            rows={3}
            placeholder="Describe what is broken (e.g. PC cannot ping the file server but can ping its default gateway...)"
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
          />

          <label>Topology & Subnet Notes *</label>
          <textarea
            rows={3}
            placeholder="Describe the network configuration (e.g. VLAN 10 is 192.168.10.0/24 with SVI at 192.168.10.1...)"
            value={topologyNotes}
            onChange={(e) => setTopologyNotes(e.target.value)}
          />

          {/* CLI Inputs */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={{ margin: 0 }}>2. Cisco CLI Command Outputs</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`btn ${inputMode === 'single' ? '' : 'secondary'}`}
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                  onClick={() => setInputMode('single')}
                >
                  Single Command
                </button>
                <button
                  type="button"
                  className={`btn ${inputMode === 'bulk' ? '' : 'secondary'}`}
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                  onClick={() => setInputMode('bulk')}
                  title="Paste an entire continuous terminal session log"
                >
                  Bulk Session Dump
                </button>
              </div>
            </div>

            {inputMode === 'single' ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {commandPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="secondary"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => setCurrentCommand(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="e.g. show ip route"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  style={{ marginBottom: 8 }}
                />

                <textarea
                  rows={4}
                  placeholder="Paste raw output from Packet Tracer CLI..."
                  value={currentOutput}
                  onChange={(e) => setCurrentOutput(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px', marginBottom: 10 }}
                />

                <button
                  type="button"
                  className="secondary"
                  onClick={addCommandOutput}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  <Plus size={13} />
                  <span>Add Command Output</span>
                </button>
              </>
            ) : (
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px 0' }}>
                  Paste a full terminal log with router/switch prompts (e.g. <code>Router# show ip route... Switch# show vlan brief...</code>). NetSage AI will automatically parse each command.
                </p>
                <textarea
                  rows={6}
                  placeholder="Paste full terminal session here..."
                  value={bulkLog}
                  onChange={(e) => setBulkLog(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', marginBottom: 10 }}
                />
                <button
                  type="button"
                  onClick={handleBulkParse}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  <Terminal size={13} />
                  <span>Parse & Import All Commands</span>
                </button>
              </div>
            )}

            {/* List of Added Commands */}
            {showOutputs.length > 0 && (
              <div style={{ marginTop: 14, background: 'rgba(15, 23, 42, 0.6)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                <label style={{ margin: '0 0 8px 0' }}>Imported Commands ({showOutputs.length}):</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {showOutputs.map((item, idx) => (
                    <div
                      key={idx}
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
                      <span style={{ color: '#38bdf8' }}>$ {item.command}</span>
                      <button
                        type="button"
                        className="outline-danger"
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                        onClick={() => removeCommandOutput(idx)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn"
              style={{ width: '100%', padding: '12px' }}
              onClick={handleDiagnose}
              disabled={loading || !symptom.trim() || !topologyNotes.trim()}
            >
              {loading ? (
                <>
                  <Sparkles size={16} className="spin" />
                  <span>Synthesizing Diagnosis...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Run Dual AI Diagnosis & Rule Check</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RESULTS CARD */}
        <div>
          {loading && (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <Sparkles size={32} color="#38bdf8" className="spin" style={{ marginBottom: 14 }} />
              <h3 style={{ margin: '0 0 6px 0' }}>Analyzing Network Telemetry</h3>
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>
                Executing LLM reasoning, matching similar lab cases via Jaccard similarity, and verifying deterministic rule anomalies...
              </p>
            </div>
          )}

          {!loading && !result && (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
              <Terminal size={36} color="#64748b" style={{ marginBottom: 12 }} />
              <h3 style={{ color: '#cbd5e1', margin: '0 0 6px 0' }}>Ready for Diagnostics</h3>
              <p style={{ fontSize: '13.5px', maxWidth: 360, margin: '0 auto' }}>
                Enter the symptom, network topology, and CLI output on the left, then click "Run Dual AI Diagnosis".
              </p>
            </div>
          )}

          {!loading && result && (
            <div>
              {/* Diagnosis Box */}
              <div className="card" style={{ borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                <div className="card-header">
                  <div className="card-title">
                    <Sparkles size={16} color="#38bdf8" />
                    <span>Generated Diagnosis</span>
                  </div>
                  <span className="badge accepted">Ready</span>
                </div>

                <div className="gauge-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600 }}>CONFIDENCE</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                      {Math.round((result.diagnosis?.confidence || 0) * 100)}% Raw
                      {result.diagnosis?.ruleAdjustedConfidence != null && (
                        <span style={{ color: '#34d399', marginLeft: 6 }}>
                          &rarr; {Math.round(result.diagnosis.ruleAdjustedConfidence * 100)}% Adjusted
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="gauge-bar-track">
                    <div
                      className="gauge-bar-fill high"
                      style={{ width: `${Math.round((result.diagnosis?.ruleAdjustedConfidence || result.diagnosis?.confidence || 0.8) * 100)}%` }}
                    />
                  </div>
                </div>

                <label>Identified Root Cause</label>
                <div style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  marginBottom: 12
                }}>
                  {result.diagnosis?.rootCause}
                </div>

                <label>OSI Layer</label>
                <p style={{ color: '#38bdf8', fontWeight: 600, margin: '0 0 12px 0' }}>
                  {result.diagnosis?.osiLayer}
                </p>

                <label>Evidence</label>
                <pre className="show-output" style={{ marginBottom: 12 }}>
                  {result.diagnosis?.evidence}
                </pre>

                <label>Fix Instructions</label>
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: '#cbd5e1',
                  marginBottom: 16
                }}>
                  {result.diagnosis?.fixSteps}
                </div>

                {result.diagnosis?.ruleFindings && result.diagnosis.ruleFindings.length > 0 && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700, marginBottom: 6 }}>
                      Rule Checker Findings:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: '12px' }}>
                      {result.diagnosis.ruleFindings.map((f, i) => (
                        <li key={i}><strong>{f.type}</strong>: {f.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Similar Cases in Library */}
              {result.similarCases && result.similarCases.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <Layers size={16} color="#818cf8" />
                      <span>Similar Cases in Library (Jaccard Match)</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.similarCases.map((match, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#fff' }}>
                            {match.case?.title}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: 2 }}>
                            {match.case?.conceptTag} • {match.case?.osiLayer} • Similarity Score: <strong style={{ color: '#38bdf8' }}>{Math.round(match.score * 100)}%</strong>
                          </div>
                        </div>
                        <a
                          href={`/cases/${match.case?.id || match.case?._id}`}
                          className="btn secondary"
                          style={{ padding: '4px 10px', fontSize: '11.5px' }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View <ArrowRight size={11} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Case to Library Option */}
              <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                {!showSaveForm ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', color: '#fff' }}>Add to Permanent Case Library</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                        Store this scenario in the 32-case collection for future training & reference.
                      </p>
                    </div>
                    <button className="btn success" onClick={() => setShowSaveForm(true)}>
                      <Save size={14} />
                      <span>Save to Library</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', color: '#34d399' }}>Save Case to Database Library</h4>
                    <label>Title</label>
                    <input
                      type="text"
                      value={saveTitle}
                      onChange={(e) => setSaveTitle(e.target.value)}
                      style={{ marginBottom: 10 }}
                    />

                    <div className="grid grid-3" style={{ marginBottom: 10 }}>
                      <div>
                        <label>Concept</label>
                        <select value={saveConcept} onChange={(e) => setSaveConcept(e.target.value)}>
                          {['VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT', 'Wireless', 'Switchport', 'Trunking', 'Interface', 'STP'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Severity</label>
                        <select value={saveSeverity} onChange={(e) => setSaveSeverity(e.target.value)}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div>
                        <label>OSI Layer</label>
                        <select value={saveOsi} onChange={(e) => setSaveOsi(e.target.value)}>
                          {['Layer 1', 'Layer 2', 'Layer 3', 'Layer 3/4', 'Layer 4', 'Layer 7'].map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <label>Expected Fault</label>
                    <textarea
                      rows={2}
                      value={saveFault}
                      onChange={(e) => setSaveFault(e.target.value)}
                      style={{ marginBottom: 10 }}
                    />

                    <label>Known Fix Steps</label>
                    <textarea
                      rows={2}
                      value={saveFix}
                      onChange={(e) => setSaveFix(e.target.value)}
                      style={{ marginBottom: 14 }}
                    />

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn success" onClick={handleSaveToLibrary}>
                        Confirm Save to Library
                      </button>
                      <button className="btn secondary" onClick={() => setShowSaveForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
