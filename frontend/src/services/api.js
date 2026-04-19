import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Inyectar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sst_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Callback registrado por el store para manejar sesión expirada
let _onSessionExpired = null
let _loggingOut = false
export const setSessionExpiredHandler = (fn) => { _onSessionExpired = fn }

// Manejar respuestas y errores globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ''
    const is401 = error.response?.status === 401
    const isLogoutEndpoint = url.includes('/auth/logout')

    if (is401 && !isLogoutEndpoint && !_loggingOut) {
      _loggingOut = true
      localStorage.removeItem('sst_token')
      if (_onSessionExpired) _onSessionExpired()
      setTimeout(() => { _loggingOut = false }, 3000)
    }
    return Promise.reject(error)
  }
)

export default api
