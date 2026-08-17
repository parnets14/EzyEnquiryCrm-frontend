import { useState, useCallback } from 'react'
import {
  Download, FileText, FileSpreadsheet, BarChart3, TrendingUp,
  Package, Users, ShoppingBag, Receipt, UserCog, RefreshCw,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { reportApi } from '../api/systemApi'
import { paymentApi } from '../api/financeApi'

const REPORT_TYPES = [
  { key: 'sales',     label: 'Sales Report',     icon: <TrendingUp />,      color: 'blue',   desc: 'Customer-wise, daily/monthly/yearly sales data' },
  { key: 'purchase',  label: 'Purchase Report',  icon: <ShoppingBag />,     color: 'purple', desc: 'Supplier-wise purchase, cost analysis' },
  { key: 'expense',   label: 'Expense Report',   icon: <Receipt />,         color: 'orange', desc: 'Category-wise expenses, monthly breakdown' },
  { key: 'profit',    label: 'P&L Report',       icon: <BarChart3 />,       color: 'green',  desc: 'Revenue, cost, net profit across date range' },
  { key: 'inventory', label: 'Inventory Report', icon: <Package />,         color: 'cyan',   desc: 'Stock levels, movements, low-stock alerts' },
  { key: 'customer',  label: 'Customer Report',  icon: <Users />,           color: 'blue',   desc: 'Top customers, outstanding, order history' },
  { key: 'supplier',  label: 'Supplier Report',  icon: <ShoppingBag />,     color: 'purple', desc: 'Supplier-wise purchase & payables' },
  { key: 'employee',  label: 'Employee Report',  icon: <UserCog />,         color: 'green',  desc: 'Attendance, salary summary' },
]

// Default date range: current month
const defaultFrom = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }
const defaultTo   = () => new Date().toISOString().split('T')[0]

export default function ReportCenter({ sales = [], purchases = [], orders = [], inventory = [], payments = { receivables: [], payables: [], history: [] } }) {
  const [selectedReport, setSelectedReport] = useState('sales')
  const [dateFrom,  setDateFrom]  = useState(defaultFrom)
  const [dateTo,    setDateTo]    = useState(defaultTo)
  const [groupBy,   setGroupBy]   = useState('month')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [reportData, setReportData] = useState(null)

  const currentReport = REPORT_TYPES.find(r => r.key === selectedReport)

  const fetchReport = useCallback(async () => {
    setLoading(true); setError(null); setReportData(null)
    try {
      let data = null
      if (selectedReport === 'sales') {
        data = await reportApi.getSalesReport({ from_date: dateFrom, to_date: dateTo, group_by: groupBy })
      } else if (selectedReport === 'purchase') {
        data = await reportApi.getPurchaseReport({ from_date: dateFrom, to_date: dateTo })
      } else if (selectedReport === 'expense') {
        data = await reportApi.getExpenseReport({ from_date: dateFrom, to_date: dateTo })
      } else if (selectedReport === 'profit') {
        data = await paymentApi.getProfitLoss({ from_date: dateFrom, to_date: dateTo })
      } else if (selectedReport === 'inventory') {
        // Use passed inventory prop — filter by date is not needed, show current stock
        data = { rows: inventory, totals: { total: inventory.reduce((a, i) => a + (i.current_stock || 0), 0), count: inventory.length } }
      } else if (selectedReport === 'customer') {
        // Build from payments receivables + orders
        const customerMap = {}
        ;(payments.receivables || []).forEach(r => {
          if (!r.customer_name) return
          if (!customerMap[r.customer_name]) customerMap[r.customer_name] = { name: r.customer_name, outstanding: 0, order_count: 0 }
          customerMap[r.customer_name].outstanding += (r.outstanding || 0)
        })
        orders.forEach(o => {
          const name = o.customer_name || '—'
          if (!customerMap[name]) customerMap[name] = { name, outstanding: 0, order_count: 0 }
          customerMap[name].order_count += 1
        })
        data = { rows: Object.values(customerMap).sort((a, b) => b.outstanding - a.outstanding) }
      } else if (selectedReport === 'supplier') {
        // Build from purchases
        const supplierMap = {}
        purchases.forEach(p => {
          const name = p.supplier_name || '—'
          if (!supplierMap[name]) supplierMap[name] = { supplier_name: name, count: 0, total: 0, last_date: '' }
          supplierMap[name].count += 1
          supplierMap[name].total += (p.total_amount || 0)
          const d = p.purchase_date || p.created_at || ''
          if (d > supplierMap[name].last_date) supplierMap[name].last_date = d
        })
        data = { rows: Object.values(supplierMap).sort((a, b) => b.total - a.total) }
      } else {
        data = { rows: [], totals: {} }
      }
      setReportData(data?.data || data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report.')
    } finally {
      setLoading(false)
    }
  }, [selectedReport, dateFrom, dateTo, groupBy, inventory, payments, orders, purchases])

  // Export as styled HTML (print-ready)
  const handleExport = (format) => {
    if (!reportData) { fetchReport(); return }
    const rows  = reportData.rows || []
    const total = reportData.totals || {}

    const tableRows = rows.map((row, i) => {
      if (selectedReport === 'sales') {
        const avg = row.order_count > 0 ? Math.round((row.total_sales || 0) / row.order_count) : 0
        return `<tr><td>${i+1}</td><td>${row.period||'—'}</td><td style="color:#059669;font-weight:700">₹${(row.total_sales||0).toLocaleString('en-IN')}</td><td>${row.order_count||0}</td><td>₹${avg.toLocaleString('en-IN')}</td></tr>`
      }
      if (selectedReport === 'purchase') {
        return `<tr><td>${i+1}</td><td style="font-weight:600">${row.supplier_name||'—'}</td><td style="color:var(--primary)">₹${(row.total||0).toLocaleString('en-IN')}</td><td>${row.count||0}</td></tr>`
      }
      if (selectedReport === 'expense') {
        const totalExp = rows.reduce((a, r) => a + (r.total || 0), 1)
        const pct = (((row.total||0)/totalExp)*100).toFixed(1)
        return `<tr><td>${i+1}</td><td style="font-weight:600">${row.category||'—'}</td><td style="color:#DC2626;font-weight:700">₹${(row.total||0).toLocaleString('en-IN')}</td><td>${row.count||0}</td><td>${pct}%</td></tr>`
      }
      if (selectedReport === 'inventory') {
        const st = (row.current_stock||0) === 0 ? 'Out' : (row.current_stock||0) <= (row.low_stock_alert||0) ? 'Low' : 'OK'
        return `<tr><td>${i+1}</td><td style="font-weight:600">${row.product_name||'—'}</td><td>${row.warehouse_name||'—'}</td><td style="color:#059669">+${row.stock_in||0}</td><td style="color:#DC2626">-${row.stock_out||0}</td><td style="font-weight:700">${row.current_stock||0}</td><td><span style="padding:2px 8px;border-radius:10px;font-size:11px;background:${st==='OK'?'#ECFDF5':st==='Low'?'#FFFBEB':'#FEF2F2'};color:${st==='OK'?'#059669':st==='Low'?'#D97706':'#DC2626'}">${st}</span></td></tr>`
      }
      if (selectedReport === 'customer') {
        return `<tr><td>${i+1}</td><td style="font-weight:700">${row.name||'—'}</td><td>${row.order_count||0}</td><td style="color:#DC2626;font-weight:700">₹${(row.outstanding||0).toLocaleString('en-IN')}</td></tr>`
      }
      if (selectedReport === 'supplier') {
        const ld = row.last_date ? new Date(row.last_date).toLocaleDateString('en-IN') : '—'
        return `<tr><td>${i+1}</td><td style="font-weight:700">${row.supplier_name||'—'}</td><td style="color:var(--primary);font-weight:700">₹${(row.total||0).toLocaleString('en-IN')}</td><td>${row.count||0}</td><td>${ld}</td></tr>`
      }
      return `<tr><td>${i+1}</td><td colspan="4">${JSON.stringify(row)}</td></tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${currentReport?.label}</title>
<style>
@page{size:A4 landscape;margin:12mm}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a2540}
.hdr{background:linear-gradient(135deg,#01152D,#FD5C02);color:#fff;padding:20px 28px;display:flex;justify-content:space-between;align-items:center}
.hdr h1{font-size:18px;font-weight:800;margin:0}
.hdr p{font-size:12px;opacity:.8;margin:4px 0 0}
table{width:100%;border-collapse:collapse;margin-top:16px}
th{background:#F8FAFC;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748B;padding:8px;text-align:left;border-bottom:2px solid #CBD5E1}
td{padding:8px;border-bottom:1px solid #F1F5F9;font-size:12px}
tr:nth-child(even){background:#FAFBFF}
.ftr{margin-top:16px;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between;border-top:1px solid #E2E8F0;padding-top:8px}
</style></head><body>
<div class="hdr"><div><h1>${currentReport?.label}</h1><p>${dateFrom} to ${dateTo} · ${rows.length} records</p></div>
<div style="text-align:right;font-size:12px;opacity:.8">EzyEnquiry ERP · ${new Date().toLocaleString('en-IN')}</div></div>
<table><thead>${getHeaders(selectedReport)}</thead><tbody>${tableRows}</tbody></table>
<div class="ftr"><span>EzyEnquiry ERP · ${currentReport?.label}</span><span>Generated: ${new Date().toLocaleString('en-IN')}</span></div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${selectedReport}_report_${dateFrom}_${dateTo}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Reports &amp; Tools</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Report Center</span>
      </div>

      <div className="page-grid-2" style={{ gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left selector */}
        <div className="card">
          <div className="card-header"><span className="card-title">Report Type</span></div>
          <div style={{ padding: '8px 0' }}>
            {REPORT_TYPES.map(r => (
              <button key={r.key} onClick={() => { setSelectedReport(r.key); setReportData(null) }}
                style={{ display:'flex', alignItems:'flex-start', gap:12, width:'100%', padding:'12px 16px', border:'none',
                  background: selectedReport===r.key ? 'var(--primary-light)' : 'transparent',
                  color: selectedReport===r.key ? 'var(--primary)' : 'var(--text)',
                  cursor:'pointer', fontSize:13, fontWeight: selectedReport===r.key ? 700 : 500,
                  borderLeft: selectedReport===r.key ? '3px solid var(--primary)' : '3px solid transparent',
                  textAlign:'left', transition:'all .15s' }}>
                <span style={{ marginTop:1 }}>{r.icon}</span>
                <div>
                  <div>{r.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400, marginTop:2, lineHeight:1.4 }}>{r.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Filters + Generate button */}
          <div className="card">
            <div className="card-body" style={{ padding:'14px 20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <label className="form-label" style={{ marginBottom:0 }}>From</label>
                  <input className="form-control" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width:150 }} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <label className="form-label" style={{ marginBottom:0 }}>To</label>
                  <input className="form-control" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width:150 }} />
                </div>
                {(selectedReport === 'sales') && (
                  <div style={{ display:'flex', gap:4 }}>
                    {['day','month'].map(g => (
                      <button key={g} className={`btn btn-sm ${groupBy===g?'btn-primary':'btn-secondary'}`} onClick={() => setGroupBy(g)}>
                        {g === 'day' ? 'Daily' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                )}
                <button className="btn btn-primary btn-sm" onClick={fetchReport} disabled={loading}
                  style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <RefreshCw style={{ width:13, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                  {loading ? 'Loading…' : 'Generate Report'}
                </button>
                <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExport('html')} disabled={!reportData}>
                    <FileText style={{ width:13 }} /> Export PDF
                  </button>
                  <button className="btn btn-success btn-sm" onClick={() => handleExport('html')} disabled={!reportData}>
                    <FileSpreadsheet style={{ width:13 }} /> Export
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Not yet generated */}
          {!reportData && !loading && (
            <div className="card">
              <div className="card-body" style={{ textAlign:'center', padding:'48px 24px' }}>
                <BarChart3 style={{ width:48, height:48, margin:'0 auto 16px', color:'var(--text-light)', display:'block' }} />
                <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>Select a report and click Generate</div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>
                  Choose a report type from the left, set the date range, then click <strong>Generate Report</strong>.
                </div>
                <button className="btn btn-primary" onClick={fetchReport}>
                  <RefreshCw style={{ width:13 }} /> Generate Report
                </button>
              </div>
            </div>
          )}

          {/* Chart — sales/purchase/profit */}
          {reportData && ['sales','purchase','profit'].includes(selectedReport) && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">{currentReport?.label} — Trend</span>
                <span className="badge badge-blue">Live</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={buildChartData(selectedReport, reportData)} barSize={12}>
                    <XAxis dataKey="label" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="var(--primary)" radius={[4,4,0,0]} name={currentReport?.label} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Data table */}
          {reportData && <ReportTable type={selectedReport} data={reportData} />}
        </div>
      </div>
    </>
  )
}

// ── Chart data builder ────────────────────────────────────────
function buildChartData(type, data) {
  const rows = data?.rows || []
  if (type === 'sales') {
    return rows.map(r => ({ label: r.period || '—', value: r.total_sales || 0 }))
  }
  if (type === 'purchase') {
    return rows.map(r => ({ label: r.supplier_name || '—', value: r.total || 0 }))
  }
  if (type === 'profit') {
    return [
      { label: 'Revenue', value: data.totalSales    || 0 },
      { label: 'Purchase',value: data.totalPurchase || 0 },
      { label: 'Expenses',value: data.totalExpenses || 0 },
      { label: 'Net Profit',value: data.netProfit   || 0 },
    ]
  }
  return []
}

// ── Report table component ────────────────────────────────────
function ReportTable({ type, data }) {
  const rows   = data?.rows   || []
  const totals = data?.totals || {}
  const fmtRs  = (v) => `₹${(parseFloat(v)||0).toLocaleString('en-IN')}`
  const fmtDt  = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

  if (!rows.length) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
          No data found for selected period.
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Report Data ({rows.length} records)</span>
        {totals.total && <span className="badge badge-green">Total: {fmtRs(totals.total)}</span>}
      </div>
      <div className="table-wrap">
        {/* Sales */}
        {type === 'sales' && (
          <table>
            <thead><tr><th>#</th><th>Period</th><th>Revenue (incl. GST)</th><th>Base Amount</th><th>GST</th><th>Orders</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ color:'var(--text-muted)' }}>{i+1}</td>
                  <td style={{ fontWeight:600 }}>{r.period || '—'}</td>
                  <td style={{ fontWeight:700, color:'var(--success)' }}>{fmtRs(r.total_sales)}</td>
                  <td>{fmtRs(r.base_amount)}</td>
                  <td style={{ color:'var(--text-muted)' }}>{fmtRs(r.total_gst)}</td>
                  <td>{r.order_count || 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'var(--bg)', fontWeight:700 }}>
                <td colSpan={2} style={{ textAlign:'right', color:'var(--text-muted)' }}>Total</td>
                <td style={{ color:'var(--success)' }}>{fmtRs(totals.total)}</td>
                <td>{fmtRs(totals.total_gst)}</td>
                <td colSpan={2} style={{ color:'var(--text-muted)' }}>{totals.count} entries</td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Purchase */}
        {type === 'purchase' && (
          <table>
            <thead><tr><th>#</th><th>Supplier</th><th>Total Purchase</th><th>Orders</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ color:'var(--text-muted)' }}>{i+1}</td>
                  <td style={{ fontWeight:600 }}>{r.supplier_name || r._id || '—'}</td>
                  <td style={{ fontWeight:700, color:'var(--primary)' }}>{fmtRs(r.total)}</td>
                  <td>{r.count || 0}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'var(--bg)', fontWeight:700 }}>
                <td colSpan={2} style={{ textAlign:'right', color:'var(--text-muted)' }}>Total</td>
                <td style={{ color:'var(--primary)' }}>{fmtRs(totals.total)}</td>
                <td style={{ color:'var(--text-muted)' }}>{totals.count} entries</td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Expense */}
        {type === 'expense' && (
          <table>
            <thead><tr><th>#</th><th>Category</th><th>Amount</th><th>Count</th><th>% of Total</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const totalExp = Math.max(rows.reduce((a, x) => a + (x.total || 0), 0), 1)
                const pct = (((r.total || 0) / totalExp) * 100).toFixed(1)
                return (
                  <tr key={i}>
                    <td style={{ color:'var(--text-muted)' }}>{i+1}</td>
                    <td style={{ fontWeight:600 }}>{r.category || '—'}</td>
                    <td style={{ fontWeight:700, color:'var(--danger)' }}>{fmtRs(r.total)}</td>
                    <td>{r.count || 0}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div className="progress-bar" style={{ flex:1 }}>
                          <div className="progress-fill" style={{ width:`${pct}%`, background:'#EF4444' }} />
                        </div>
                        <span style={{ fontSize:11, width:36 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Profit */}
        {type === 'profit' && (
          <table>
            <thead><tr><th>Item</th><th>Amount</th></tr></thead>
            <tbody>
              {[
                { label:'Sales Revenue',     val: data.totalSales,    color:'var(--success)' },
                { label:'Purchase Cost',     val: data.totalPurchase, color:'var(--danger)'  },
                { label:'Operating Expenses',val: data.totalExpenses, color:'var(--danger)'  },
                { label:'Salary',            val: data.totalSalary,   color:'var(--danger)'  },
                { label:'Gross Profit',      val: data.grossProfit,   color:'var(--primary)', bold:true },
                { label:'Net Profit',        val: data.netProfit,     color: data.netProfit>=0?'var(--success)':'var(--danger)', bold:true },
              ].map((row, i) => (
                <tr key={i} style={{ background: row.bold ? 'var(--bg)' : 'transparent' }}>
                  <td style={{ fontWeight: row.bold?700:400, paddingLeft: row.bold?8:20 }}>{row.label}</td>
                  <td style={{ fontWeight: row.bold?800:500, color: row.color, textAlign:'right' }}>
                    {fmtRs(row.val || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Inventory */}
        {type === 'inventory' && (
          <table>
            <thead><tr><th>#</th><th>Product</th><th>Warehouse</th><th>Stock In</th><th>Stock Out</th><th>Current Stock</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const st = (r.current_stock||0) === 0 ? 'Out' : (r.current_stock||0) <= (r.low_stock_alert||0) ? 'Low' : 'OK'
                return (
                  <tr key={i}>
                    <td style={{ color:'var(--text-muted)' }}>{i+1}</td>
                    <td style={{ fontWeight:600 }}>{r.product_name || '—'}</td>
                    <td style={{ fontSize:12 }}>{r.warehouse_name || '—'}</td>
                    <td style={{ color:'var(--success)', fontWeight:600 }}>+{r.stock_in || 0}</td>
                    <td style={{ color:'var(--danger)', fontWeight:600 }}>-{r.stock_out || 0}</td>
                    <td style={{ fontWeight:800, color: st==='Out'?'var(--danger)':st==='Low'?'var(--warning)':'var(--text)' }}>
                      {r.current_stock || 0}
                    </td>
                    <td><span className={`badge ${st==='OK'?'badge-green':st==='Low'?'badge-yellow':'badge-red'}`}>{st==='OK'?'In Stock':st==='Low'?'Low Stock':'Out of Stock'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Customer */}
        {type === 'customer' && (
          <table>
            <thead><tr><th>#</th><th>Customer</th><th>Total Orders</th><th>Outstanding</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ color:'var(--text-muted)' }}>{i+1}</td>
                  <td style={{ fontWeight:700 }}>{r.name || '—'}</td>
                  <td>{r.order_count || 0}</td>
                  <td style={{ fontWeight:700, color: r.outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {fmtRs(r.outstanding)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Supplier */}
        {type === 'supplier' && (
          <table>
            <thead><tr><th>#</th><th>Supplier</th><th>Total Purchase</th><th>Orders</th><th>Last Purchase</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ color:'var(--text-muted)' }}>{i+1}</td>
                  <td style={{ fontWeight:700 }}>{r.supplier_name || '—'}</td>
                  <td style={{ fontWeight:700, color:'var(--primary)' }}>{fmtRs(r.total)}</td>
                  <td>{r.count || 0}</td>
                  <td style={{ fontSize:12 }}>{r.last_date ? new Date(r.last_date).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Employee — placeholder (backend endpoint not in SOW scope yet) */}
        {type === 'employee' && (
          <div className="card-body" style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
            Employee attendance &amp; salary report. Data from HR module.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Table header helper for export ───────────────────────────
function getHeaders(type) {
  const h = {
    sales:     '<tr><th>#</th><th>Period</th><th>Revenue</th><th>Orders</th><th>Avg Order</th></tr>',
    purchase:  '<tr><th>#</th><th>Supplier</th><th>Total</th><th>Orders</th></tr>',
    expense:   '<tr><th>#</th><th>Category</th><th>Amount</th><th>Count</th><th>%</th></tr>',
    inventory: '<tr><th>#</th><th>Product</th><th>Warehouse</th><th>Stock In</th><th>Stock Out</th><th>Current</th><th>Status</th></tr>',
    customer:  '<tr><th>#</th><th>Customer</th><th>Orders</th><th>Outstanding</th></tr>',
    supplier:  '<tr><th>#</th><th>Supplier</th><th>Total</th><th>Orders</th><th>Last Date</th></tr>',
  }
  return h[type] || '<tr><th>#</th><th>Data</th></tr>'
}
