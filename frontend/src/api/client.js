// src/api/client.js
// Central axios instance + typed helper calls to the NetSage AI backend.
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach Authorization header if token exists in localStorage
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('netsage_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Auth ---
export const loginUser = (credentials) => client.post('/auth/login', credentials).then((r) => r.data);
export const registerUser = (payload) => client.post('/auth/register', payload).then((r) => r.data);
export const getMe = () => client.get('/auth/me').then((r) => r.data);

// --- Admin User Management (Admin Only) ---
export const getAdminUsers = () => client.get('/admin/users').then((r) => r.data);
export const getAdminUserActivity = (userId) => client.get(`/admin/users/${userId}/activity`).then((r) => r.data);
export const updateUserStatus = (userId, status) =>
  client.post(`/admin/users/${userId}/status`, { status }).then((r) => r.data);
export const deleteUser = (userId) => client.delete(`/admin/users/${userId}`).then((r) => r.data);

// --- Cases ---
export const listCases = (params = {}) => client.get('/cases', { params }).then((r) => r.data);
export const getCase = (id) => client.get(`/cases/${id}`).then((r) => r.data);
export const createCase = (payload) => client.post('/cases', payload).then((r) => r.data);
export const diagnoseCustomCase = (payload) => client.post('/cases/diagnose-custom', payload).then((r) => r.data);
export const verifyCaseFix = (caseId, payload) => client.post(`/cases/${caseId}/verify`, payload).then((r) => r.data);

// --- Diagnosis ---
export const runDiagnosis = (caseId) => client.post(`/diagnosis/${caseId}`).then((r) => r.data);
export const getDiagnosisHistory = (caseId) => client.get(`/diagnosis/${caseId}`).then((r) => r.data);

// --- Review ---
export const acceptDiagnosis = (diagnosisId, body = {}) =>
  client.post(`/review/${diagnosisId}/accept`, body).then((r) => r.data);
export const editDiagnosis = (diagnosisId, body) =>
  client.post(`/review/${diagnosisId}/edit`, body).then((r) => r.data);
export const rejectDiagnosis = (diagnosisId, body) =>
  client.post(`/review/${diagnosisId}/reject`, body).then((r) => r.data);
export const getCorrectionLogs = () => client.get('/review/logs').then((r) => r.data);

// --- Dashboard ---
export const getDashboardStats = () => client.get('/dashboard/stats').then((r) => r.data);

// --- Rule checker ---
export const checkShowOutputs = (showOutputs) =>
  client.post('/check', { showOutputs }).then((r) => r.data);

export default client;
