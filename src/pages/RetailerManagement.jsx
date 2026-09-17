/**
 * RetailerManagement.jsx
 * Admin hub for all retailer app connections.
 * Tabs: Overview | Companies | Orders | Enquiries | Users | Subscriptions
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Building2, ShoppingCart, MessageSquare, Users, CreditCard,
  RefreshCw, Search, Eye, CheckCircle, XCircle, AlertCircle,
  X, TrendingUp, ShieldOff, ShieldCheck, FileText,
} from 'lucide-react'
import { retailerApi } from '../api/retailerApi'

// ─── helpers ─────────────────────────────────────────────────
const money   = n => n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN')
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_BADGE = {
  Approved: 'badge-green', Active: 'badge-green', Delivered: 'badge-green', Confirmed: 'badge-green',
  Pending: 'badge-yellow', New: 'badge-yellow', Viewed: 'badge-yellow',
  Rejected: 'badge-red', Suspended: 'badge-red', Cancelled: 'badge-red',
  Dispatched: 'badge-blue', Replied: 'badge-blue',
}
const badge = s => STATUS_BADGE[s] || 'badge-gray'

const PLANS = ['Free', 'Retailer Basic', 'Retailer Pro']

// ═══════════════════════════════════════════════════════════════
export default function RetailerManagement() {
  const [tab, setTab] = useState('overview')

  // data
  const [companies,   setCompanies]   = useState([])
  const [orders,      setOrders]      = useState([])
  const [enquiries,   setEnquiries]   = useState([])
  const [users,       setUsers]       = useState([])
  const [subs,        setSubs]        = useState([])
  const [revenue,     setRevenue]     = useState(null)

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [search,  setSearch]  = useState('')
  const [toast,   setToast]   = useState({ msg: '', ok: true })

  // modals
  const [viewCompany,    setViewCompany]    = useState(null)
  const [rejectFor,      setRejectFor]      = useState(null)
  const [rejectReason,   setRejectReason]   = useState('')
  const [suspendFor,     setSuspendFor]     = useState(null)
  const [suspendReason,  setSuspendReason]  = useState('')
  const [planFor,        setPlanFor]        = useState(null)
  const [planForm,       setPlanForm]       = useState({ plan: 'Free', months: '1', enquiry_limit: '0', amount_paid: '' })
  const [saving,         setSaving]         = useState(false)

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 3500) }

  // ── Load all data ──────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [c, o, e, u, s, rev] = await Promise.all([
        retailerApi.listCompanies({ limit: 200 }).catch(() => ({ data: [] })),
        retailerApi.listOrders({ limit: 200 }).catch(() => ({ data: [] })),
        retailerApi.listEnquiries({ limit: 200 }).catch(() => ({ data: [] })),
        retailerApi.listUsers({ limit: 200 }).catch(() => ({ data: [] })),
        retailerApi.listSubscriptions().catch(() => ({ data: { subscriptions: [] } })),
        retailerApi.revenue().catch(() => null),
      ])
      setCompanies (c?.data?.companies  || c?.companies  || c?.data || [])
      setOrders    (o?.data?.orders     || o?.orders     || o?.data || [])
      setEnquiries (e?.data?.enquiries  || e?.enquiries  || e?.data || [])
      setUsers     (u?.data?.users      || u?.users      || u?.data || [])
      setSubs      (s?.data?.subscriptions || s?.subscriptions || [])
      setRevenue   (rev?.data || rev || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load retailer data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Actions ────────────────────────────────────────────────
  const handleApprove = async (id, name) => {
    setSaving(true)
    try {
      await retailerApi.approveCompany(id)
      showToast(`${name} approved.`)
      load()
    } catch (e) { showToast(e?.response?.data?.message || 'Approve failed.', false) }
    finally { setSaving(false) }
  }

  const handleReject = async () => {
    if (!rejectFor) return
    setSaving(true)
    try {
      await retailerApi.rejectCompany(rejectFor.id || rejectFor._id, rejectReason)
      showToast(`${rejectFor.name} rejected.`)
      setRejectFor(null); setRejectReason(''); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Reject failed.', false) }
    finally { setSaving(false) }
  }

  const handleSuspend = async () => {
    if (!suspendFor) return
    setSaving(true)
    try {
      await retailerApi.suspendCompany(suspendFor.id || suspendFor._id, suspendReason)
      showToast(`${suspendFor.name} suspended.`)
      setSuspendFor(null); setSuspendReason(''); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Suspend failed.', false) }
    finally { setSaving(false) }
  }

  const handleReinstate = async (id, name) => {
    setSaving(true)
    try {
      await retailerApi.reinstateCompany(id)
      showToast(`${name} reinstated.`)
      load()
    } catch (e) { showToast(e?.response?.data?.message || 'Reinstate failed.', false) }
    finally { setSaving(false) }
  }

  const handlePlan = async () => {
    if (!planFor) return
    setSaving(true)
    try {
      await retailerApi.setCompanyPlan(planFor.company_id || planFor.id || planFor._id, {
        plan: planForm.plan,
        months: parseInt(planForm.months) || 1,
        enquiry_limit: parseInt(planForm.enquiry_limit) || 0,
        amount_paid: parseFloat(planForm.amount_paid) || 0,
      })
      showToast('Plan updated.')
      setPlanFor(null); load()
    } catch (e) { showToast(e?.response?.data?.message || 'Plan update failed.', false) }
    finally { setSaving(false) }
  }

  // ── Filtered data ─────────────────────────────────────────
  const q     = search.trim().toLowerCase()
  const match = (...vals) => !q || vals.some(v => (v || '').toLowerCase().includes(q))

  const fCompanies = companies.filter(c => match(c.name, c.owner_name, c.mobile, c.email, c.company_code))
  const fOrders    = orders.filter(o    => match(o.order_code, o.company_name, o.customer_name, o.product_name))
  const fEnquiries = enquiries.filter(e => match(e.enq_code, e.company_name, e.retailer_name, e.product_name))
  const fUsers     = users.filter(u     => match(u.name, u.mobile, u.email, u.company_name))
  const fSubs      = subs.filter(s      => match(s.company_name, s.plan, s.company_code))

  // ── Stats ─────────────────────────────────────────────────
  const pendingCount   = companies.filter(c => c.status === 'Pending').length
  const approvedCount  = companies.filter(c => c.status === 'Approved').length
  const suspendedCount = companies.filter(c => c.status === 'Suspended').length

  const STATS = [
    { label: 'Total Retailers',   val: companies.length,  icon: Building2,     color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Pending Approval',  val: pendingCount,      icon: AlertCircle,   color: '#D97706', bg: '#FFFBEB' },
    { label: 'Approved',          val: approvedCount,     icon: CheckCircle,   color: '#059669', bg: '#ECFDF5' },
    { label: 'Suspended',         val: suspendedCount,    icon: ShieldOff,     color: '#DC2626', bg: '#FEF2F2' },
    { label: 'Total Orders',      val: orders.length,     icon: ShoppingCart,  color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Enquiries',         val: enquiries.length,  icon: MessageSquare, color: '#EA580C', bg: '#FFF7ED' },
    { label: 'Users',             val: users.length,      icon: Users,         color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Platform Revenue',  val: money(revenue?.total_revenue), icon: TrendingUp, color: '#059669', bg: '#ECFDF5' },
  ]

  const TABS = [
    { key: 'overview',   label: 'Overview' },
    { key: 'companies',  label: `Companies (${companies.length})` },
    { key: 'orders',     label: `Orders (${orders.length})` },
    { key: 'enquiries',  label: `Enquiries (${enquiries.length})` },
    { key: 'users',      label: `Users (${users.length})` },
    { key: 'subs',       label: `Subscriptions (${subs.length})` },
  ]

  return (
    <>
      {/* ── Toast ── */}
      {toast.msg && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, background: toast.ok ? '#059669' : '#DC2626', color: '#fff', padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,.2)', maxWidth: 380 }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div className="page-header-left">
          <div className="page-title">Retailer Management</div>
          <div className="page-desc">Manage retailer app registrations, approvals, orders and subscriptions</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-warning" style={{ marginBottom: 14 }}><AlertCircle size={15} style={{ marginRight: 8 }} />{error}</div>}

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => { setTab(t.key); setSearch('') }}>
            {t.label}
            {t.key === 'companies' && pendingCount > 0 && (
              <span style={{ marginLeft: 6, background: '#DC2626', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════ */}
      {tab === 'overview' && (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {STATS.map(({ label, val, icon: Icon, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 14, padding: '16px 20px', border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pending approvals */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Pending Approvals
                {pendingCount > 0 && <span style={{ background: '#DC2626', color: '#fff', borderRadius: 20, padding: '1px 9px', fontSize: 11, fontWeight: 800 }}>{pendingCount}</span>}
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => setTab('companies')}>View All Companies</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Company</th><th>Owner</th><th>Mobile</th><th>Email</th><th>Biz Type</th><th>Registered</th><th style={{ textAlign: 'center' }}>Actions</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Loading…</td></tr>}
                  {!loading && companies.filter(c => c.status === 'Pending').length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                      <CheckCircle size={20} color="#059669" style={{ marginBottom: 6, display: 'block', margin: '0 auto 6px' }} />
                      No pending approvals — you're all caught up!
                    </td></tr>
                  )}
                  {!loading && companies.filter(c => c.status === 'Pending').slice(0, 10).map(c => (
                    <tr key={c._id || c.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.company_code}</div>
                      </td>
                      <td>{c.owner_name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.mobile}</td>
                      <td style={{ fontSize: 12 }}>{c.email}</td>
                      <td>{c.biz_type || 'Retailer'}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(c.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button className="btn btn-sm btn-primary" style={{ background: '#059669', fontSize: 11 }} disabled={saving}
                            onClick={() => handleApprove(c._id || c.id, c.name)}>
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }}
                            onClick={() => { setRejectFor(c); setRejectReason('') }}>
                            <XCircle size={12} /> Reject
                          </button>
                          <button className="btn btn-sm btn-secondary" style={{ fontSize: 11 }}
                            onClick={() => setViewCompany(c)}>
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ COMPANIES ═════════════════════════════════════════ */}
      {tab === 'companies' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Retailer Companies</span>
            <div className="header-actions">
              <div className="search-bar"><Search size={14} /><input placeholder="Search companies…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th><th>Owner</th><th>Mobile</th><th>Email</th>
                  <th>GST</th><th>Status</th><th>Registered</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30 }}>Loading…</td></tr>}
                {!loading && fCompanies.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No retailer companies found.</td></tr>
                )}
                {!loading && fCompanies.map(c => (
                  <tr key={c._id || c.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.company_code}</div>
                    </td>
                    <td>{c.owner_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.mobile}</td>
                    <td style={{ fontSize: 12 }}>{c.email}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{c.gst_number || '—'}</td>
                    <td><span className={`badge ${badge(c.status)}`}>{c.status}</span></td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(c.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-secondary" title="View" onClick={() => setViewCompany(c)}><Eye size={12} /></button>
                        {c.status === 'Pending' && <>
                          <button className="btn btn-sm btn-primary" style={{ background: '#059669', fontSize: 11 }} disabled={saving}
                            onClick={() => handleApprove(c._id || c.id, c.name)}>
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }}
                            onClick={() => { setRejectFor(c); setRejectReason('') }}>
                            <XCircle size={12} /> Reject
                          </button>
                        </>}
                        {c.status === 'Approved' && (
                          <button className="btn btn-sm btn-secondary" style={{ fontSize: 11, color: '#DC2626' }}
                            onClick={() => { setSuspendFor(c); setSuspendReason('') }}>
                            <ShieldOff size={12} /> Suspend
                          </button>
                        )}
                        {c.status === 'Suspended' && (
                          <button className="btn btn-sm btn-primary" style={{ fontSize: 11, background: '#059669' }} disabled={saving}
                            onClick={() => handleReinstate(c._id || c.id, c.name)}>
                            <ShieldCheck size={12} /> Reinstate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ ORDERS ════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Retailer Orders</span>
            <div className="header-actions">
              <div className="search-bar"><Search size={14} /><input placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Company</th><th>Customer</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30 }}>Loading…</td></tr>}
                {!loading && fOrders.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No orders found.</td></tr>}
                {!loading && fOrders.map((o, i) => (
                  <tr key={o._id || i}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F26522', fontSize: 12 }}>{o.order_code || '—'}</td>
                    <td>{o.company_name || '—'}</td>
                    <td>{o.customer_name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{o.product_name || '—'}</td>
                    <td>{o.qty || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{money(o.total_amount)}</td>
                    <td><span className={`badge ${badge(o.status)}`}>{o.status}</span></td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ ENQUIRIES ═════════════════════════════════════════ */}
      {tab === 'enquiries' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">All Retailer Enquiries</span>
            <div className="header-actions">
              <div className="search-bar"><Search size={14} /><input placeholder="Search enquiries…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Code</th><th>Company</th><th>Product</th><th>Qty</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading…</td></tr>}
                {!loading && fEnquiries.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No enquiries found.</td></tr>}
                {!loading && fEnquiries.map((e, i) => (
                  <tr key={e._id || i}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#F26522', fontSize: 12 }}>{e.enq_code || '—'}</td>
                    <td>{e.company_name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{e.product_name || '—'}</td>
                    <td>{e.qty} {e.unit || ''}</td>
                    <td><span className={`badge ${badge(e.status)}`}>{e.status}</span></td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ USERS ═════════════════════════════════════════════ */}
      {tab === 'users' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Retailer App Users</span>
            <div className="header-actions">
              <div className="search-bar"><Search size={14} /><input placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Company</th><th>Mobile</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }}>Loading…</td></tr>}
                {!loading && fUsers.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No users found.</td></tr>}
                {!loading && fUsers.map((u, i) => (
                  <tr key={u._id || i}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td>
                    <td>{u.company_name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.mobile || '—'}</td>
                    <td style={{ fontSize: 12 }}>{u.email || '—'}</td>
                    <td>{u.role || 'Retailer'}</td>
                    <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ SUBSCRIPTIONS ═════════════════════════════════════ */}
      {tab === 'subs' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Retailer Subscriptions</span>
            <div className="header-actions">
              <div className="search-bar"><Search size={14} /><input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Company</th><th>Plan</th><th>Enquiries</th><th>Expires</th><th>Last Paid</th><th>Status</th><th style={{ textAlign: 'center' }}>Action</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>Loading…</td></tr>}
                {!loading && fSubs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No subscriptions found.</td></tr>}
                {!loading && fSubs.map(s => (
                  <tr key={s.company_id}>
                    <td style={{ fontWeight: 600 }}>{s.company_name}</td>
                    <td><span className="badge badge-blue">{s.plan}</span></td>
                    <td>{s.enquiry_limit > 0 ? `${s.enquiries_used}/${s.enquiry_limit}` : `${s.enquiries_used} (unlimited)`}</td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(s.expires_at)}</td>
                    <td>{money(s.last_amount)}</td>
                    <td><span className={`badge ${badge(s.status)}`}>{s.status}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-sm btn-primary"
                        onClick={() => { setPlanFor(s); setPlanForm({ plan: s.plan || 'Free', months: '1', enquiry_limit: String(s.enquiry_limit || 0), amount_paid: '' }) }}>
                        Manage Plan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════ MODALS ════════════════════════════════════════════ */}

      {/* View Company */}
      {viewCompany && (
        <div className="modal-overlay" onClick={() => setViewCompany(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><Building2 size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />{viewCompany.name}</span>
              <button className="modal-close" onClick={() => setViewCompany(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  ['Company Code',    viewCompany.company_code],
                  ['Owner',          viewCompany.owner_name],
                  ['Mobile',         viewCompany.mobile],
                  ['Email',          viewCompany.email],
                  ['Business Type',  viewCompany.biz_type],
                  ['GST Number',     viewCompany.gst_number],
                  ['PAN Number',     viewCompany.pan_number],
                  ['Status',         viewCompany.status],
                  ['Address',        viewCompany.address],
                  ['City / State',   [viewCompany.city, viewCompany.state].filter(Boolean).join(', ')],
                  ['Pincode',        viewCompany.pin_code],
                  ['Registered',     fmtDate(viewCompany.created_at)],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-word' }}>{val || '—'}</div>
                  </div>
                ))}
              </div>

              {/* KYC docs status */}
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 8 }}>KYC Documents</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[['GST', viewCompany.docs_gst], ['PAN', viewCompany.docs_pan], ['Address', viewCompany.docs_address], ['Business', viewCompany.docs_biz]].map(([label, ok]) => (
                    <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: ok ? '#ECFDF5' : '#FEF2F2', color: ok ? '#059669' : '#DC2626', border: `1px solid ${ok ? '#A7F3D0' : '#FECACA'}` }}>
                      {ok ? <CheckCircle size={11} /> : <XCircle size={11} />}{label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setViewCompany(null)}>Close</button>
              {viewCompany.status === 'Pending' && (
                <>
                  <button className="btn btn-primary btn-sm" style={{ background: '#059669' }} disabled={saving}
                    onClick={() => { handleApprove(viewCompany._id || viewCompany.id, viewCompany.name); setViewCompany(null) }}>
                    <CheckCircle size={13} style={{ marginRight: 4 }} />Approve
                  </button>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => { setRejectFor(viewCompany); setViewCompany(null); setRejectReason('') }}>
                    <XCircle size={13} style={{ marginRight: 4 }} />Reject
                  </button>
                </>
              )}
              {viewCompany.status === 'Approved' && (
                <button className="btn btn-secondary btn-sm" style={{ color: '#DC2626' }}
                  onClick={() => { setSuspendFor(viewCompany); setViewCompany(null); setSuspendReason('') }}>
                  <ShieldOff size={13} style={{ marginRight: 4 }} />Suspend
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Company */}
      {rejectFor && (
        <div className="modal-overlay" onClick={() => !saving && setRejectFor(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><XCircle size={15} style={{ marginRight: 6, verticalAlign: 'middle', color: '#DC2626' }} />Reject — {rejectFor.name}</span>
              <button className="modal-close" onClick={() => setRejectFor(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <textarea className="form-control" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Incomplete documents" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => setRejectFor(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" disabled={saving} onClick={handleReject}>{saving ? 'Rejecting…' : 'Reject'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Company */}
      {suspendFor && (
        <div className="modal-overlay" onClick={() => !saving && setSuspendFor(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><ShieldOff size={15} style={{ marginRight: 6, verticalAlign: 'middle', color: '#DC2626' }} />Suspend — {suspendFor.name}</span>
              <button className="modal-close" onClick={() => setSuspendFor(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Reason <span style={{ color: '#DC2626' }}>*</span></label>
                <textarea className="form-control" rows={3} value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="e.g. Policy violation" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => setSuspendFor(null)}>Cancel</button>
              <button className="btn btn-danger btn-sm" disabled={saving || !suspendReason.trim()} onClick={handleSuspend}>{saving ? 'Suspending…' : 'Suspend'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Plan */}
      {planFor && (
        <div className="modal-overlay" onClick={() => !saving && setPlanFor(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title"><CreditCard size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />Manage Plan — {planFor.company_name}</span>
              <button className="modal-close" onClick={() => setPlanFor(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Plan</label>
                <select className="form-control" value={planForm.plan} onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))}>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Extend (months)</label>
                  <input type="number" min="1" className="form-control" value={planForm.months} onChange={e => setPlanForm(f => ({ ...f, months: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Enquiry Limit (0 = unlimited)</label>
                  <input type="number" min="0" className="form-control" value={planForm.enquiry_limit} onChange={e => setPlanForm(f => ({ ...f, enquiry_limit: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Amount Paid (₹)</label>
                <input type="number" min="0" className="form-control" placeholder="0" value={planForm.amount_paid} onChange={e => setPlanForm(f => ({ ...f, amount_paid: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" disabled={saving} onClick={() => setPlanFor(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={handlePlan}>{saving ? 'Saving…' : 'Update Plan'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
