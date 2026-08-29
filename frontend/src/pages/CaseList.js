// src/pages/CaseList.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCases } from '../api/client';
import Badge from '../components/Badge';

const CONCEPT_TAGS = ['VLAN', 'Gateway', 'DHCP', 'DNS', 'Routing', 'ACL', 'NAT', 'Wireless', 'Switchport', 'Trunking', 'Interface', 'STP'];

export default function CaseList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ conceptTag: '', severity: '' });

  useEffect(() => {
    setLoading(true);
    listCases(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)))
      .then(setCases)
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div>
      <h2>Troubleshooting Cases</h2>

      <div className="card" style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label>Concept Tag</label>
          <select value={filters.conceptTag} onChange={(e) => setFilters((f) => ({ ...f, conceptTag: e.target.value }))}>
            <option value="">All</option>
            {CONCEPT_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Severity</label>
          <select value={filters.severity} onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}>
            <option value="">All</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? <p>Loading...</p> : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Concept</th>
                <th>OSI Layer</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c._id}>
                  <td><Link to={`/cases/${c._id}`}>{c.title}</Link></td>
                  <td>{c.conceptTag}</td>
                  <td>{c.osiLayer}</td>
                  <td><Badge value={c.severity} /></td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr><td colSpan={4}>No cases match these filters.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
