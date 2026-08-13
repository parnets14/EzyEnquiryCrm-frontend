/**
 * dispatchApi.js
 * Endpoints:
 *   GET    /dispatches          → list (filter: status, page, limit)
 *   GET    /dispatches/:id      → single dispatch
 *   POST   /dispatches          → create dispatch (auto-deducts inventory + sets order→Dispatched)
 *   PATCH  /dispatches/:id/deliver → mark delivered (auto-creates Sale + Receivable)
 *   PUT    /dispatches/:id      → edit dispatch details
 */
import api from './index'

export const dispatchApi = {
  // List — params: { status, page, limit }
  list: (params = {}) =>
    api.get('/dispatches', { params }).then(r => r.data),

  get: (id) =>
    api.get(`/dispatches/${id}`).then(r => r.data),

  // Body: { order_id, vehicle_number, driver_name, driver_mobile, transport_name, lr_number, dispatch_date, expected_delivery }
  create: (data) =>
    api.post('/dispatches', data).then(r => r.data),

  // Body: { delivered_date? }  — defaults to today on backend
  markDelivered: (id, delivered_date) =>
    api.patch(`/dispatches/${id}/deliver`, { delivered_date }).then(r => r.data),

  update: (id, data) =>
    api.put(`/dispatches/${id}`, data).then(r => r.data),
}
