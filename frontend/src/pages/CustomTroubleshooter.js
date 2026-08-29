// src/pages/CustomTroubleshooter.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { diagnoseCustomCase, createCase } from '../api/client';
import { useAppContext } from '../context/AppContext';
import Badge from '../components/Badge';

export default function CustomTroubleshooter() {
  const navigate = useNavigate();
  const { showToast } = useAppContext();

  // Inputs for Custom Case
  const [title, setTitle] = useState('');
  const [symptom, setSymptom] = useState('');
  const [topologyNotes, setTopologyNotes] = useState('');
  const [showOutputs, setShowOutputs] = useState([]);

  // Temp state for adding command output
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
    setShowOutputs([...showOutputs, { command: currentCommand, output: currentOutput }]);
    setCurrentCommand('show ip route');
    setCurrentOutput('');
    showToast('Command output added to case.');
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
      setSaveFault(data.diagnosis.rootCause);
      setSaveFix(data.diagnosis.fixSteps);
      setSaveOsi(data.diagnosis.osiLayer || 'Layer 3');
      
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
      showToast(err.response?.data?.error || err.message, 'danger');
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
      showToast(err.response?.data?.error || err.message, 'danger');
    }
  }

  return (
    <div>
      <h2>Custom Case Troubleshooter</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
        Diagnose a custom network troubleshooting scenario. Enter the symptom, topology details, and raw command outputs. The AI will analyze the issues, search for similar pre-existing cases in the library, and run deterministic validation checks.
      </p>

      <div className="grid grid-2">
        {/* INPUT FORM CARD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3>1. Case Details</h3>
          
          <label>Case Title (Optional - for saving later)</label>
          <input 
            type="text" 
            placeholder="e.g. PC-1 VLAN 10 Gateway Unreachable" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
          />

          <label>Symptom Description <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea 
            rows={3} 
            placeholder="Describe what is broken (e.g. PC cannot ping the file server but can ping the gateway...)" 
            value={symptom} 
            onChange={(e) => setSymptom(e.target.value)} 
          />

          <label>Topology & Subnet Notes <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea 
            rows={3} 
            placeholder="Describe the network configuration (e.g. VLAN 10 is 192.168.10.0/24, SVI at 192.168.10.1...)" 
            value={topologyNotes} 
            onChange={(e) => setTopologyNotes(e.target.value)} 
          />

          <h3 style={{ marginTop: 20 }}>2. Device Show Command Outputs</h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {commandPresets.map((preset) => (
              <button 
                key={preset} 
                type="button" 
                className="secondary" 
                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                onClick={() => setCurrentCommand(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <label>Command Name</label>
          <input 
            type="text" 
            placeholder="e.g. show ip route" 
            value={currentCommand} 
            onChange={(e) => setCurrentCommand(e.target.value)} 
          />

          <label>Raw Output</label>
          <textarea 
            rows={5} 
            placeholder="Paste raw output from CLI here..." 
            value={currentOutput} 
            onChange={(e) => setCurrentOutput(e.target.value)} 
          />

          <button 
            type="button" 
            className="secondary" 
            style={{ marginTop: 10, alignSelf: 'flex-start' }}
            onClick={addCommandOutput}
          >
            Add Command Output
          </button>

          {showOutputs.length > 0 && (
            <div style={{ marginTop: 15, padding: 10, background: 'var(--panel-light)', borderRadius: 'var(--radius)' }}>
              <label style={{ marginTop: 0 }}>Added Command Outputs ({showOutputs.length}):</label>
              <ul style={{ paddingLeft: 18, margin: '6px 0 0 0' }}>
                {showOutputs.map((item, idx) => (
                  <li key={idx} style={{ fontSize: '13px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <code>$ {item.command}</code>
                      <button 
                        type="button" 
                        className="danger" 
                        style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px' }}
                        onClick={() => removeCommandOutput(idx)}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 25, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <button 
              type="button" 
              style={{ width: '100%', padding: '12px' }} 
              onClick={handleDiagnose} 
              disabled={loading || !symptom.trim() || !topologyNotes.trim()}
            >
              {loading ? 'Diagnosing Case...' : 'Run Diagnostics'}
            </button>
          </div>
        </div>

        {/* RESULTS CARD */}
        <div>
          {loading && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <div className="spinner" style={{ border: '4px solid var(--border)', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', marginBottom: 15 }}></div>
              <p>Analyzing case details...</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>AI and rule checker are processing outputs</p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {!loading && !result && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
              <p>Submit a case on the left to run AI diagnosis.</p>
            </div>
          )}

          {!loading && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              {/* SIMILAR CASES CARD */}
              <div className="card" style={{ borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                <h3>🔍 Similar Cases in Library ({result.similarCases.length})</h3>
                {result.similarCases.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                    No highly matching cases found in the Case Library. This appears to be a unique scenario!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                    {result.similarCases.map((match, i) => (
                      <div key={i} style={{ padding: 10, background: 'var(--panel-light)', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold' }}>
                          <span>{match.case.title}</span>
                          <span style={{ color: 'var(--primary)' }}>{Math.round(match.score * 100)}% match</span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <strong>Known Fault:</strong> {match.case.expectedFault}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DIAGNOSIS DETAIL */}
              <div className="card">
                <h3>🤖 AI Diagnosis Results</h3>
                <div style={{ marginTop: 12 }}>
                  <label style={{ marginTop: 0 }}>OSI Layer Mapping</label>
                  <div><span className="badge pending">{result.diagnosis.osiLayer}</span></div>

                  <label>Identified Root Cause</label>
                  <p style={{ margin: '4px 0 0 0', background: 'var(--panel-light)', padding: 10, borderRadius: 6 }}>
                    {result.diagnosis.rootCause}
                  </p>

                  <label>Confidence Metrics</label>
                  <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Raw AI:</span>{' '}
                      <strong>{Math.round(result.diagnosis.confidence * 100)}%</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Rule-Adjusted:</span>{' '}
                      <strong style={{ color: 'var(--primary)' }}>{Math.round(result.diagnosis.ruleAdjustedConfidence * 100)}%</strong>
                    </div>
                  </div>

                  <label>Evidence Highlight</label>
                  <blockquote style={{ margin: '4px 0 0 0', fontStyle: 'italic', borderLeft: '3px solid var(--border)', paddingLeft: 10, color: 'var(--text-muted)', fontSize: '13px' }}>
                    "{result.diagnosis.evidence}"
                  </blockquote>

                  <label>Next Diagnostic Command</label>
                  <p style={{ margin: '4px 0 0 0' }}><code>{result.diagnosis.nextCommand}</code></p>

                  <label>Recommended Fix Steps</label>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap', background: 'rgba(74,222,128,.05)', border: '1px solid rgba(74,222,128,.15)', padding: 10, borderRadius: 6, color: 'var(--success)' }}>
                    {result.diagnosis.fixSteps}
                  </p>
                </div>
              </div>

              {/* RULE CHECKER FINDINGS */}
              <div className="card">
                <h3>✅ Rule Checker Findings</h3>
                {result.diagnosis.ruleFindings.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                    No basic configuration mismatches detected by the deterministic checks.
                  </p>
                ) : (
                  <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                    {result.diagnosis.ruleFindings.map((finding, idx) => (
                      <li key={idx} style={{ marginBottom: 6, fontSize: '13px' }}>
                        <Badge value={finding.severity} />{' '}
                        <strong>{finding.type}</strong>: {finding.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ADD TO LIBRARY TOGGLE */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!showSaveForm ? (
                  <button type="button" onClick={() => setShowSaveForm(true)}>
                    Add Case to Case Library Database
                  </button>
                ) : (
                  <div className="card" style={{ borderColor: 'var(--success)' }}>
                    <h3>📂 Save Case to Database Library</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Pre-fill details using the diagnosis. You can review and edit before saving.
                    </p>

                    <label>Case Title</label>
                    <input 
                      type="text" 
                      value={saveTitle} 
                      onChange={(e) => setSaveTitle(e.target.value)} 
                    />

                    <div className="grid grid-3" style={{ marginTop: 10 }}>
                      <div>
                        <label>Concept Tag</label>
                        <select value={saveConcept} onChange={(e) => setSaveConcept(e.target.value)}>
                          {['VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT', 'Wireless', 'Switchport', 'Trunking', 'Interface', 'STP'].map(c => (
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
                          {['Layer 1', 'Layer 2', 'Layer 3', 'Layer 3/4', 'Layer 4', 'Layer 7'].map(layer => (
                            <option key={layer} value={layer}>{layer}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <label>Expected Fault (Ground Truth)</label>
                    <textarea 
                      rows={2} 
                      value={saveFault} 
                      onChange={(e) => setSaveFault(e.target.value)} 
                    />

                    <label>Known Fix Steps</label>
                    <textarea 
                      rows={2} 
                      value={saveFix} 
                      onChange={(e) => setSaveFix(e.target.value)} 
                    />

                    <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                      <button type="button" onClick={handleSaveToLibrary}>
                        Save Case to Library
                      </button>
                      <button type="button" className="secondary" onClick={() => setShowSaveForm(false)}>
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
