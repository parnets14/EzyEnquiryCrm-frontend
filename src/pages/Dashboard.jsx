import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, ShoppingBag, MessageSquare, Package, Users, CreditCard, AlertTriangle, ArrowRight, Truck, CheckCircle } from 'lucide-react'

const statusColors = {
  New: 'badge-blue', Viewed: 'badge-cyan', Replied: 'badge-yellow',
  Negotiation: 'badge-orange', Confirmed: 'badge-green', Cancelled: 'badge-red',
}

export default function Dashboard({
  inventory = [], purchases = [], enquiries = [], orders = [],
  dispatches = [], sales = [], payments = { receivables: [], payables: [], history: [] },
  notifications = [], dashboardStats = null,
}) {
  // ── Prefer live dashboardStats from API, fall back to local calcs ─
  const todaySales      = dashboardStats?.todaySales      ?? sales.reduce((a, s) => a + (s.total_amount || s.total || 0), 0)
  const totalPurchase   = dashboardStats?.totalPurchase   ?? purchases.reduce((a, p) => a + (p.total_amount || p.total || 0), 0)
  const pendingOrders   = dashboardStats?.pendingOrders   ?? orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length
  const lowStockCount   = dashboardStats?.lowStockCount   ?? inventory.filter(i => (i.current_stock ?? i.current) <= (i.low_stock_alert ?? i.lowAlert)).length
  const totalOutstanding = dashboardStats?.totalOutstanding ?? (payments.receivables || []).reduce((a, r) => a + (r.outstanding || 0), 0)
  const activeEnquiries = enquiries.filter(e => !['Confirmed', 'Cancelled'].includes(e.status)).length
  const newEnquiries    = enquiries.filter(e => e.status === 'New').length
  const inTransit       = dispatches.filter(d => ['Dispatched', 'In Transit'].includes(d.status)).length

  // Stock derived values
  const totalStock    = dashboardStats?.totalStock ?? inventory.reduce((a, i) => a + (i.current_stock ?? i.current ?? 0), 0)
  const lowStockItems = inventory.filter(i => (i.current_stock ?? i.current ?? 0) <= (i.low_stock_alert ?? i.lowAlert ?? 0))
  const outstandingRcv = dashboardStats?.totalOutstanding ?? (payments.receivables || []).reduce((a, r) => a + (r.outstanding || 0), 0)

  // Revenue / profit
  const totalRevenue  = sales.reduce((a, s) => a + (s.amount || 0), 0)
  const totalCOGS     = orders.filter(o => ['Dispatched', 'Delivered'].includes(o.status))
    .reduce((a, o) => a + (o.purchase_cost || o.purchaseCost || 0), 0)
  const netProfit = dashboardStats
    ? (dashboardStats.monthSales - (dashboardStats.totalPurchase || 0))
    : (totalRevenue - totalCOGS)

  // Chart data — last 6 months, fully dynamic from purchases + sales props
  // If API provides trend data use it, otherwise build from raw data
  const rawTrend = dashboardStats?.trend || []
  const chartData = useMemo(() => {
    if (rawTrend.length > 0) {
      return rawTrend.map(t => ({
        month:    t.period || t.month || '',
        sales:    t.total_sales    || t.sales    || 0,
        purchase: t.total_purchase || t.purchase || 0,
        profit:   (t.total_sales || t.sales || 0) - (t.total_purchase || t.purchase || 0),
      }))
    }

    // Build last 6 months from raw purchases + sales arrays
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const now = new Date()
    const slots = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      slots.push({
        key:      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        month:    `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        sales:    0,
        purchase: 0,
        profit:   0,
      })
    }

    // Aggregate purchases
    purchases.forEach(p => {
      const raw = p.purchase_date || p.date || ''
      if (!raw) return
      const d = new Date(raw)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const slot = slots.find(s => s.key === key)
      if (slot) slot.purchase += (p.total_amount || p.total || 0)
    })

    // Aggregate sales
    sales.forEach(s => {
      const raw = s.sale_date || s.date || s.created_at || ''
      if (!raw) return
      const d = new Date(raw)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const slot = slots.find(sl => sl.key === key)
      if (slot) slot.sales += (s.total_amount || s.amount || s.total || 0)
    })

    // Compute profit per slot
    slots.forEach(s => { s.profit = s.sales - s.purchase })

    return slots
  }, [rawTrend, purchases, sales])

  // Top products / customers from dashboardStats
  const topProducts  = dashboardStats?.topProducts  || []
  const topCustomers = dashboardStats?.topCustomers || []

  // Recent enquiries from API data
  const recentEnquiries = dashboardStats?.recentEnquiries || enquiries.slice(0, 5)

  return (
    <>
      <div className="breadcrumb">
        <span className="breadcrumb-active">Dashboard</span>
        <span className="breadcrumb-sep">•</span>
        <span>{dashboardStats?.companyName || 'Business Overview'}</span>
      </div>

      {/* ── KPI Cards ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><TrendingUp /></div>
          <div className="stat-info">
            <div className="stat-label">Today's Sales</div>
            <div className="stat-value">₹{todaySales.toLocaleString()}</div>
            <div className="stat-change up">From {sales.length} invoice{sales.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><MessageSquare /></div>
          <div className="stat-info">
            <div className="stat-label">Active Enquiries</div>
            <div className="stat-value">{activeEnquiries}</div>
            <div className="stat-change up">▲ {newEnquiries} new</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><ShoppingBag /></div>
          <div className="stat-info">
            <div className="stat-label">Pending Orders</div>
            <div className="stat-value">{pendingOrders}</div>
            <div className="stat-change">{inTransit} in transit</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Package /></div>
          <div className="stat-info">
            <div className="stat-label">Stock Available</div>
            <div className="stat-value">{totalStock} Pcs</div>
            <div className="stat-change down">{lowStockItems.length > 0 ? `▼ ${lowStockItems.length} low stock` : '✓ All OK'}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cyan"><ShoppingBag /></div>
          <div className="stat-info">
            <div className="stat-label">Purchase</div>
            <div className="stat-value">₹{totalPurchase.toLocaleString()}</div>
            <div className="stat-change">{purchases.length} entries</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><CreditCard /></div>
          <div className="stat-info">
            <div className="stat-label">Outstanding (Recv.)</div>
            <div className="stat-value">₹{outstandingRcv.toLocaleString()}</div>
            <div className="stat-change down">{(payments.receivables || []).filter(r => r.outstanding > 0).length} pending</div>
          </div>
        </div>
      </div>

      {/* ── Profit highlight ── */}
      <div style={{
        background: 'linear-gradient(135deg, #01152D 0%, #FD5C02 100%)',
        borderRadius: 14, padding: '18px 24px', marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            NET PROFIT — {dashboardStats ? `Month of ${new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}` : 'Tiles Business'}
          </div>
          <div style={{ color: '#fff', fontSize: 28, fontWeight: 800 }}>
            {netProfit !== 0 ? `₹${netProfit.toLocaleString()}` : '₹0'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[
            { label: 'Avg Selling Rate',  val: sales.length ? `₹${Math.round(sales.reduce((a,s) => a + (s.rate || 0), 0) / sales.length).toLocaleString()} /Unit` : '—' },
            { label: 'Total Sales',       val: `₹${(dashboardStats?.monthSales ?? sales.reduce((a,s) => a + (s.total_amount || 0), 0)).toLocaleString()}` },
            { label: 'Total Purchase',    val: `₹${(dashboardStats?.totalPurchase ?? purchases.reduce((a,p) => a + (p.total_amount || 0), 0)).toLocaleString()}` },
          ].map(item => (
            <div key={item.label}>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{item.label}</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="page-grid-2" style={{ gap: 16, marginBottom: 16 }}>
        {/* Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Sales vs Purchase vs Profit</span>
            <span className="badge badge-blue">{new Date().getFullYear()}</span>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={9}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Bar dataKey="sales"    fill="#FD5C02" radius={[4,4,0,0]} name="Sales" />
                <Bar dataKey="purchase" fill="#06B6D4" radius={[4,4,0,0]} name="Purchase" />
                <Bar dataKey="profit"   fill="#10B981" radius={[4,4,0,0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, marginTop: 4 }}>
              {[['#FD5C02','Sales'],['#06B6D4','Purchase'],['#10B981','Profit']].map(([c,l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts + Schedule */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Alerts & Notifications</span>
            <span className="badge badge-red">{notifications.filter(n => !(n.is_read || n.read)).length} New</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(notifications.slice(0, 4).length > 0 ? notifications.slice(0, 4) : []).map(n => (
              <div key={n._id || n.id} className={`alert ${n.is_read || n.read ? 'alert-info' : 'alert-warning'}`} style={{ fontSize: 12 }}>
                <AlertTriangle style={{ width: 14, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: (n.is_read || n.read) ? 400 : 600 }}>{n.title || n.msg || n.message}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                    {n.created_at ? new Date(n.created_at).toLocaleDateString('en-IN') : (n.time || '')}
                  </div>
                </div>
              </div>
            ))}
            {lowStockItems.map((item, i) => (
              <div key={i} className="alert alert-warning" style={{ fontSize: 12 }}>
                <AlertTriangle style={{ width: 14 }} />
                <span><strong>{item.product_name || item.name || item.productCode || '—'}</strong> — only {item.current_stock ?? item.current ?? 0} units left (Low Stock)</span>
              </div>
            ))}
            {outstandingRcv > 0 && (
              <div className="alert alert-danger" style={{ fontSize: 12 }}>
                <CreditCard style={{ width: 14 }} />
                <span>Outstanding receivable: <strong>₹{outstandingRcv.toLocaleString()}</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-grid-2" style={{ gap: 16, marginBottom: 16 }}>
        {/* Recent Enquiries */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Enquiries</span>
            <span className="badge badge-blue">{enquiries.length} total</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Retailer</th><th>Product</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>
                {(recentEnquiries.length ? recentEnquiries : enquiries.slice(0, 5)).map(e => {
                  const eId   = e.enq_code       || e.id       || ''
                  const eName = e.retailer_name  || e.retailer || ''
                  const eProd = e.product_name   || e.product  || ''
                  return (
                    <tr key={e._id || e.id}>
                      <td style={{ color: '#FD5C02', fontWeight: 600, fontSize: 12 }}>{eId}</td>
                      <td style={{ fontWeight: 600 }}>{eName}</td>
                      <td style={{ fontSize: 11, maxWidth: 140 }}>{eProd}</td>
                      <td>{e.qty} {e.unit}</td>
                      <td><span className={`badge ${statusColors[e.status] || 'badge-gray'}`}>{e.status}</span></td>
                    </tr>
                  )
                })}
                {enquiries.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No enquiries yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Orders</span>
            <span className="badge badge-green">{orders.length} total</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {orders.slice(0, 5).map(o => {
                  const oCode = o.order_code    || o.id       || ''
                  const oCust = o.customer_name || o.customer || ''
                  const oProd = o.product_name  || o.product  || ''
                  const oTotal= o.total_amount  || o.total    || 0
                  return (
                    <tr key={o._id || o.id}>
                      <td style={{ color: '#FD5C02', fontWeight: 600, fontSize: 12 }}>{oCode}</td>
                      <td style={{ fontWeight: 600 }}>{oCust}</td>
                      <td style={{ fontSize: 11 }}>{oProd}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{oTotal.toLocaleString()}</td>
                      <td><span className={`badge ${
                        o.status === 'Delivered' ? 'badge-green' :
                        o.status === 'Dispatched' ? 'badge-purple' :
                        o.status === 'Ready' ? 'badge-orange' :
                        o.status === 'Processing' ? 'badge-yellow' : 'badge-cyan'
                      }`}>{o.status}</span></td>
                    </tr>
                  )
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inventory snapshot */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Current Inventory Snapshot</span>
          <span className="badge badge-blue">Live</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Stock In</th><th>Stock Out</th><th>Current Stock</th><th>Status</th></tr></thead>
            <tbody>
              {inventory.map((inv, i) => {
                const current = inv.current_stock ?? inv.current ?? 0
                const lowAlert = inv.low_stock_alert ?? inv.lowAlert ?? 0
                const status = current === 0 ? 'Out' : current <= lowAlert ? 'Low' : 'OK'
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{inv.product_name || inv.name || inv.productCode || '—'}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>+{inv.stock_in ?? inv.stockIn ?? 0}</td>
                    <td style={{ color: (inv.stock_out ?? inv.stockOut ?? 0) > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {(inv.stock_out ?? inv.stockOut ?? 0) > 0 ? `-${inv.stock_out ?? inv.stockOut}` : '—'}
                    </td>
                    <td style={{
                      fontWeight: 800, fontSize: 16,
                      color: current === 0 ? 'var(--danger)' : current <= lowAlert ? 'var(--warning)' : 'var(--text)'
                    }}>{current} Pcs</td>
                    <td>
                      <span className={`badge ${status === 'OK' ? 'badge-green' : status === 'Low' ? 'badge-yellow' : 'badge-red'}`}>
                        {status === 'OK' ? 'In Stock' : status === 'Low' ? 'Low Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
