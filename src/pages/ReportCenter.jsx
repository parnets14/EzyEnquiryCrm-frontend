import { useState } from 'react'
import { Download, FileText, FileSpreadsheet, BarChart3, TrendingUp, Package, Users, ShoppingBag, Receipt, UserCog } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const REPORT_TYPES = [
  { key: 'sales', label: 'Sales Report', icon: <TrendingUp />, color: 'blue', desc: 'Customer-wise, product-wise, daily/monthly/yearly sales data' },
  { key: 'purchase', label: 'Purchase Report', icon: <ShoppingBag />, color: 'purple', desc: 'Supplier-wise purchase, cost analysis, monthly trends' },
  { key: 'expense', label: 'Expense Report', icon: <Receipt />, color: 'orange', desc: 'Category-wise expenses, monthly breakdown, budget vs actual' },
  { key: 'profit', label: 'P&L Report', icon: <BarChart3 />, color: 'green', desc: 'Revenue, cost, net profit across any date range' },
  { key: 'inventory', label: 'Inventory Report', icon: <Package />, color: 'cyan', desc: 'Stock levels, movements, low-stock, warehouse-wise summary' },
  { key: 'customer', label: 'Customer Report', icon: <Users />, color: 'blue', desc: 'Top customers, outstanding balances, order history' },
  { key: 'supplier', label: 'Supplier Report', icon: <ShoppingBag />, color: 'purple', desc: 'Supplier-wise purchase history, payables, delivery performance' },
  { key: 'employee', label: 'Employee Report', icon: <UserCog />, color: 'green', desc: 'Attendance, salary, performance summary' },
]

const salesData = [
  { month: 'Mar', value: 520000 }, { month: 'Apr', value: 780000 }, { month: 'May', value: 920000 },
  { month: 'Jun', value: 1100000 }, { month: 'Jul', value: 1250000 }, { month: 'Aug', value: 92040 },
]

// Preview data — Tiles industry
const PREVIEW = {
  sales: [
    { period: 'August 2026',  revenue: '₹92,040',   orders: 1,  avgOrder: '₹92,040',  topProduct: 'Kajaria Vitrified 800×800' },
    { period: 'July 2026',    revenue: '₹12,50,000', orders: 44, avgOrder: '₹28,409',  topProduct: 'Somany Ceramic 600×600' },
    { period: 'June 2026',    revenue: '₹11,00,000', orders: 38, avgOrder: '₹28,947',  topProduct: 'Kajaria Vitrified 800×800' },
  ],
  purchase: [
    { supplier: 'Kajaria Ceramics Ltd',  amount: '₹2,37,888', orders: 2, lastDate: '02 Aug 2026' },
    { supplier: 'Somany Ceramics',       amount: '₹1,56,232', orders: 2, lastDate: '03 Aug 2026' },
    { supplier: 'Johnson Tiles Pvt Ltd', amount: '₹55,224',   orders: 1, lastDate: '02 Aug 2026' },
  ],
  expense: [
    { category: 'Rent',           amount: '₹35,000', pct: '63%', trend: 'Stable' },
    { category: 'Marketing',      amount: '₹9,500',  pct: '17%', trend: '↑ Up' },
    { category: 'Electricity',    amount: '₹5,800',  pct: '10%', trend: 'Stable' },
    { category: 'Transportation', amount: '₹3,200',  pct: '6%',  trend: '↓ Down' },
    { category: 'Office Supplies',amount: '₹1,800',  pct: '3%',  trend: 'Stable' },
  ],
  inventory: [
    { product: 'Kajaria Vitrified 800×800',   warehouse: 'Main – Surat',   openingStock: 0,    stockIn: 2400, stockOut: 0,   closingStock: 2400, status: 'OK'  },
    { product: 'Somany Ceramic 600×600',      warehouse: 'Main – Surat',   openingStock: 0,    stockIn: 3200, stockOut: 0,   closingStock: 3200, status: 'OK'  },
    { product: 'Johnson Wall Tile 300×600',   warehouse: 'Main – Surat',   openingStock: 0,    stockIn: 1800, stockOut: 0,   closingStock: 1800, status: 'OK'  },
    { product: 'Kajaria Parking Tile 400×400',warehouse: 'Branch – Mumbai',openingStock: 0,    stockIn: 1200, stockOut: 0,   closingStock: 1200, status: 'OK'  },
    { product: 'Somany Mosaic 300×300',       warehouse: 'Main – Surat',   openingStock: 400,  stockIn: 0,    stockOut: 355, closingStock: 45,   status: 'Low' },
  ],
}

export default function ReportCenter({
  sales = [], purchases = [], orders = [], inventory = [],
  payments = { receivables: [], payables: [], history: [] },
}) {
  const [selectedReport, setSelectedReport] = useState('sales')
  const [dateFrom, setDateFrom] = useState('2026-08-01')
  const [dateTo, setDateTo] = useState('2026-08-31')
  const [period, setPeriod] = useState('monthly')

  const previewData = PREVIEW[selectedReport] || []
  const currentReport = REPORT_TYPES.find(r => r.key === selectedReport)

  return (
    <>
      <div className="breadcrumb">
        <span>Reports & Tools</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Report Center</span>
      </div>

      <div className="page-grid-2" style={{ gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left: Report selector */}
        <div className="card">
          <div className="card-header"><span className="card-title">Report Type</span></div>
          <div style={{ padding: '8px 0' }}>
            {REPORT_TYPES.map(r => (
              <button
                key={r.key}
                onClick={() => setSelectedReport(r.key)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  width: '100%', padding: '12px 16px', border: 'none',
                  background: selectedReport === r.key ? 'var(--primary-light)' : 'transparent',
                  color: selectedReport === r.key ? 'var(--primary)' : 'var(--text)',
                  cursor: 'pointer', fontSize: 13, fontWeight: selectedReport === r.key ? 700 : 500,
                  borderLeft: selectedReport === r.key ? '3px solid var(--primary)' : '3px solid transparent',
                  textAlign: 'left', transition: 'all .15s',
                }}
              >
                <span style={{ marginTop: 1 }}>{r.icon}</span>
                <div>
                  <div>{r.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2, lineHeight: 1.4 }}>{r.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Report view */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filters */}
          <div className="card">
            <div className="card-body" style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>From</label>
                  <input className="form-control" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 150 }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>To</label>
                  <input className="form-control" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 150 }} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['daily', 'weekly', 'monthly', 'yearly'].map(p => (
                    <button key={p} className={`btn btn-sm ${period === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod(p)}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm">
                    <FileText style={{ width: 13 }} /> Export PDF
                  </button>
                  <button className="btn btn-success btn-sm">
                    <FileSpreadsheet style={{ width: 13 }} /> Export Excel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          {(selectedReport === 'sales' || selectedReport === 'purchase' || selectedReport === 'profit') && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">{currentReport?.label} — Monthly Trend</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={salesData.map(d => d.month === 'Aug' ? { ...d, value: selectedReport === 'sales' ? sales.reduce((a,s) => a+(s.total||0), 0) || d.value : selectedReport === 'purchase' ? purchases.reduce((a,p) => a+(p.total||0), 0) || d.value : d.value } : d)} barSize={12}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} name={currentReport?.label} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table preview */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">{currentReport?.label} — Data Preview</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aug 2026</span>
            </div>

            {/* Sales preview */}
            {selectedReport === 'sales' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Period</th><th>Revenue</th><th>Orders</th><th>Avg. Order Value</th><th>Top Product</th></tr></thead>
                  <tbody>{previewData.map((row, i) => (<tr key={i}><td style={{ fontWeight: 600 }}>{row.period}</td><td style={{ fontWeight: 700, color: 'var(--success)' }}>{row.revenue}</td><td>{row.orders}</td><td>{row.avgOrder}</td><td style={{ fontSize: 12 }}>{row.topProduct}</td></tr>))}</tbody>
                </table>
              </div>
            )}

            {/* Purchase preview */}
            {selectedReport === 'purchase' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Supplier</th><th>Total Purchase</th><th>Purchase Orders</th><th>Last Date</th></tr></thead>
                  <tbody>{previewData.map((row, i) => (<tr key={i}><td style={{ fontWeight: 600 }}>{row.supplier}</td><td style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.amount}</td><td>{row.orders}</td><td style={{ fontSize: 12 }}>{row.lastDate}</td></tr>))}</tbody>
                </table>
              </div>
            )}

            {/* Expense preview */}
            {selectedReport === 'expense' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Category</th><th>Amount</th><th>% of Total</th><th>Trend</th></tr></thead>
                  <tbody>{previewData.map((row, i) => (<tr key={i}><td style={{ fontWeight: 600 }}>{row.category}</td><td style={{ fontWeight: 700, color: 'var(--danger)' }}>{row.amount}</td><td>{row.pct}</td><td style={{ color: row.trend.includes('Up') ? 'var(--danger)' : row.trend.includes('Down') ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>{row.trend}</td></tr>))}</tbody>
                </table>
              </div>
            )}

            {/* Inventory preview */}
            {selectedReport === 'inventory' && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>Warehouse</th><th>Opening</th><th>Stock In</th><th>Stock Out</th><th>Closing</th><th>Status</th></tr></thead>
                  <tbody>{previewData.map((row, i) => (<tr key={i}><td style={{ fontWeight: 600, fontSize: 12 }}>{row.product}</td><td style={{ fontSize: 12 }}>{row.warehouse}</td><td>{row.openingStock}</td><td style={{ color: 'var(--success)', fontWeight: 600 }}>+{row.stockIn}</td><td style={{ color: 'var(--danger)', fontWeight: 600 }}>-{row.stockOut}</td><td style={{ fontWeight: 700, color: row.closingStock === 0 ? 'var(--danger)' : row.closingStock < 100 ? 'var(--warning)' : 'var(--text)' }}>{row.closingStock}</td><td><span className={`badge ${row.status === 'OK' ? 'badge-green' : row.status === 'Low' ? 'badge-yellow' : 'badge-red'}`}>{row.status}</span></td></tr>))}</tbody>
                </table>
              </div>
            )}

            {/* Other reports: placeholder */}
            {!['sales', 'purchase', 'expense', 'inventory'].includes(selectedReport) && (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <BarChart3 style={{ width: 40, height: 40, margin: '0 auto 12px', color: 'var(--text-light)', display: 'block' }} />
                <h3>Report Ready to Generate</h3>
                <p style={{ fontSize: 13, marginTop: 6 }}>Set the date range and click Export to generate your {currentReport?.label}.</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }}>
                  <Download style={{ width: 14 }} />Generate Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
