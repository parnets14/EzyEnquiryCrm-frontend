import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, Search, Download, Plus, Calendar, BarChart2 } from 'lucide-react'

// ── API field helpers ──
const salCode     = s => s.sale_code      || s.id       || ''
const salCustomer = s => s.customer_name  || s.customer || ''
const salProduct  = s => s.product_name   || s.product  || ''
const salBranch   = s => s.branch_name    || s.branch   || ''
const salDate     = s => s.sale_date
  ? new Date(s.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : (s.date || '')
const salTotal    = s => s.total_amount   || s.total    || 0
const salAmount   = s => s.amount         || 0
const salGst      = s => s.gst_amount     || s.gst      || 0
const salPayment  = s => s.payment_status || s.payment  || 'Pending'
const salOrderRef = s => s.order_id       || s.orderId  || ''

// ── Date helpers ──
const todayStr   = () => new Date().toISOString().split('T')[0]
const weekStart  = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] }
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }
const yearStart  = () => { const d = new Date(); d.setMonth(0); d.setDate(1); return d.toISOString().split('T')[0] }

const EMPTY_FORM = {
  customer_name: '', product_name: '', qty: '', rate: '',
  gst_percent: '18', payment_status: 'Pending', sale_date: todayStr(),
}

export default function SalesManagement({ branches = [], sales = [], orders = [], customers = [], products = [], addSale }) {
  const branchNames = branches.map(b => b.name || b).filter(Boolean)
  const [search,       setSearch]       = useState('')
  const [branchFilter, setBranchFilter] = useState('All')
  const [reportTab,    setReportTab]    = useState('monthly')
  const [fromDate,     setFromDate]     = useState(monthStart())
  const [toDate,       setToDate]       = useState(todayStr())
  const [showModal,    setShowModal]    = useState(false)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [errors,       setErrors]       = useState({})
  const [saving,       setSaving]       = useState(false)
  const [successMsg,   setSuccessMsg]   = useState('')

  const toast = msg => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const switchTab = (tab) => {
    setReportTab(tab)
    if (tab === 'daily')   { setFromDate(todayStr());   setToDate(todayStr()) }
    if (tab === 'weekly')  { setFromDate(weekStart());  setToDate(todayStr()) }
    if (tab === 'monthly') { setFromDate(monthStart()); setToDate(todayStr()) }
    if (tab === 'yearly')  { setFromDate(yearStart());  setToDate(todayStr()) }
  }

  // ── Date-range filtered sales ──
  const rangeFiltered = useMemo(() => {
    const from = new Date(fromDate + 'T00:00:00')
    const to   = new Date(toDate   + 'T23:59:59')
    return sales.filter(s => {
      if (!s.sale_date) return false
      const d = new Date(s.sale_date)
      return d >= from && d <= to
    })
  }, [sales, fromDate, toDate])

  // ── KPI totals ──
  const totalSales     = sales.reduce((a, s) => a + salTotal(s), 0)
  const pendingPayment = sales.filter(s => salPayment(s) === 'Pending').reduce((a, s) => a + salTotal(s), 0)
  const rangeTotal     = rangeFiltered.reduce((a, s) => a + salTotal(s), 0)

  // ── Trend chart data (monthly, last 6 months) ──
  const trendData = useMemo(() => {
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const now = new Date()
    const slots = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      slots.push({
        key:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
        month: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        sales: 0,
      })
    }
    sales.forEach(s => {
      const raw = s.sale_date || ''
      if (!raw) return
      const d = new Date(raw); if (isNaN(d)) return
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const slot = slots.find(sl => sl.key === key)
      if (slot) slot.sales += salTotal(s)
    })
    return slots
  }, [sales])

  // ── Table filter ──
  const filtered = useMemo(() => rangeFiltered.filter(s =>
    (branchFilter === 'All' || salBranch(s) === branchFilter) &&
    (salCustomer(s).toLowerCase().includes(search.toLowerCase()) ||
     salCode(s).toLowerCase().includes(search.toLowerCase()) ||
     salProduct(s).toLowerCase().includes(search.toLowerCase()))
  ), [rangeFiltered, branchFilter, search])

  // ── Form computed values ──
  const formAmount = (Number(form.qty) * Number(form.rate)) || 0
  const formGst    = Math.round(formAmount * (Number(form.gst_percent) || 0) / 100)
  const formTotal  = formAmount + formGst

  const validate = () => {
    const e = {}
    if (!form.customer_name.trim()) e.customer_name = 'Customer required'
    if (!form.product_name.trim())  e.product_name  = 'Product required'
    if (!form.qty  || Number(form.qty)  <= 0) e.qty  = 'Valid qty required'
    if (!form.rate || Number(form.rate) <= 0) e.rate = 'Valid rate required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const result = await addSale?.({
      customer_name:  form.customer_name,
      product_name:   form.product_name,
      qty:            Number(form.qty),
      rate:           Number(form.rate),
      amount:         formAmount,
      gst_percent:    Number(form.gst_percent),
      gst_amount:     formGst,
      total_amount:   formTotal,
      payment_status: form.payment_status,
      sale_date:      form.sale_date,
    })
    setSaving(false)
    if (result?.success === false) { toast(`Error: ${result.message}`); return }
    setForm(EMPTY_FORM); setErrors({})
    setShowModal(false)
    toast(`Sale recorded – ₹${formTotal.toLocaleString()}`)
  }

  const REPORT_TABS = [
    { key: 'daily',   label: 'Daily',   icon: <Calendar style={{ width: 13 }} /> },
    { key: 'weekly',  label: 'Weekly',  icon: <Calendar style={{ width: 13 }} /> },
    { key: 'monthly', label: 'Monthly', icon: <BarChart2 style={{ width: 13 }} /> },
    { key: 'yearly',  label: 'Yearly',  icon: <TrendingUp style={{ width: 13 }} /> },
  ]

  return (
    <>
      <div className="breadcrumb">
        <span>Finance</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Sales Management</span>
      </div>

      {successMsg && (
        <div className="alert alert-info" style={{ marginBottom: 14 }}>✓ {successMsg}</div>
      )}

      {/* ── KPI Stats ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Sales',     val: `₹${totalSales.toLocaleString()}`,    color: 'blue' },
          { label: 'Total Invoices',  val: sales.length,                           color: 'green' },
          { label: 'Pending Payment', val: `₹${pendingPayment.toLocaleString()}`,  color: 'red' },
          { label: 'Avg Order Value', val: sales.length ? `₹${Math.round(totalSales / sales.length).toLocaleString()}` : '—', color: 'purple' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}><TrendingUp /></div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Report Tabs: Daily / Weekly / Monthly / Yearly ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Sales Reports</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {REPORT_TABS.map(t => (
              <button key={t.key}
                className={`btn btn-xs ${reportTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                onClick={() => switchTab(t.key)}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {/* Date range + range total */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>From</label>
              <input type="date" className="form-control" style={{ width: 150 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>To</label>
              <input type="date" className="form-control" style={{ width: 150 }} value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>
              {REPORT_TABS.find(t => t.key === reportTab)?.label} Total: ₹{rangeTotal.toLocaleString()}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>({rangeFiltered.length} entries)</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            {reportTab === 'daily' || reportTab === 'weekly' ? (
              <BarChart data={rangeFiltered.map(s => ({
                date: s.sale_date ? new Date(s.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
                total: salTotal(s),
              }))} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Bar dataKey="total" fill="#4F46E5" radius={[4,4,0,0]} name="Sales" />
              </BarChart>
            ) : (
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} name="Sales" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sales Entries Table ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Sales Entries ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar">
              <Search /><input placeholder="Search sales…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {branchNames.length > 0 && (
              <select className="form-control" style={{ width: 160 }} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                <option value="All">All Branches</option>
                {branchNames.map(b => <option key={b}>{b}</option>)}
              </select>
            )}
            <button className="btn btn-secondary"><Download style={{ width: 15 }} />Export</button>
            {addSale && (
              <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowModal(true) }}>
                <Plus style={{ width: 14 }} />Add Sale
              </button>
            )}
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sale ID</th><th>Date</th><th>Branch</th><th>Customer</th><th>Product</th>
                <th>Qty</th><th>Rate</th><th>Amount</th><th>GST</th><th>Total</th>
                <th>Order Ref</th><th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s._id || s.id}>
                  <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{salCode(s)}</td>
                  <td style={{ fontSize: 12 }}>{salDate(s)}</td>
                  <td style={{ fontSize: 12 }}>
                    {salBranch(s) ? <span className="badge badge-blue">{salBranch(s)}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 600 }}>{salCustomer(s)}</td>
                  <td style={{ fontSize: 12 }}>{salProduct(s)}</td>
                  <td>{(s.qty || 0).toLocaleString()} {s.unit || 'Sq Ft'}</td>
                  <td>₹{(s.rate || 0).toLocaleString()}</td>
                  <td>₹{salAmount(s).toLocaleString()}</td>
                  <td style={{ color: 'var(--text-muted)' }}>₹{salGst(s).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{salTotal(s).toLocaleString()}</td>
                  <td style={{ color: 'var(--primary)', fontSize: 12 }}>
                    {salOrderRef(s) ? String(salOrderRef(s)).substring(0, 10) + '…' : '—'}
                  </td>
                  <td>
                    <span className={`badge ${salPayment(s) === 'Received' ? 'badge-green' : salPayment(s) === 'Partial' ? 'badge-yellow' : 'badge-red'}`}>
                      {salPayment(s)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    No sales entries for selected range. Sales are auto-created when orders are delivered, or add manually.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Manual Add Sale Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Sale Entry</span>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  {customers.length > 0 ? (
                    <select className="form-control" value={form.customer_name}
                      onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}>
                      <option value="">— Select Customer —</option>
                      {customers.map(c => (
                        <option key={c._id || c.id} value={c.name || c.customer_name}>{c.name || c.customer_name}</option>
                      ))}
                    </select>
                  ) : (
                    <input className={`form-control${errors.customer_name ? ' error' : ''}`}
                      placeholder="Customer name" value={form.customer_name}
                      onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} />
                  )}
                  {errors.customer_name && <div className="form-error">{errors.customer_name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Sale Date *</label>
                  <input type="date" className="form-control" value={form.sale_date}
                    onChange={e => setForm(p => ({ ...p, sale_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Product *</label>
                {products.length > 0 ? (
                  <select className={`form-control${errors.product_name ? ' error' : ''}`}
                    value={form.product_name}
                    onChange={e => {
                      const prod = products.find(p => (p.name || p.product_name) === e.target.value)
                      setForm(prev => ({
                        ...prev,
                        product_name: e.target.value,
                        rate: prod ? String(prod.selling_rate || prod.rate || prod.retail_rate || '') : prev.rate,
                        gst_percent: prod ? String(prod.gst_percent || '18') : prev.gst_percent,
                      }))
                    }}>
                    <option value="">— Select Product —</option>
                    {products.map(p => (
                      <option key={p._id || p.id} value={p.name || p.product_name}>{p.name || p.product_name}</option>
                    ))}
                  </select>
                ) : (
                  <input className={`form-control${errors.product_name ? ' error' : ''}`}
                    placeholder="Product name" value={form.product_name}
                    onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} />
                )}
                {errors.product_name && <div className="form-error">{errors.product_name}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input className={`form-control${errors.qty ? ' error' : ''}`}
                    type="number" placeholder="0" value={form.qty}
                    onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} />
                  {errors.qty && <div className="form-error">{errors.qty}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Rate (₹) *</label>
                  <input className={`form-control${errors.rate ? ' error' : ''}`}
                    type="number" placeholder="0.00" value={form.rate}
                    onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} />
                  {errors.rate && <div className="form-error">{errors.rate}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">GST %</label>
                  <select className="form-control" value={form.gst_percent}
                    onChange={e => setForm(p => ({ ...p, gst_percent: e.target.value }))}>
                    {['0','5','12','18','28'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              {/* Auto-calculated totals */}
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', fontSize: 13, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Amount</span><span>₹{formAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: 'var(--text-muted)' }}>
                  <span>GST ({form.gst_percent}%)</span><span>₹{formGst.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--success)' }}>₹{formTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Payment Status</label>
                <select className="form-control" value={form.payment_status}
                  onChange={e => setForm(p => ({ ...p, payment_status: e.target.value }))}>
                  {['Pending', 'Partial', 'Received'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                <TrendingUp style={{ width: 14 }} />{saving ? 'Saving…' : 'Save Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
