/**
 * api/index.js — Axios instance + re-exports for all API modules
 *
 * • baseURL  → http://localhost:5000/api  (PORT=5000 from backend .env)
 * • Every request automatically gets  Authorization: Bearer <token>
 * • Any 401 response clears storage and redirects to /login
 *
 * Usage:
 *   import api from './api'                     // axios instance
 *   import { authApi } from './api/authApi'     // named module
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Attach JWT on every request ────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error),
)

// ── Handle 401 globally ────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('isLoggedIn')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api

// ── Re-export all API modules ───────────────────────────────
export { authApi }            from './authApi'
export { companyApi }         from './companyApi'
export { branchApi }          from './branchApi'
export { userApi }            from './userApi'
export { profileApi }         from './profileApi'
export { settingsApi }        from './settingsApi'
export { categoryApi, brandApi, productApi } from './productApi'
export { inventoryApi }       from './inventoryApi'
export { enquiryApi }         from './enquiryApi'
export { orderApi }           from './orderApi'
export { dispatchApi }        from './dispatchApi'
export { customerApi, leadApi, followupApi } from './crmApi'
export { purchaseApi, salesApi, expenseApi, paymentApi } from './financeApi'
export { hrApi }              from './hrApi'
export { notificationApi, documentApi, subscriptionApi, reportApi } from './systemApi'
