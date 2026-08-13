/**
 * authApi.js
 * Endpoints: POST /auth/login | /auth/send-otp | /auth/verify-otp
 *            GET  /auth/me
 *            POST /auth/change-password | /auth/logout
 */
import api from './index'

export const authApi = {
  // ── Login with email + password ───────────────────────────
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then(r => r.data),

  // ── Send OTP (email or mobile) ────────────────────────────
  sendOtp: (target, type = 'email', purpose = 'login') =>
    api.post('/auth/send-otp', { target, type, purpose }).then(r => r.data),

  // ── Verify OTP ────────────────────────────────────────────
  verifyOtp: (target, otp, purpose = 'login') =>
    api.post('/auth/verify-otp', { target, otp, purpose }).then(r => r.data),

  // ── Get logged-in user profile ────────────────────────────
  me: () =>
    api.get('/auth/me').then(r => r.data),

  // ── Change password ───────────────────────────────────────
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then(r => r.data),

  // ── Logout (clears localStorage too) ─────────────────────
  logout: async () => {
    try { await api.post('/auth/logout') } catch { /* server-side logout is best-effort */ }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('isLoggedIn')
  },
}
