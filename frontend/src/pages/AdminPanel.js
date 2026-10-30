// src/pages/AdminPanel.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  Trash2,
  Activity,
  Search,
  RefreshCw,
  X,
  Clock,
  CheckCircle,
  XCircle,
  LogIn
} from 'lucide-react';
import { getAdminUsers, getAdminUserActivity, updateUserStatus, deleteUser } from '../api/client';
import { useAppContext } from '../context/AppContext';

export default function AdminPanel() {
  const { user, isAdmin, openAuthModal, showToast } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Activity drawer / modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, showToast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const handleToggleStatus = async (targetUser) => {
    if (targetUser.id === user?.id) {
      showToast('You cannot suspend your own account.', 'error');
      return;
    }
    const newStatus = targetUser.status === 'suspended' ? 'active' : 'suspended';
    const confirmMsg = newStatus === 'suspended'
      ? `Are you sure you want to suspend ${targetUser.email}? They will be blocked from logging in.`
      : `Unsuspend ${targetUser.email} and restore access?`;

    if (!window.confirm(confirmMsg)) return;

    setActionBusyId(targetUser.id);
    try {
      await updateUserStatus(targetUser.id, newStatus);
      showToast(`User ${targetUser.email} is now ${newStatus}.`, 'success');
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to update user status', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user?.id) {
      showToast('You cannot delete your own account.', 'error');
      return;
    }
    if (!window.confirm(`Permanently delete user ${targetUser.email}? This action cannot be undone.`)) {
      return;
    }

    setActionBusyId(targetUser.id);
    try {
      await deleteUser(targetUser.id);
      showToast(`User ${targetUser.email} deleted successfully.`, 'success');
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(null);
      }
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete user', 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleViewActivity = async (targetUser) => {
    setSelectedUser(targetUser);
    setLoadingActivities(true);
    try {
      const data = await getAdminUserActivity(targetUser.id);
      setActivities(data.activities || []);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to fetch user activity', 'error');
    } finally {
      setLoadingActivities(false);
    }
  };

  // If not logged in as Admin, show restricted access gate
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: 24, textAlign: 'center' }}>
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 12,
          padding: 36
        }}>
          <Shield size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <h2 style={{ color: '#fff', fontSize: 22, marginBottom: 8 }}>Administrator Access Only</h2>
          <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            The User Management console and activity monitor is restricted to verified NetSage AI administrators.
            Please sign in with your administrator account to access this area.
          </p>
          <button
            onClick={openAuthModal}
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#0284c7',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 6,
              fontWeight: 600
            }}
          >
            <LogIn size={16} />
            <span>Sign In as Admin</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;
  const totalActivities = users.reduce((acc, u) => acc + (u.activityCount || 0), 0);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, color: '#f8fafc', margin: 0 }}>
            <Shield size={24} color="#f59e0b" />
            <span>Admin User Management</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0 0' }}>
            Monitor user activities, manage lab permissions, and suspend or delete accounts.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="btn secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontSize: 13, fontWeight: 600 }}>
            <Users size={16} />
            <span>Total Registered</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f8fafc', marginTop: 8 }}>
            {totalUsers}
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontSize: 13, fontWeight: 600 }}>
            <UserCheck size={16} />
            <span>Active Users</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399', marginTop: 8 }}>
            {activeCount}
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
            <UserX size={16} />
            <span>Suspended</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f87171', marginTop: 8 }}>
            {suspendedCount}
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#a78bfa', fontSize: 13, fontWeight: 600 }}>
            <Activity size={16} />
            <span>Total Activities</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#c084fc', marginTop: 8 }}>
            {totalActivities}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 18,
        flexWrap: 'wrap',
        background: '#0f172a',
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid #1e293b'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={15} color="#64748b" style={{ position: 'absolute', left: 10, top: 10 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by user name or email..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#f8fafc',
              fontSize: 13,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 6,
            color: '#f8fafc',
            fontSize: 13,
            minWidth: 140
          }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended Only</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: 10,
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>User Profile</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Joined Date</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>Activity Count</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                    Loading user accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrentAdmin = u.id === user?.id;
                  const isSuspended = u.status === 'suspended';

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        background: isSuspended ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{u.email}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: u.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: u.role === 'admin' ? '#fbbf24' : '#38bdf8',
                          border: `1px solid ${u.role === 'admin' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                        }}>
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: isSuspended ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                          color: isSuspended ? '#f87171' : '#34d399',
                          border: `1px solid ${isSuspended ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`
                        }}>
                          {isSuspended ? <XCircle size={12} /> : <CheckCircle size={12} />}
                          <span>{u.status.toUpperCase()}</span>
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>{u.activityCount}</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>actions</span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          {/* Activity Button */}
                          <button
                            onClick={() => handleViewActivity(u)}
                            className="btn secondary"
                            title="View user activity history"
                            style={{ padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Activity size={13} />
                            <span>Activity</span>
                          </button>

                          {/* Suspend / Unsuspend */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrentAdmin || actionBusyId === u.id}
                            title={isCurrentAdmin ? 'Cannot suspend self' : isSuspended ? 'Unsuspend user' : 'Suspend user'}
                            style={{
                              padding: '6px 10px',
                              fontSize: 12,
                              borderRadius: 6,
                              cursor: isCurrentAdmin ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: isSuspended ? 'rgba(52, 211, 153, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              border: `1px solid ${isSuspended ? 'rgba(52, 211, 153, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                              color: isSuspended ? '#34d399' : '#fbbf24',
                              opacity: isCurrentAdmin ? 0.5 : 1
                            }}
                          >
                            {isSuspended ? <UserCheck size={13} /> : <UserX size={13} />}
                            <span>{isSuspended ? 'Unsuspend' : 'Suspend'}</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrentAdmin || actionBusyId === u.id}
                            title={isCurrentAdmin ? 'Cannot delete self' : 'Permanently delete user'}
                            style={{
                              padding: '6px 10px',
                              fontSize: 12,
                              borderRadius: 6,
                              cursor: isCurrentAdmin ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#f87171',
                              opacity: isCurrentAdmin ? 0.5 : 1
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Activity Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 16
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 12,
            width: '100%',
            maxWidth: 650,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #1e293b',
              background: 'rgba(30, 41, 59, 0.4)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} color="#38bdf8" />
                  <span>Activity Log: {selectedUser.name}</span>
                </h3>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{selectedUser.email}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {loadingActivities ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                  Loading activities...
                </div>
              ) : activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                  No recorded activities for this user yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid #1e293b',
                        borderRadius: 8,
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        gap: 12
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: '#0284c7',
                            color: '#fff'
                          }}>
                            {act.action}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#cbd5e1' }}>
                          {act.details}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} />
                        <span>{new Date(act.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #1e293b', textAlign: 'right' }}>
              <button
                className="btn secondary"
                onClick={() => setSelectedUser(null)}
                style={{ padding: '6px 16px', fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
