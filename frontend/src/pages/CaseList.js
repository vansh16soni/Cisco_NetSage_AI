// src/pages/CaseList.js
import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { listCases } from '../api/client';
import Badge from '../components/Badge';
import {
  Search,
  ArrowRight
} from 'lucide-react';

const CONCEPT_TAGS = ['VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT', 'Wireless', 'Switchport', 'Trunking', 'Interface', 'STP'];

export default function CaseList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    conceptTag: '',
    severity: '',
    status: ''
  });

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v)
    );
    listCases(params)
      .then(setCases)
      .finally(() => setLoading(false));
  }, [filters]);

  // Client-side text search
  const filteredCases = useMemo(() => {
    if (!searchTerm.trim()) return cases;
    const term = searchTerm.toLowerCase();
    return cases.filter((c) =>
      c.title?.toLowerCase().includes(term) ||
      c.symptom?.toLowerCase().includes(term) ||
      c.conceptTag?.toLowerCase().includes(term)
    );
  }, [cases, searchTerm]);

  // Quick stats
  const totalCount = cases.length;
  const acceptedCount = cases.filter((c) => c.status === 'Accepted').length;
  const pendingCount = cases.filter((c) => c.status === 'Pending').length;
  const unreviewedCount = cases.filter((c) => !c.status || c.status === 'Unreviewed').length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Troubleshooting Case Library</h1>
          <p className="page-subtitle">
            Curated repository of 32 realistic Cisco Packet Tracer networking lab fault scenarios.
          </p>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value">{totalCount}</div>
          <div className="stat-label">Total Lab Cases</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#34d399' }}>{acceptedCount}</div>
          <div className="stat-label">Verified & Accepted</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#fbbf24' }}>{pendingCount}</div>
          <div className="stat-label">Awaiting Human Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#94a3b8' }}>{unreviewedCount}</div>
          <div className="stat-label">Unreviewed Diagnoses</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 14, alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <label style={{ margin: '0 0 4px 0' }}>Search Scenarios</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search by title, symptom, or concept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
          </div>

          {/* Concept Filter */}
          <div>
            <label style={{ margin: '0 0 4px 0' }}>Concept Tag</label>
            <select
              value={filters.conceptTag}
              onChange={(e) => setFilters((f) => ({ ...f, conceptTag: e.target.value }))}
            >
              <option value="">All Concepts</option>
              {CONCEPT_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label style={{ margin: '0 0 4px 0' }}>Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
            >
              <option value="">All Severities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* Review Status Filter */}
          <div>
            <label style={{ margin: '0 0 4px 0' }}>Review Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="Accepted">Accepted</option>
              <option value="Pending">Pending Review</option>
              <option value="Edited">Edited</option>
              <option value="Rejected">Rejected</option>
              <option value="Unreviewed">Unreviewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Case Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading case dataset...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Case Title & Symptom</th>
                <th>Concept</th>
                <th>OSI Layer</th>
                <th>Severity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Workbench</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => {
                const caseId = c.id || c._id;
                return (
                  <tr key={caseId}>
                    <td>
                      <Link
                        to={`/cases/${caseId}`}
                        style={{ fontWeight: 600, color: '#fff', fontSize: '14px', display: 'block', marginBottom: 2 }}
                      >
                        {c.title}
                      </Link>
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.symptom}
                      </span>
                    </td>
                    <td>
                      <span className="badge pending">{c.conceptTag}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
                        {c.osiLayer}
                      </span>
                    </td>
                    <td>
                      <Badge value={c.severity} />
                    </td>
                    <td>
                      <Badge value={c.status || 'Unreviewed'} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/cases/${caseId}`}
                        className="btn secondary"
                        style={{ padding: '5px 12px', fontSize: '12px' }}
                      >
                        <span>Open</span>
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    No troubleshooting cases match the current search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
