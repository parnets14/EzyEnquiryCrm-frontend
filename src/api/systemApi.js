/**
 * systemApi.js — Notifications · Documents · Subscriptions · Reports
 *
 * Notifications:  GET /notifications  •  PATCH /:id/read  •  PATCH /mark-all-read  •  DELETE /:id
 * Documents:      GET /documents      •  POST /documents (multipart)  •  DELETE /:id
 * Subscriptions:  GET|POST /subscriptions  •  PATCH /:id/cancel
 * Reports:        GET /reports/dashboard  |  /sales  |  /purchases  |  /expenses
 */
import api from './index'

// ── Notifications ─────────────────────────────────────────────
export const notificationApi = {
  // params: { is_read, page, limit }
  list: (params = {}) =>
    api.get('/notifications', { params }).then(r => r.data),

  markRead: (id) =>
    api.patch(`/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    api.patch('/notifications/mark-all-read').then(r => r.data),

  delete: (id) =>
    api.delete(`/notifications/${id}`).then(r => r.data),
}

// ── Documents ─────────────────────────────────────────────────
export const documentApi = {
  // params: { entity_type, entity_id, page, limit }
  list: (params = {}) =>
    api.get('/documents', { params }).then(r => r.data),

  // formData must contain files[] + entity_type + entity_id? + doc_type?
  upload: (formData) =>
    api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  delete: (id) =>
    api.delete(`/documents/${id}`).then(r => r.data),
}

// ── Subscriptions ─────────────────────────────────────────────
export const subscriptionApi = {
  list: () =>
    api.get('/subscriptions').then(r => r.data),

  // Body: { plan, starts_at, expires_at, amount_paid?, payment_ref? }
  create: (data) =>
    api.post('/subscriptions', data).then(r => r.data),

  cancel: (id) =>
    api.patch(`/subscriptions/${id}/cancel`).then(r => r.data),
}

// ── Reports / Analytics ───────────────────────────────────────
export const reportApi = {
  // Full dashboard KPIs + top products + top customers + recent enquiries
  getDashboardStats: () =>
    api.get('/reports/dashboard').then(r => r.data),

  // params: { from_date, to_date, group_by: 'day'|'month' }
  getSalesReport: (params = {}) =>
    api.get('/reports/sales', { params }).then(r => r.data),

  // params: { from_date, to_date }
  getPurchaseReport: (params = {}) =>
    api.get('/reports/purchases', { params }).then(r => r.data),

  // params: { from_date, to_date }
  getExpenseReport: (params = {}) =>
    api.get('/reports/expenses', { params }).then(r => r.data),
}
