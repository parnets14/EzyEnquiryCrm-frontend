import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingBag, Receipt } from 'lucide-react'

export default function ProfitLoss({ sales = [], purchases = [], orders = [] }) {

  // ── Revenue from Sales ────────────────────────────────────
  const totalRevenue   = sales.reduce((a, s) => a + (s.amount || 0), 0)   // excl GST
  const totalGSTOut    = sales.reduce((a, s) => a + (s.gst    || 0), 0)
  const totalInvoiced  = sales.reduce((a, s) => a + (s.total  || 0), 0)   // incl GST

  // ── Cost of Goods from ALL orders (any status with purchase cost) ─
  // Use sales → match to orders → get purchase cost
  const totalCOGS = orders
    .filter(o => o.purchaseCost > 0)
    .reduce((a, o) => a + (o.purchaseCost || 0), 0)

  // Also compute from purchases directly (total stock purchased cost)
  const totalPurchaseCost = purchases.reduce((a, p) => a + (p.amount || 0), 0)  // excl GST
  const totalGSTIn        = purchases.reduce((a, p) => a + (p.gst    || 0), 0)

  // ── Operating expenses from orders ───────────────────────
  const totalTransport = orders.reduce((a, o) => a + (o.transport || 0), 0)
  const totalPacking   = orders.reduce((a, o) => a + (o.packing   || 0), 0)

  // ── P&L computed using SALES revenue vs COGS from matched orders ─
  // If no sales yet, show purchase-based view
  const cogsUsed      = totalCOGS > 0 ? totalCOGS : 0
  const grossProfit   = totalRevenue - cogsUsed
  const operatingExp  = totalTransport + totalPacking
  const netProfit     = grossProfit - operatingExp
  const margin        = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0
  const gstNet        = totalGSTOut - totalGSTIn   // net GST payable

  // ── Per-order P&L (ALL active orders that have purchase cost) ────
  const orderPL = orders
    .filter(o => o.purchaseCost > 0 || o.amount > 0)
    .map(o => {
      const rev         = o.amount      || 0
      const cogs        = o.purchaseCost || 0
      const transport   = o.transport   || 0
      const packing     = o.packing     || 0
      const grossP      = rev - cogs
      const netP        = grossP - transport - packing
      return {
        id:           o.id,
        customer:     o.customer,
        product:      o.product,
        qty:          o.qty,
        unit:         'Sq Ft',
        sellRate:     o.rate,
        purchaseRate: o.purchaseRate,
        status:       o.status,
        revenue:      rev,
        cogs,
        transport,
        packing,
        grossProfit:  grossP,
        netProfit:    netP,
        margin:       rev > 0 ? ((netP / rev) * 100).toFixed(1) : 0,
      }
    })

  // ── Monthly chart data ────────────────────────────────────
  const monthlyData = [
    { month: 'Mar', revenue: 520000,  cost: 380000, profit: 140000 },
    { month: 'Apr', revenue: 780000,  cost: 560000, profit: 220000 },
    { month: 'May', revenue: 920000,  cost: 660000, profit: 260000 },
    { month: 'Jun', revenue: 1100000, cost: 790000, profit: 310000 },
    { month: 'Jul', revenue: 1250000, cost: 890000, profit: 360000 },
    { month: 'Aug', revenue: totalRevenue || 78000, cost: cogsUsed || 62000, profit: netProfit || 11300 },
  ]

  // ── P&L Statement rows ────────────────────────────────────
  const plRows = [
    { label: 'Sales Revenue (excl. GST)',  value: totalRevenue,    type: 'income',  bold: false },
    { label: 'GST Collected (Output Tax)', value: totalGSTOut,     type: 'income',  bold: false, muted: true },
    { label: 'Total Invoiced (incl. GST)', value: totalInvoiced,   type: 'total',   bold: true  },
    { label: '— Cost of Goods Sold (COGS)',value: -cogsUsed,       type: 'expense', bold: false },
    { label: 'Gross Profit',               value: grossProfit,     type: 'gross',   bold: true  },
    { label: '— Transport Charges',        value: -totalTransport, type: 'expense', bold: false },
    { label: '— Packing / Loading',        value: -totalPacking,   type: 'expense', bold: false },
    { label: 'Net Profit',                 value: netProfit,       type: 'net',     bold: true  },
  ]

  // ── Purchase summary rows ─────────────────────────────────
  const purchaseRows = purchases.map(p => ({
    id:       p.id,
    date:     p.date,
    supplier: p.supplier,
    product:  p.product,
    qty:      p.qty,
    rate:     p.rate,
    amount:   p.amount,
    gst:      p.gst,
    total:    p.total,
  }))

  return (
    <>
      <div className="breadcrumb">
        <span>Finance</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Profit & Loss</span>
      </div>

      {/* ── KPI Stats ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
        {[
          { label: 'Total Revenue',      val: `₹${totalRevenue.toLocaleString()}`,              icon: <TrendingUp />,   color: 'blue'   },
          { label: 'Total Purchase Cost',val: `₹${totalPurchaseCost.toLocaleString()}`,         icon: <ShoppingBag />,  color: 'red'    },
          { label: 'Gross Profit',       val: `₹${grossProfit.toLocaleString()}`,               icon: <DollarSign />,   color: 'cyan'   },
          { label: 'Net Profit',         val: `₹${netProfit.toLocaleString()}`,                 icon: <TrendingUp />,   color: 'green'  },
          { label: 'Profit Margin',      val: `${margin}%`,                                      icon: <Target />,       color: 'purple' },
          { label: 'Net GST Payable',    val: `₹${Math.max(0, gstNet).toLocaleString()}`,       icon: <Receipt />,      color: 'orange' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart + P&L Statement ── */}
      <div className="page-grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenue vs Cost vs Profit</span>
            <span className="badge badge-blue">Mar – Aug 2026</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={monthlyData} barSize={9}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[4,4,0,0]} name="Revenue" />
                <Bar dataKey="cost"    fill="#EF4444" radius={[4,4,0,0]} name="Cost"    />
                <Bar dataKey="profit"  fill="#10B981" radius={[4,4,0,0]} name="Profit"  />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* P&L Statement */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">P&L Statement</span>
            <span className="badge badge-green">Live</span>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '7px 0', borderBottom: '2px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Item</th>
                  <th style={{ textAlign: 'right', padding: '7px 0', borderBottom: '2px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {plRows.map((row, i) => (
                  <tr key={i} style={{ background: (row.type === 'net' || row.type === 'gross' || row.type === 'total') ? 'var(--bg)' : 'transparent' }}>
                    <td style={{
                      padding: '9px 6px', borderBottom: '1px solid var(--border)',
                      fontWeight: row.bold ? 700 : 400,
                      fontSize: row.bold ? 14 : 13,
                      color: row.type === 'net' ? 'var(--success)' : row.type === 'gross' ? 'var(--primary)' : row.type === 'total' ? 'var(--text)' : row.muted ? 'var(--text-muted)' : 'var(--text)',
                      paddingLeft: row.type === 'expense' ? 20 : 6,
                    }}>
                      {row.label}
                    </td>
                    <td style={{
                      padding: '9px 6px', borderBottom: '1px solid var(--border)', textAlign: 'right',
                      fontWeight: row.bold ? 700 : 400,
                      fontSize: row.bold ? 14 : 13,
                      color: row.value < 0 ? 'var(--danger)' : row.type === 'net' ? 'var(--success)' : row.type === 'gross' ? 'var(--primary)' : row.muted ? 'var(--text-muted)' : 'var(--text)',
                    }}>
                      {row.value < 0
                        ? `− ₹${Math.abs(row.value).toLocaleString()}`
                        : `₹${row.value.toLocaleString()}`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Per-Order P&L Table ── */}      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Per-Order Profit & Loss ({orderPL.length})</span>
          <span className="badge badge-blue">Auto Calculated</span>
        </div>
        {orderPL.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Sell Rate</th>
                  <th>Purchase Rate</th>
                  <th>Revenue</th>
                  <th>COGS</th>
                  <th>Expenses</th>
                  <th>Gross Profit</th>
                  <th>Net Profit</th>
                  <th>Margin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orderPL.map(o => (
                  <tr key={o.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{o.id}</td>
                    <td style={{ fontWeight: 600 }}>{o.customer}</td>
                    <td style={{ fontSize: 12, maxWidth: 160 }}>{o.product}</td>
                    <td style={{ fontWeight: 600 }}>{o.qty?.toLocaleString()} {o.unit}</td>
                    <td>₹{o.sellRate?.toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)' }}>₹{o.purchaseRate?.toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{o.revenue?.toLocaleString()}</td>
                    <td style={{ color: 'var(--danger)' }}>₹{o.cogs?.toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)' }}>₹{(o.transport + o.packing).toLocaleString()}</td>
                    <td style={{ fontWeight: 600, color: o.grossProfit >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                      ₹{o.grossProfit?.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 700, color: o.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      ₹{o.netProfit?.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${Number(o.margin) >= 10 ? 'badge-green' : Number(o.margin) >= 0 ? 'badge-yellow' : 'badge-red'}`}>
                        {o.margin}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        o.status === 'Delivered'  ? 'badge-green'  :
                        o.status === 'Dispatched' ? 'badge-blue'   :
                        o.status === 'Ready'      ? 'badge-orange' :
                        o.status === 'Processing' ? 'badge-yellow' : 'badge-cyan'
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Summary row */}
              <tfoot>
                <tr style={{ background: 'var(--primary-light)', fontWeight: 700 }}>
                  <td colSpan={6} style={{ padding: '10px 8px', color: 'var(--primary)', fontSize: 13 }}>TOTAL</td>
                  <td style={{ padding: '10px 8px', color: 'var(--success)' }}>₹{orderPL.reduce((a, o) => a + o.revenue, 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--danger)' }}>₹{orderPL.reduce((a, o) => a + o.cogs, 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>₹{orderPL.reduce((a, o) => a + o.transport + o.packing, 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--primary)' }}>₹{orderPL.reduce((a, o) => a + o.grossProfit, 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--success)', fontSize: 14 }}>₹{orderPL.reduce((a, o) => a + o.netProfit, 0).toLocaleString()}</td>
                  <td colSpan={2} style={{ padding: '10px 8px' }}>
                    <span className="badge badge-green">
                      {totalRevenue > 0 ? ((orderPL.reduce((a,o) => a+o.netProfit,0) / totalRevenue * 100).toFixed(1)) : margin}% avg
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
            No orders yet. P&L per-order breakdown will appear here once orders are created.
          </div>
        )}
      </div>

    </>
  )
}
