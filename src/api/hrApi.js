/**
 * hrApi.js — Employees · Attendance · Salary
 *
 * Employee:   GET|POST /employees  •  GET|PUT|DELETE /employees/:id
 * Attendance: GET /employees/attendance/list  •  POST /employees/attendance/mark
 * Salary:     GET|POST /employees/salary/records
 *             PATCH /employees/salary/records/:id/pay
 */
import api from './index'

export const hrApi = {
  // ── Employees ─────────────────────────────────────────────
  // params: { department, is_active, page, limit }
  listEmployees: (params = {}) =>
    api.get('/employees', { params }).then(r => r.data),

  // Returns employee + last 30 attendance records
  getEmployee: (id) =>
    api.get(`/employees/${id}`).then(r => r.data),

  createEmployee: (data) =>
    api.post('/employees', data).then(r => r.data),

  updateEmployee: (id, data) =>
    api.put(`/employees/${id}`, data).then(r => r.data),

  deleteEmployee: (id) =>
    api.delete(`/employees/${id}`).then(r => r.data),

  // ── Attendance ────────────────────────────────────────────
  // params: { employee_id, date, page, limit }
  listAttendance: (params = {}) =>
    api.get('/employees/attendance/list', { params }).then(r => r.data),

  // Body: { employee_id, date, status, check_in?, check_out? }
  markAttendance: (data) =>
    api.post('/employees/attendance/mark', data).then(r => r.data),

  // ── Salary ────────────────────────────────────────────────
  // params: { employee_id, month, year, page, limit }
  listSalary: (params = {}) =>
    api.get('/employees/salary/records', { params }).then(r => r.data),

  // Body: { employee_id, month, year, basic_salary, allowances?, deductions? }
  createSalary: (data) =>
    api.post('/employees/salary/records', data).then(r => r.data),

  // Body: { payment_date, payment_mode, reference? }
  paySalary: (id, data) =>
    api.patch(`/employees/salary/records/${id}/pay`, data).then(r => r.data),
}
