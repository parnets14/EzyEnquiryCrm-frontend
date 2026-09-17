/**
 * retailerApi.js
 * Admin-side retailer management API calls.
 * All endpoints hit the admin-facing routes, not the retailer-app routes.
 */
import api from './index'

export const retailerApi = {
  // ── All registered retailer companies (admin view) ────────
  listCompanies: (params = {}) =>
    api.get('/retailer/admin/companies', { params }).then(r => r.data),

  // ── Single retailer company ───────────────────────────────
  getCompany: (id) =>
    api.get(`/retailer/admin/companies/${id}`).then(r => r.data),

  // ── Approve / reject a pending retailer ──────────────────
  approveCompany: (id) =>
    api.patch(`/retailer/admin/companies/${id}/approve`).then(r => r.data),

  rejectCompany: (id, reason = '') =>
    api.patch(`/retailer/admin/companies/${id}/reject`, { reason }).then(r => r.data),

  // ── Suspend / reinstate ───────────────────────────────────
  suspendCompany: (id, reason = '') =>
    api.patch(`/retailer/admin/companies/${id}/suspend`, { reason }).then(r => r.data),

  reinstateCompany: (id) =>
    api.patch(`/retailer/admin/companies/${id}/reinstate`).then(r => r.data),

  // ── All retailer users (across all companies) ─────────────
  listUsers: (params = {}) =>
    api.get('/retailer/admin/users', { params }).then(r => r.data),

  // ── All retailer orders (admin view) ─────────────────────
  listOrders: (params = {}) =>
    api.get('/retailer/admin/orders', { params }).then(r => r.data),

  // ── All retailer enquiries (admin view) ───────────────────
  listEnquiries: (params = {}) =>
    api.get('/retailer/admin/enquiries', { params }).then(r => r.data),

  // ── Subscription plan management ─────────────────────────
  listSubscriptions: (params = {}) =>
    api.get('/subscriptions/admin/all', { params }).then(r => r.data),

  setCompanyPlan: (companyId, data) =>
    api.patch(`/subscriptions/company/${companyId}`, data).then(r => r.data),

  // ── KYC documents for a retailer company ─────────────────
  getKycDocs: (companyId) =>
    api.get(`/retailer/admin/companies/${companyId}/kyc`).then(r => r.data),

  // ── Revenue summary ───────────────────────────────────────
  revenue: () =>
    api.get('/subscriptions/admin/revenue').then(r => r.data),
}
