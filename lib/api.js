import axios from 'axios';

const API_BASE = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_BASE });

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('aod_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Search
export const searchAPI = {
  search: (params) => api.get('/search', { params }),
};

// Occupations
export const occupationAPI = {
  get: (code) => api.get(`/occupations/${encodeURIComponent(code)}`),
  tasks: (code, params) => api.get(`/occupations/${encodeURIComponent(code)}/tasks`, { params }),
  skills: (code) => api.get(`/occupations/${encodeURIComponent(code)}/skills`),
  knowledge: (code) => api.get(`/occupations/${encodeURIComponent(code)}/knowledge`),
  abilities: (code) => api.get(`/occupations/${encodeURIComponent(code)}/abilities`),
  workActivities: (code) => api.get(`/occupations/${encodeURIComponent(code)}/work-activities`),
  workContext: (code) => api.get(`/occupations/${encodeURIComponent(code)}/work-context`),
  tools: (code) => api.get(`/occupations/${encodeURIComponent(code)}/tools`),
  education: (code) => api.get(`/occupations/${encodeURIComponent(code)}/education`),
  related: (code) => api.get(`/occupations/${encodeURIComponent(code)}/related`),
  workStyles: (code) => api.get(`/occupations/${encodeURIComponent(code)}/work-styles`),
  export: (code, format) => api.get(`/occupations/${encodeURIComponent(code)}/export`, { params: { format }, responseType: format === 'csv' ? 'blob' : 'json' }),
};

// Industries
export const industryAPI = {
  list: () => api.get('/industries'),
  occupations: (code, params) => api.get(`/industries/${code}/occupations`, { params }),
};

// Stats
export const statsAPI = {
  get: () => api.get('/stats'),
  featured: () => api.get('/featured'),
};

// Ask the Data
export const askAPI = {
  ask: (question, language = 'en') => api.post('/ask', { question, language }),
};

// Library
export const libraryAPI = {
  save: (onet_code) => api.post('/library/save', { onet_code }),
  list: () => api.get('/library'),
  check: (onet_code) => api.get(`/library/check/${encodeURIComponent(onet_code)}`),
};

// Marketplace
export const marketplaceAPI = {
  list: (params) => api.get('/marketplace/packs', { params }),
  get: (id) => api.get(`/marketplace/packs/${id}`),
  create: (data) => api.post('/marketplace/packs', data),
};

// Pack Builder
export const packBuilderAPI = {
  export: (codes, format = 'json') => api.post('/pack-builder/export', { codes, format }, {
    responseType: format === 'csv' ? 'blob' : 'json',
  }),
};

// Crosswalks
export const crosswalkAPI = {
  get: (code) => api.get(`/crosswalks/${encodeURIComponent(code)}`),
};

// NOC
export const nocAPI = {
  get: (code) => api.get(`/noc/${encodeURIComponent(code)}`),
};

// API Keys
export const apiKeysAPI = {
  generate: () => api.post('/api-keys/generate'),
  list: () => api.get('/api-keys'),
};

export default api;
