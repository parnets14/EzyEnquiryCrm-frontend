import { useMemo, useState } from 'react'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, ShoppingCart,
  CreditCard, Package, Target, Activity,
} from 'lucide-react'

const PIE_COLORS = ['#FD5C02', '#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#3B82F6']

export default function DashboardAnalytics({
  sales = [], purchases = [], orders = [], enquiries = [],
  payments = { receivables: [], payables: [], history: [] },
  inventory = [],
  dashboardStats = null,
}) {
  const [period, setPeriod] = useState('month')

  // ── Live KPIs — prefer dashboardStats from API, fall back to raw arrays ──
  const totalRevenue    = dashboardStats?.monthSales    ?? sales.reduce((a, s) => a + (s.total_amount || 0), 0)
  const yearRevenue     = dashboardStats?.yearSales     ?? 0
  const totalOrders     = dashboardStats?.totalOrders   ?? orders.length
  const pendingOrders   = dashboardStats?.pendingOrders ?? orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length
  const totalCustomers  = dashboardStats?.totalCustomers ?? 0
  const totalProducts   = dashboardStats?.totalProducts  ?? 0
  const activeEnquiries = enquiries.filter(e => !['Confirmed', 'Cancelled'].includes(e.status)).length
  const outstandingRcv  = dashboardStats?.totalOutstanding ?? (payments.receivables || []).reduce((a, r) => a + (r.outstanding || 0), 0)
  const totalPurchase   = purchases.reduce((a, p) => a + (p.total_amount || 0), 0)
  const totalCOGS       = orders.filter(o => ['Dispatched', 'Delivered'].includes(o.status)).reduce((a, o) => a + (o.purchase_cost || 0), 0)
  const netProfit       = totalRevenue - totalCOGS
  const convRate        = enquiries.length > 0 ? ((enquiries.filter(e => e.status === 'Confirmed').length / enquiries.length) * 100).toFixed(1) : '0.0'
  const totalStock      = inventory.reduce((a, i) => a + (i.current_stock || 0), 0)
  const lowStockCount   = dashboardStats?.lowStockCount ?? inventory.filter(i => (i.current_stock || 0) <= (i.low_stock_alert || 0)).length

  // ── 12-month trend from dashboardStats.trend or built from raw data ──
  const chartData = useMemo(() => {
    if (dashboardStats?.trend?.length > 0) {
      return dashboardStats.trend.map(t => ({
        month:    t.month || t.period || '',
        sales:    t.sales    || 0,
        purchase: t.purchase || 0,
        profit:   t.profit   || (t.sales || 0) - (t.purchase || 0),
      }))
    }
    // Build from raw arrays
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const now = new Date()
    const slots = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      slots.push({
        key:      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        month:    `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        sales: 0, purchase: 0, profit: 0,
      })
    }
    purchases.forEach(p => {
      const raw = p.purchase_date || p.date || ''
      if (!raw) return
      const d = new Date(raw); if (isNaN(d)) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const slot = slots.find(s => s.key === key)
      if (slot) slot.purchase += (p.total_amount || 0)
    })
    sales.forEach(s => {
      const raw = s.sale_date || s.date || s.created_at || ''
      if (!raw) return
      const d = new Date(raw); if (isNaN(d)) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const slot = slots.find(sl => sl.key === key)
      if (slot) slot.sales += (s.total_amount || 0)
    })
    slots.forEach(s => { s.profit = s.sales - s.purchase })
    return slots
  }, [dashboardStats?.trend, purchases, sales])

  // ── Top customers from dashboardStats or computed locally ──
  const topCustomers = useMemo(() => {
    if (dashboardStats?.topCustomers?.length > 0) {
      return dashboardStats.topCustomers.map(c => ({
        name:        c.name || '—',
        order_count: c.order_count || 0,
        total_sales: c.total_sales || 0,
      }))
    }
    return []
  }, [dashboardStats?.topCustomers])

  // ── Top products (category breakdown for pie) ──
  const topProducts = useMemo(() => {
    if (dashboardStats?.topProducts?.length > 0) {
      const total = dashboardStats.topProducts.reduce((a, p) => a + (p.total_sales || 0), 1)
      return dashboardStats.topProducts.map((p, i) => ({
        name:  p.name || p.code || `Product ${i + 1}`,
        value: Math.round(((p.total_sales || 0) / total) * 100),
        color: PIE_COLORS[i % PIE_COLORS.length],
        total_sales: p.total_sales || 0,
      }))
    }
    // If no data yet, show empty state
    return []
  }, [dashboardStats?.topProducts])

  // ── Enquiry funnel from live data ──
  const enquiryFunnel = [
    { stage: 'New',         count: enquiries.filter(e => e.status === 'New').length },
    { stage: 'Replied',     count: enquiries.filter(e => e.status === 'Replied').length },
    { stage: 'Negotiation', count: enquiries.filter(e => e.status === 'Negotiation').length },
    { stage: 'Confirmed',   count: enquiries.filter(e => e.status === 'Confirmed').length },
  ]

  // ── Payment trend (last 4 weeks) from transactions ──
  const paymentTrend = useMemo(() => {
    const txns = payments.history || []
    const now  = new Date()
    return [1, 2, 3, 4].reverse().map(w => {
      const weekEnd   = new Date(now); weekEnd.setDate(now.getDate() - (w - 1) * 7)
      const weekStart = new Date(weekEnd); weekStart.setDate(weekEnd.getDate() - 6)
      const label = `W${5 - w}`
      const received    = txns.filter(t => t.type === 'Received' && new Date(t.txn_date || t.date) >= weekStart && new Date(t.txn_date || t.date) <= weekEnd).reduce((a, t) => a + (t.amount || 0), 0)
      const outstanding = (payments.receivables || []).filter(r => r.status !== 'Received').reduce((a, r) => a + (r.outstanding || 0), 0)
      return { week: label, received, outstanding: w === 1 ? outstanding : 0 }
    })
  }, [payments])

  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().toLocaleString('en-IN', { month: 'long' })

  const KPI_CARDS = [
    { label: `Revenue (${currentMonth})`, value: `₹${totalRevenue.toLocaleString()}`,           change: `₹${yearRevenue.toLocaleString()} YTD`, up: true,  color: 'blue',   icon: TrendingUp  },
    { label: 'Total Orders',              value: `${totalOrders}`,                               change: `${pendingOrders} pending`,               up: true,  color: 'green',  icon: ShoppingCart},
    { label: 'Active Enquiries',          value: `${activeEnquiries}`,                           change: `${enquiries.length} total`,              up: true,  color: 'purple', icon: Users       },
    { label: 'Conversion Rate',           value: `${convRate}%`,                                 change: 'Enquiry → Order',                        up: true,  color: 'cyan',   icon: Target      },
    { label: 'Total Stock',               value: `${totalStock.toLocaleString()} Units`,         change: `${lowStockCount} low stock`,             up: lowStockCount === 0, color: 'orange', icon: Package },
    { label: 'Net Profit (Month)',         value: `₹${netProfit.toLocaleString()}`,              change: totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% margin` : '—', up: netProfit >= 0, color: 'green', icon: TrendingUp },
    { label: 'Outstanding Receivable',    value: `₹${outstandingRcv.toLocaleString()}`,          change: `${(payments.receivables || []).filter(r => r.outstanding > 0).length} pending`, up: false, color: 'red', icon: TrendingDown },
    { label: 'Total Purchase',            value: `₹${totalPurchase.toLocaleString()}`,           change: `${purchases.length} bills`,              up: true,  color: 'yellow', icon: Activity    },
  ]

  return (
    <>
      <div className="breadcrumb">
        <span>Reports</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Dashboard Analytics</span>
      </div>

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Dashboard Analytics</div>
          <div className="page-desc">Real-time business intelligence — {currentMonth} {currentYear}</div>
        </div>
        <div className="page-header-actions">
          <select className="form-control" style={{ width: 160 }} value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="page-grid-4" style={{ marginBottom: 20 }}>
        {KPI_CARDS.map(kpi => (
          <div key={kpi.label} className="stat-card">
            <div className={`stat-icon ${kpi.color}`}><kpi.icon size={18} /></div>
            <div className="stat-info">
              <div className="stat-label">{kpi.label}</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{kpi.value}</div>
              <div className={`stat-change ${kpi.up ? 'up' : 'down'}`}>{kpi.change}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue trend + Category breakdown */}
      <div className="page-grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">12-Month Revenue & Profit</span>
            <span className="badge badge-blue">Live</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FD5C02" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FD5C02" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Area dataKey="sales"    stroke="#FD5C02" fill="url(#revGrad)"  name="Revenue" strokeWidth={2} />
                <Area dataKey="profit"   stroke="#10B981" fill="url(#profGrad)" name="Profit"  strokeWidth={2} />
                <Area dataKey="purchase" stroke="#06B6D4" fill="none"           name="Purchase" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Pie */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top Products by Sales</span>
            <span className="badge badge-purple">Live</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {topProducts.length > 0 ? (
              <>
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={topProducts} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {topProducts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={v => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1 }}>
                  {topProducts.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 11 }}>₹{(p.total_sales || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', width: '100%', padding: 24 }}>
                Product sales data will appear here once orders are delivered.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enquiry Funnel + Payment Trend */}
      <div className="page-grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Enquiry Conversion Funnel</span>
            <span className="badge badge-orange">Live</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={enquiryFunnel} layout="vertical" barSize={18}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#FD5C02" radius={[0, 6, 6, 0]} name="Enquiries" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Payment Received vs Outstanding</span>
            <span className="badge badge-green">Live</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={paymentTrend} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Bar dataKey="received"    fill="#10B981" name="Received"    radius={[4,4,0,0]} />
                <Bar dataKey="outstanding" fill="#F59E0B" name="Outstanding" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Customers — fully dynamic */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Customers by Revenue</span>
          <span className="badge badge-blue">Live</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Customer</th><th>Orders</th><th>Revenue</th><th>Revenue Share</th><th>Status</th></tr>
            </thead>
            <tbody>
              {topCustomers.length > 0 ? topCustomers.map((c, i) => {
                const totalRev = Math.max(topCustomers.reduce((a, x) => a + (x.total_sales || 0), 0), 1)
                const share    = (((c.total_sales || 0) / totalRev) * 100).toFixed(1)
                return (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{c.name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{c.order_count || 0}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      {c.total_sales > 0 ? `₹${c.total_sales.toLocaleString()}` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${share}%`, background: '#FD5C02' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, width: 36 }}>{share}%</span>
                      </div>
                    </td>
                    <td><span className="badge badge-green">Active</span></td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  Customer revenue data appears after orders are delivered.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
