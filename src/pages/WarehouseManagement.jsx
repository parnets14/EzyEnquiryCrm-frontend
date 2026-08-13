import { useState, useCallback } from 'react'
import { Plus, MapPin, Warehouse, Edit2, Trash2, Eye, X, Search } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────
const WAREHOUSE_TYPES = ['Main Warehouse', 'Branch Warehouse', 'Transit Hub', 'Cold Storage', 'Depot', 'Other']

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
]

const EMPTY_FORM = {
  warehouse_code: '', name: '', warehouse_type: '', address: '', city: '', state: '',
  pincode: '', contact_person: '', mobile: '', email: '', manager: '', is_active: true,
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function validate(form) {
  const e = {}
  if (!form.warehouse_code.trim()) e.warehouse_code = 'Warehouse code is required'
  if (!form.name.trim())           e.name           = 'Warehouse name is required'
  if (!form.city.trim())           e.city           = 'City is required'
  if (!form.state)                 e.state          = 'State is required'
  if (form.mobile && !/^\d{10}$/.test(form.mobile.trim()))
    e.mobile = 'Enter a valid 10-digit mobile number'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    e.email  = 'Enter a valid email address'
  if (form.pincode && !/^\d{6}$/.test(form.pincode.trim()))
    e.pincode = 'Pincode must be 6 digits'
  return e
}

// ── Field ──────────────────────────────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && ' *'}</label>
      {children}
      {error && <div className="form-error">{error}</div>}
    </div>
  )
}

// ── Create / Edit Modal ────────────────────────────────────────────────────────
function WarehouseModal({ editData, onClose, onSave, saving }) {
  const isEdit = !!editData?._id
  const [form, setForm] = useState(() =>
    isEdit ? {
      warehouse_code: editData.warehouse_code || '',
      name:           editData.name           || '',
      warehouse_type: editData.warehouse_type || '',
      address:        editData.address        || '',
      city:           editData.city           || '',
      state:          editData.state          || '',
      pincode:        editData.pincode        || '',
      contact_person: editData.contact_person || '',
      mobile:         editData.mobile         || '',
      email:          editData.email          || '',
      manager:        editData.manager        || '',
      is_active:      editData.is_active !== false,
    } : { ...EMPTY_FORM }
  )
  const [errors, setErrors] = useState({})
  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSubmit = () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave(form)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Warehouse' : 'Create New Warehouse'}</span>
          <button className="btn-ghost" onClick={onClose}><X style={{ width: 16 }} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <Field label="Warehouse Code" required error={errors.warehouse_code}>
            <input className={`form-control${errors.warehouse_code ? ' error' : ''}`}
              placeholder="e.g. WH-001" value={form.warehouse_code}
              onChange={set('warehouse_code')} style={{ textTransform: 'uppercase' }} />
          </Field>
          <div className="form-row">
            <Field label="Warehouse Name" required error={errors.name}>
              <input className={`form-control${errors.name ? ' error' : ''}`}
                placeholder="e.g. Main Warehouse – Surat" value={form.name} onChange={set('name')} />
            </Field>
            <Field label="Warehouse Type">
              <select className="form-control" value={form.warehouse_type} onChange={set('warehouse_type')}>
                <option value="">Select type</option>
                {WAREHOUSE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Address">
            <textarea className="form-control" rows={2} placeholder="Street / Plot No. / Area"
              value={form.address} onChange={set('address')} />
          </Field>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <Field label="City" required error={errors.city}>
              <input className={`form-control${errors.city ? ' error' : ''}`}
                placeholder="City" value={form.city} onChange={set('city')} />
            </Field>
            <Field label="State" required error={errors.state}>
              <select className={`form-control${errors.state ? ' error' : ''}`}
                value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Pincode" error={errors.pincode}>
              <input className={`form-control${errors.pincode ? ' error' : ''}`}
                placeholder="6-digit PIN" maxLength={6} value={form.pincode} onChange={set('pincode')} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Contact Person">
              <input className="form-control" placeholder="Person to contact"
                value={form.contact_person} onChange={set('contact_person')} />
            </Field>
            <Field label="Mobile Number" error={errors.mobile}>
              <input className={`form-control${errors.mobile ? ' error' : ''}`}
                placeholder="10-digit mobile" maxLength={10} value={form.mobile} onChange={set('mobile')} />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Email" error={errors.email}>
              <input className={`form-control${errors.email ? ' error' : ''}`}
                type="email" placeholder="warehouse@company.com" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Warehouse Manager">
              <input className="form-control" placeholder="Manager name"
                value={form.manager} onChange={set('manager')} />
            </Field>
          </div>
          <Field label="Status">
            <select className="form-control" value={form.is_active ? 'Active' : 'Inactive'}
              onChange={e => setForm(p => ({ ...p, is_active: e.target.value === 'Active' }))}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Warehouse' : 'Create Warehouse'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── View Modal ─────────────────────────────────────────────────────────────────
function ViewModal({ wh, onClose, onEdit }) {
  const InfoRow = ({ label, value }) => {
    if (!value) return null
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, padding: '9px 0', borderBottom: '1px solid var(--border)', alignItems: 'start' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, paddingTop: 1 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>{value}</span>
      </div>
    )
  }
  const fullAddress = [wh.address, wh.city, wh.state, wh.pincode].filter(Boolean).join(', ')
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540, width: '100%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="modal-title" style={{ fontSize: 16 }}>{wh.name}</span>
              {wh.warehouse_code && (
                <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-light, #eff6ff)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                  {wh.warehouse_code}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${wh.is_active !== false ? 'badge-green' : 'badge-gray'}`}>
                {wh.is_active !== false ? '● Active' : '● Inactive'}
              </span>
              {wh.warehouse_type && <span className="badge badge-blue">{wh.warehouse_type}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }}
              onClick={() => { onClose(); onEdit(wh) }}>
              <Edit2 style={{ width: 12 }} /> Edit
            </button>
            <button className="btn-ghost" onClick={onClose}><X style={{ width: 16 }} /></button>
          </div>
        </div>
        <div className="modal-body" style={{ paddingTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Warehouse Info</div>
          <InfoRow label="Warehouse Code" value={wh.warehouse_code} />
          <InfoRow label="Warehouse Name" value={wh.name} />
          <InfoRow label="Type"           value={wh.warehouse_type} />
          {fullAddress && (<>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16, marginBottom: 4 }}>Address</div>
            {wh.address  && <InfoRow label="Street / Area" value={wh.address} />}
            {wh.city     && <InfoRow label="City"          value={wh.city} />}
            {wh.state    && <InfoRow label="State"         value={wh.state} />}
            {wh.pincode  && <InfoRow label="Pincode"       value={wh.pincode} />}
          </>)}
          {(wh.contact_person || wh.mobile || wh.email || wh.manager) && (<>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16, marginBottom: 4 }}>Contact Details</div>
            <InfoRow label="Contact Person" value={wh.contact_person} />
            <InfoRow label="Mobile"         value={wh.mobile} />
            <InfoRow label="Email"          value={wh.email} />
            <InfoRow label="Manager"        value={wh.manager} />
          </>)}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function WarehouseManagement({ warehouses = [], addWarehouse, updateWarehouse, deleteWarehouse }) {
  const [showModal,      setShowModal]      = useState(false)
  const [editData,       setEditData]       = useState(null)
  const [viewData,       setViewData]       = useState(null)
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(null)
  const [search,         setSearch]         = useState('')
  const [filterStatus,   setFilterStatus]   = useState('All')
  const [toast,          setToast]          = useState('')
  const [statusUpdating, setStatusUpdating] = useState(null)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500) }
  const openCreate = () => { setEditData(null); setShowModal(true) }
  const openEdit   = (wh) => { setEditData(wh); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditData(null) }

  const handleSave = useCallback(async (form) => {
    setSaving(true)
    try {
      if (editData?._id) {
        const res = await updateWarehouse(editData._id, form)
        if (res?.success === false) { alert(res.message || 'Update failed'); return }
        showToast(`Warehouse "${form.name}" updated`)
      } else {
        const res = await addWarehouse(form)
        if (res?.success === false) { alert(res.message || 'Create failed'); return }
        showToast(`Warehouse "${form.name}" created`)
      }
      closeModal()
    } finally { setSaving(false) }
  }, [editData, addWarehouse, updateWarehouse])

  const handleStatusChange = useCallback(async (wh, newStatus) => {
    const id = wh._id || wh.id
    setStatusUpdating(id)
    try {
      const res = await updateWarehouse(id, { ...wh, is_active: newStatus === 'Active' })
      if (res?.success === false) { alert(res.message || 'Status update failed'); return }
      showToast(`"${wh.name}" marked as ${newStatus}`)
    } finally { setStatusUpdating(null) }
  }, [updateWarehouse])

  const handleDelete = useCallback(async (wh) => {
    if (!window.confirm(`Delete "${wh.name}"? This cannot be undone if no stock is linked.`)) return
    setDeleting(wh._id || wh.id)
    try {
      const res = await deleteWarehouse(wh._id || wh.id)
      if (res?.success === false) { alert(res.message || 'Delete failed'); return }
      showToast(`Warehouse "${wh.name}" deleted`)
    } finally { setDeleting(null) }
  }, [deleteWarehouse])

  const filtered = warehouses.filter(w => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (w.name           || '').toLowerCase().includes(q) ||
      (w.warehouse_code || '').toLowerCase().includes(q) ||
      (w.city           || '').toLowerCase().includes(q) ||
      (w.manager        || '').toLowerCase().includes(q)
    const matchStatus =
      filterStatus === 'Active'   ? w.is_active !== false :
      filterStatus === 'Inactive' ? w.is_active === false : true
    return matchSearch && matchStatus
  })

  const totalActive   = warehouses.filter(w => w.is_active !== false).length
  const totalInactive = warehouses.filter(w => w.is_active === false).length

  return (
    <>
      <div className="breadcrumb">
        <span>Purchase &amp; Inventory</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Warehouse Management</span>
      </div>

      {toast && <div className="alert alert-info" style={{ marginBottom: 14 }}>✓ {toast}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Warehouses', val: warehouses.length, color: 'blue',  filter: 'All'      },
          { label: 'Active',           val: totalActive,       color: 'green', filter: 'Active'   },
          { label: 'Inactive',         val: totalInactive,     color: 'gray',  filter: 'Inactive' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px', cursor: 'pointer' }}
            onClick={() => setFilterStatus(s.filter)} title={`Show ${s.label}`}>
            <div className={`stat-icon ${s.color}`}><Warehouse /></div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: 32 }}
                placeholder="Search by name, code, city, manager…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {['All', 'Active', 'Inactive'].map(f => (
              <button key={f} className={`btn ${filterStatus === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setFilterStatus(f)}>{f}</button>
            ))}
            <button className="btn btn-primary" onClick={openCreate} style={{ marginLeft: 'auto' }}>
              <Plus style={{ width: 15 }} /> Add Warehouse
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Warehouses ({filtered.length}{filtered.length !== warehouses.length ? ` of ${warehouses.length}` : ''})
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Code</th><th>Warehouse Name</th><th>Type</th>
                <th>Address</th><th>City / State</th>
                <th>Contact Person</th><th>Mobile</th><th>Manager</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <Warehouse style={{ width: 36, height: 36, margin: '0 auto 10px', display: 'block', color: 'var(--border)' }} />
                    {search || filterStatus !== 'All' ? 'No warehouses match your filter' : 'No warehouses yet — click "Add Warehouse" to create one'}
                  </td>
                </tr>
              ) : filtered.map((wh, idx) => {
                const id = wh._id || wh.id
                return (
                  <tr key={id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                    <td><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}>{wh.warehouse_code || '—'}</span></td>
                    <td><div style={{ fontWeight: 700, fontSize: 13 }}>{wh.name}</div></td>
                    <td style={{ fontSize: 12 }}>
                      {wh.warehouse_type ? <span className="badge badge-blue" style={{ fontSize: 11 }}>{wh.warehouse_type}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 180 }}>
                      {wh.address
                        ? <div style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                            <MapPin style={{ width: 11, flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{wh.address}</span>
                          </div>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {wh.city || '—'}
                      {wh.state && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>, {wh.state}</span>}
                      {wh.pincode && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wh.pincode}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{wh.contact_person || '—'}</td>
                    <td style={{ fontSize: 13 }}>{wh.mobile || '—'}</td>
                    <td style={{ fontSize: 13 }}>{wh.manager || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <select className="form-control"
                        style={{ fontSize: 12, padding: '3px 8px', width: 'auto', display: 'inline-block', fontWeight: 600,
                          color: wh.is_active !== false ? 'var(--success, #16a34a)' : 'var(--text-muted)',
                          cursor: statusUpdating === id ? 'not-allowed' : 'pointer' }}
                        value={wh.is_active !== false ? 'Active' : 'Inactive'}
                        disabled={statusUpdating === id}
                        onChange={e => handleStatusChange(wh, e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn-ghost" title="View details" onClick={() => setViewData(wh)} style={{ padding: '4px 6px' }}><Eye style={{ width: 14 }} /></button>
                        <button className="btn-ghost" title="Edit" onClick={() => openEdit(wh)} style={{ padding: '4px 6px' }}><Edit2 style={{ width: 14 }} /></button>
                        <button className="btn-ghost" title="Delete" onClick={() => handleDelete(wh)} disabled={deleting === id} style={{ padding: '4px 6px', color: 'var(--danger)' }}><Trash2 style={{ width: 14 }} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <WarehouseModal editData={editData} onClose={closeModal} onSave={handleSave} saving={saving} />}
      {viewData && <ViewModal wh={viewData} onClose={() => setViewData(null)} onEdit={(wh) => { setViewData(null); openEdit(wh) }} />}
    </>
  )
}
