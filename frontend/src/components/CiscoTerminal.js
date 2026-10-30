// src/components/CiscoTerminal.js
import React, { useState } from 'react';
import { Terminal, Copy, Check, Search } from 'lucide-react';

export default function CiscoTerminal({ showOutputs = [], title = 'Cisco IOS Terminal' }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!showOutputs || showOutputs.length === 0) {
    return (
      <div className="terminal-window">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
          </div>
          <span className="terminal-title">Cisco IOS CLI Output</span>
        </div>
        <div className="terminal-body" style={{ color: '#64748b', fontStyle: 'italic' }}>
          No show command outputs recorded for this case.
        </div>
      </div>
    );
  }

  const currentCommand = showOutputs[activeTab] || showOutputs[0];

  const handleCopy = () => {
    const textToCopy = `$ ${currentCommand.command}\n${currentCommand.output}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Highlighting parser for Cisco CLI output lines
  const renderHighlightedLine = (line, index) => {
    if (searchTerm && line.toLowerCase().includes(searchTerm.toLowerCase())) {
      return (
        <span key={index} className="cli-line" style={{ background: 'rgba(251, 191, 36, 0.2)', display: 'block' }}>
          {line}
        </span>
      );
    }

    // Replace and highlight tokens
    // 1. Administratively down / down
    if (/administratively down/i.test(line)) {
      const parts = line.split(/(administratively down)/i);
      return (
        <span key={index} className="cli-line">
          {parts.map((p, i) =>
            /administratively down/i.test(p) ? (
              <span key={i} className="cli-status-down">{p}</span>
            ) : (
              highlightOtherTokens(p)
            )
          )}
        </span>
      );
    }

    if (/\bdown\b/i.test(line) && !/protocol down/i.test(line)) {
      const parts = line.split(/(\bdown\b)/i);
      return (
        <span key={index} className="cli-line">
          {parts.map((p, i) =>
            /^\s*down\s*$/i.test(p) ? (
              <span key={i} className="cli-status-down">{p}</span>
            ) : (
              highlightOtherTokens(p)
            )
          )}
        </span>
      );
    }

    return (
      <span key={index} className="cli-line">
        {highlightOtherTokens(line)}
      </span>
    );
  };

  const highlightOtherTokens = (text) => {
    // Regex for IP, interface, up, permit, deny
    const tokenRegex = /(\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b|\b(?:GigabitEthernet|FastEthernet|Ethernet|Serial|Vlan|Loopback)[0-9/.]*|\b(?:up)\b|\b(?:permit|deny)\b)/gi;

    const parts = text.split(tokenRegex);
    return parts.map((part, idx) => {
      if (/^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(part)) {
        return <span key={idx} className="cli-ip">{part}</span>;
      }
      if (/^(?:GigabitEthernet|FastEthernet|Ethernet|Serial|Vlan|Loopback)/i.test(part)) {
        return <span key={idx} className="cli-intf">{part}</span>;
      }
      if (/^up$/i.test(part)) {
        return <span key={idx} className="cli-status-up">{part}</span>;
      }
      if (/^(permit|deny)$/i.test(part)) {
        return (
          <span
            key={idx}
            style={{
              color: part.toLowerCase() === 'permit' ? '#34d399' : '#f87171',
              fontWeight: 700
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const lines = (currentCommand.output || '').split('\n');

  return (
    <div className="terminal-window">
      {/* Chrome Top Bar */}
      <div className="terminal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="terminal-dots">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
          </div>
          <span className="terminal-title">
            <Terminal size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: 140 }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: 7, color: '#64748b' }} />
            <input
              type="text"
              placeholder="Filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '3px 8px 3px 24px',
                fontSize: '11px',
                height: '24px',
                borderRadius: '4px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>
          <button
            className="secondary"
            onClick={handleCopy}
            style={{ padding: '3px 8px', fontSize: '11px', height: '24px' }}
            title="Copy command & output"
          >
            {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Tabs if multiple commands */}
      {showOutputs.length > 1 && (
        <div style={{
          display: 'flex',
          background: '#090e1c',
          borderBottom: '1px solid var(--border)',
          padding: '0 8px',
          overflowX: 'auto',
          gap: 4
        }}>
          {showOutputs.map((so, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              style={{
                background: activeTab === idx ? '#0f172a' : 'transparent',
                color: activeTab === idx ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderBottom: activeTab === idx ? '2px solid #38bdf8' : '2px solid transparent',
                borderRadius: 0,
                padding: '6px 12px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                boxShadow: 'none',
                cursor: 'pointer'
              }}
            >
              $ {so.command}
            </button>
          ))}
        </div>
      )}

      {/* Terminal View Area */}
      <div className="terminal-body">
        <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: 8 }}>
          # {currentCommand.command}
        </div>
        <div>
          {lines.map((line, idx) => renderHighlightedLine(line, idx))}
        </div>
      </div>
    </div>
  );
}
