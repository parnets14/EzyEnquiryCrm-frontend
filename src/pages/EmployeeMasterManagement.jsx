import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Layers, Tag } from 'lucide-react'
import { employeeMasterApi } from '../api/employeeMasterApi'

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_DEPT = { name: '', description: '', is_active: true }
const EMPTY_DESIG = { department_id: '', name: '', description: '', is_active: true }

// ─────────────────────────────────────────────────────────────
export default function EmployeeMasterManagement() {
  const [tab, setTab] = useState('department')

  // ── Toast ─────────────────────────────────────────────────
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const toast = (text, type = 'success') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3500)
  }

  // ── Department state ──────────────────────────────────────
  const [departments,  setDepartments]  = useState([])
  const [deptLoading,  setDeptLoading]  = useState(false)
  const [showDeptForm, setShowDeptForm] = useState(false)
  const [deptForm,     setDeptForm]     = useState(EMPTY_DEPT)
  const [deptErrors,   setDeptErrors]   = useState({})
  const [deptSaving,   setDeptSaving]   = useState(false)
  const [editDept,     setEditDept]     = useState(null)   // null=create, object=edit

  // ── Designation state ─────────────────────────────────────
  const [designations,  setDesignations]  = useState([])
  const [desigLoading,  setDesigLoading]  = useState(false)
  const [showDesigForm, setShowDesigForm] = useState(false)
  const [desigForm,     setDesigForm]     = useState(EMPTY_DESIG)
  const [desigErrors,   setDesigErrors]   = useState({})
  const [desigSaving,   setDesigSaving]   = useState(false)
  const [editDesig,     setEditDesig]     = useState(null)

  // ─────────────────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────────────────
  const loadDepartments = useCallback(async () => {
    setDeptLoading(true)
    try {
      const res  = await employeeMasterApi.listDepartments()
      const data = res?.data || res
      setDepartments(Array.isArray(data?.departments) ? data.departments : [])
    } catch { toast('Failed to load departments', 'error') }
    setDeptLoading(false)
  }, [])

  const loadDesignations = useCallback(async () => {
    setDesigLoading(true)
    try {
      const res  = await employeeMasterApi.listDesignations()
      const data = res?.data || res
      setDesignations(Array.isArray(data?.designations) ? data.designations : [])
    } catch { toast('Failed to load designations', 'error') }
    setDesigLoading(false)
  }, [])

  useEffect(() => {
    loadDepartments()
    loadDesignations()
  }, [loadDepartments, loadDesignations])

  // ─────────────────────────────────────────────────────────
  // DEPARTMENT CRUD
  // ─────────────────────────────────────────────────────────
  const validateDept = () => {
    const e = {}
    if (!deptForm.name.trim()) e.name = 'Department name is required'
    return e
  }

  const startEditDept = (dept) => {
    setEditDept(dept)
    setDeptForm({
      name:        dept.name        || '',
      description: dept.description || '',
      is_active:   dept.is_active !== false,
    })
    setDeptErrors({})
  }

  const cancelDept = () => {
    setEditDept(null)
    setDeptForm(EMPTY_DEPT)
    setDeptErrors({})
    setShowDeptForm(false)
  }

  const saveDept = async () => {
    const e = validateDept()
    if (Object.keys(e).length) { setDeptErrors(e); return }
    setDeptSaving(true)
    try {
      if (editDept) {
        const res    = await employeeMasterApi.updateDepartment(editDept._id || editDept.id, deptForm)
        const updated = res?.data || res
        setDepartments(prev => prev.map(d => (d._id === updated._id || d.id === updated.id) ? updated : d))
        toast(`Department "${updated.name}" updated`)
      } else {
        const res  = await employeeMasterApi.createDepartment(deptForm)
        const newD = res?.data || res
        setDepartments(prev => [...prev, newD])
        toast(`Department "${newD.name}" created`)
      }
      cancelDept()
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save department', 'error')
    }
    setDeptSaving(false)
  }

  const deleteDept = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? This will fail if designations exist under it.`)) return
    const deptId = String(dept._id || dept.id)
    try {
      await employeeMasterApi.deleteDepartment(deptId)
      setDepartments(prev => prev.filter(d => String(d._id || d.id) !== deptId))
      // Also remove orphaned designations from local state
      setDesignations(prev => prev.filter(d => {
        const did = String(d.department_id?._id || d.department_id)
        return did !== deptId
      }))
      toast(`Department "${dept.name}" deleted`)
    } catch (err) {
      toast(err.response?.data?.message || 'Cannot delete department', 'error')
    }
  }

  // ─────────────────────────────────────────────────────────
  // DESIGNATION CRUD
  // ─────────────────────────────────────────────────────────
  const validateDesig = () => {
    const e = {}
    if (!desigForm.department_id) e.department_id = 'Department is required'
    if (!desigForm.name.trim())   e.name = 'Designation name is required'
    return e
  }

  const startEditDesig = (desig) => {
    setEditDesig(desig)
    setDesigForm({
      department_id: String(desig.department_id?._id || desig.department_id || ''),
      name:          desig.name        || '',
      description:   desig.description || '',
      is_active:     desig.is_active !== false,
    })
    setDesigErrors({})
  }

  const cancelDesig = () => {
    setEditDesig(null)
    setDesigForm(EMPTY_DESIG)
    setDesigErrors({})
    setShowDesigForm(false)
  }

  const saveDesig = async () => {
    const e = validateDesig()
    if (Object.keys(e).length) { setDesigErrors(e); return }
    setDesigSaving(true)
    try {
      if (editDesig) {
        const res     = await employeeMasterApi.updateDesignation(editDesig._id || editDesig.id, desigForm)
        const updated = res?.data || res
        setDesignations(prev => prev.map(d => (d._id === updated._id || d.id === updated.id) ? updated : d))
        toast(`Designation "${updated.name}" updated`)
      } else {
        const res  = await employeeMasterApi.createDesignation(desigForm)
        const newD = res?.data || res
        setDesignations(prev => [...prev, newD])
        toast(`Designation "${newD.name}" created`)
      }
      cancelDesig()
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save designation', 'error')
    }
    setDesigSaving(false)
  }

  const deleteDesig = async (desig) => {
    if (!window.confirm(`Delete designation "${desig.name}"?`)) return
    const desigId = String(desig._id || desig.id)
    try {
      await employeeMasterApi.deleteDesignation(desigId)
      setDesignations(prev => prev.filter(d => String(d._id || d.id) !== desigId))
      toast(`Designation "${desig.name}" deleted`)
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete designation', 'error')
    }
  }

  // Also close form on tab switch
  const handleTabSwitch = (t) => {
    setTab(t)
    setShowDeptForm(false)
    setEditDept(null)
    setDeptForm(EMPTY_DEPT)
    setDeptErrors({})
    setShowDesigForm(false)
    setEditDesig(null)
    setDesigForm(EMPTY_DESIG)
    setDesigErrors({})
  }

  // Open dept form (add mode)
  const openAddDept = () => {
    setEditDept(null)
    setDeptForm(EMPTY_DEPT)
    setDeptErrors({})
    setShowDeptForm(true)
  }

  // Active departments for dropdown in designation form
  const activeDepts = departments.filter(d => d.is_active !== false)

  // Open desig form (add mode)
  const openAddDesig = () => {
    setEditDesig(null)
    setDesigForm(EMPTY_DESIG)
    setDesigErrors({})
    setShowDesigForm(true)
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="breadcrumb">
        <span>HR &amp; Admin</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Employee Master Management</span>
      </div>

      {/* Toast */}
      {msg && (
        <div
          className={`alert ${msgType === 'error' ? 'alert-danger' : 'alert-info'}`}
          style={{ marginBottom: 14 }}
        >
          {msgType === 'error' ? '✗ ' : '✓ '}{msg}
        </div>
      )}

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Departments',   val: departments.length,                                          color: 'blue'   },
          { label: 'Active Departments',  val: departments.filter(d => d.is_active !== false).length,       color: 'green'  },
          { label: 'Total Designations',  val: designations.length,                                         color: 'purple' },
          { label: 'Active Designations', val: designations.filter(d => d.is_active !== false).length,      color: 'orange' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}>
              {s.label.includes('Dept') ? <Layers /> : <Tag />}
            </div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn${tab === 'department' ? ' active' : ''}`}
          onClick={() => handleTabSwitch('department')}
        >
          <Layers style={{ width: 14, marginRight: 5 }} />Department
        </button>
        <button
          className={`tab-btn${tab === 'designation' ? ' active' : ''}`}
          onClick={() => handleTabSwitch('designation')}
        >
          <Tag style={{ width: 14, marginRight: 5 }} />Designation
        </button>
      </div>

      {/* ══════════ DEPARTMENT TAB ══════════ */}
      {tab === 'department' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Departments ({departments.length})</span>
            <button className="btn btn-primary" onClick={openAddDept}>
              <Plus style={{ width: 14 }} />Add Department
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Department ID</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deptLoading && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!deptLoading && departments.map(dept => (
                  <tr key={dept._id || dept.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>
                      {dept.dept_code || '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{dept.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {dept.description || '—'}
                    </td>
                    <td>
                      <span className={`badge ${dept.is_active !== false ? 'badge-green' : 'badge-red'}`}>
                        {dept.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{fmtDate(dept.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => { startEditDept(dept); setShowDeptForm(true) }}
                        >
                          <Edit2 style={{ width: 12 }} />Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => deleteDept(dept)}
                        >
                          <Trash2 style={{ width: 12 }} />Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!deptLoading && departments.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No departments yet. Click <strong>Add Department</strong> to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ DESIGNATION TAB ══════════ */}
      {tab === 'designation' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Designations ({designations.length})</span>
            <button className="btn btn-primary" onClick={openAddDesig}>
              <Plus style={{ width: 14 }} />Add Designation
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Designation ID</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {desigLoading && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      Loading…
                    </td>
                  </tr>
                )}
                {!desigLoading && designations.map(desig => (
                  <tr key={desig._id || desig.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>
                      {desig.desig_code || '—'}
                    </td>
                    <td>
                      <span className="badge badge-blue" style={{ fontSize: 11 }}>
                        {desig.department_id?.name || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{desig.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {desig.description || '—'}
                    </td>
                    <td>
                      <span className={`badge ${desig.is_active !== false ? 'badge-green' : 'badge-red'}`}>
                        {desig.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{fmtDate(desig.created_at)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => { startEditDesig(desig); setShowDesigForm(true) }}
                        >
                          <Edit2 style={{ width: 12 }} />Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => deleteDesig(desig)}
                        >
                          <Trash2 style={{ width: 12 }} />Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!desigLoading && designations.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No designations yet. Click <strong>Add Designation</strong> to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ DEPARTMENT MODAL ══════════ */}
      {showDeptForm && (
        <div className="modal-overlay" onClick={() => { setShowDeptForm(false); cancelDept() }}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editDept ? `Edit Department — ${editDept.name}` : 'Add Department'}
              </span>
              <button className="btn-ghost" onClick={() => { setShowDeptForm(false); cancelDept() }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department Name *</label>
                  <input
                    className={`form-control${deptErrors.name ? ' error' : ''}`}
                    placeholder="e.g. Sales"
                    value={deptForm.name}
                    onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))}
                    autoFocus
                  />
                  {deptErrors.name && <div className="form-error">{deptErrors.name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={deptForm.is_active ? 'active' : 'inactive'}
                    onChange={e => setDeptForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-control"
                  placeholder="Optional description"
                  value={deptForm.description}
                  onChange={e => setDeptForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowDeptForm(false); cancelDept() }}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={deptSaving} onClick={saveDept}>
                {deptSaving ? 'Saving…' : editDept ? 'Update Department' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DESIGNATION MODAL ══════════ */}
      {showDesigForm && (
        <div className="modal-overlay" onClick={() => { setShowDesigForm(false); cancelDesig() }}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editDesig ? `Edit Designation — ${editDesig.name}` : 'Add Designation'}
              </span>
              <button className="btn-ghost" onClick={() => { setShowDesigForm(false); cancelDesig() }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    className={`form-control${desigErrors.department_id ? ' error' : ''}`}
                    value={desigForm.department_id}
                    onChange={e => setDesigForm(p => ({ ...p, department_id: e.target.value }))}
                  >
                    <option value="">Select Department</option>
                    {activeDepts.map(d => (
                      <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
                    ))}
                  </select>
                  {desigErrors.department_id && (
                    <div className="form-error">{desigErrors.department_id}</div>
                  )}
                  {activeDepts.length === 0 && (
                    <div className="form-hint" style={{ color: 'var(--warning)' }}>
                      No active departments. Create departments first.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Designation Name *</label>
                  <input
                    className={`form-control${desigErrors.name ? ' error' : ''}`}
                    placeholder="e.g. Sales Executive"
                    value={desigForm.name}
                    onChange={e => setDesigForm(p => ({ ...p, name: e.target.value }))}
                    autoFocus
                  />
                  {desigErrors.name && <div className="form-error">{desigErrors.name}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    className="form-control"
                    placeholder="Optional description"
                    value={desigForm.description}
                    onChange={e => setDesigForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={desigForm.is_active ? 'active' : 'inactive'}
                    onChange={e => setDesigForm(p => ({ ...p, is_active: e.target.value === 'active' }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowDesigForm(false); cancelDesig() }}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={desigSaving} onClick={saveDesig}>
                {desigSaving ? 'Saving…' : editDesig ? 'Update Designation' : 'Create Designation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
