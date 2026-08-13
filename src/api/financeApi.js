/**
 * financeApi.js — Purchases · Suppliers · Sales · Expenses · Payments · P&L · Ledgers
 *
 * Purchase:     GET|POST /purchases  •  GET|PUT|DELETE /purchases/:id
 *               GET /purchases/suppliers/all  •  POST /purchases/suppliers
 *               PUT|DELETE /purchases/suppliers/:id
 *
 * Sales:        GET|POST /sales
 *
 * Expenses:     GET|POST /expenses  •  PUT|DELETE /expenses/:id
 *
 * Payments:     GET /payments/receivables  |  /payables  |  /transactions
 *               PATCH /payments/receivables/:id/collect
 *               PATCH /payments/payables/:id/pay
 *               GET   /payments/profit-loss
 *               GET   /payments/ledger/customer?customer_id=
 *               GET   /payments/ledger/supplier?supplier_id=
 */
import api from './index'

// ── Purchases ─────────────────────────────────────────────────
export const purchaseApi = {
  // params: { search, supplier_id, status, page, limit }
  list: (params = {}) =>
    api.get('/purchases', { params }).then(r => r.data),

  get: (id) =>
    api.get(`/purchases/${id}`).then(r => r.data),

  // Auto-increments stock + creates a Payable on backend
  create: (data) =>
    api.post('/purchases', data).then(r => r.data),

  update: (id, data) =>
    api.put(`/purchases/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/purchases/${id}`).then(r => r.data),

  // ── Suppliers ───────────────────────────────────────────
  listSuppliers: () =>
    api.get('/purchases/suppliers/all').then(r => r.data),

  createSupplier: (data) =>
    api.post('/purchases/suppliers', data).then(r => r.data),

  updateSupplier: (id, data) =>
    api.put(`/purchases/suppliers/${id}`, data).then(r => r.data),

  deleteSupplier: (id) =>
    api.delete(`/purchases/suppliers/${id}`).then(r => r.data),
}

// ── Sales ─────────────────────────────────────────────────────
export const salesApi = {
  // params: { search, payment_status, page, limit }
  list: (params = {}) =>
    api.get('/sales', { params }).then(r => r.data),

  // Manual sale entry (auto-entries happen via dispatch→deliver flow)
  create: (data) =>
    api.post('/sales', data).then(r => r.data),
}

// ── Expenses ──────────────────────────────────────────────────
export const expenseApi = {
  // params: { category, from_date, to_date, page, limit }
  list: (params = {}) =>
    api.get('/expenses', { params }).then(r => r.data),

  create: (data) =>
    api.post('/expenses', data).then(r => r.data),

  update: (id, data) =>
    api.put(`/expenses/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/expenses/${id}`).then(r => r.data),
}

// ── Payments ──────────────────────────────────────────────────
export const paymentApi = {
  // ── Receivables (customer outstanding) ──────────────────
  listReceivables: (params = {}) =>
    api.get('/payments/receivables', { params }).then(r => r.data),

  // Body: { amount, mode, reference, notes }
  collectReceivable: (id, data) =>
    api.patch(`/payments/receivables/${id}/collect`, data).then(r => r.data),

  // ── Payables (supplier outstanding) ─────────────────────
  listPayables: (params = {}) =>
    api.get('/payments/payables', { params }).then(r => r.data),

  // Body: { amount, mode, reference, notes }
  payPayable: (id, data) =>
    api.patch(`/payments/payables/${id}/pay`, data).then(r => r.data),

  // ── Transaction history ──────────────────────────────────
  listTransactions: (params = {}) =>
    api.get('/payments/transactions', { params }).then(r => r.data),

  // ── Profit & Loss ────────────────────────────────────────
  // params: { from_date, to_date }
  getProfitLoss: (params = {}) =>
    api.get('/payments/profit-loss', { params }).then(r => r.data),

  // ── Ledgers ──────────────────────────────────────────────
  getCustomerLedger: (customer_id) =>
    api.get('/payments/ledger/customer', { params: { customer_id } }).then(r => r.data),

  getSupplierLedger: (supplier_id) =>
    api.get('/payments/ledger/supplier', { params: { supplier_id } }).then(r => r.data),
}
