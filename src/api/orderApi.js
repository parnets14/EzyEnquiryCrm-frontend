/**
 * orderApi.js
 * Endpoints:
 *   GET    /orders              → list (filter: status, search, page, limit)
 *   GET    /orders/:id          → single order
 *   POST   /orders              → create order (from enquiry or direct)
 *   PATCH  /orders/:id/status   → status flow: New→Accepted→Processing→Ready→Dispatched→Delivered
 *   PUT    /orders/:id          → full update
 *   DELETE /orders/:id          → delete
 */
import api from './index'

export const orderApi = {
  // List — params: { status, search, page, limit }
  list: (params = {}) =>
    api.get('/orders', { params }).then(r => r.data),

  get: (id) =>
    api.get(`/orders/${id}`).then(r => r.data),

  // Body: { customer_name, qty, rate, enquiry_id?, product_id?, gst_percent?, purchase_rate? }
  create: (data) =>
    api.post('/orders', data).then(r => r.data),

  // Body: { status, warehouse_status? }
  updateStatus: (id, data) =>
    api.patch(`/orders/${id}/status`, data).then(r => r.data),

  update: (id, data) =>
    api.put(`/orders/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/orders/${id}`).then(r => r.data),
}
