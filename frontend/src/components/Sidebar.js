// src/components/Sidebar.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  BarChart3,
  FileText,
  ShieldCheck,
  Cpu,
  UserCheck,
  LogIn,
  LogOut,
  Shield,
  User
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Sidebar() {
  const { user, isAdmin, openAuthModal, logout, reviewerName, setReviewerName } = useAppContext();

  return (
    <div className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <Cpu size={22} />
        </div>
        <div>
          <h1 className="brand-title">NetSage AI</h1>
          <span className="brand-tag">Packet Tracer Lab</span>
        </div>
      </div>

      {/* Navigation */}
      <nav>
        <NavLink to="/" end>
          <Layers size={17} />
          <span>Case Library</span>
        </NavLink>

        <NavLink to="/custom-troubleshooter">
          <Sparkles size={17} />
          <span>Custom Troubleshooter</span>
        </NavLink>

        <NavLink to="/rule-checker">
          <ShieldCheck size={17} />
          <span>Rule Checker</span>
        </NavLink>

        <NavLink to="/dashboard">
          <BarChart3 size={17} />
          <span>Analytics Dashboard</span>
        </NavLink>

        <NavLink to="/correction-log">
          <FileText size={17} />
          <span>Responsible AI Log</span>
        </NavLink>

        {isAdmin && (
          <NavLink to="/admin" style={{ borderLeft: '3px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
            <Shield size={17} color="#fbbf24" />
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>User Management</span>
          </NavLink>
        )}
      </nav>

      {/* Auth & Reviewer Profile in Footer */}
      <div className="sidebar-footer">
        {user ? (
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isAdmin ? <Shield size={14} color="#f59e0b" /> : <User size={14} color="#38bdf8" />}
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                  {user.name}
                </span>
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                background: isAdmin ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: isAdmin ? '#fbbf24' : '#38bdf8',
                border: `1px solid ${isAdmin ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`
              }}>
                {user.role}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
            <button
              onClick={logout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '5px 8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={openAuthModal}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '8px 12px',
                background: '#0284c7',
                border: 'none',
                color: '#fff',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
          </div>
        )}

        <div className="reviewer-input-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <UserCheck size={12} color="#38bdf8" />
            <label style={{ margin: 0 }}>Reviewer Attribution</label>
          </div>
          <input
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Reviewer Name"
            title="Name attached to Accept/Edit/Reject actions"
          />
        </div>
      </div>
    </div>
  );
}
