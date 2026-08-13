import { useState } from 'react'
import { Plus, Search, Trash2, Shield, Check, X, Save, Users, UserCheck, UserX, Crown } from 'lucide-react'

const ROLES = ['Super Admin', 'Company Owner', 'Manager', 'Accountant', 'Sales Executive', 'Warehouse Staff', 'Retailer', 'Wholesaler']

const roleColors = {
  'Super Admin':    'badge-purple',
  'Company Owner':  'badge-blue',
  'Manager':        'badge-cyan',
  'Accountant':     'badge-green',
  'Sales Executive':'badge-orange',
  'Warehouse Staff':'badge-yellow',
  'Retailer':       'badge-red',
  'Wholesaler':     'badge-gray',
}

const MODULES = [
  { module: 'Dashboard',           perms: ['View'] },
  { module: 'Company Registration',perms: ['View', 'Edit'] },
  { module: 'User Management',     perms: ['View', 'Add', 'Edit', 'Delete'] },
  { module: 'Product Management',  perms: ['View', 'Add', 'Edit', 'Delete'] },
  { module: 'Inventory Management',perms: ['View', 'Stock In', 'Stock Out', 'Transfer'] },
  { module: 'Product Search',      perms: ['View', 'Enquire'] },
  { module: 'Enquiry Management',  perms: ['View', 'Create', 'Reply', 'Close'] },
  { module: 'Order Management',    perms: ['View', 'Create', 'Edit', 'Cancel'] },
  { module: 'Dispatch Management', perms: ['View', 'Create', 'Update'] },
  { module: 'Customer Management', perms: ['View', 'Add', 'Edit'] },
  { module: 'Lead Management',     perms: ['View', 'Add', 'Edit', 'Delete'] },
  { module: 'Follow-up Management',perms: ['View', 'Add', 'Mark Done'] },
  { module: 'Sales Management',    perms: ['View', 'Add', 'Export'] },
  { module: 'Purchase Management', perms: ['View', 'Add', 'Export'] },
  { module: 'Expense Management',  perms: ['View', 'Add', 'Delete'] },
  { module: 'Profit & Loss',       perms: ['View', 'Export'] },
  { module: 'Payment Management',  perms: ['View', 'Record', 'Export'] },
  { module: 'Employee Management', perms: ['View', 'Add', 'Edit', 'Salary'] },
  { module: 'Notification System', perms: ['View', 'Configure'] },
  { module: 'Report Center',       perms: ['View', 'Export'] },
  { module: 'Warehouse Management',perms: ['View', 'Add', 'Edit'] },
  { module: 'Document Management', perms: ['View', 'Upload', 'Delete'] },
  { module: 'Subscription System', perms: ['View', 'Upgrade'] },
]

const defaultMatrix = () => {
  const m = {}
  ROLES.forEach((_role, ri) => {
    m[ri] = {}
    MODULES.forEach((mod, mi) => {
      m[ri][mi] = {}
      mod.perms.forEach((_perm, pi) => {
        if      (ri === 0) m[ri][mi][pi] = true                                          // Super Admin – full access
        else if (ri === 1) m[ri][mi][pi] = pi < 2 || (pi === 2 && mi < 18)              // Company Owner
        else if (ri === 2) m[ri][mi][pi] = pi === 0 || (pi === 1 && mi >= 5 && mi <= 14)// Manager
        else if (ri === 3) m[ri][mi][pi] = mi >= 12 && mi <= 18 && pi === 0             // Accountant
        else if (ri === 4) m[ri][mi][pi] = (mi >= 6 && mi <= 14 && pi <= 1) || mi === 9 // Sales Executive
        else if (ri === 5) m[ri][mi][pi] = mi === 4 && pi <= 2                          // Warehouse Staff
        else if (ri === 6) m[ri][mi][pi] = mi === 5 && pi === 0                         // Retailer
        else               m[ri][mi][pi] = mi === 5 && pi === 0                         // Wholesaler
      })
    })
  })
  return m
}

const EMPTY_FORM = { name: '', mobile: '', email: '', password: '', role: 'Sales Executive' }

export default function UserManagement({ users = [], addUser, deleteUser, resetUserPassword, loadingData }) {
  const [mainTab, setMainTab] = useState('users')
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [errors, setErrors]         = useState({})
  const [successMsg, setSuccessMsg] = useState('')
  const [saving, setSaving]         = useState(false)
  const [selectedRole, setSelectedRole] = useState(0)
  const [matrix, setMatrix]         = useState(defaultMatrix())
  const [permSaved, setPermSaved]   = useState(false)

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const filtered = users.filter(u =>
    (roleFilter === 'All' || u.role === roleFilter) &&
    ((u.name || '').toLowerCase().includes(search.toLowerCase()) ||
     (u.email || '').toLowerCase().includes(search.toLowerCase()))
  )

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name   = 'Name required'
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required'
    if (!form.email.trim()) e.email  = 'Email required'
    if (!form.password || form.password.length < 8) e.password = 'Password min 8 chars'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const result = await addUser?.({ name: form.name, mobile: form.mobile, email: form.email, password: form.password, role: form.role })
    setSaving(false)
    if (result?.success === false) { toast(`Error: ${result.message}`); return }
    setForm(EMPTY_FORM); setErrors({})
    setShowModal(false)
    toast(`User ${form.name} created`)
  }

  const handleDelete = async (id) => {
    const result = await deleteUser?.(id)
    if (result?.success === false) toast(`Error: ${result.message}`)
    else toast('User removed')
  }

  const togglePerm = (mi, pi) => {
    setMatrix(prev => { const next = JSON.parse(JSON.stringify(prev)); next[selectedRole][mi][pi] = !next[selectedRole][mi][pi]; return next })
    setPermSaved(false)
  }
  const handlePermSave = () => { setPermSaved(true); setTimeout(() => setPermSaved(false), 2500) }

  return (
    <>
      <div className="breadcrumb">
        <span>Admin</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">User & Role Management</span>
      </div>

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div className="page-header-left">
          <div className="page-title">User & Role Management</div>
          <div className="page-desc">Manage system users, roles and module-level permissions</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setMainTab('users'); setForm(EMPTY_FORM); setErrors({}); setShowModal(true) }}>
            <Plus />Add User
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck style={{ width: 16, flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      {/* ── Main Tab switcher ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button className={`tab-btn${mainTab === 'users' ? ' active' : ''}`} onClick={() => setMainTab('users')}>
          👥 User Management
        </button>
        <button className={`tab-btn${mainTab === 'roles' ? ' active' : ''}`} onClick={() => setMainTab('roles')}>
          🛡️ Roles & Permissions
        </button>
      </div>

      {/* ══════════════════════════════════════════
          TAB: USER MANAGEMENT
      ══════════════════════════════════════════ */}
      {mainTab === 'users' && (
        <>
          {/* Summary row — Total + Active + Inactive */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { key: 'All',      label: 'Total Users',    value: users.length,                                         bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB', textColor: '#1D4ED8', borderColor: '#BFDBFE', Icon: Users       },
              { key: 'Active',   label: 'Active',          value: users.filter(u => u.is_active !== false).length,      bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#059669', textColor: '#047857', borderColor: '#A7F3D0', Icon: UserCheck   },
              { key: 'Inactive', label: 'Inactive',        value: users.filter(u => u.is_active === false).length,      bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626', textColor: '#B91C1C', borderColor: '#FECACA', Icon: UserX       },
              { key: 'Admin',    label: 'Admins',          value: users.filter(u => u.role === 'Super Admin' || u.role === 'Company Owner').length, bg: '#F5F3FF', iconBg: '#EDE9FE', iconColor: '#7C3AED', textColor: '#6D28D9', borderColor: '#DDD6FE', Icon: Crown },
            ].map(s => {
              const active = roleFilter === s.key
              return (
                <div
                  key={s.key}
                  onClick={() => setRoleFilter(active ? 'All' : s.key)}
                  style={{
                    background:   active ? s.iconBg  : s.bg,
                    border:       `1.5px solid ${active ? s.iconColor : s.borderColor}`,
                    borderRadius: 10,
                    padding:      '12px 14px',
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          10,
                    boxShadow:    active ? `0 0 0 3px ${s.borderColor}` : 'var(--shadow)',
                    transition:   'all 0.15s',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: s.iconBg, border: `1px solid ${s.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.Icon style={{ width: 16, height: 16, color: s.iconColor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: s.textColor, marginBottom: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.textColor, lineHeight: 1 }}>{s.value}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="card-title">
                  {roleFilter === 'All' ? `All Users` : roleFilter}
                  {' '}({filtered.length})
                </span>
                {roleFilter !== 'All' && (
                  <button
                    onClick={() => setRoleFilter('All')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#FFF3EC', color: '#FD5C02', border: '1px solid #FED7B8', cursor: 'pointer' }}
                  >
                    <X style={{ width: 10 }} /> Clear filter
                  </button>
                )}
              </div>
              <div className="header-actions">
                <div className="search-bar">
                  <Search /><input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 160 }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                  <option value="All">All Roles</option>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowModal(true) }}>
                  <Plus />Add User
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>User</th><th>Mobile</th><th>Role</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {loadingData && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Loading…</td></tr>}
                  {!loadingData && filtered.map(u => {
                    const id = u._id || u.id
                    const joinedStr = u.created_at
                      ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : (u.joined || '—')
                    return (
                      <tr key={id}>
                        <td>
                          <div className="user-info">
                            <div className="avatar avatar-purple">{(u.name || '?').charAt(0)}</div>
                            <div><div className="user-name">{u.name}</div><div className="user-role">{u.email}</div></div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>{u.mobile || '—'}</td>
                        <td><span className={`badge ${roleColors[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                        <td style={{ fontSize: 12 }}>{joinedStr}</td>
                        <td><span className={`badge ${u.is_active !== false ? 'badge-green' : 'badge-red'}`}>{u.is_active !== false ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-secondary btn-xs" title="Set permissions"
                              onClick={() => { setSelectedRole(ROLES.indexOf(u.role) >= 0 ? ROLES.indexOf(u.role) : 0); setMainTab('roles') }}>
                              <Shield style={{ width: 12 }} />Perms
                            </button>
                            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(id)}>
                              <Trash2 style={{ width: 13 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!loadingData && filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title">Add New User</span>
                  <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
                </div>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className={`form-control${errors.name ? ' error' : ''}`} placeholder="Enter name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                      {errors.name && <div className="form-error">{errors.name}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile *</label>
                      <input className={`form-control${errors.mobile ? ' error' : ''}`} placeholder="10-digit number" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} />
                      {errors.mobile && <div className="form-error">{errors.mobile}</div>}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input className={`form-control${errors.email ? ' error' : ''}`} placeholder="email@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                      {errors.email && <div className="form-error">{errors.email}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <select className="form-control" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password * (min 8 chars)</label>
                    <input type="password" className={`form-control${errors.password ? ' error' : ''}`} placeholder="Set initial password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                    {errors.password && <div className="form-error">{errors.password}</div>}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Creating…' : 'Create User'}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: ROLES & PERMISSIONS
      ══════════════════════════════════════════ */}
      {mainTab === 'roles' && (
        <>
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <Shield />
            <span>Permission changes take effect on next login. Super Admin always has full access and cannot be restricted.</span>
          </div>

          <div className="page-grid-2" style={{ gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
            {/* Role selector */}
            <div className="card">
              <div className="card-header"><span className="card-title">Select Role</span></div>
              <div style={{ padding: '8px 0' }}>
                {ROLES.map((r, i) => (
                  <button key={r} onClick={() => setSelectedRole(i)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 16px', border: 'none',
                    background: selectedRole === i ? 'var(--primary-light)' : 'transparent',
                    color: selectedRole === i ? 'var(--primary)' : 'var(--text)',
                    cursor: 'pointer', fontSize: 13, fontWeight: selectedRole === i ? 700 : 500,
                    borderLeft: selectedRole === i ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'all .15s', textAlign: 'left',
                  }}>
                    <Shield style={{ width: 14, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{r}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {users.filter(u => u.role === r).length} users
                    </span>
                  </button>
                ))}
              </div>
              {/* Quick link back to users of this role */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}
                  onClick={() => { setRoleFilter(ROLES[selectedRole]); setMainTab('users') }}>
                  View {ROLES[selectedRole]} Users →
                </button>
              </div>
            </div>

            {/* Permissions matrix */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="card-title">Permissions for</span>
                  <span className={`badge ${roleColors[ROLES[selectedRole]]}`}>{ROLES[selectedRole]}</span>
                </div>
                <div className="header-actions">
                  {permSaved && <span className="badge badge-green"><Check style={{ width: 11 }} /> Saved</span>}
                  <button className="btn btn-primary btn-sm" onClick={handlePermSave}>
                    <Save style={{ width: 13 }} />Save Changes
                  </button>
                </div>
              </div>
              <div className="table-wrap" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ minWidth: 180 }}>Module</th>
                      <th style={{ width: 120, textAlign: 'center' }}>Action</th>
                      <th style={{ width: 80, textAlign: 'center' }}>Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((mod, mi) =>
                      mod.perms.map((perm, pi) => (
                        <tr key={`${mi}-${pi}`}>
                          {pi === 0 && (
                            <td rowSpan={mod.perms.length} style={{ fontWeight: 600, fontSize: 13, verticalAlign: 'top', paddingTop: 13, borderRight: '1px solid var(--border)' }}>
                              {mod.module}
                            </td>
                          )}
                          <td style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{perm}</td>
                          <td style={{ textAlign: 'center' }}>
                            {selectedRole === 0 ? (
                              <Check style={{ width: 16, color: 'var(--success)' }} />
                            ) : (
                              <button onClick={() => togglePerm(mi, pi)} style={{
                                width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
                                background: matrix[selectedRole][mi][pi] ? '#ECFDF5' : '#FEF2F2',
                                color: matrix[selectedRole][mi][pi] ? 'var(--success)' : 'var(--danger)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all .15s',
                              }}>
                                {matrix[selectedRole][mi][pi] ? <Check style={{ width: 14 }} /> : <X style={{ width: 14 }} />}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
