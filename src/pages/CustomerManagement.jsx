import { useState } from 'react'
import { Plus, Search, Eye, MapPin, Users, FileText, IndianRupee, CheckCircle } from 'lucide-react'
import { customerApi } from '../api/crmApi'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const EMPTY_FORM = { name: '', mobile: '', email: '', gst_number: '', address: '', city: '', state: '', pincode: '', biz_type: 'Retailer' }

export default function CustomerManagement({ customers = [], addCustomer, loadingData }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
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
    if (!form.address.trim()) e.address = 'Address required'
    if (!form.city.trim()) e.city = 'City required'
    if (!form.state.trim()) e.state = 'State required'
    if (!form.pincode.trim() || !/^\d{6}$/.test(form.pincode)) e.pincode = 'Valid 6-digit pincode required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const result = await addCustomer?.({
      name: form.name, mobile: form.mobile, email: form.email,
      gst_number: form.gst_number, address: form.address,
      city: form.city, state: form.state, pincode: form.pincode,
      biz_type: form.biz_type,
    })
    setSaving(false)
    if (result?.success === false) { toast(`Error: ${result.message}`); return }
    setForm(EMPTY_FORM)
    setErrors({})
    setShowAddModal(false)
    toast(`Customer added successfully`)
  }

  // Open the detail modal and fetch full profile + history (orders, enquiries, outstanding).
  const openDetail = async (customer) => {
    setSelected(customer)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await customerApi.get(customer._id || customer.id)
      setDetail(res?.data || res)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setSelected(null)
    setDetail(null)
    setDetailLoading(false)
  }

  return (
    <>
      <div className="breadcrumb"><span>CRM & Leads</span><span className="breadcrumb-sep">›</span><span className="breadcrumb-active">Customer Management</span></div>

      {successMsg && <div className="alert alert-info" style={{ marginBottom: 14 }}>✓ {successMsg}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Customers', val: customers.length, color: 'blue', icon: <Users /> },
          { label: 'With GST', val: customers.filter(c => (c.gst_number || '').trim()).length, color: 'purple', icon: <FileText /> },
          { label: 'With Outstanding', val: customers.filter(c => (c.outstanding_amount || 0) > 0).length, color: 'red', icon: <IndianRupee /> },
          { label: 'Active', val: customers.filter(c => c.is_active !== false).length, color: 'green', icon: <CheckCircle /> },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
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
            <thead><tr><th>Customer</th><th>Mobile</th><th>City</th><th>GST</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loadingData && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Loading…</td></tr>}
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
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{c.gst_number || '—'}</td>
                    <td><span className={`badge ${c.is_active !== false ? 'badge-green' : 'badge-gray'}`}>{c.is_active !== false ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => openDetail(c)}><Eye style={{ width: 13 }} /></button>
                    </td>
                  </tr>
                )
              })}
              {!loadingData && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (() => {
        const c = detail || selected
        const orders = detail?.orders || []
        const enquiries = detail?.enquiries || []
        const outstanding = detail?.outstanding_amount || 0
        return (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{c.name}</span>
              <span className={`badge ${c.is_active !== false ? 'badge-green' : 'badge-gray'}`}>{c.is_active !== false ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="modal-body">
              {/* ── Customer Profile ── */}
              <div className="form-section-label">Customer Profile</div>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <div><div className="form-label">Customer Name</div><p>{c.name || '—'}</p></div>
                <div><div className="form-label">Mobile Number</div><p>{c.mobile || '—'}</p></div>
              </div>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <div><div className="form-label">GST Number</div><p style={{ fontSize: 12, fontFamily: 'monospace' }}>{c.gst_number || '—'}</p></div>
                <div><div className="form-label">Email</div><p style={{ fontSize: 12 }}>{c.email || '—'}</p></div>
              </div>
              <div className="form-group">
                <div className="form-label">Address</div>
                <p style={{ fontSize: 13 }}>
                  {[c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div><div className="form-label">Status</div><p><span className={`badge ${c.is_active !== false ? 'badge-green' : 'badge-gray'}`}>{c.is_active !== false ? 'Active' : 'Inactive'}</span></p></div>
                <div><div className="form-label">Outstanding Amount</div><p style={{ fontWeight: 700, color: outstanding > 0 ? 'var(--danger, #dc2626)' : 'inherit' }}>{fmtMoney(outstanding)}</p></div>
              </div>

              {/* ── Customer History ── */}
              <div className="form-section-label" style={{ marginTop: 18 }}>Customer History</div>

              {detailLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Loading history…</p>
              ) : (
                <>
                  <div className="form-label" style={{ marginTop: 4 }}>Previous Orders ({orders.length})</div>
                  <OrderTable rows={orders} emptyText="No previous orders." badgeClass="badge-blue" />

                  <div className="form-label" style={{ marginTop: 12 }}>Previous Enquiries ({enquiries.length})</div>
                  <EnquiryTable rows={enquiries} emptyText="No previous enquiries." badgeClass="badge-purple" />
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeDetail}>Close</button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Add New Customer</span><button className="btn-ghost" onClick={() => setShowAddModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-section-label">Basic Details</div>
              <div className="form-group">
                <label className="form-label">Customer / Business name *</label>
                <input className={`form-control${errors.name ? ' error' : ''}`} placeholder="e.g. ABC Tiles" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                {errors.name && <div className="form-error">{errors.name}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile number *</label>
                  <input className={`form-control${errors.mobile ? ' error' : ''}`} placeholder="10-digit mobile" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} maxLength={10} />
                  {errors.mobile && <div className="form-error">{errors.mobile}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" placeholder="customer@business.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">GST number</label>
                <input className="form-control" placeholder="Optional GSTIN" style={{ fontFamily: 'monospace' }} value={form.gst_number} onChange={e => setForm(p => ({ ...p, gst_number: e.target.value.toUpperCase() }))} maxLength={15} />
              </div>

              <div className="form-section-label" style={{ marginTop: 16 }}>Address</div>
              <div className="form-group">
                <label className="form-label">Street / Building *</label>
                <textarea className={`form-control${errors.address ? ' error' : ''}`} placeholder="Building and street" rows={2} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
                {errors.address && <div className="form-error">{errors.address}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className={`form-control${errors.city ? ' error' : ''}`} placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                  {errors.city && <div className="form-error">{errors.city}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">State *</label>
                  <input className={`form-control${errors.state ? ' error' : ''}`} placeholder="State" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
                  {errors.state && <div className="form-error">{errors.state}</div>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Pincode *</label>
                <input className={`form-control${errors.pincode ? ' error' : ''}`} placeholder="6-digit pincode" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))} maxLength={6} />
                {errors.pincode && <div className="form-error">{errors.pincode}</div>}
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

// ── History tables ────────────────────────────────────────────
function OrderTable({ rows, emptyText, badgeClass }) {
  if (!rows.length) return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{emptyText}</p>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Order</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {rows.map(o => (
            <tr key={o._id}>
              <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{o.order_code || '—'}</td>
              <td style={{ fontSize: 12 }}>{o.product_name || '—'}</td>
              <td style={{ fontSize: 12 }}>{o.qty ?? '—'}</td>
              <td style={{ fontSize: 12 }}>{fmtMoney(o.total_amount)}</td>
              <td><span className={`badge ${badgeClass}`}>{o.status || '—'}</span></td>
              <td style={{ fontSize: 12 }}>{fmtDate(o.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EnquiryTable({ rows, emptyText, badgeClass }) {
  if (!rows.length) return <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{emptyText}</p>
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Enquiry</th><th>Product</th><th>Qty</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {rows.map(en => (
            <tr key={en._id}>
              <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{en.enq_code || '—'}</td>
              <td style={{ fontSize: 12 }}>{en.product_name || '—'}</td>
              <td style={{ fontSize: 12 }}>{en.qty ?? '—'}</td>
              <td><span className={`badge ${badgeClass}`}>{en.status || '—'}</span></td>
              <td style={{ fontSize: 12 }}>{fmtDate(en.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


