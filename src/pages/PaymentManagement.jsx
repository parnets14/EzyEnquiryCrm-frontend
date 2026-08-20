import { useState, useEffect, useCallback } from 'react'
import { Search, CreditCard, TrendingUp, TrendingDown, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { paymentApi } from '../api/financeApi'

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'NEFT/RTGS', 'Cheque']

const fmt = (n) => {
  const v = parseFloat(n) || 0
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function overdueDays(dueDate) {
  if (!dueDate) return 0
  const diff = Math.floor((Date.now() - new Date(dueDate)) / 86400000)
  return diff > 0 ? diff : 0
}

// ── Skeleton loader row ────────────────────────────────────────
function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i}>
          <div style={{ height: 14, borderRadius: 6, background: 'var(--border)',
            opacity: 0.6, animation: 'pulse 1.4s ease-in-out infinite' }} />
        </td>
      ))}
    </tr>
  )
}

export default function PaymentManagement() {
  const [tab,         setTab]         = useState('receivable')
  const [showModal,   setShowModal]   = useState(null)
  const [search,      setSearch]      = useState('')
  const [successMsg,  setSuccessMsg]  = useState('')
  const [errorMsg,    setErrorMsg]    = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [pForm,       setPForm]       = useState({ amount: '', mode: 'Cash', ref: '', notes: '' })

  // ── Data state ─────────────────────────────────────────────
  const [receivables,    setReceivables]    = useState([])
  const [payables,       setPayables]       = useState([])
  const [transactions,   setTransactions]   = useState([])
  const [loading,        setLoading]        = useState({ receivable: false, payable: false, history: false })
  const [rcvStatus,      setRcvStatus]      = useState('All')
  const [payStatus,      setPayStatus]      = useState('All')
  const [txnType,        setTxnType]        = useState('All')

  // ── Pagination state ───────────────────────────────────────
  const [rcvPage,  setRcvPage]  = useState(1)
  const [payPage,  setPayPage]  = useState(1)
  const [txnPage,  setTxnPage]  = useState(1)
  const [rcvTotal, setRcvTotal] = useState(0)
  const [payTotal, setPayTotal] = useState(0)
  const [txnTotal, setTxnTotal] = useState(0)
  const PAGE_LIMIT = 20

  const toast = (msg, type = 'success') => {
    if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000) }
    else                    { setErrorMsg(msg);   setTimeout(() => setErrorMsg(''),   5000) }
  }

  // ── Fetch receivables ──────────────────────────────────────
  const fetchReceivables = useCallback(async () => {
    setLoading(l => ({ ...l, receivable: true }))
    try {
      const res = await paymentApi.listReceivables({ status: rcvStatus, page: rcvPage, limit: PAGE_LIMIT })
      setReceivables(res.data?.receivables || [])
      setRcvTotal(res.data?.pagination?.total || 0)
    } catch {
      toast('Failed to load receivables', 'error')
    } finally {
      setLoading(l => ({ ...l, receivable: false }))
    }
  }, [rcvStatus, rcvPage])

  // ── Fetch payables ─────────────────────────────────────────
  const fetchPayables = useCallback(async () => {
    setLoading(l => ({ ...l, payable: true }))
    try {
      const res = await paymentApi.listPayables({ status: payStatus, page: payPage, limit: PAGE_LIMIT })
      setPayables(res.data?.payables || [])
      setPayTotal(res.data?.pagination?.total || 0)
    } catch {
      toast('Failed to load payables', 'error')
    } finally {
      setLoading(l => ({ ...l, payable: false }))
    }
  }, [payStatus, payPage])

  // ── Fetch transactions ─────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setLoading(l => ({ ...l, history: true }))
    try {
      const res = await paymentApi.listTransactions({ type: txnType, page: txnPage, limit: PAGE_LIMIT })
      setTransactions(res.data?.transactions || [])
      setTxnTotal(res.data?.pagination?.total || 0)
    } catch {
      toast('Failed to load transactions', 'error')
    } finally {
      setLoading(l => ({ ...l, history: false }))
    }
  }, [txnType, txnPage])

  useEffect(() => { fetchReceivables() }, [fetchReceivables])
  useEffect(() => { fetchPayables()    }, [fetchPayables])
  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // ── Summary stats (from loaded data slices) ────────────────
  const totalReceivable = receivables.reduce((s, r) => s + (parseFloat(r.outstanding) || 0), 0)
  const totalPayable    = payables.reduce((s, p) => s + (parseFloat(p.outstanding) || 0), 0)
  const overdueRcv      = receivables.filter(r => overdueDays(r.due_date) > 0).length
  const overduePayable  = payables.filter(p => overdueDays(p.due_date) > 0).length
  const rcvdThisMonth   = transactions.filter(h => h.type === 'Received').reduce((a, h) => a + (parseFloat(h.amount) || 0), 0)
  const paidThisMonth   = transactions.filter(h => h.type === 'Paid').reduce((a, h) => a + (parseFloat(h.amount) || 0), 0)

  // ── Collect receivable ─────────────────────────────────────
  const handleCollect = async () => {
    if (!pForm.amount || Number(pForm.amount) <= 0) {
      toast('Please enter a valid amount', 'error')
      return
    }
    setSubmitting(true)
    try {
      await paymentApi.collectReceivable(showModal.record._id, {
        amount:    Number(pForm.amount),
        mode:      pForm.mode,
        reference: pForm.ref,
        notes:     pForm.notes,
      })
      toast(`✓ ₹${Number(pForm.amount).toLocaleString()} recorded from ${showModal.record.customer_name}`)
      setShowModal(null)
      setPForm({ amount: '', mode: 'Cash', ref: '', notes: '' })
      fetchReceivables()
      fetchTransactions()
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to record payment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Pay payable ────────────────────────────────────────────
  const handlePay = async () => {
    if (!pForm.amount || Number(pForm.amount) <= 0) {
      toast('Please enter a valid amount', 'error')
      return
    }
    setSubmitting(true)
    try {
      await paymentApi.payPayable(showModal.record._id, {
        amount:    Number(pForm.amount),
        mode:      pForm.mode,
        reference: pForm.ref,
        notes:     pForm.notes,
      })
      toast(`✓ ₹${Number(pForm.amount).toLocaleString()} paid to ${showModal.record.supplier_name}`)
      setShowModal(null)
      setPForm({ amount: '', mode: 'Bank Transfer', ref: '', notes: '' })
      fetchPayables()
      fetchTransactions()
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to record payment', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Filtered receivables by search ────────────────────────
  const filteredReceivables = receivables.filter(r =>
    (r.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.rcv_code     || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Pagination helper ──────────────────────────────────────
  function PaginationBar({ total, page, setPage, limit, loading: isLoading }) {
    const pages = Math.ceil(total / limit)
    if (pages <= 1) return null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
        borderTop: '1px solid var(--border)', justifyContent: 'flex-end', fontSize: 13 }}>
        <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>
          Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
        </span>
        <button className="btn btn-secondary btn-xs" disabled={page <= 1 || isLoading}
          onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ fontWeight: 600 }}>{page} / {pages}</span>
        <button className="btn btn-secondary btn-xs" disabled={page >= pages || isLoading}
          onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    )
  }

  return (
    <>
      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.2} }`}</style>

      <div className="breadcrumb">
        <span>Finance</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Payment Management</span>
      </div>

      {successMsg && (
        <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle style={{ color: 'var(--success)', width: 18, flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle style={{ color: 'var(--danger)', width: 18, flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{errorMsg}</span>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Receivable',      val: fmt(totalReceivable),  sub: `${overdueRcv} overdue`,                                 color: 'blue',   icon: <TrendingUp /> },
          { label: 'Total Payable',         val: fmt(totalPayable),     sub: `${overduePayable} overdue`,                             color: 'red',    icon: <TrendingDown /> },
          { label: 'Received (Loaded)',     val: fmt(rcvdThisMonth),    sub: `${transactions.filter(h => h.type === 'Received').length} txns`, color: 'green',  icon: <CheckCircle /> },
          { label: 'Paid (Loaded)',         val: fmt(paidThisMonth),    sub: `${transactions.filter(h => h.type === 'Paid').length} txns`,    color: 'purple', icon: <CreditCard /> },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 18 }}>{s.val}</div>
              <div className="stat-change">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {[
          ['receivable', 'Receivable (Customers)'],
          ['payable',    'Payable (Suppliers)'],
          ['history',    'Transaction History'],
        ].map(([k, l]) => (
          <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ══════════════════ RECEIVABLE TAB ══════════════════ */}
      {tab === 'receivable' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Customer Outstanding ({rcvTotal})</span>
            <div className="header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="search-bar">
                <Search />
                <input placeholder="Search customer…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width: 130, fontSize: 13 }}
                value={rcvStatus} onChange={e => { setRcvStatus(e.target.value); setRcvPage(1) }}>
                {['All', 'Pending', 'Partial', 'Received', 'Overdue'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button className="btn btn-secondary btn-xs" onClick={fetchReceivables}
                title="Refresh" disabled={loading.receivable}>
                <RefreshCw style={{ width: 13, ...(loading.receivable ? { animation: 'spin 1s linear infinite' } : {}) }} />
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Customer</th><th>Invoice Amt</th><th>Received</th>
                  <th>Outstanding</th><th>Due Date</th><th>Overdue</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading.receivable
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
                  : filteredReceivables.length === 0
                    ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                          No outstanding receivables found.
                        </td>
                      </tr>
                    )
                    : filteredReceivables.map(r => {
                        const od = overdueDays(r.due_date)
                        return (
                          <tr key={r._id}>
                            <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>
                              {r.rcv_code || r._id?.slice(-6).toUpperCase()}
                            </td>
                            <td style={{ fontWeight: 600 }}>{r.customer_name || '—'}</td>
                            <td>{fmt(r.invoice_amount)}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(r.received)}</td>
                            <td style={{
                              fontWeight: 700, fontSize: 15,
                              color: parseFloat(r.outstanding) > 0 ? 'var(--danger)' : 'var(--success)',
                            }}>
                              {fmt(r.outstanding)}
                            </td>
                            <td style={{ fontSize: 12 }}>{fmtDate(r.due_date)}</td>
                            <td>
                              {od > 0
                                ? <span className="badge badge-red">{od}d late</span>
                                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                              }
                            </td>
                            <td>
                              <span className={`badge ${
                                r.status === 'Received' ? 'badge-green' :
                                r.status === 'Partial'  ? 'badge-yellow' : 'badge-red'
                              }`}>{r.status}</span>
                            </td>
                            <td>
                              {parseFloat(r.outstanding) > 0
                                ? (
                                  <button className="btn btn-primary btn-xs"
                                    onClick={() => {
                                      setShowModal({ type: 'receive', record: r })
                                      setPForm({ amount: '', mode: 'Cash', ref: '', notes: '' })
                                    }}>
                                    <CreditCard style={{ width: 12 }} /> Collect
                                  </button>
                                )
                                : <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Cleared</span>
                              }
                            </td>
                          </tr>
                        )
                      })
                }
              </tbody>
            </table>
          </div>

          <PaginationBar total={rcvTotal} page={rcvPage} setPage={setRcvPage}
            limit={PAGE_LIMIT} loading={loading.receivable} />
        </div>
      )}

      {/* ══════════════════ PAYABLE TAB ══════════════════ */}
      {tab === 'payable' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Supplier Outstanding ({payTotal})</span>
            <div className="header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="form-control" style={{ width: 130, fontSize: 13 }}
                value={payStatus} onChange={e => { setPayStatus(e.target.value); setPayPage(1) }}>
                {['All', 'Pending', 'Partial', 'Paid', 'Overdue'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button className="btn btn-secondary btn-xs" onClick={fetchPayables}
                title="Refresh" disabled={loading.payable}>
                <RefreshCw style={{ width: 13, ...(loading.payable ? { animation: 'spin 1s linear infinite' } : {}) }} />
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Supplier</th><th>Invoice Amt</th><th>Paid</th>
                  <th>Outstanding</th><th>Due Date</th><th>Overdue</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading.payable
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={9} />)
                  : payables.length === 0
                    ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                          No outstanding payables found.
                        </td>
                      </tr>
                    )
                    : payables.map(p => {
                        const od = overdueDays(p.due_date)
                        return (
                          <tr key={p._id}>
                            <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>
                              {p.pay_code || p._id?.slice(-6).toUpperCase()}
                            </td>
                            <td style={{ fontWeight: 600 }}>{p.supplier_name || '—'}</td>
                            <td>{fmt(p.invoice_amount)}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(p.paid)}</td>
                            <td style={{
                              fontWeight: 700,
                              color: parseFloat(p.outstanding) > 0 ? 'var(--danger)' : 'var(--success)',
                            }}>
                              {fmt(p.outstanding)}
                            </td>
                            <td style={{ fontSize: 12 }}>{fmtDate(p.due_date)}</td>
                            <td>
                              {od > 0
                                ? <span className="badge badge-red">{od}d late</span>
                                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                              }
                            </td>
                            <td>
                              <span className={`badge ${
                                p.status === 'Paid'    ? 'badge-green'  :
                                p.status === 'Partial' ? 'badge-yellow' : 'badge-red'
                              }`}>{p.status}</span>
                            </td>
                            <td>
                              {parseFloat(p.outstanding) > 0
                                ? (
                                  <button className="btn btn-primary btn-xs"
                                    onClick={() => {
                                      setShowModal({ type: 'pay', record: p })
                                      setPForm({ amount: '', mode: 'Bank Transfer', ref: '', notes: '' })
                                    }}>
                                    <CreditCard style={{ width: 12 }} /> Pay
                                  </button>
                                )
                                : <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Paid</span>
                              }
                            </td>
                          </tr>
                        )
                      })
                }
              </tbody>
            </table>
          </div>

          <PaginationBar total={payTotal} page={payPage} setPage={setPayPage}
            limit={PAGE_LIMIT} loading={loading.payable} />
        </div>
      )}

      {/* ══════════════════ HISTORY TAB ══════════════════ */}
      {tab === 'history' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Transaction History ({txnTotal})</span>
            <div className="header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="form-control" style={{ width: 130, fontSize: 13 }}
                value={txnType} onChange={e => { setTxnType(e.target.value); setTxnPage(1) }}>
                {['All', 'Received', 'Paid'].map(s => <option key={s}>{s}</option>)}
              </select>
              <button className="btn btn-secondary btn-xs" onClick={fetchTransactions}
                title="Refresh" disabled={loading.history}>
                <RefreshCw style={{ width: 13, ...(loading.history ? { animation: 'spin 1s linear infinite' } : {}) }} />
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TXN Code</th><th>Date</th><th>Type</th><th>Party</th>
                  <th>Amount</th><th>Mode</th><th>Reference</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading.history
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
                  : transactions.length === 0
                    ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                          No transactions found.
                        </td>
                      </tr>
                    )
                    : transactions.map(h => (
                      <tr key={h._id}>
                        <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>
                          {h.txn_code || h._id?.slice(-6).toUpperCase()}
                        </td>
                        <td style={{ fontSize: 12 }}>{fmtDate(h.txn_date)}</td>
                        <td>
                          <span className={`badge ${h.type === 'Received' ? 'badge-green' : 'badge-red'}`}>
                            {h.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{h.party_name || '—'}</td>
                        <td style={{
                          fontWeight: 700,
                          color: h.type === 'Received' ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {h.type === 'Received' ? '+' : '−'} {fmt(h.amount)}
                        </td>
                        <td><span className="chip">{h.mode || '—'}</span></td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{h.reference || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{h.notes || '—'}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>

          <PaginationBar total={txnTotal} page={txnPage} setPage={setTxnPage}
            limit={PAGE_LIMIT} loading={loading.history} />
        </div>
      )}

      {/* ══════════════════ PAYMENT MODAL ══════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {showModal.type === 'receive' ? '💰 Collect Payment' : '💸 Pay Supplier'}
              </span>
              <button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Info banner */}
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <CreditCard />
                <div>
                  <strong>
                    {showModal.type === 'receive'
                      ? showModal.record.customer_name
                      : showModal.record.supplier_name}
                  </strong>
                  <div style={{ fontSize: 12 }}>
                    Invoice: {fmt(showModal.record.invoice_amount)} &nbsp;|&nbsp;
                    {showModal.type === 'receive'
                      ? `Received: ${fmt(showModal.record.received)}`
                      : `Paid: ${fmt(showModal.record.paid)}`}
                    &nbsp;|&nbsp;
                    <strong style={{ color: 'var(--danger)' }}>
                      Outstanding: {fmt(showModal.record.outstanding)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Amount {showModal.type === 'receive' ? 'to Collect' : 'to Pay'} (₹) *
                  </label>
                  <input className="form-control" type="number" placeholder="0.00" min="1"
                    value={pForm.amount}
                    onChange={e => setPForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode *</label>
                  <select className="form-control" value={pForm.mode}
                    onChange={e => setPForm(f => ({ ...f, mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Transaction / UTR / Cheque Ref</label>
                  <input className="form-control" placeholder="Reference number"
                    value={pForm.ref}
                    onChange={e => setPForm(f => ({ ...f, ref: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-control" placeholder="Optional remarks"
                    value={pForm.notes}
                    onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              {pForm.amount && (
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                  After this payment — Outstanding will be&nbsp;
                  <strong style={{
                    color: Math.max(0, parseFloat(showModal.record.outstanding || 0) - Number(pForm.amount)) === 0
                      ? 'var(--success)' : 'var(--warning)',
                  }}>
                    {fmt(Math.max(0, parseFloat(showModal.record.outstanding || 0) - Number(pForm.amount)))}
                  </strong>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(null)} disabled={submitting}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={submitting}
                onClick={showModal.type === 'receive' ? handleCollect : handlePay}>
                <CheckCircle style={{ width: 14 }} />
                {submitting ? 'Saving…' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
