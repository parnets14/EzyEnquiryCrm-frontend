import { useState } from 'react'
import { Plus, Search, CreditCard, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react'

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'NEFT/RTGS', 'Cheque']

export default function PaymentManagement({ payments = { receivables: [], payables: [], history: [] }, recordPayment }) {
  const [tab,       setTab]       = useState('receivable')
  const [showModal, setShowModal] = useState(null)
  const [search,    setSearch]    = useState('')
  const [successMsg,setSuccessMsg]= useState('')
  const [pForm,     setPForm]     = useState({ amount: '', mode: 'Bank Transfer', ref: '', notes: '' })

  const { receivables = [], payables = [], history = [] } = payments

  const totalReceivable = receivables.reduce((s, r) => s + (r.outstanding || 0), 0)
  const totalPayable    = payables.reduce((s, p) => s + (p.outstanding || 0), 0)
  const overdueRcv      = receivables.filter(r => r.overdueDays > 0).length
  const overduePayable  = payables.filter(p => p.overdueDays > 0).length

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000) }

  const handleCollect = () => {
    if (!pForm.amount || Number(pForm.amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }
    recordPayment?.(
      showModal.record.id,
      Number(pForm.amount),
      pForm.mode,
      pForm.ref,
      pForm.notes,
    )
    toast(`✓ Payment ₹${Number(pForm.amount).toLocaleString()} recorded from ${showModal.record.customerId || showModal.record.supplier}`)
    setShowModal(null)
    setPForm({ amount: '', mode: 'Bank Transfer', ref: '', notes: '' })
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Finance</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Payment Management</span>
      </div>

      {successMsg && (
        <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle style={{ color: 'var(--success)', width: 18 }} />
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Receivable',      val: `₹${totalReceivable.toLocaleString()}`,  change: `${overdueRcv} overdue`,    color: 'blue',   icon: <TrendingUp /> },
          { label: 'Total Payable',         val: `₹${totalPayable.toLocaleString()}`,     change: `${overduePayable} overdue`, color: 'red',    icon: <TrendingDown /> },
          { label: 'Received (This Month)', val: `₹${history.filter(h => h.type === 'Received').reduce((a, h) => a + h.amount, 0).toLocaleString()}`, change: `${history.filter(h => h.type === 'Received').length} txns`, color: 'green', icon: <CheckCircle /> },
          { label: 'Paid (This Month)',     val: `₹${history.filter(h => h.type === 'Paid').reduce((a, h) => a + h.amount, 0).toLocaleString()}`,     change: `${history.filter(h => h.type === 'Paid').length} txns`,    color: 'purple',icon: <CreditCard /> },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{s.val}</div>
              <div className="stat-change">{s.change}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['receivable', 'Receivable (Customers)'], ['payable', 'Payable (Suppliers)'], ['history', 'Transaction History']].map(([k, l]) => (
          <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── Receivable ── */}
      {tab === 'receivable' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Customer Outstanding ({receivables.length})</span>
            <div className="header-actions">
              <div className="search-bar"><Search /><input placeholder="Search customer…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Customer</th><th>Order</th><th>Invoice Amt</th><th>Received</th><th>Outstanding</th><th>Due Date</th><th>Overdue</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {receivables.filter(r => (r.customerId || '').toLowerCase().includes(search.toLowerCase())).map(r => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>{r.id}</td>
                    <td style={{ fontWeight: 600 }}>{r.customerId}</td>
                    <td style={{ fontSize: 12, color: 'var(--primary)' }}>{r.orderId}</td>
                    <td>₹{r.invoiceAmt?.toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{r.received?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: r.outstanding > 0 ? 'var(--danger)' : 'var(--success)', fontSize: 15 }}>
                      ₹{r.outstanding?.toLocaleString()}
                    </td>
                    <td style={{ fontSize: 12 }}>{r.dueDate || '—'}</td>
                    <td>
                      {r.overdueDays > 0
                        ? <span className="badge badge-red">{r.overdueDays}d late</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'Received' ? 'badge-green' : r.status === 'Partial' ? 'badge-yellow' : 'badge-red'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.outstanding > 0 && (
                        <button className="btn btn-primary btn-xs" onClick={() => setShowModal({ type: 'receive', record: r })}>
                          <CreditCard style={{ width: 12 }} />Collect
                        </button>
                      )}
                      {r.outstanding === 0 && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Cleared</span>}
                    </td>
                  </tr>
                ))}
                {receivables.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    No outstanding payments. Outstanding is auto-created when orders are delivered.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payable ── */}
      {tab === 'payable' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Supplier Outstanding ({payables.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Supplier</th><th>Purchase Ref</th><th>Invoice Amt</th><th>Paid</th><th>Outstanding</th><th>Due Date</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {payables.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.supplier}</td>
                    <td style={{ fontSize: 12, color: 'var(--primary)' }}>{p.purchaseId}</td>
                    <td>₹{p.invoiceAmt?.toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{p.paid?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: p.outstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      ₹{p.outstanding?.toLocaleString()}
                    </td>
                    <td style={{ fontSize: 12 }}>{p.dueDate}</td>
                    <td>
                      <span className={`badge ${p.status === 'Paid' ? 'badge-green' : p.status === 'Overdue' ? 'badge-red' : 'badge-yellow'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.outstanding > 0 && (
                        <button className="btn btn-primary btn-xs" onClick={() => setShowModal({ type: 'pay', record: { ...p, customerId: p.supplier } })}>
                          <CreditCard style={{ width: 12 }} />Pay
                        </button>
                      )}
                      {p.outstanding === 0 && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Paid</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Transaction History ({history.length})</span></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>TXN ID</th><th>Date</th><th>Type</th><th>Party</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>{h.id}</td>
                    <td style={{ fontSize: 12 }}>{h.date}</td>
                    <td><span className={`badge ${h.type === 'Received' ? 'badge-green' : 'badge-red'}`}>{h.type}</span></td>
                    <td style={{ fontWeight: 600 }}>{h.party}</td>
                    <td style={{ fontWeight: 700, color: h.type === 'Received' ? 'var(--success)' : 'var(--danger)' }}>
                      {h.type === 'Received' ? '+' : '−'} ₹{h.amount?.toLocaleString()}
                    </td>
                    <td><span className="chip">{h.mode}</span></td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{h.ref}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.notes}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No transactions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Collect Payment Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">💰 Collect Payment</span>
              <button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <CreditCard />
                <div>
                  <strong>{showModal.record.customerId}</strong>
                  <div style={{ fontSize: 12 }}>
                    Invoice: ₹{showModal.record.invoiceAmt?.toLocaleString()} |
                    Received: ₹{showModal.record.received?.toLocaleString()} |
                    <strong style={{ color: 'var(--danger)' }}> Outstanding: ₹{showModal.record.outstanding?.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount to Collect (₹) *</label>
                  <input className="form-control" type="number" placeholder="0.00" value={pForm.amount} onChange={e => setPForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode *</label>
                  <select className="form-control" value={pForm.mode} onChange={e => setPForm(f => ({ ...f, mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Transaction / UTR / Cheque Ref</label>
                  <input className="form-control" placeholder="Reference number" value={pForm.ref} onChange={e => setPForm(f => ({ ...f, ref: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-control" placeholder="Optional remarks" value={pForm.notes} onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              {pForm.amount && (
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  After this payment: Outstanding will be
                  <strong style={{ color: Math.max(0, (showModal.record.outstanding || 0) - Number(pForm.amount)) === 0 ? 'var(--success)' : 'var(--warning)', marginLeft: 6 }}>
                    ₹{Math.max(0, (showModal.record.outstanding || 0) - Number(pForm.amount)).toLocaleString()}
                  </strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCollect}>
                <CheckCircle style={{ width: 14 }} />Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
