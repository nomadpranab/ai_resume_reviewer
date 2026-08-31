import axios from 'axios'

// In development: http://localhost:80 (through Docker Nginx)
// In production: same domain (empty string = relative URL)
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — adds Bearer token automatically
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

// Response interceptor — handles 401
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

export const authApi = {
  register: (data: { email: string; full_name: string; password: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
}

export const resumeApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/resume/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: () => api.get('/api/resume/list'),
  getDownloadUrl: (resumeId: number) =>
    api.get(`/api/resume/${resumeId}/download`),
  delete: (resumeId: number) => api.delete(`/api/resume/${resumeId}`),
}

export const reviewApi = {
  analyze: (resumeId: number) =>
    api.post(`/api/review/${resumeId}/analyze`),
  history: (resumeId: number) =>
    api.get(`/api/review/${resumeId}/history`),
}

export default api
