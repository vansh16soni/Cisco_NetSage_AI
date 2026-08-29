// src/api/client.js
// Central axios instance + typed helper calls to the NetSage AI backend.
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// --- Cases ---
export const listCases = (params = {}) => client.get('/cases', { params }).then((r) => r.data);
export const getCase = (id) => client.get(`/cases/${id}`).then((r) => r.data);
export const createCase = (payload) => client.post('/cases', payload).then((r) => r.data);
export const diagnoseCustomCase = (payload) => client.post('/cases/diagnose-custom', payload).then((r) => r.data);

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
