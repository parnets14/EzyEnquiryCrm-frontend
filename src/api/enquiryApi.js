/**
 * enquiryApi.js
 * Endpoints:
 *   GET    /enquiries/stats     → status-wise counts
 *   GET    /enquiries           → list (filter: status, search, page, limit)
 *   GET    /enquiries/:id       → single enquiry
 *   POST   /enquiries           → create enquiry
 *   PATCH  /enquiries/:id       → update (status, reply, negotiation note…)
 *   DELETE /enquiries/:id       → delete
 */
import api from './index'

export const enquiryApi = {
  // Status-count stats for dashboard badges
  stats: () =>
    api.get('/enquiries/stats').then(r => r.data),

  // List — params: { status, search, page, limit }
  list: (params = {}) =>
    api.get('/enquiries', { params }).then(r => r.data),

  get: (id) =>
    api.get(`/enquiries/${id}`).then(r => r.data),

  create: (data) =>
    api.post('/enquiries', data).then(r => r.data),

  // Partial update — status change, wholesaler reply, negotiation note etc.
  update: (id, data) =>
    api.patch(`/enquiries/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/enquiries/${id}`).then(r => r.data),
}
