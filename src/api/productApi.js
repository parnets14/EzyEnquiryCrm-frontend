/**
 * productApi.js
 * Covers: Categories · Sub-categories · Brands · Products · Product Search · Recycle Bin
 */
import api from './index'

// ── Categories ────────────────────────────────────────────────
export const categoryApi = {
  list: () =>
    api.get('/categories').then(r => r.data),

  create: (data) =>
    api.post('/categories', data).then(r => r.data),

  update: (id, data) =>
    api.put(`/categories/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/categories/${id}`).then(r => r.data),
}

// ── Sub-Categories ────────────────────────────────────────────
export const subCategoryApi = {
  list: (params = {}) =>
    api.get('/sub-categories', { params }).then(r => r.data),

  listByCategory: (categoryId) =>
    api.get('/sub-categories', { params: { categoryId } }).then(r => r.data),

  create: (data) =>
    api.post('/sub-categories', data).then(r => r.data),

  update: (id, data) =>
    api.put(`/sub-categories/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/sub-categories/${id}`).then(r => r.data),
}

// ── Brands ────────────────────────────────────────────────────
export const brandApi = {
  list: () =>
    api.get('/brands').then(r => r.data),

  create: (data) =>
    api.post('/brands', data).then(r => r.data),

  update: (id, data) =>
    api.put(`/brands/${id}`, data).then(r => r.data),

  delete: (id) =>
    api.delete(`/brands/${id}`).then(r => r.data),
}

// ── Products ──────────────────────────────────────────────────
export const productApi = {
  // List with filters
  list: (params = {}) =>
    api.get('/products', { params }).then(r => r.data),

  // Super Admin cross-company product catalogue.
  listAll: (params = {}) =>
    api.get('/products/admin/all', { params }).then(r => r.data),

  // Active brands/categories belonging to a product owner company.
  getCompanyTaxonomy: (companyId) =>
    api.get(`/products/admin/company/${companyId}/taxonomy`).then(r => r.data),

  // Taxonomy for legacy products whose owner company record no longer exists.
  getProductTaxonomy: (productId) =>
    api.get(`/products/admin/product/${productId}/taxonomy`).then(r => r.data),

  // Full-text marketplace search
  search: (params = {}) =>
    api.get('/products/search', { params }).then(r => r.data),

  get: (id) =>
    api.get(`/products/${id}`).then(r => r.data),

  // create — supports optional image File objects in data.imageFiles[]
  create: (data) => {
    const { imageFiles, ...fields } = data
    const hasImages = imageFiles && imageFiles.length > 0
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => {
      if (v === null || v === undefined) return
      if (typeof v === 'boolean') { fd.append(k, v ? 'true' : 'false'); return }
      if (Array.isArray(v))       { fd.append(k, JSON.stringify(v));     return }
      fd.append(k, v)
    })
    if (hasImages) imageFiles.forEach(f => fd.append('file', f))
    return api.post('/products', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  // update — supports optional image File objects in data.imageFiles[]
  update: (id, data) => {
    const { imageFiles, image_urls, ...fields } = data
    const hasImages = imageFiles && imageFiles.length > 0
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => {
      if (v === null || v === undefined) return
      if (typeof v === 'boolean') { fd.append(k, v ? 'true' : 'false'); return }
      if (Array.isArray(v))       { fd.append(k, JSON.stringify(v));     return }
      fd.append(k, v)
    })
    fd.append('image_urls', JSON.stringify(Array.isArray(image_urls) ? image_urls : []))
    if (hasImages) imageFiles.forEach(f => fd.append('file', f))
    return api.put(`/products/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  delete: (id) =>
    api.delete(`/products/${id}`).then(r => r.data),

  // ── Recycle Bin ───────────────────────────────────────────
  // GET /products/recycle-bin — list soft-deleted products
  getRecycleBin: (params = {}) =>
    api.get('/products/recycle-bin', { params }).then(r => r.data),

  // POST /products/:id/restore — restore product from recycle bin
  restore: (id) =>
    api.post(`/products/${id}/restore`).then(r => r.data),

  // Check if product has linked transactions
  checkTransactions: (id) =>
    api.get(`/products/${id}/check-transactions`).then(r => r.data),

  // Upload extra images to an existing product
  uploadImage: (id, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/products/${id}/upload-image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}
