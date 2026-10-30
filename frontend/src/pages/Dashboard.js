// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { getDashboardStats } from '../api/client';
import { Link } from 'react-router-dom';
import Badge from '../components/Badge';
import {
  BarChart3,
  Layers,
  Sparkles,
  CheckCircle2,
  FileText,
  ArrowRight,
  Activity
} from 'lucide-react';

const SEVERITY_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#f43f5e', Critical: '#ef4444' };
const PIE_COLORS = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#fb923c', '#38bdf8'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const fetchStats = () => {
    setError(null);
    getDashboardStats()
      .then(setStats)
      .catch((err) => {
        console.error('Failed to load dashboard stats:', err);
        setError('Unable to reach backend API. Please verify the backend service is running and connected.');
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#f87171', marginBottom: 16 }}>{error}</p>
        <button className="btn secondary" onClick={fetchStats}>
          Retry Connection
        </button>
      </div>
    );
  }

  if (!stats) {
    return <p style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading dashboard telemetry...</p>;
  }

  const issuesByType = (stats.issuesByType || []).map((d) => ({ name: d._id, count: d.count }));
  const severityBreakdown = (stats.severityBreakdown || []).map((d) => ({ name: d._id, value: d.count }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lab Analytics & Telemetry</h1>
          <p className="page-subtitle">
            Real-time diagnostics metrics, concept category distribution, and AI vs. human agreement tracking.
          </p>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="stat-value">{stats.totalCases}</div>
            <Layers size={22} color="#38bdf8" />
          </div>
          <div className="stat-label">Total Lab Cases in Library</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="stat-value" style={{ color: '#38bdf8' }}>{stats.totalDiagnoses}</div>
            <Sparkles size={22} color="#38bdf8" />
          </div>
          <div className="stat-label">AI Diagnoses Generated</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="stat-value" style={{ color: '#34d399' }}>
              {stats.agreementRate !== null ? `${stats.agreementRate}%` : 'N/A'}
            </div>
            <CheckCircle2 size={22} color="#34d399" />
          </div>
          <div className="stat-label">AI-Human Agreement Rate</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="stat-value" style={{ color: '#fbbf24' }}>
              {stats.recentCorrections?.length || 0}
            </div>
            <FileText size={22} color="#fbbf24" />
          </div>
          <div className="stat-label">Responsible AI Corrections</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <BarChart3 size={16} color="#38bdf8" />
              <span>Issues by Network Concept Tag</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={issuesByType}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-25} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
              <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={16} color="#818cf8" />
              <span>Severity Breakdown</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <PieChart>
              <Pie data={severityBreakdown} dataKey="value" nameKey="name" outerRadius={95} innerRadius={45} paddingAngle={4} label>
                {severityBreakdown.map((entry, i) => (
                  <Cell key={i} fill={SEVERITY_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ paddingTop: 10, fontSize: '12px' }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Corrections Audit Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <FileText size={16} color="#fbbf24" />
            <span>Recent Responsible AI Corrections & Human Overrides</span>
          </div>
          <Link to="/correction-log" style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>View Full Audit Log</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {stats.recentCorrections?.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: '10px 0' }}>No corrections logged yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Case Title</th>
                <th>Concept</th>
                <th>Correction Type</th>
                <th>Human Justification / Reason</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentCorrections.map((log) => {
                const caseId = log.case?.id || log.case?._id;
                return (
                  <tr key={log.id || log._id}>
                    <td>
                      {caseId ? (
                        <Link to={`/cases/${caseId}`} style={{ fontWeight: 600, color: '#fff' }}>
                          {log.case.title}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className="badge pending">{log.case?.conceptTag || '—'}</span>
                    </td>
                    <td>
                      <Badge value={log.correctionType} />
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '13px' }}>
                      {log.reasonForCorrection || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
