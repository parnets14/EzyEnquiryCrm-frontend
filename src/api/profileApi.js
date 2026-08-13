/**
 * profileApi.js
 * User Profile & Account Settings
 *
 * Endpoints:
 *   GET    /auth/me                   → get own profile (via authApi.me)
 *   PUT    /users/:id                 → update profile fields
 *   POST   /auth/change-password      → change password (via authApi.changePassword)
 *   POST   /documents (multipart)     → upload avatar / profile photo
 *
 * Profile.jsx uses authApi directly for /auth/me and /auth/change-password.
 * This file provides the extra update-profile and avatar-upload helpers.
 */
import api from './index'

export const profileApi = {
  /**
   * Update own profile (name, phone, department, location, bio).
   * Backend: PUT /api/users/:id — Admin/Self route.
   * @param {string} userId  - logged-in user's _id
   * @param {object} data    - { name, mobile, role, is_active, ... }
   */
  update: (userId, data) =>
    api.put(`/users/${userId}`, data).then(r => r.data),

  /**
   * Upload a profile avatar image.
   * Backend: POST /api/documents  (multipart/form-data)
   * @param {File} file          - image file
   * @param {string} userId      - used as entity_id
   */
  uploadAvatar: (file, userId) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('entity_type', 'user_avatar')
    formData.append('entity_id', userId)
    formData.append('doc_type', 'avatar')
    return api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  /**
   * Get activity log for the current user.
   * Backend: GET /api/users/:id  — returns user + last activity
   * @param {string} userId
   */
  getActivity: (userId) =>
    api.get(`/users/${userId}`).then(r => r.data),
}
