import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'
import { TrendingUp, TrendingDown, Users, ShoppingCart, CreditCard, Package, Target, Activity } from 'lucide-react'

// Historical data (Mar–Jul) for tiles business
const MONTHLY_REVENUE = [
  { month: 'Mar', revenue: 520000,  orders: 18, profit: 98000  },
  { month: 'Apr', revenue: 780000,  orders: 26, profit: 155000 },
  { month: 'May', revenue: 920000,  orders: 31, profit: 192000 },
  { month: 'Jun', revenue: 1100000, orders: 38, profit: 238000 },
  { month: 'Jul', revenue: 1250000, orders: 44, profit: 290000 },
  { month: 'Aug', revenue: 92040,   orders: 1,  profit: 11300  },
]

const CATEGORY_DATA = [
  { name: 'Vitrified Tiles',   value: 42, color: '#FD5C02' },
  { name: 'Ceramic Tiles',     value: 28, color: '#06B6D4' },
  { name: 'Wall Tiles',        value: 16, color: '#10B981' },
  { name: 'Outdoor/Parking',   value: 9,  color: '#F59E0B' },
  { name: 'Mosaic/Designer',   value: 5,  color: '#8B5CF6' },
]

const TOP_CUSTOMERS = [
  { name: 'Ramesh Tiles Store',   city: 'Mumbai',    orders: 1, revenue: 92040,  growth: 100 },
  { name: 'Sharma Traders',       city: 'Pune',      orders: 0, revenue: 0,      growth: 0   },
  { name: 'Gupta Enterprises',    city: 'Delhi',     orders: 0, revenue: 0,      growth: 0   },
  { name: 'Patel Tile World',     city: 'Ahmedabad', orders: 0, revenue: 0,      growth: 0   },
  { name: 'Kiran Shah',           city: 'Surat',     orders: 0, revenue: 0,      growth: 0   },
]

const ENQUIRY_FUNNEL = [
  { stage: 'New',         count: 2 },
  { stage: 'Replied',     count: 1 },
  { stage: 'Negotiation', count: 1 },
  { stage: 'Confirmed',   count: 1 },
]

const PAYMENT_TREND = [
  { week: 'W1', received: 175584, outstanding: 0       },
  { week: 'W2', received: 0,      outstanding: 92040   },
  { week: 'W3', received: 0,      outstanding: 176056  },
  { week: 'W4', received: 0,      outstanding: 268096  },
]

export default function DashboardAnalytics({
  sales = [], purchases = [], orders = [], enquiries = [],
  payments = { receivables: [], payables: [], history: [] },
  inventory = [],
}) {
  // Live KPIs from real data
  const totalRevenue      = sales.reduce((a, s) => a + (s.total || 0), 0)
  const totalOrders       = orders.length
  const activeEnquiries   = enquiries.filter(e => !['Confirmed', 'Cancelled'].includes(e.status)).length
  const outstandingRcv    = (payments.receivables || []).reduce((a, r) => a + (r.outstanding || 0), 0)
  const totalPurchase     = purchases.reduce((a, p) => a + (p.total || 0), 0)
  const totalCOGS         = orders.filter(o => ['Dispatched','Delivered'].includes(o.status)).reduce((a, o) => a + (o.purchaseCost || 0), 0)
  const netProfit         = sales.reduce((a,s) => a + (s.amount||0), 0) - totalCOGS
  const convRate          = enquiries.length > 0 ? ((enquiries.filter(e => e.status === 'Confirmed').length / enquiries.length) * 100).toFixed(1) : '0.0'
  const totalStock        = inventory.reduce((a, i) => a + i.current, 0)

  // Update Aug with live values
  const chartData = MONTHLY_REVENUE.map(d =>
    d.month === 'Aug' ? { ...d, revenue: totalRevenue || d.revenue, profit: netProfit || d.profit } : d
  )

  const KPI_CARDS = [
    { label: 'Total Revenue (Aug)', value: `₹${(totalRevenue || 92040).toLocaleString()}`, change: '+28%',  up: true,  color: 'blue',   icon: TrendingUp },
    { label: 'Total Orders',        value: `${totalOrders}`,                                change: 'New',   up: true,  color: 'green',  icon: ShoppingCart },
    { label: 'Active Enquiries',    value: `${activeEnquiries}`,                           change: `${enquiries.length} total`, up: true, color: 'purple', icon: Users },
    { label: 'Conversion Rate',     value: `${convRate}%`,                                 change: 'Enq→Order', up: true, color: 'cyan', icon: Target },
    { label: 'Total Stock',         value: `${totalStock.toLocaleString()} Sq Ft`,         change: '5 products', up: true, color: 'orange', icon: Package },
    { label: 'Net Profit (Aug)',     value: `₹${(netProfit > 0 ? netProfit : 11300).toLocaleString()}`, change: `${(totalRevenue > 0 ? ((netProfit/totalRevenue)*100).toFixed(1) : 14.5)}% margin`, up: true, color: 'green', icon: TrendingUp },
    { label: 'Outstanding Recv.',   value: `₹${outstandingRcv.toLocaleString()}`,          change: `${(payments.receivables||[]).filter(r=>r.outstanding>0).length} pending`, up: false, color: 'red', icon: TrendingDown },
    { label: 'Total Purchase',      value: `₹${totalPurchase.toLocaleString()}`,           change: `${purchases.length} bills`, up: true, color: 'yellow', icon: Activity },
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
          <div className="page-desc">Real-time business intelligence — Tiles World Pvt Ltd</div>
        </div>
        <div className="page-header-actions">
          <select className="form-control" style={{ width: 140 }}>
            <option>This Month</option>
            <option>Last Month</option>
            <option>Last 3 Months</option>
            <option>This Year</option>
          </select>
          <button className="btn btn-secondary">Export PDF</button>
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

      {/* Revenue & Category charts */}
      <div className="page-grid-2" style={{ gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Monthly Revenue & Profit</span>
            <span className="badge badge-blue">Mar – Aug 2026</span>
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
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Area dataKey="revenue" stroke="#FD5C02" fill="url(#revGrad)" name="Revenue" strokeWidth={2} />
                <Area dataKey="profit"  stroke="#10B981" fill="url(#profGrad)" name="Profit"  strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Sales by Tile Category</span>
            <span className="badge badge-purple">Aug 2026</span>
          </div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {CATEGORY_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={v => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {CATEGORY_DATA.map(cat => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{cat.name}</span>
                  <span style={{ fontWeight: 700 }}>{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="page-grid-2" style={{ gap: 16, marginBottom: 16 }}>
        {/* Enquiry Funnel */}
        <div className="card">
          <div className="card-header"><span className="card-title">Enquiry Conversion Funnel</span><span className="badge badge-orange">Live</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ENQUIRY_FUNNEL.map(f => {
                const live = enquiries.filter(e => e.status === f.stage).length
                return { ...f, count: live > 0 ? live : f.count }
              })} layout="vertical" barSize={18}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#FD5C02" radius={[0, 6, 6, 0]} name="Enquiries" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Trend */}
        <div className="card">
          <div className="card-header"><span className="card-title">Payment Received vs Outstanding</span></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={PAYMENT_TREND} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Bar dataKey="received"    fill="#10B981" name="Received"    radius={[4,4,0,0]} />
                <Bar dataKey="outstanding" fill="#F59E0B" name="Outstanding" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Top Customers by Revenue</span>
          <span className="badge badge-blue">Aug 2026</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Customer</th><th>City</th><th>Orders</th><th>Revenue</th><th>Revenue Share</th><th>Status</th></tr></thead>
            <tbody>
              {TOP_CUSTOMERS.map((c, i) => {
                const totalRev = Math.max(TOP_CUSTOMERS.reduce((a, x) => a + x.revenue, 0), 1)
                const share = ((c.revenue / totalRev) * 100).toFixed(1)
                return (
                  <tr key={c.name}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.city}</td>
                    <td style={{ fontWeight: 600 }}>{c.orders}</td>
                    <td style={{ fontWeight: 700, color: c.revenue > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {c.revenue > 0 ? `₹${c.revenue.toLocaleString()}` : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className="progress-fill" style={{ width: `${share}%`, background: '#FD5C02' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, width: 36 }}>{share}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.revenue > 0 ? 'badge-green' : 'badge-gray'}`}>
                        {c.revenue > 0 ? 'Active' : 'Prospect'}
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
