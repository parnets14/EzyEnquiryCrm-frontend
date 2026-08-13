/**
 * settingsApi.js
 * Company & System Settings
 *
 * Endpoints:
 *   GET    /companies/:id             → get company settings
 *   PUT    /companies/:id             → update company settings (name, gst, address…)
 *   GET    /subscriptions             → current subscription info
 *   POST   /subscriptions             → create/upgrade subscription
 *   PATCH  /subscriptions/:id/cancel  → cancel subscription
 *
 * Settings.jsx currently uses local state only.
 * Wire these in when the settings page needs live persistence.
 */
import api from './index'

export const settingsApi = {
  /**
   * Fetch company settings (name, gst, address, plan etc.)
   * @param {string} companyId
   */
  getCompany: (companyId) =>
    api.get(`/companies/${companyId}`).then(r => r.data),

  /**
   * Update company general settings.
   * Body: { name, mobile, email, gst_number, pan_number, address, city, state, pin_code }
   * @param {string} companyId
   * @param {object} data
   */
  updateCompany: (companyId, data) =>
    api.put(`/companies/${companyId}`, data).then(r => r.data),

  /**
   * Get active subscriptions for the company.
   */
  getSubscriptions: () =>
    api.get('/subscriptions').then(r => r.data),

  /**
   * Create a new subscription / upgrade plan.
   * Body: { plan, starts_at, expires_at, amount_paid, payment_ref }
   */
  createSubscription: (data) =>
    api.post('/subscriptions', data).then(r => r.data),

  /**
   * Cancel an active subscription.
   * @param {string} subscriptionId
   */
  cancelSubscription: (subscriptionId) =>
    api.patch(`/subscriptions/${subscriptionId}/cancel`).then(r => r.data),
}
