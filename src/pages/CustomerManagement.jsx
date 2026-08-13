import { useState } from 'react'
import { Plus, Search, Eye, Phone, MapPin, X } from 'lucide-react'

const EMPTY_FORM = { name: '', mobile: '', email: '', city: '', state: '', gst_number: '', biz_type: 'Retailer', address: '' }

export default function CustomerManagement({ customers = [], addCustomer, deleteCustomer, loadingData }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.mobile || '').includes(search) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  )

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Company name required'
    if (!form.mobile.trim() || !/^\d{10}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const result = await addCustomer?.({
      name: form.name, mobile: form.mobile, email: form.email,
      city: form.city, state: form.state, gst_number: form.gst_number,
      biz_type: form.biz_type, address: form.address,
    })
    setSaving(false)
    if (result?.success === false) { toast(`Error: ${result.message}`); return }
    setForm(EMPTY_FORM)
    setErrors({})
    setShowAddModal(false)
    toast(`Customer added successfully`)
  }

  return (
    <>
      <div className="breadcrumb"><span>CRM & Leads</span><span className="breadcrumb-sep">›</span><span className="breadcrumb-active">Customer Management</span></div>

      {successMsg && <div className="alert alert-info" style={{ marginBottom: 14 }}>✓ {successMsg}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Customers', val: customers.length, color: 'blue' },
          { label: 'Retailers', val: customers.filter(c => c.biz_type === 'Retailer').length, color: 'green' },
          { label: 'Wholesalers', val: customers.filter(c => c.biz_type === 'Wholesaler').length, color: 'purple' },
          { label: 'Active', val: customers.filter(c => c.is_active !== false).length, color: 'red' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}><Eye /></div>
            <div className="stat-info"><div className="stat-label">{s.label}</div><div className="stat-value" style={{ fontSize: 20 }}>{s.val}</div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Customer List ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar"><Search /><input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowAddModal(true) }}><Plus />Add Customer</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Mobile</th><th>City</th><th>Type</th><th>GST</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loadingData && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading…</td></tr>}
              {!loadingData && filtered.map(c => {
                const id = c._id || c.id
                return (
                  <tr key={id}>
                    <td>
                      <div className="user-info">
                        <div className="avatar avatar-blue">{(c.name || '?').charAt(0)}</div>
                        <div><div className="user-name">{c.name}</div><div className="user-role">{c.email || '—'}</div></div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>{c.mobile || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin style={{ width: 12 }} />{c.city || '—'}{c.state ? `, ${c.state}` : ''}
                      </span>
                    </td>
                    <td><span className={`badge ${c.biz_type === 'Retailer' ? 'badge-blue' : 'badge-purple'}`}>{c.biz_type || 'Retailer'}</span></td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{c.gst_number || '—'}</td>
                    <td><span className={`badge ${c.is_active !== false ? 'badge-green' : 'badge-gray'}`}>{c.is_active !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => setSelected(c)}><Eye style={{ width: 13 }} /></button>
                    </td>
                  </tr>
                )
              })}
              {!loadingData && filtered.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{selected.name}</span>
              <span className={`badge ${selected.biz_type === 'Retailer' ? 'badge-blue' : 'badge-purple'}`}>{selected.biz_type || 'Retailer'}</span>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: 8 }}>
                <div><div className="form-label">Mobile</div><p>{selected.mobile || '—'}</p></div>
                <div><div className="form-label">Email</div><p style={{ fontSize: 12 }}>{selected.email || '—'}</p></div>
              </div>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <div><div className="form-label">City</div><p>{selected.city || '—'}</p></div>
                <div><div className="form-label">State</div><p>{selected.state || '—'}</p></div>
                <div><div className="form-label">GST Number</div><p style={{ fontSize: 12, fontFamily: 'monospace' }}>{selected.gst_number || '—'}</p></div>
              </div>
              {selected.address && (
                <div className="form-group"><div className="form-label">Address</div><p style={{ fontSize: 13 }}>{selected.address}</p></div>
              )}
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div><div className="form-label">Credit Limit</div><p style={{ fontWeight: 700 }}>₹{(selected.credit_limit || 0).toLocaleString()}</p></div>
                <div><div className="form-label">Status</div><p><span className={`badge ${selected.is_active !== false ? 'badge-green' : 'badge-gray'}`}>{selected.is_active !== false ? 'Active' : 'Inactive'}</span></p></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Add New Customer</span><button className="btn-ghost" onClick={() => setShowAddModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Company / Shop Name *</label>
                  <input className={`form-control${errors.name ? ' error' : ''}`} placeholder="e.g. Patel Tile Store" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
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
                  <label className="form-label">Email</label>
                  <input className="form-control" placeholder="email@company.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">GST Number</label>
                  <input className="form-control" placeholder="15-char GSTIN" style={{ fontFamily: 'monospace' }} value={form.gst_number} onChange={e => setForm(p => ({ ...p, gst_number: e.target.value.toUpperCase() }))} maxLength={15} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-control" placeholder="State" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Customer Type</label>
                <select className="form-control" value={form.biz_type} onChange={e => setForm(p => ({ ...p, biz_type: e.target.value }))}>
                  <option>Retailer</option><option>Wholesaler</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Customer'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
