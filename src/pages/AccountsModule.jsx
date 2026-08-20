import { useState, useEffect, useCallback } from 'react'
import { BookOpen, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
import { accountsApi, paymentApi } from '../api/financeApi'

export default function AccountsModule({
  sales = [], purchases = [], payments = { receivables: [], payables: [], history: [] },
  orders = [], inventory = [],
}) {
  const [tab, setTab] = useState('ledger')

  // ── Live payment summary from API ─────────────────────────
  const [liveSummary, setLiveSummary] = useState({
    totalOutstandingRcv: 0, totalOutstandingPay: 0,
    totalReceived: 0, totalPaid: 0,
  })
  const [liveTransactions, setLiveTransactions] = useState([])

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const [rcv, pay, txns] = await Promise.all([
          paymentApi.listReceivables({ status: 'All', limit: 1 }),
          paymentApi.listPayables({ status: 'All', limit: 1 }),
          paymentApi.listTransactions({ type: 'All', limit: 500 }),
        ])
        const rcvList  = rcv?.data?.receivables  || []
        const payList  = pay?.data?.payables     || []
        const txnList  = txns?.data?.transactions || []
        // Backend returns aggregated totals via pagination.total but not sum — compute from slices
        // Use the full list from receivables/payables for outstanding totals
        const [rcvAll, payAll] = await Promise.all([
          paymentApi.listReceivables({ status: 'All', limit: 1000 }),
          paymentApi.listPayables({ status: 'All', limit: 1000 }),
        ])
        const allRcv = rcvAll?.data?.receivables || []
        const allPay = payAll?.data?.payables    || []
        setLiveSummary({
          totalOutstandingRcv: allRcv.reduce((s, r) => s + (parseFloat(r.outstanding) || 0), 0),
          totalOutstandingPay: allPay.reduce((s, p) => s + (parseFloat(p.outstanding) || 0), 0),
          totalReceived: txnList.filter(h => h.type === 'Received').reduce((s, h) => s + (parseFloat(h.amount) || 0), 0),
          totalPaid:     txnList.filter(h => h.type === 'Paid').reduce((s, h)     => s + (parseFloat(h.amount) || 0), 0),
        })
        setLiveTransactions(txnList)
      } catch { /* silent fallback */ }
    }
    fetchSummary()
  }, [])

  // ── Cash Book state ────────────────────────────────────────
  const [cashBook,       setCashBook]       = useState(null)
  const [cashLoading,    setCashLoading]    = useState(false)
  const [cashFromDate,   setCashFromDate]   = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [cashToDate, setCashToDate] = useState(() => new Date().toISOString().split('T')[0])

  // ── Bank Book state ────────────────────────────────────────
  const [bankBook,       setBankBook]       = useState(null)
  const [bankLoading,    setBankLoading]    = useState(false)
  const [bankFromDate,   setBankFromDate]   = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [bankToDate, setBankToDate] = useState(() => new Date().toISOString().split('T')[0])

  // ── Customer Ledger state ──────────────────────────────────
  const [custId,     setCustId]     = useState('')
  const [custLedger, setCustLedger] = useState(null)
  const [custLoading,setCustLoading]= useState(false)
  const [custError,  setCustError]  = useState('')

  // ── Supplier Ledger state ──────────────────────────────────
  const [suppId,     setSuppId]     = useState('')
  const [suppLedger, setSuppLedger] = useState(null)
  const [suppLoading,setSuppLoading]= useState(false)
  const [suppError,  setSuppError]  = useState('')

  // ── Live calculations from props + live payment summary ──────
  const totalSalesInvoiced  = sales.reduce((a, s) => a + (s.total_amount || 0), 0)
  const totalSalesRevenue   = sales.reduce((a, s) => a + (s.amount       || 0), 0)
  const totalGSTCollected   = sales.reduce((a, s) => a + (s.gst_amount   || 0), 0)
  const totalPurchased      = purchases.reduce((a, p) => a + (p.total_amount || 0), 0)
  const totalPurchaseCost   = purchases.reduce((a, p) => a + (p.amount       || 0), 0)
  const totalGSTPaid        = purchases.reduce((a, p) => a + (p.gst_amount   || 0), 0)
  const totalReceived       = liveSummary.totalReceived
  const totalPaid           = liveSummary.totalPaid
  const totalOutstandingRcv = liveSummary.totalOutstandingRcv
  const totalOutstandingPay = liveSummary.totalOutstandingPay
  const gstPayable = totalGSTCollected - totalGSTPaid
  const netCash    = totalReceived - totalPaid

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

  // ── General Ledger (from props) ────────────────────────────
  const ledger = [
    ...purchases.map(p => ({
      date: fmtDate(p.purchase_date || p.created_at), type: 'Purchase',
      ref: p.purchase_code || '', party: p.supplier_name || '—',
      narration: `Purchased ${p.product_name || ''} × ${p.qty || 0}`,
      debit: p.total_amount || 0, credit: 0,
      _ts: new Date(p.purchase_date || p.created_at || 0).getTime(),
    })),
    ...sales.map(s => ({
      date: fmtDate(s.sale_date || s.created_at), type: 'Sales',
      ref: s.sale_code || '', party: s.customer_name || '—',
      narration: `Sold ${s.product_name || ''} × ${s.qty || 0}`,
      debit: 0, credit: s.total_amount || 0,
      _ts: new Date(s.sale_date || s.created_at || 0).getTime(),
    })),
    ...(liveTransactions).filter(h => h.type === 'Received').map(h => ({
      date: fmtDate(h.txn_date || h.created_at), type: 'Receipt',
      ref: h.txn_code || '', party: h.party_name || '—',
      narration: h.notes || `Payment received via ${h.mode || 'Cash'}`,
      debit: 0, credit: h.amount || 0,
      _ts: new Date(h.txn_date || h.created_at || 0).getTime(),
    })),
    ...(liveTransactions).filter(h => h.type === 'Paid').map(h => ({
      date: fmtDate(h.txn_date || h.created_at), type: 'Payment',
      ref: h.txn_code || '', party: h.party_name || '—',
      narration: h.notes || `Payment made via ${h.mode || 'Bank Transfer'}`,
      debit: h.amount || 0, credit: 0,
      _ts: new Date(h.txn_date || h.created_at || 0).getTime(),
    })),
  ].sort((a, b) => b._ts - a._ts)

  let runningBalance = 0
  const ledgerWithBalance = ledger.map(entry => {
    runningBalance += (entry.credit - entry.debit)
    return { ...entry, balance: runningBalance }
  })

  // ── Fetch Cash Book ────────────────────────────────────────
  const fetchCashBook = useCallback(async () => {
    setCashLoading(true)
    try {
      const res = await accountsApi.getCashBook({ from_date: cashFromDate, to_date: cashToDate })
      setCashBook(res?.data || res)
    } catch { setCashBook(null) }
    finally { setCashLoading(false) }
  }, [cashFromDate, cashToDate])

  // ── Fetch Bank Book ────────────────────────────────────────
  const fetchBankBook = useCallback(async () => {
    setBankLoading(true)
    try {
      const res = await accountsApi.getBankBook({ from_date: bankFromDate, to_date: bankToDate })
      setBankBook(res?.data || res)
    } catch { setBankBook(null) }
    finally { setBankLoading(false) }
  }, [bankFromDate, bankToDate])

  // ── Fetch Customer Ledger ──────────────────────────────────
  const fetchCustLedger = async () => {
    if (!custId.trim()) { setCustError('Enter a Customer ID or select a customer'); return }
    setCustLoading(true); setCustError(''); setCustLedger(null)
    try {
      const res = await accountsApi.getCustomerLedger(custId.trim())
      setCustLedger(res?.data || res)
    } catch (e) { setCustError(e?.response?.data?.message || 'Failed to load ledger') }
    finally { setCustLoading(false) }
  }

  // ── Fetch Supplier Ledger ──────────────────────────────────
  const fetchSuppLedger = async () => {
    if (!suppId.trim()) { setSuppError('Enter a Supplier ID'); return }
    setSuppLoading(true); setSuppError(''); setSuppLedger(null)
    try {
      const res = await accountsApi.getSupplierLedger(suppId.trim())
      setSuppLedger(res?.data || res)
    } catch (e) { setSuppError(e?.response?.data?.message || 'Failed to load ledger') }
    finally { setSuppLoading(false) }
  }

  // Auto-load when switching to cash/bank tab
  useEffect(() => {
    if (tab === 'cashbook') fetchCashBook()
    if (tab === 'bankbook') fetchBankBook()
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Date filter row (reused for cash/bank book) ────────────
  const DateFilter = ({ from, setFrom, to, setTo, loading, onApply }) => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>From</label>
        <input type="date" className="form-control" style={{ width: 150 }} value={from} onChange={e => setFrom(e.target.value)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>To</label>
        <input type="date" className="form-control" style={{ width: 150 }} value={to} onChange={e => setTo(e.target.value)} />
      </div>
      <button className="btn btn-primary" onClick={onApply} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        {loading ? 'Loading…' : 'Apply'}
      </button>
    </div>
  )

  // ── Book entries table (reused for cash/bank book) ─────────
  const BookTable = ({ data, loading, columns }) => {
    if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
    if (!data) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Select date range and click Apply.</div>
    const entries = data.entries || []
    return (
      <>
        <div style={{ display: 'flex', gap: 20, marginBottom: 12, padding: '10px 14px',
          background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Total In</div>
            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>₹{(data.totalIn || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Total Out</div>
            <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 16 }}>₹{(data.totalOut || 0).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Closing Balance</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: (data.closingBalance || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              ₹{Math.abs(data.closingBalance || 0).toLocaleString()} {(data.closingBalance || 0) >= 0 ? 'Dr' : 'Cr'}
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Type</th>
                {columns.includes('mode') && <th>Mode</th>}
                <th>Description</th>
                {columns.includes('ref') && <th>Ref</th>}
                <th>Debit (Dr.)</th><th>Credit (Cr.)</th><th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No entries for this period.
                </td></tr>
              )}
              {entries.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12 }}>{fmtDate(e.date)}</td>
                  <td><span className={`badge ${e.type === 'Receipt' || e.type === 'Credit' ? 'badge-green' : e.type === 'Expense' ? 'badge-orange' : 'badge-red'}`} style={{ fontSize: 10 }}>{e.type}</span></td>
                  {columns.includes('mode') && <td style={{ fontSize: 12 }}>{e.mode || '—'}</td>}
                  <td style={{ fontSize: 12, maxWidth: 240 }}>{e.description}</td>
                  {columns.includes('ref') && <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{e.ref || '—'}</td>}
                  <td style={{ color: 'var(--success)', fontWeight: e.debit > 0 ? 600 : 400 }}>{e.debit > 0 ? `₹${e.debit.toLocaleString()}` : '—'}</td>
                  <td style={{ color: 'var(--danger)', fontWeight: e.credit > 0 ? 600 : 400 }}>{e.credit > 0 ? `₹${e.credit.toLocaleString()}` : '—'}</td>
                  <td style={{ fontWeight: 700, color: e.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ₹{Math.abs(e.balance).toLocaleString()} {e.balance >= 0 ? 'Dr' : 'Cr'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  const gstRows = [
    { desc: 'GST Collected on Sales (Output Tax)',  amount: totalGSTCollected, type: 'credit' },
    { desc: 'GST Paid on Purchases (Input Tax)',     amount: -totalGSTPaid,     type: 'debit'  },
    { desc: 'Net GST Payable to Government',         amount: gstPayable,        type: 'net', bold: true },
  ]

  return (
    <>
      <div className="breadcrumb">
        <span>Finance</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Accounts Module</span>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Sales (incl. GST)', val: `₹${totalSalesInvoiced.toLocaleString()}`,  color: 'blue',   icon: <TrendingUp />    },
          { label: 'Total Purchase',          val: `₹${totalPurchased.toLocaleString()}`,       color: 'red',    icon: <TrendingDown />  },
          { label: 'Outstanding Receivable',  val: `₹${totalOutstandingRcv.toLocaleString()}`, color: 'orange', icon: <ArrowUpRight />  },
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '16px 20px', marginBottom: 16 }}>
        {[
          { label: 'Cash/Bank Received',  val: `₹${totalReceived.toLocaleString()}`,         color: 'var(--success)' },
          { label: 'Cash/Bank Paid Out',  val: `₹${totalPaid.toLocaleString()}`,              color: 'var(--danger)'  },
          { label: 'Net Cash Position',   val: `₹${netCash.toLocaleString()}`,                color: netCash >= 0 ? 'var(--success)' : 'var(--danger)', bold: true },
          { label: 'GST Payable (Net)',   val: `₹${gstPayable.toLocaleString()}`,             color: 'var(--warning)' },
        ].map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontWeight: item.bold ? 800 : 700, fontSize: item.bold ? 20 : 16, color: item.color }}>{item.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          ['ledger',    'General Ledger'],
          ['cashbook',  'Cash Book'],
          ['bankbook',  'Bank Book'],
          ['custledger','Customer Ledger'],
          ['suppledger','Supplier Ledger'],
          ['gst',       'GST Summary'],
          ['balance',   'Trial Balance'],
        ].map(([k, l]) => (
          <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── General Ledger ── */}
      {tab === 'ledger' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">General Ledger (Auto-generated)</span>
            <span className="badge badge-blue">Live from props</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Type</th><th>Ref</th><th>Party</th><th>Narration</th><th>Debit (Dr.)</th><th>Credit (Cr.)</th><th>Balance</th></tr>
              </thead>
              <tbody>
                {ledgerWithBalance.map((entry, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{entry.date}</td>
                    <td>
                      <span className={`badge ${entry.type === 'Sales' ? 'badge-green' : entry.type === 'Purchase' ? 'badge-red' : entry.type === 'Receipt' ? 'badge-cyan' : 'badge-orange'}`} style={{ fontSize: 10 }}>{entry.type}</span>
                    </td>
                    <td style={{ color: 'var(--primary)', fontSize: 12, fontFamily: 'monospace' }}>{entry.ref}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{entry.party}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{entry.narration}</td>
                    <td style={{ color: 'var(--danger)', fontWeight: entry.debit > 0 ? 600 : 400 }}>{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '—'}</td>
                    <td style={{ color: 'var(--success)', fontWeight: entry.credit > 0 ? 600 : 400 }}>{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '—'}</td>
                    <td style={{ fontWeight: 700, color: entry.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      ₹{Math.abs(entry.balance).toLocaleString()} {entry.balance >= 0 ? 'Cr' : 'Dr'}
                    </td>
                  </tr>
                ))}
                {ledgerWithBalance.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Ledger entries appear as you add purchases, complete sales, and record payments.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Cash Book ── */}
      {tab === 'cashbook' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Cash Book</span>
            <span className="badge badge-green">Live from API</span>
          </div>
          <div className="card-body">
            <DateFilter from={cashFromDate} setFrom={setCashFromDate} to={cashToDate} setTo={setCashToDate} loading={cashLoading} onApply={fetchCashBook} />
            <BookTable data={cashBook} loading={cashLoading} columns={['description']} />
          </div>
        </div>
      )}

      {/* ── Bank Book ── */}
      {tab === 'bankbook' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Bank Book</span>
            <span className="badge badge-blue">Live from API</span>
          </div>
          <div className="card-body">
            <DateFilter from={bankFromDate} setFrom={setBankFromDate} to={bankToDate} setTo={setBankToDate} loading={bankLoading} onApply={fetchBankBook} />
            <BookTable data={bankBook} loading={bankLoading} columns={['mode', 'ref']} />
          </div>
        </div>
      )}

      {/* ── Customer Ledger ── */}
      {tab === 'custledger' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Customer Ledger</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Customer ID</label>
                <input className="form-control" style={{ width: 280 }} placeholder="Paste customer _id here"
                  value={custId} onChange={e => setCustId(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={fetchCustLedger} disabled={custLoading} style={{ gap: 6 }}>
                <RefreshCw size={13} style={{ animation: custLoading ? 'spin 1s linear infinite' : 'none' }} />
                {custLoading ? 'Loading…' : 'Load Ledger'}
              </button>
            </div>
            {custError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{custError}</div>}
            {custLedger && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  {custLedger.customer?.name} — Closing Balance:&nbsp;
                  <span style={{ color: custLedger.closingBalance >= 0 ? 'var(--danger)' : 'var(--success)' }}>
                    ₹{Math.abs(custLedger.closingBalance || 0).toLocaleString()} {custLedger.closingBalance >= 0 ? 'Dr' : 'Cr'}
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                    <tbody>
                      {(custLedger.ledger || []).map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12 }}>{fmtDate(row.date)}</td>
                          <td><span className={`badge ${row.type === 'Sale' ? 'badge-red' : 'badge-green'}`} style={{ fontSize: 10 }}>{row.type}</span></td>
                          <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{row.sale_code || row.txn_code || '—'}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: row.debit > 0 ? 600 : 400 }}>{row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '—'}</td>
                          <td style={{ color: 'var(--success)', fontWeight: row.credit > 0 ? 600 : 400 }}>{row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '—'}</td>
                          <td style={{ fontWeight: 700, color: row.balance >= 0 ? 'var(--danger)' : 'var(--success)' }}>₹{Math.abs(row.balance).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Supplier Ledger ── */}
      {tab === 'suppledger' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Supplier Ledger</span></div>
          <div className="card-body">
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Supplier ID</label>
                <input className="form-control" style={{ width: 280 }} placeholder="Paste supplier _id here"
                  value={suppId} onChange={e => setSuppId(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={fetchSuppLedger} disabled={suppLoading} style={{ gap: 6 }}>
                <RefreshCw size={13} style={{ animation: suppLoading ? 'spin 1s linear infinite' : 'none' }} />
                {suppLoading ? 'Loading…' : 'Load Ledger'}
              </button>
            </div>
            {suppError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{suppError}</div>}
            {suppLedger && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  {suppLedger.supplier?.name} — Closing Balance:&nbsp;
                  <span style={{ color: suppLedger.closingBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ₹{Math.abs(suppLedger.closingBalance || 0).toLocaleString()} {suppLedger.closingBalance >= 0 ? 'Cr' : 'Dr'}
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                    <tbody>
                      {(suppLedger.ledger || []).map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12 }}>{fmtDate(row.date)}</td>
                          <td><span className={`badge ${row.type === 'Purchase' ? 'badge-red' : 'badge-green'}`} style={{ fontSize: 10 }}>{row.type}</span></td>
                          <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{row.purchase_code || row.txn_code || '—'}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: row.debit > 0 ? 600 : 400 }}>{row.debit > 0 ? `₹${row.debit.toLocaleString()}` : '—'}</td>
                          <td style={{ color: 'var(--success)', fontWeight: row.credit > 0 ? 600 : 400 }}>{row.credit > 0 ? `₹${row.credit.toLocaleString()}` : '—'}</td>
                          <td style={{ fontWeight: 700 }}>₹{Math.abs(row.balance).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', fontWeight: row.bold ? 700 : 400, color: row.type === 'net' ? 'var(--warning)' : 'var(--text)' }}>{row.desc}</td>
                      <td style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: row.bold ? 700 : 400, color: row.type === 'credit' ? 'var(--danger)' : row.type === 'debit' ? 'var(--success)' : 'var(--warning)' }}>
                        {row.amount < 0 ? `− ₹${Math.abs(row.amount).toLocaleString()}` : `₹${row.amount.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
