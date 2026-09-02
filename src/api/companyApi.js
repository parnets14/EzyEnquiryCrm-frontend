/**
 * companyApi.js
 * Endpoints: GET|POST /companies  •  GET|PUT|DELETE /companies/:id
 *            PATCH /companies/:id/approve | /reject | /docs
 */
import api from './index'

export const companyApi = {
  // ── List all companies (Super Admin / Admin) ──────────────
  list: (params = {}) =>
    api.get('/companies', { params }).then(r => r.data),

  // ── Get single company ────────────────────────────────────
  get: (id) =>
    api.get(`/companies/${id}`).then(r => r.data),

  // ── Get signed URLs for a company's KYC documents (admin) ──
  documents: (id) =>
    api.get(`/companies/${id}/documents`).then(r => r.data),

  // ── Register a new company ────────────────────────────────
  create: (data) =>
    api.post('/companies', data).then(r => r.data),

  // ── Update company details ────────────────────────────────
  update: (id, data) =>
    api.put(`/companies/${id}`, data).then(r => r.data),

  // ── Delete company (Super Admin only) ─────────────────────
  delete: (id) =>
    api.delete(`/companies/${id}`).then(r => r.data),

  // ── Approve company (Super Admin only) ───────────────────
  approve: (id) =>
    api.patch(`/companies/${id}/approve`).then(r => r.data),

  // ── Reject company (Super Admin only) ────────────────────
  reject: (id, reject_reason = '') =>
    api.patch(`/companies/${id}/reject`, { reject_reason }).then(r => r.data),

  // ── Update document status ────────────────────────────────
  updateDocs: (id, docs) =>
    api.patch(`/companies/${id}/docs`, docs).then(r => r.data),
}
