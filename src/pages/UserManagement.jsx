import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Trash2, Shield, Check, X, Save, Users, UserCheck, UserX, Crown, Lock, ChevronDown } from 'lucide-react'
import { rolePermissionApi } from '../api/rolePermissionApi'
import { PERMISSION_CATALOG } from '../config/permissions'

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

// Solid accent color per role (used for the dot in the role selector).
const ROLE_DOT = {
  'Super Admin':     '#7C3AED',
  'Company Owner':   '#2563EB',
  'Manager':         '#0891B2',
  'Accountant':      '#059669',
  'Sales Executive': '#F26522',
  'Warehouse Staff': '#CA8A04',
  'Retailer':        '#DC2626',
  'Wholesaler':      '#64748B',
}

const EMPTY_FORM = { name: '', mobile: '', email: '', password: '', role: 'Sales Executive' }

function normalizeRolePermissions(role, rawPermissions, modules) {
  const normalized = {}
  const raw = rawPermissions || {}

  modules.forEach(module => {
    const storedModule = raw[module.key]
    normalized[module.key] = {}
    ;(module.actions || []).forEach(action => {
      normalized[module.key][action.key] = role === 'Super Admin'
        ? true
        : typeof storedModule === 'boolean'
          ? storedModule
          : storedModule?.[action.key] === true
    })
  })

  return normalized
}

function normalizePermissionPayload(payload = {}) {
  const apiModules = Array.isArray(payload.modules) ? payload.modules : []
  const modules = apiModules.some(module => Array.isArray(module.actions) && module.actions.length)
    ? apiModules
    : PERMISSION_CATALOG
  const apiRoles = new Map((payload.roles || []).map(item => [item.role, item]))
  const byRole = {}
  const locked = {}

  ROLES.forEach(role => {
    const apiRole = apiRoles.get(role)
    byRole[role] = normalizeRolePermissions(role, apiRole?.permissions, modules)
    locked[role] = role === 'Super Admin' || apiRole?.locked === true
  })

  return { modules, byRole, locked }
}

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
  const [expandedModule, setExpandedModule] = useState(null)

  // ── Roles & Permissions (live, DB-backed) ──────────────────
  const [permModules, setPermModules] = useState([])   // [{ key, label, category, actions }]
  const [permByRole, setPermByRole]   = useState({})    // { role: { module: { action: bool } } }
  const [lockedRoles, setLockedRoles] = useState({})
  const [draft, setDraft]             = useState(null)
  const [permLoading, setPermLoading] = useState(false)
  const [permSaving, setPermSaving]   = useState(false)
  const [permSaved, setPermSaved]     = useState(false)

  // Permission preview shown inside the Add User modal (for the chosen role).
  const [modalPermsLoading, setModalPermsLoading] = useState(false)
  // Editable per-user permission overrides in the Add User modal (module→actions).
  const [userPerms, setUserPerms] = useState(null)

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const selectedRoleName = ROLES[selectedRole]

  // Load the permission matrix when the Roles tab is opened.
  useEffect(() => {
    if (mainTab !== 'roles' || permModules.length) return
    let cancelled = false
    setPermLoading(true)
    rolePermissionApi.list()
      .then(res => {
        const payload = res?.data || res
        if (cancelled) return
        const normalized = normalizePermissionPayload(payload)
        setPermModules(normalized.modules)
        setPermByRole(normalized.byRole)
        setLockedRoles(normalized.locked)
      })
      .catch(() => { if (!cancelled) toast('Error: could not load permissions') })
      .finally(() => { if (!cancelled) setPermLoading(false) })
    return () => { cancelled = true }
  }, [mainTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Ensure the permission catalog is loaded when the Add User modal opens,
  // so we can preview the chosen role's module access as a checklist.
  useEffect(() => {
    if (!showModal || permModules.length) return
    let cancelled = false
    setModalPermsLoading(true)
    rolePermissionApi.list()
      .then(res => {
        const payload = res?.data || res
        if (cancelled) return
        const normalized = normalizePermissionPayload(payload)
        setPermModules(normalized.modules)
        setPermByRole(normalized.byRole)
        setLockedRoles(normalized.locked)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setModalPermsLoading(false) })
    return () => { cancelled = true }
  }, [showModal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Seed the editable per-user permissions from the selected role whenever the
  // modal opens, the role changes, or the role matrix finishes loading.
  useEffect(() => {
    if (!showModal) { setUserPerms(null); return }
    const rolePerms = permByRole[form.role]
    if (rolePerms) setUserPerms(structuredClone(rolePerms))
  }, [showModal, form.role, permByRole]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle a whole module on/off for the new user (view = gateway; enabling a
  // module turns on all its actions, disabling turns them all off).
  const toggleUserModule = (moduleKey) => {
    setUserPerms(prev => {
      const next = structuredClone(prev || {})
      const mod = permModules.find(m => m.key === moduleKey)
      const actions = mod?.actions || [{ key: 'view' }]
      const current = next[moduleKey] || {}
      const isOn = typeof current === 'boolean' ? current : current?.view === true
      const turnOn = !isOn
      next[moduleKey] = {}
      actions.forEach(a => { next[moduleKey][a.key] = turnOn })
      return next
    })
  }

  // Reset the modal's per-user permissions back to the selected role's defaults.
  const resetUserPermsToRole = () => {
    const rolePerms = permByRole[form.role]
    setUserPerms(rolePerms ? structuredClone(rolePerms) : {})
  }

  // Grouped catalog reused by both the Roles tab and the Add User preview.
  // (defined below as groupedModules)

  // Sync the editable draft whenever the selected role or loaded data changes.
  useEffect(() => {
    if (!permByRole[selectedRoleName]) { setDraft(null); return }
    setDraft(structuredClone(permByRole[selectedRoleName]))
    setPermSaved(false)
  }, [selectedRoleName, permByRole])

  // Modules grouped by category for a clean, scannable layout.
  const groupedModules = useMemo(() => {
    const groups = {}
    permModules.forEach(m => { (groups[m.category] ||= []).push(m) })
    return Object.entries(groups)  // [ [category, modules[]], ... ]
  }, [permModules])

  const isLocked = !!lockedRoles[selectedRoleName]
  const dirty = draft && permByRole[selectedRoleName] &&
    JSON.stringify(draft) !== JSON.stringify(permByRole[selectedRoleName])

  const enabledCount = draft
    ? Object.values(draft).reduce((total, actions) => total + Object.values(actions || {}).filter(Boolean).length, 0)
    : 0
  const totalActionCount = permModules.reduce((total, module) => total + (module.actions?.length || 0), 0)
  const selectedRoleUserCount = users.filter(user => user.role === selectedRoleName).length
  const enabledPercent = totalActionCount ? Math.round((enabledCount / totalActionCount) * 100) : 0

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
    // Send per-user permission overrides only when they differ from the role's
    // defaults — otherwise leave null so the user simply follows the role.
    const roleDefaults = permByRole[form.role]
    const permsChanged = userPerms && roleDefaults &&
      JSON.stringify(userPerms) !== JSON.stringify(roleDefaults)
    const payload = {
      name: form.name, mobile: form.mobile, email: form.email,
      password: form.password, role: form.role,
      permissions: form.role === 'Super Admin' ? null : (permsChanged ? userPerms : null),
    }
    const result = await addUser?.(payload)
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

  const togglePermission = (moduleKey, actionKey) => {
    if (isLocked) return
    setDraft(prev => ({
      ...prev,
      [moduleKey]: {
        ...(prev?.[moduleKey] || {}),
        [actionKey]: !prev?.[moduleKey]?.[actionKey],
      },
    }))
    setPermSaved(false)
  }

  const setModuleActions = (module, value) => {
    if (isLocked) return
    setDraft(prev => {
      const next = structuredClone(prev || {})
      next[module.key] ||= {}
      module.actions.forEach(item => { next[module.key][item.key] = value })
      return next
    })
    setPermSaved(false)
  }

  const handlePermReset = () => {
    if (permByRole[selectedRoleName]) setDraft(structuredClone(permByRole[selectedRoleName]))
    setPermSaved(false)
  }

  const handlePermSave = async () => {
    if (isLocked || !draft) return
    setPermSaving(true)
    try {
      const res = await rolePermissionApi.update(selectedRoleName, draft)
      const payload = res?.data || res
      const saved = normalizeRolePermissions(
        selectedRoleName,
        payload?.permissions || draft,
        permModules,
      )
      setPermByRole(prev => ({ ...prev, [selectedRoleName]: saved }))
      setDraft(structuredClone(saved))
      setPermSaved(true)
      toast(`Permissions saved for ${selectedRoleName}`)
      setTimeout(() => setPermSaved(false), 2500)
    } catch (err) {
      toast(`Error: ${err.response?.data?.message || 'could not save permissions'}`)
    } finally {
      setPermSaving(false)
    }
  }

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
          {showModal && (() => {
            const roleIsSuper = form.role === 'Super Admin'
            const activePerms = userPerms || permByRole[form.role] || {}
            const previewOn = (key) => {
              if (roleIsSuper) return true
              const modulePermission = activePerms[key]
              return typeof modulePermission === 'boolean' ? modulePermission : modulePermission?.view === true
            }
            const totalOn = roleIsSuper ? permModules.length : permModules.filter(m => previewOn(m.key)).length
            return (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, width: '92%' }}>
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

                  {/* ── Access preview for the selected role ── */}
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Shield style={{ width: 14, color: ROLE_DOT[form.role] || 'var(--text-muted)' }} />
                        Modules this user can access
                      </label>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        {!roleIsSuper && !modalPermsLoading && (
                          <button type="button" onClick={resetUserPermsToRole}
                            style={{ background:'none', border:'none', color:'var(--primary)', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                            Reset to role defaults
                          </button>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                          {modalPermsLoading ? 'Loading…' : `${totalOn} enabled`}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      border: '1px solid var(--border)', borderRadius: 10, padding: 12,
                      maxHeight: 220, overflowY: 'auto', background: '#FAFBFD',
                    }}>
                      {modalPermsLoading && (
                        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>Loading access…</div>
                      )}
                      {!modalPermsLoading && groupedModules.map(([category, mods]) => (
                        <div key={category} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
                            {category}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
                            {mods.map(m => {
                              const on = previewOn(m.key)
                              return (
                                <div key={m.key}
                                  onClick={roleIsSuper ? undefined : () => toggleUserModule(m.key)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, cursor: roleIsSuper ? 'default' : 'pointer', userSelect:'none' }}>
                                  <span style={{
                                    width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    background: on ? 'var(--success)' : '#fff',
                                    border: `1.5px solid ${on ? 'var(--success)' : '#CBD5E1'}`,
                                  }}>
                                    {on && <Check style={{ width: 11, color: '#fff' }} />}
                                  </span>
                                  <span style={{ color: on ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {m.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield style={{ width: 12, flexShrink: 0 }} />
                      {roleIsSuper
                        ? <span>Super Admin always has full access.</span>
                        : <span>Auto-filled from the <strong style={{ margin: '0 3px' }}>{form.role}</strong> role. Click a module to customise this user's access.</span>}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Creating…' : 'Create User'}</button>
                </div>
              </div>
            </div>
            )
          })()}
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB: ROLES & PERMISSIONS
      ══════════════════════════════════════════ */}
      {mainTab === 'roles' && (
        <>
          <div className="permissions-note">
            <div className="permissions-note-icon"><Shield size={17} /></div>
            <div>
              <strong>Role-based access control</strong>
              <span>Changes apply automatically to every user assigned to the selected role.</span>
            </div>
            <span className="permissions-note-lock"><Lock size={12} /> Super Admin is protected</span>
          </div>

          <div className="permissions-layout">
            <aside className="card permissions-role-panel">
              <div className="permissions-role-heading">
                <div>
                  <div className="card-title">System Roles</div>
                  <div className="permissions-subtitle">Choose a role to configure</div>
                </div>
                <span className="permissions-count-badge">{ROLES.length}</span>
              </div>

              <div className="permissions-role-list">
                {ROLES.map((role, index) => {
                  const selected = selectedRole === index
                  const count = users.filter(user => user.role === role).length
                  const accent = ROLE_DOT[role] || '#94A3B8'
                  return (
                    <button
                      key={role}
                      type="button"
                      className={`permissions-role-option${selected ? ' active' : ''}`}
                      style={{ '--role-accent': accent }}
                      onClick={() => { setSelectedRole(index); setExpandedModule(null) }}
                    >
                      <span className="permissions-role-icon" style={{ background: `${accent}14`, color: accent }}>
                        {role === 'Super Admin' ? <Crown size={15} /> : <Shield size={15} />}
                      </span>
                      <span className="permissions-role-copy">
                        <strong>{role}</strong>
                        <small>{count} user{count === 1 ? '' : 's'}</small>
                      </span>
                      {role === 'Super Admin'
                        ? <Lock size={13} className="permissions-role-lock" />
                        : <span className="permissions-role-arrow">›</span>}
                    </button>
                  )
                })}
              </div>

              <div className="permissions-role-footer">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setRoleFilter(selectedRoleName); setMainTab('users') }}
                >
                  <Users size={13} /> View users in this role
                </button>
              </div>
            </aside>

            <section className="card permissions-editor">
              <div className="permissions-editor-header">
                <div className="permissions-role-summary">
                  <span
                    className="permissions-summary-icon"
                    style={{ background: `${ROLE_DOT[selectedRoleName] || '#94A3B8'}14`, color: ROLE_DOT[selectedRoleName] || '#64748B' }}
                  >
                    {isLocked ? <Crown size={19} /> : <Shield size={19} />}
                  </span>
                  <div>
                    <div className="permissions-editor-title">Permissions for <strong>{selectedRoleName}</strong></div>
                    <div className="permissions-editor-meta">
                      <span><Users size={12} /> {selectedRoleUserCount} user{selectedRoleUserCount === 1 ? '' : 's'}</span>
                      <span className={isLocked ? 'permissions-status locked' : 'permissions-status editable'}>
                        {isLocked ? <><Lock size={11} /> Protected role</> : 'Editable role'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="permissions-progress-block">
                  <div className="permissions-progress-copy">
                    <span>{enabledCount} of {totalActionCount} actions enabled</span>
                    <strong>{enabledPercent}%</strong>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: `${enabledPercent}%` }} /></div>
                </div>

                <div className="permissions-save-actions">
                  {permSaved && <span className="badge badge-green"><Check size={11} /> Saved</span>}
                  {dirty && !permSaved && <span className="permissions-dirty-dot">Unsaved</span>}
                  {!isLocked && (
                    <>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={handlePermReset} disabled={!dirty || permSaving}>Reset</button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={handlePermSave} disabled={!dirty || permSaving}>
                        <Save size={13} /> {permSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isLocked && !permLoading && (
                <div className="permissions-locked-banner">
                  <Lock size={15} />
                  <span><strong>Full access is always enabled.</strong> This protected role cannot be restricted.</span>
                </div>
              )}

              <div className="permissions-editor-body">
                {permLoading && (
                  <div className="loading-state"><div className="spinner" /><span>Loading role permissions…</span></div>
                )}

                {!permLoading && draft && groupedModules.map(([category, modules]) => (
                  <section className="permissions-category" key={category}>
                    <div className="permissions-category-heading">
                      <div>
                        <span>{category}</span>
                        <small>{modules.length} module{modules.length === 1 ? '' : 's'}</small>
                      </div>
                      <div className="permissions-category-line" />
                    </div>

                    <div className="permissions-module-list">
                      {modules.map(module => {
                        const moduleActions = module.actions || []
                        const moduleEnabledCount = moduleActions.filter(action => draft[module.key]?.[action.key] === true).length
                        const allEnabled = moduleActions.length > 0 && moduleEnabledCount === moduleActions.length
                        const partlyEnabled = moduleEnabledCount > 0 && !allEnabled
                        const isExpanded = expandedModule === module.key

                        return (
                          <article className={`permissions-module-row${isExpanded ? ' expanded' : ''}`} key={module.key}>
                            <div className="permissions-module-main">
                              <label
                                className="permissions-module-check"
                                title={isLocked ? 'Always enabled for this protected role' : `${allEnabled ? 'Clear' : 'Grant'} all ${module.label} actions`}
                              >
                                <input
                                  type="checkbox"
                                  className={`permissions-checkbox${partlyEnabled ? ' partial' : ''}`}
                                  checked={allEnabled}
                                  disabled={isLocked || moduleActions.length === 0}
                                  onChange={() => setModuleActions(module, !allEnabled)}
                                  aria-label={`${allEnabled ? 'Clear' : 'Grant'} all actions for ${module.label}`}
                                />
                              </label>

                              <button
                                type="button"
                                className="permissions-module-expand"
                                onClick={() => setExpandedModule(current => current === module.key ? null : module.key)}
                                aria-expanded={isExpanded}
                                aria-controls={`permission-actions-${module.key}`}
                              >
                                <span className="permissions-module-copy">
                                  <strong>{module.label}</strong>
                                  <small>{moduleActions.length} permission{moduleActions.length === 1 ? '' : 's'} available</small>
                                </span>
                                <span className={`permissions-module-total${allEnabled ? ' complete' : partlyEnabled ? ' partial' : ''}`}>
                                  {moduleEnabledCount}/{moduleActions.length}
                                </span>
                                <ChevronDown size={16} className="permissions-module-chevron" />
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="permissions-action-panel" id={`permission-actions-${module.key}`}>
                                <div className="permissions-action-panel-heading">
                                  <span>Select the actions allowed for this role</span>
                                  {!isLocked && moduleActions.length > 0 && (
                                    <button
                                      type="button"
                                      className={`permissions-bulk-button${allEnabled ? ' clear' : ''}`}
                                      onClick={() => setModuleActions(module, !allEnabled)}
                                    >
                                      {allEnabled ? 'Clear all' : 'Select all'}
                                    </button>
                                  )}
                                </div>

                                {moduleActions.length === 0 ? (
                                  <div className="permissions-no-actions">No configurable actions</div>
                                ) : (
                                  <div className="permissions-action-checkboxes">
                                    {moduleActions.map(action => {
                                      const enabled = draft[module.key]?.[action.key] === true
                                      return (
                                        <label className={`permissions-action-checkbox${enabled ? ' selected' : ''}`} key={`${module.key}-${action.key}`}>
                                          <input
                                            type="checkbox"
                                            className="permissions-checkbox"
                                            checked={enabled}
                                            disabled={isLocked}
                                            onChange={() => togglePermission(module.key, action.key)}
                                          />
                                          <span className="permissions-action-copy">
                                            <strong>{action.label}</strong>
                                            <small>{enabled ? 'Access granted' : 'No access'}</small>
                                          </span>
                                        </label>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  )
}
