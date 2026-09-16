/**
 * Gradient Calculation API
 * Backend: /api/gradient-calc
 */
import api from './index'

export const gradientApi = {
  /** List saved calculations (paginated). */
  list: (params = {}) =>
    api.get('/gradient-calc', { params }).then(r => r.data),

  /** Save a calculation to history. */
  save: (payload) =>
    api.post('/gradient-calc', payload).then(r => r.data),

  /** Delete one record by id. */
  remove: (id) =>
    api.delete(`/gradient-calc/${id}`).then(r => r.data),
}
