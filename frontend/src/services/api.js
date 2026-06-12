// AIVENTRA AI-only API client.
// Data (cases, evidence, geo, timeline, dashboard) now lives in Firestore.
// FastAPI exposes only AI inference endpoints, and every request carries
// a Firebase ID token in the Authorization header.
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL,
  timeout: 60000,
});

// Async token provider set by AuthContext. Resolved fresh per request
// so token rotation just works.
let getTokenAsync = async () => null;
export function setAuthTokenProvider(fn) {
  getTokenAsync = fn;
}

apiClient.interceptors.request.use(async (config) => {
  try {
    const t = await getTokenAsync();
    if (t) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${t}`;
    }
  } catch (_) {
    // no token — request will proceed unauthenticated and the server may 401
  }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      // Soft notify — actual sign-out is handled by Firebase auth listener
      console.warn('[api] 401 — token may be expired or invalid');
    }
    return Promise.reject(err);
  },
);

// ─── AI endpoints (FastAPI) ────────────────────────────────────────
export const reportsApi = {
  analyze: async (file, caseId) => {
    const fd = new FormData();
    fd.append('file', file);
    if (caseId) fd.append('case_id', caseId);
    const r = await apiClient.post('/reports/analyze', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },
};

export const todApi = {
  estimate: async (payload) => (await apiClient.post('/tod/estimate', payload)).data,
};

export const riskApi = {
  score: async (caseId) => (await apiClient.get(`/risk/score/${caseId}`)).data,
  recompute: async (caseId, signals) =>
    (await apiClient.post(`/risk/score/${caseId}`, signals || {})).data,
};

export const timelineApi = {
  forCase: async (caseId) => (await apiClient.get(`/timeline/${caseId}`)).data,
};

export const chatApi = {
  ask: async ({ query, case_id, history }) =>
    (await apiClient.post('/assistant/ask', { query, case_id, history: history || [] })).data,
};

export const imageApi = {
  analyze: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await apiClient.post('/images/analyze', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data;
  },

  /**
   * Unified endpoint — accepts BOTH images and PDF autopsy reports.
   * Returns body_diagram + structured injuries.
   */
  generateBodyChart: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const r = await apiClient.post('/images/generate-body-chart', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // PDFs with OCR can take a while
    });
    return r.data;
  },
};

// Health probe
export const systemApi = {
  health: async () => (await apiClient.get('/health')).data,
};

// Geocoding (Nominatim via FastAPI proxy)
export const geocodeApi = {
  forward: async (q, limit = 1) =>
    (await apiClient.get('/geocode/forward', { params: { q, limit } })).data,
  reverse: async (lat, lng) =>
    (await apiClient.get('/geocode/reverse', { params: { lat, lng } })).data,
};

export default apiClient;
