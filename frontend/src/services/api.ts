import axios from 'axios'

// All API calls go to the FastAPI backend via Nginx
const BASE_URL = 'http://localhost:8000'

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
// Automatically adds Bearer token to every request
// No need to manually add token in every API call
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
// If any request returns 401 → token expired → redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { email: string; full_name: string; password: string }) =>
    api.post('/api/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),

  me: () =>
    api.get('/api/auth/me'),
}

// ── Resume API ────────────────────────────────────────────────────────────────

export const resumeApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  list: () =>
    api.get('/api/resume/list'),

  getDownloadUrl: (resumeId: number) =>
    api.get(`/api/resume/${resumeId}/download`),

  delete: (resumeId: number) =>
    api.delete(`/api/resume/${resumeId}`),
}

// ── Review API ────────────────────────────────────────────────────────────────

export const reviewApi = {
  analyze: (resumeId: number) =>
    api.post(`/api/review/${resumeId}/analyze`),

  history: (resumeId: number) =>
    api.get(`/api/review/${resumeId}/history`),
}

export default api
