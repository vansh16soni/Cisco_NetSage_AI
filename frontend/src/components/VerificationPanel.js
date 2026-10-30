// src/components/VerificationPanel.js
import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, Play, RefreshCw } from 'lucide-react';
import { verifyCaseFix } from '../api/client';
import { useAppContext } from '../context/AppContext';

export default function VerificationPanel({ caseDoc, onVerified }) {
  const { showToast } = useAppContext();
  const [command, setCommand] = useState('show ip interface brief');
  const [output, setOutput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(caseDoc?.lastVerification || null);

  const isAlreadyVerified = verificationResult?.verified === true;

  const handleVerify = async (customOutputs = null) => {
    const outputsToSend = customOutputs || [
      {
        command: command.trim() || 'show ip interface brief',
        output: output.trim() || 'GigabitEthernet0/0 is up, line protocol is up\nFastEthernet0/1 is up, line protocol is up'
      }
    ];

    setVerifying(true);
    try {
      const res = await verifyCaseFix(caseDoc.id || caseDoc._id, {
        verificationOutputs: outputsToSend
      });
      setVerificationResult(res);
      if (res.verified) {
        showToast('Fix successfully verified in lab!');
      } else {
        showToast(`Verification failed: ${res.findings?.length || 0} issue(s) still detected.`, 'warning');
      }
      if (onVerified) onVerified(res);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Verification request failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulatePass = () => {
    // Generate a clean output matching the case type
    const cleanOutput = [
      {
        command: 'show ip interface brief',
        output: 'Interface                  IP-Address      OK? Method Status                Protocol\nFastEthernet0/1            192.168.10.1    YES manual up                    up      \nGigabitEthernet0/0         10.0.0.1        YES manual up                    up'
      },
      {
        command: 'show ip route',
        output: 'Gateway of last resort is 10.0.0.2 to network 0.0.0.0\nS*    0.0.0.0/0 [1/0] via 10.0.0.2\nC     192.168.10.0/24 is directly connected, FastEthernet0/1'
      }
    ];
    handleVerify(cleanOutput);
  };

  return (
    <div className="card" style={{
      border: isAlreadyVerified ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)',
      background: isAlreadyVerified ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.75) 100%)' : 'var(--panel)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={20} color={isAlreadyVerified ? '#34d399' : '#38bdf8'} />
          <h3 style={{ margin: 0, fontSize: '16px' }}>Step 4: Close-the-Loop Fix Verification</h3>
        </div>
        {isAlreadyVerified && (
          <span className="badge accepted" style={{ fontSize: '12px' }}>
            <CheckCircle2 size={13} style={{ marginRight: 4 }} /> VERIFIED IN LAB
          </span>
        )}
      </div>

      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
        After applying the fix steps in Cisco Packet Tracer, paste the post-fix verification CLI output below to deterministically confirm the fault has been cleared.
      </p>

      {isAlreadyVerified ? (
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 8,
          padding: 14,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontWeight: 600, fontSize: '14px' }}>
            <CheckCircle2 size={18} />
            {verificationResult.message || 'All deterministic checks passed! Fault cleared in Packet Tracer.'}
          </div>
          {verificationResult.verifiedAt && (
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 4 }}>
              Timestamp: {new Date(verificationResult.verifiedAt).toLocaleString()}
            </div>
          )}
        </div>
      ) : verificationResult && !verificationResult.verified ? (
        <div style={{
          background: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 8,
          padding: 14,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fb7185', fontWeight: 600, fontSize: '14px' }}>
            <AlertTriangle size={18} />
            {verificationResult.message}
          </div>
          {verificationResult.findings && (
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: '12px', color: '#fca5a5' }}>
              {verificationResult.findings.map((f, i) => (
                <li key={i}><strong>{f.type}</strong>: {f.message}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label>Verification Command</label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g. show ip interface brief or show ip route"
          />
        </div>
        <div>
          <label>Post-Fix CLI Output</label>
          <textarea
            rows={4}
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder="Paste output from Packet Tracer after applying the fix..."
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => handleVerify()}
          disabled={verifying}
          className="btn"
        >
          {verifying ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
          <span>{verifying ? 'Verifying Output...' : 'Run Verification Check'}</span>
        </button>

        <button
          className="btn secondary"
          onClick={handleSimulatePass}
          disabled={verifying}
          title="Simulate a clean post-fix Packet Tracer output to demonstrate the verification loop"
        >
          <CheckCircle2 size={14} color="#34d399" />
          <span>Simulate Clean Packet Tracer Verification</span>
        </button>
      </div>
    </div>
  );
}
