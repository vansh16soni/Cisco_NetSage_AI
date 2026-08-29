// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getDashboardStats } from '../api/client';
import { Link } from 'react-router-dom';

const SEVERITY_COLORS = { Low: '#4ade80', Medium: '#fbbf24', High: '#f87171' };
const PIE_COLORS = ['#38bdf8', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#34d399', '#f472b6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => { getDashboardStats().then(setStats); }, []);

  if (!stats) return <p>Loading dashboard...</p>;

  const issuesByType = stats.issuesByType.map((d) => ({ name: d._id, count: d.count }));
  const severityBreakdown = stats.severityBreakdown.map((d) => ({ name: d._id, value: d.count }));

  return (
    <div>
      <h2>Dashboard</h2>

      <div className="grid grid-4">
        <div className="card">
          <div className="stat-value">{stats.totalCases}</div>
          <div className="stat-label">Total Cases</div>
        </div>
        <div className="card">
          <div className="stat-value">{stats.totalDiagnoses}</div>
          <div className="stat-label">AI Diagnoses Run</div>
        </div>
        <div className="card">
          <div className="stat-value">
            {stats.agreementRate !== null ? `${stats.agreementRate}%` : 'N/A'}
          </div>
          <div className="stat-label">AI-Human Agreement Rate</div>
        </div>
        <div className="card">
          <div className="stat-value">{stats.recentCorrections.length}</div>
          <div className="stat-label">Recent Corrections</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Issues by Type</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={issuesByType}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
              <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Severity Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={severityBreakdown} dataKey="value" nameKey="name" outerRadius={90} label>
                {severityBreakdown.map((entry, i) => (
                  <Cell key={i} fill={SEVERITY_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Recent Corrections</h3>
        {stats.recentCorrections.length === 0 && <p>No corrections logged yet.</p>}
        <table>
          <thead>
            <tr><th>Case</th><th>Type</th><th>Reason</th></tr>
          </thead>
          <tbody>
            {stats.recentCorrections.map((log) => (
              <tr key={log._id}>
                <td>{log.case ? <Link to={`/cases/${log.case._id}`}>{log.case.title}</Link> : '—'}</td>
                <td>{log.correctionType}</td>
                <td>{log.reasonForCorrection}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link to="/correction-log">View full Responsible AI log &rarr;</Link>
      </div>
    </div>
  );
}
