import { useState } from 'react'
import { BookOpen, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function AccountsModule({
  sales = [], purchases = [], payments = { receivables: [], payables: [], history: [] },
  orders = [], inventory = [],
}) {
  const [tab, setTab] = useState('ledger')

  // ── Live calculations — all using backend snake_case field names ──
  const totalSalesInvoiced  = sales.reduce((a, s) => a + (s.total_amount || 0), 0)
  const totalSalesRevenue   = sales.reduce((a, s) => a + (s.amount       || 0), 0)
  const totalGSTCollected   = sales.reduce((a, s) => a + (s.gst_amount   || 0), 0)

  const totalPurchased      = purchases.reduce((a, p) => a + (p.total_amount || 0), 0)
  const totalPurchaseCost   = purchases.reduce((a, p) => a + (p.amount       || 0), 0)
  const totalGSTPaid        = purchases.reduce((a, p) => a + (p.gst_amount   || 0), 0)

  const totalReceived       = (payments.history || []).filter(h => h.type === 'Received').reduce((a, h) => a + (h.amount || 0), 0)
  const totalPaid           = (payments.history || []).filter(h => h.type === 'Paid').reduce((a, h) => a + (h.amount || 0), 0)

  const totalOutstandingRcv = (payments.receivables || []).reduce((a, r) => a + (r.outstanding || 0), 0)
  const totalOutstandingPay = (payments.payables    || []).reduce((a, p) => a + (p.outstanding || 0), 0)

  const gstPayable = totalGSTCollected - totalGSTPaid
  const netCash    = totalReceived - totalPaid

  // Helper — format ISO date to readable
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  // ── Ledger entries — built from real backend data ─────────
  const ledger = [
    ...purchases.map(p => ({
      date:      fmtDate(p.purchase_date || p.created_at),
      type:      'Purchase',
      ref:       p.purchase_code || p._id || '',
      party:     p.supplier_name || '—',
      narration: `Purchased ${p.product_name || ''} × ${p.qty || 0} ${p.unit || ''}`,
      debit:     p.total_amount || 0,
      credit:    0,
      _ts:       new Date(p.purchase_date || p.created_at || 0).getTime(),
    })),
    ...sales.map(s => ({
      date:      fmtDate(s.sale_date || s.created_at),
      type:      'Sales',
      ref:       s.sale_code || s._id || '',
      party:     s.customer_name || '—',
      narration: `Sold ${s.product_name || ''} × ${s.qty || 0} ${s.unit || ''}`,
      debit:     0,
      credit:    s.total_amount || 0,
      _ts:       new Date(s.sale_date || s.created_at || 0).getTime(),
    })),
    ...(payments.history || []).filter(h => h.type === 'Received').map(h => ({
      date:      fmtDate(h.txn_date || h.created_at),
      type:      'Receipt',
      ref:       h.txn_code || h._id || '',
      party:     h.party_name || '—',
      narration: h.notes || `Payment received via ${h.mode || 'Cash'}`,
      debit:     0,
      credit:    h.amount || 0,
      _ts:       new Date(h.txn_date || h.created_at || 0).getTime(),
    })),
    ...(payments.history || []).filter(h => h.type === 'Paid').map(h => ({
      date:      fmtDate(h.txn_date || h.created_at),
      type:      'Payment',
      ref:       h.txn_code || h._id || '',
      party:     h.party_name || '—',
      narration: h.notes || `Payment made via ${h.mode || 'Bank Transfer'}`,
      debit:     h.amount || 0,
      credit:    0,
      _ts:       new Date(h.txn_date || h.created_at || 0).getTime(),
    })),
  ].sort((a, b) => b._ts - a._ts)

  // Running balance
  let runningBalance = 0
  const ledgerWithBalance = ledger.map(entry => {
    runningBalance += (entry.credit - entry.debit)
    return { ...entry, balance: runningBalance }
  })

  // GST summary
  const gstRows = [
    { desc: 'GST Collected on Sales (Output Tax)',   amount: totalGSTCollected,  type: 'credit' },
    { desc: 'GST Paid on Purchases (Input Tax)',      amount: -totalGSTPaid,      type: 'debit'  },
    { desc: 'Net GST Payable to Government',          amount: gstPayable,         type: 'net', bold: true },
  ]

  return (
    <>
      <div className="breadcrumb">
        <span>Finance</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Accounts Module</span>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Sales (incl. GST)', val: `₹${totalSalesInvoiced.toLocaleString()}`,  color: 'blue',   icon: <TrendingUp />   },
          { label: 'Total Purchase',          val: `₹${totalPurchased.toLocaleString()}`,       color: 'red',    icon: <TrendingDown /> },
          { label: 'Outstanding Receivable',  val: `₹${totalOutstandingRcv.toLocaleString()}`, color: 'orange', icon: <ArrowUpRight /> },
          { label: 'Outstanding Payable',     val: `₹${totalOutstandingPay.toLocaleString()}`, color: 'purple', icon: <ArrowDownRight />},
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

      {/* Cash position banner */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '16px 20px', marginBottom: 16,
      }}>
        {[
          { label: 'Cash/Bank Received',     val: `₹${totalReceived.toLocaleString()}`,      color: 'var(--success)' },
          { label: 'Cash/Bank Paid Out',      val: `₹${totalPaid.toLocaleString()}`,          color: 'var(--danger)'  },
          { label: 'Net Cash Position',       val: `₹${netCash.toLocaleString()}`,            color: netCash >= 0 ? 'var(--success)' : 'var(--danger)', bold: true },
          { label: 'GST Payable (Net)',       val: `₹${gstPayable.toLocaleString()}`,         color: 'var(--warning)' },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontWeight: item.bold ? 800 : 700, fontSize: item.bold ? 20 : 16, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['ledger', 'General Ledger'], ['gst', 'GST Summary'], ['balance', 'Trial Balance']].map(([k, l]) => (
          <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── General Ledger ── */}
      {tab === 'ledger' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">General Ledger (Auto-generated)</span>
            <span className="badge badge-blue">Live</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Type</th><th>Ref</th><th>Party</th>
                  <th>Narration</th><th>Debit (Dr.)</th><th>Credit (Cr.)</th><th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerWithBalance.map((entry, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{entry.date}</td>
                    <td>
                      <span className={`badge ${
                        entry.type === 'Sales'   ? 'badge-green' :
                        entry.type === 'Purchase'? 'badge-red' :
                        entry.type === 'Receipt' ? 'badge-cyan' :
                        'badge-orange'
                      }`} style={{ fontSize: 10 }}>{entry.type}</span>
                    </td>
                    <td style={{ color: 'var(--primary)', fontSize: 12, fontFamily: 'monospace' }}>{entry.ref}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{entry.party}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{entry.narration}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: entry.debit > 0 ? 600 : 400 }}>
                      {entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: entry.credit > 0 ? 600 : 400 }}>
                      {entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: entry.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      ₹{Math.abs(entry.balance).toLocaleString()} {entry.balance >= 0 ? 'Cr' : 'Dr'}
                    </td>
                  </tr>
                ))}
                {ledgerWithBalance.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Ledger entries auto-appear as you add purchases, complete sales, and receive payments.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GST Summary ── */}
      {tab === 'gst' && (
        <div className="card">
          <div className="card-header"><span className="card-title">GST Summary</span></div>
          <div className="card-body">
            <div style={{ maxWidth: 500 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '2px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {gstRows.map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontWeight: row.bold ? 700 : 400, color: row.type === 'net' ? 'var(--warning)' : 'var(--text)' }}>
                        {row.desc}
                      </td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: row.bold ? 700 : 400,
                        color: row.type === 'credit' ? 'var(--danger)' : row.type === 'debit' ? 'var(--success)' : 'var(--warning)' }}>
                        {row.amount < 0 ? `− ₹${Math.abs(row.amount).toLocaleString()}` : `₹${row.amount.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 20 }}>
                <div className="form-label">GST by Rate</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {[
                    { rate: '18% GST', salesGST: totalGSTCollected, purchaseGST: totalGSTPaid, net: gstPayable },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, fontSize: 13, background: 'var(--bg)', padding: '12px 14px', borderRadius: 8 }}>
                      <span style={{ fontWeight: 600 }}>{row.rate}</span>
                      <span style={{ color: 'var(--danger)' }}>Output: ₹{row.salesGST.toLocaleString()}</span>
                      <span style={{ color: 'var(--success)' }}>Input: ₹{row.purchaseGST.toLocaleString()}</span>
                      <span style={{ fontWeight: 700, color: 'var(--warning)' }}>Net: ₹{row.net.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Trial Balance ── */}
      {tab === 'balance' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Trial Balance</span></div>
          <div className="card-body">
            <div style={{ maxWidth: 600 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '2px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Account</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Debit (Dr.)</th>
                    <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '2px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Credit (Cr.)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { account: 'Sales Revenue',          dr: 0,                  cr: totalSalesRevenue     },
                    { account: 'GST Payable (Output)',   dr: 0,                  cr: totalGSTCollected      },
                    { account: 'Purchase / COGS',        dr: totalPurchaseCost,  cr: 0                      },
                    { account: 'GST Receivable (Input)', dr: totalGSTPaid,       cr: 0                      },
                    { account: 'Accounts Receivable',    dr: totalOutstandingRcv,cr: 0                      },
                    { account: 'Accounts Payable',       dr: 0,                  cr: totalOutstandingPay    },
                    { account: 'Cash / Bank (Net)',       dr: netCash > 0 ? netCash : 0, cr: netCash < 0 ? Math.abs(netCash) : 0 },
                  ].map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{row.account}</td>
                      <td style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', color: row.dr > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {row.dr > 0 ? `₹${row.dr.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', color: row.cr > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {row.cr > 0 ? `₹${row.cr.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {/* Totals */}
                  <tr style={{ fontWeight: 800, background: 'var(--bg)' }}>
                    <td style={{ padding: '10px 0', borderTop: '2px solid var(--border)' }}>TOTAL</td>
                    <td style={{ padding: '10px 0', borderTop: '2px solid var(--border)', textAlign: 'right', color: 'var(--danger)' }}>
                      ₹{(totalPurchaseCost + totalGSTPaid + totalOutstandingRcv + (netCash > 0 ? netCash : 0)).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 0', borderTop: '2px solid var(--border)', textAlign: 'right', color: 'var(--success)' }}>
                      ₹{(totalSalesRevenue + totalGSTCollected + totalOutstandingPay + (netCash < 0 ? Math.abs(netCash) : 0)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
