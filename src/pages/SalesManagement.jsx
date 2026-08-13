import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Search, Download } from 'lucide-react'

// API field helpers — backend returns snake_case
const salCode     = s => s.sale_code      || s.id       || ''
const salCustomer = s => s.customer_name  || s.customer || ''
const salProduct  = s => s.product_name   || s.product  || ''
const salDate     = s => s.sale_date
  ? new Date(s.sale_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : (s.date || '')
const salTotal    = s => s.total_amount   || s.total    || 0
const salAmount   = s => s.amount         || 0
const salGst      = s => s.gst_amount     || s.gst      || 0
const salPayment  = s => s.payment_status || s.payment  || 'Pending'
const salOrderRef = s => s.order_id       || s.orderId  || ''

export default function SalesManagement({ sales = [], orders = [] }) {
  const [search, setSearch] = useState('')

  // Calculate live totals using API fields
  const totalSales    = sales.reduce((a, s) => a + salTotal(s), 0)
  const pendingPayment = sales.filter(s => salPayment(s) === 'Pending').reduce((a, s) => a + salTotal(s), 0)

  // Build monthly trend from live sales data
  const monthMap = {}
  sales.forEach(s => {
    const dt = s.sale_date ? new Date(s.sale_date) : null
    if (!dt) return
    const key = dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
    monthMap[key] = (monthMap[key] || 0) + salTotal(s)
  })
  const trendData = Object.entries(monthMap).map(([month, sales]) => ({ month, sales }))
  if (trendData.length === 0) trendData.push({ month: 'Current', sales: totalSales })

  const filtered = sales.filter(s =>
    salCustomer(s).toLowerCase().includes(search.toLowerCase()) ||
    salCode(s).includes(search) ||
    salProduct(s).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="breadcrumb">
        <span>Finance</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Sales Management</span>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Sales',       val: `₹${totalSales.toLocaleString()}`,   color: 'blue' },
          { label: 'Total Invoices',    val: sales.length,                          color: 'green' },
          { label: 'Pending Payment',   val: `₹${pendingPayment.toLocaleString()}`, color: 'red' },
          { label: 'Avg Order Value',   val: sales.length ? `₹${Math.round(totalSales / sales.length).toLocaleString()}` : '—', color: 'purple' },
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

      <div style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Sales Trend</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Sales Entries ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar"><Search /><input placeholder="Search sales…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <button className="btn btn-secondary"><Download style={{ width: 15 }} />Export</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sale ID</th><th>Date</th><th>Customer</th><th>Product</th><th>Qty</th>
                <th>Rate</th><th>Amount</th><th>GST</th><th>Total</th><th>Order Ref</th><th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s._id || s.id}>
                  <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{salCode(s)}</td>
                  <td style={{ fontSize: 12 }}>{salDate(s)}</td>
                  <td style={{ fontWeight: 600 }}>{salCustomer(s)}</td>
                  <td style={{ fontSize: 12 }}>{salProduct(s)}</td>
                  <td>{(s.qty || 0).toLocaleString()} {s.unit || 'Sq Ft'}</td>
                  <td>₹{(s.rate || 0).toLocaleString()}</td>
                  <td>₹{salAmount(s).toLocaleString()}</td>
                  <td style={{ color: 'var(--text-muted)' }}>₹{salGst(s).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{salTotal(s).toLocaleString()}</td>
                  <td style={{ color: 'var(--primary)', fontSize: 12 }}>{salOrderRef(s) ? String(salOrderRef(s)).substring(0, 10) + '…' : '—'}</td>
                  <td>
                    <span className={`badge ${salPayment(s) === 'Received' ? 'badge-green' : salPayment(s) === 'Partial' ? 'badge-yellow' : 'badge-red'}`}>
                      {salPayment(s)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No sales entries yet. Sales are auto-created when orders are delivered.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
