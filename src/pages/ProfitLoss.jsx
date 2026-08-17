import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Target, ShoppingBag, Receipt, RefreshCw } from 'lucide-react'
import { paymentApi } from '../api/financeApi'

export default function ProfitLoss({ sales = [], purchases = [], orders = [] }) {
  const [plData,   setPlData]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])

  const fetchPL = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await paymentApi.getProfitLoss({ from_date: fromDate, to_date: toDate })
      setPlData(res?.data || res)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load P&L data.')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => { fetchPL() }, [fetchPL])

  // ── Values from API or fallback to local computation ──────
  const totalRevenue      = plData?.totalSales    ?? sales.reduce((a, s) => a + (s.total_amount || s.amount || 0), 0)
  const totalPurchaseCost = plData?.totalPurchase ?? purchases.reduce((a, p) => a + (p.total_amount || p.amount || 0), 0)
  const totalExpenses     = plData?.totalExpenses ?? 0
  const totalSalary       = plData?.totalSalary   ?? 0
  const grossProfit       = plData?.grossProfit   ?? (totalRevenue - totalPurchaseCost)
  const netProfit         = plData?.netProfit     ?? grossProfit
  const margin            = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'
  const expenseBreakdown  = plData?.expenseBreakdown ?? []

  // ── Monthly trend from API ────────────────────────────────
  const trend = plData?.trend ?? []
  const chartData = trend.length > 0
    ? trend.map(t => ({
        month:   t.month  || '',
        revenue: t.sales  || 0,
        cost:    (t.purchase || 0) + (t.expenses || 0),
        profit:  (t.sales || 0) - (t.purchase || 0) - (t.expenses || 0),
      }))
    : []

  // ── P&L Statement rows ────────────────────────────────────
  const plRows = [
    { label: 'Sales Revenue',                  value: totalRevenue,      type: 'income',  bold: false },
    { label: '— Cost of Goods Sold (Purchase)', value: -totalPurchaseCost,type: 'expense', bold: false },
    { label: 'Gross Profit',                   value: grossProfit,        type: 'gross',   bold: true  },
    { label: '— Operating Expenses',           value: -totalExpenses,     type: 'expense', bold: false },
    { label: '— Salary / Payroll',             value: -totalSalary,       type: 'expense', bold: false },
    { label: 'Net Profit',                     value: netProfit,          type: 'net',     bold: true  },
  ]

  return (
    <>
      <div className="breadcrumb">
        <span>Finance</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Profit &amp; Loss</span>
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>From</label>
          <input type="date" className="form-control" style={{ width: 150 }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>To</label>
          <input type="date" className="form-control" style={{ width: 150 }} value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={fetchPL} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw style={{ width: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Loading…' : 'Apply'}
        </button>
        {plData?.period && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {new Date(plData.period.from).toLocaleDateString('en-IN')} — {new Date(plData.period.to).toLocaleDateString('en-IN')}
          </span>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {/* KPI Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
        {[
          { label: 'Total Revenue',      val: `₹${totalRevenue.toLocaleString()}`,      icon: <TrendingUp />,  color: 'blue'   },
          { label: 'Total Purchase Cost',val: `₹${totalPurchaseCost.toLocaleString()}`, icon: <ShoppingBag />, color: 'red'    },
          { label: 'Total Expenses',     val: `₹${totalExpenses.toLocaleString()}`,     icon: <Receipt />,     color: 'orange' },
          { label: 'Gross Profit',       val: `₹${grossProfit.toLocaleString()}`,       icon: <DollarSign />,  color: 'cyan'   },
          { label: 'Net Profit',         val: `₹${netProfit.toLocaleString()}`,         icon: <TrendingUp />,  color: 'green'  },
          { label: 'Profit Margin',      val: `${margin}%`,                             icon: <Target />,      color: 'purple' },
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

      <div className="page-grid-2" style={{ marginBottom: 16 }}>
        {/* Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenue vs Cost vs Profit</span>
            <span className="badge badge-blue">Live</span>
          </div>
          <div className="card-body">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={chartData} barSize={9}>
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
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
                No trend data for selected period.
              </div>
            )}
          </div>
        </div>

        {/* P&L Statement */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">P&amp;L Statement</span>
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
                  <tr key={i} style={{ background: (row.type === 'net' || row.type === 'gross') ? 'var(--bg)' : 'transparent' }}>
                    <td style={{
                      padding: '9px 6px', borderBottom: '1px solid var(--border)',
                      fontWeight: row.bold ? 700 : 400, fontSize: row.bold ? 14 : 13,
                      color: row.type === 'net' ? 'var(--success)' : row.type === 'gross' ? 'var(--primary)' : 'var(--text)',
                      paddingLeft: row.type === 'expense' ? 20 : 6,
                    }}>{row.label}</td>
                    <td style={{
                      padding: '9px 6px', borderBottom: '1px solid var(--border)', textAlign: 'right',
                      fontWeight: row.bold ? 700 : 400, fontSize: row.bold ? 14 : 13,
                      color: row.value < 0 ? 'var(--danger)' : row.type === 'net' ? 'var(--success)' : row.type === 'gross' ? 'var(--primary)' : 'var(--text)',
                    }}>
                      {row.value < 0 ? `− ₹${Math.abs(row.value).toLocaleString()}` : `₹${row.value.toLocaleString()}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expense Breakdown */}
      {expenseBreakdown.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Expense Breakdown</span>
            <span className="badge badge-orange">{expenseBreakdown.length} categories</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Category</th><th>Count</th><th>Total Amount</th><th>% of Expenses</th></tr></thead>
              <tbody>
                {expenseBreakdown.map((row, i) => {
                  const share = totalExpenses > 0 ? ((row.total / totalExpenses) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.category || '—'}</td>
                      <td>{row.count || 0}</td>
                      <td style={{ fontWeight: 700, color: 'var(--danger)' }}>₹{(row.total || 0).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{ width: `${share}%`, background: '#EF4444' }} />
                          </div>
                          <span style={{ fontSize: 11, width: 36 }}>{share}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
