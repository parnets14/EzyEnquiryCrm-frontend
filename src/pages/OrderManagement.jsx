import { useState, useCallback } from 'react'
import {
  Search, Eye, Truck, Package, CheckCircle, ClipboardList, Settings,
  Layers, Send, ShieldCheck, XCircle, Clock, FileText, Box, AlertCircle,
  History, ArrowRight, ChevronRight,
} from 'lucide-react'

// ── SOW full status workflow ──────────────────────────────────
const ALL_STATUSES = [
  'New', 'Pending Approval', 'Approved',
  'Picking Started', 'Picking Completed',
  'Sorting Started', 'Sorting Completed',
  'Packing Started', 'Packing Completed',
  'Invoice Generated', 'Ready for Dispatch',
  'Dispatched', 'In Transit', 'Delivered', 'Cancelled',
]

// Valid next transitions (mirrors backend VALID_TRANSITIONS)
const NEXT_STATUS = {
  'New':               ['Pending Approval', 'Cancelled'],
  'Pending Approval':  ['Approved', 'Cancelled'],
  'Approved':          ['Picking Started', 'Cancelled'],
  'Picking Started':   ['Picking Completed', 'Cancelled'],
  'Picking Completed': ['Sorting Started'],
  'Sorting Started':   ['Sorting Completed'],
  'Sorting Completed': ['Packing Started'],
  'Packing Started':   ['Packing Completed'],
  'Packing Completed': ['Invoice Generated'],
  'Invoice Generated': ['Ready for Dispatch'],
  'Ready for Dispatch':['Dispatched'],
  'Dispatched':        ['In Transit'],
  'In Transit':        ['Delivered'],
  'Delivered':         [],
  'Cancelled':         [],
}

// Status → badge colour
const STATUS_COLOR = {
  'New':               'badge-blue',
  'Pending Approval':  'badge-cyan',
  'Approved':          'badge-green',
  'Picking Started':   'badge-yellow',
  'Picking Completed': 'badge-yellow',
  'Sorting Started':   'badge-orange',
  'Sorting Completed': 'badge-orange',
  'Packing Started':   'badge-purple',
  'Packing Completed': 'badge-purple',
  'Invoice Generated': 'badge-blue',
  'Ready for Dispatch':'badge-cyan',
  'Dispatched':        'badge-purple',
  'In Transit':        'badge-yellow',
  'Delivered':         'badge-green',
  'Cancelled':         'badge-red',
}

// Summary stat cards (key pipeline stages)
const STAT_CARDS = [
  { s: 'New',               bg:'#EFF6FF', iconBg:'#DBEAFE', ic:'#2563EB', tc:'#1D4ED8', bc:'#BFDBFE', Icon: ClipboardList },
  { s: 'Approved',          bg:'#F0FDF4', iconBg:'#D1FAE5', ic:'#059669', tc:'#047857', bc:'#A7F3D0', Icon: CheckCircle   },
  { s: 'Packing Completed', bg:'#F5F3FF', iconBg:'#EDE9FE', ic:'#7C3AED', tc:'#6D28D9', bc:'#DDD6FE', Icon: Box           },
  { s: 'Invoice Generated', bg:'#FFF7ED', iconBg:'#FFEDD5', ic:'#EA580C', tc:'#C2410C', bc:'#FED7AA', Icon: FileText      },
  { s: 'Ready for Dispatch',bg:'#FFFBEB', iconBg:'#FEF3C7', ic:'#D97706', tc:'#B45309', bc:'#FDE68A', Icon: Layers        },
  { s: 'Dispatched',        bg:'#F5F3FF', iconBg:'#EDE9FE', ic:'#7C3AED', tc:'#6D28D9', bc:'#DDD6FE', Icon: Send          },
  { s: 'Delivered',         bg:'#ECFDF5', iconBg:'#D1FAE5', ic:'#059669', tc:'#047857', bc:'#A7F3D0', Icon: ShieldCheck   },
  { s: 'Cancelled',         bg:'#FEF2F2', iconBg:'#FEE2E2', ic:'#DC2626', tc:'#B91C1C', bc:'#FECACA', Icon: XCircle       },
]

// ── Field helpers ─────────────────────────────────────────────
const ordId       = o => o._id           || o.id            || ''
const ordCode     = o => o.order_code    || o.id            || ''
const ordCustomer = o => o.customer_name || o.customer      || ''
const ordProduct  = o => o.product_name  || o.product       || ''
const ordTotal    = o => o.total_amount  || o.total         || 0
const ordAmount   = o => o.amount        || 0
const ordGst      = o => o.gst_amount    || o.gst           || 0
const ordDate     = o => {
  const d = o.order_date || o.created_at
  return d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : ''
}
const ordEnqCode  = o => o.enquiry_code  || ''
const fmtDate     = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

export default function OrderManagement({
  branches = [], orders = [], inventory = [],
  updateOrderStatus, createDispatch, markDelivered, markInTransit,
}) {
  const branchNames = branches.map(b => b.name || b).filter(Boolean)

  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [branchFilter, setBranchFilter] = useState('All')
  const [selected,     setSelected]     = useState(null)   // order detail
  const [showHistory,  setShowHistory]  = useState(false)
  const [dispatchForm, setDispatchForm] = useState(null)   // dispatch form order
  const [successMsg,   setSuccessMsg]   = useState('')
  const [errorMsg,     setErrorMsg]     = useState('')
  const [busyId,       setBusyId]       = useState(null)

  // Status confirm modal
  const [confirmModal, setConfirmModal] = useState(null)   // {orderId, from, to}
  const [remarks,      setRemarks]      = useState('')

  // Dispatch form fields
  const [dForm, setDForm] = useState({
    vehicle:'', driver:'', driverMobile:'', transport:'',
    lr:'', dispatchDate:'', expectedDelivery:'', expectedDays:'', branch:'',
  })

  // ── Filtered orders ───────────────────────────────────────
  const filtered = orders.filter(o =>
    (statusFilter === 'All' || o.status === statusFilter) &&
    (branchFilter === 'All' || (o.branch_name || '') === branchFilter) &&
    (
      ordCustomer(o).toLowerCase().includes(search.toLowerCase()) ||
      ordCode(o).toLowerCase().includes(search.toLowerCase()) ||
      ordProduct(o).toLowerCase().includes(search.toLowerCase()) ||
      ordEnqCode(o).toLowerCase().includes(search.toLowerCase()) ||
      (o.branch_name || '').toLowerCase().includes(search.toLowerCase())
    )
  )

  const toast = (msg, err = false) => {
    if (err) { setErrorMsg(msg);   setTimeout(() => setErrorMsg(''),   5000) }
    else     { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000) }
  }

  // ── Single status update ──────────────────────────────────
  const doStatusUpdate = useCallback(async (orderId, newStatus, rem = '') => {
    setBusyId(orderId)
    const res = await updateOrderStatus?.(orderId, { status: newStatus, remarks: rem })
    setBusyId(null)
    if (res?.success === false) { toast(res.message || `Cannot move to ${newStatus}`, true); return false }
    toast(`✓ Status → ${newStatus}`)
    if (selected && ordId(selected) === orderId) {
      setSelected(prev => ({ ...prev, ...res?.data, status: newStatus }))
    }
    return true
  }, [updateOrderStatus, selected])

  const openConfirm = (o, nextStatus) => {
    setConfirmModal({ orderId: ordId(o), from: o.status, to: nextStatus })
    setRemarks('')
  }

  const submitConfirm = async () => {
    if (!confirmModal) return
    const ok = await doStatusUpdate(confirmModal.orderId, confirmModal.to, remarks)
    if (ok) setConfirmModal(null)
  }

  // ── Dispatch submit ───────────────────────────────────────
  const handleDispatch = () => {
    if (!dForm.vehicle || !dForm.driver || !dForm.transport || !dForm.lr || !dForm.dispatchDate) {
      toast('Please fill Vehicle, Driver, Transport Company, LR Number and Dispatch Date', true)
      return
    }
    let expDelivery = dForm.expectedDelivery
    if (dForm.expectedDays && dForm.dispatchDate && !expDelivery) {
      const d = new Date(dForm.dispatchDate)
      d.setDate(d.getDate() + parseInt(dForm.expectedDays))
      expDelivery = d.toISOString().split('T')[0]
    }
    createDispatch?.({
      order_id:               ordId(dispatchForm),
      customer_name:          ordCustomer(dispatchForm),
      branch_name:            dForm.branch || dispatchForm.branch_name || '',
      vehicle_number:         dForm.vehicle,
      driver_name:            dForm.driver,
      driver_mobile:          dForm.driverMobile,
      transport_name:         dForm.transport,
      lr_number:              dForm.lr,
      dispatch_date:          dForm.dispatchDate,
      expected_delivery_days: dForm.expectedDays ? parseInt(dForm.expectedDays) : null,
      expected_delivery:      expDelivery || null,
    }).then(res => {
      if (res?.success === false) { toast(res.message || 'Dispatch failed', true); return }
      toast(`✓ Dispatched! LR: ${dForm.lr}`)
      setDispatchForm(null)
      setDForm({ vehicle:'', driver:'', driverMobile:'', transport:'', lr:'', dispatchDate:'', expectedDelivery:'', expectedDays:'', branch:'' })
    })
  }

  // ── Stock lookup ──────────────────────────────────────────
  const getStock = pid => {
    if (!pid) return 0
    const inv = inventory.find(i => (i.product_id?._id || i.product_id) === pid)
    return inv ? (inv.current_stock ?? 0) : 0
  }

  // ── Action buttons per order row ──────────────────────────
  const ActionButtons = ({ o }) => {
    const oid  = ordId(o)
    const busy = busyId === oid

    return (
      <div className="table-actions">
        {/* View */}
        <button className="btn btn-ghost btn-xs" onClick={() => { setSelected(o); setShowHistory(false) }}>
          <Eye style={{ width: 13 }} />
        </button>

        {/* New → Pending Approval */}
        {o.status === 'New' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => openConfirm(o, 'Pending Approval')}>
            <Clock style={{ width: 12 }} />{busy ? '…' : 'Submit'}
          </button>
        )}

        {/* Pending Approval → Approved */}
        {o.status === 'Pending Approval' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => openConfirm(o, 'Approved')}>
            <CheckCircle style={{ width: 12 }} />{busy ? '…' : 'Approve'}
          </button>
        )}

        {/* Approved → Picking Started */}
        {o.status === 'Approved' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => doStatusUpdate(oid, 'Picking Started', 'Picking started')}>
            <Package style={{ width: 12 }} />{busy ? '…' : 'Pick'}
          </button>
        )}

        {/* Picking Started → Picking Completed */}
        {o.status === 'Picking Started' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => doStatusUpdate(oid, 'Picking Completed', 'Picking done')}>
            <CheckCircle style={{ width: 12 }} />{busy ? '…' : 'Done Pick'}
          </button>
        )}

        {/* Picking Completed → Sorting Started */}
        {o.status === 'Picking Completed' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => doStatusUpdate(oid, 'Sorting Started', 'Sorting started')}>
            <Settings style={{ width: 12 }} />{busy ? '…' : 'Sort'}
          </button>
        )}

        {/* Sorting Started → Sorting Completed */}
        {o.status === 'Sorting Started' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => doStatusUpdate(oid, 'Sorting Completed', 'Sorting done')}>
            <CheckCircle style={{ width: 12 }} />{busy ? '…' : 'Done Sort'}
          </button>
        )}

        {/* Sorting Completed → Packing Started */}
        {o.status === 'Sorting Completed' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => doStatusUpdate(oid, 'Packing Started', 'Packing started')}>
            <Box style={{ width: 12 }} />{busy ? '…' : 'Pack'}
          </button>
        )}

        {/* Packing Started → Packing Completed */}
        {o.status === 'Packing Started' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => doStatusUpdate(oid, 'Packing Completed', 'Packing done')}>
            <CheckCircle style={{ width: 12 }} />{busy ? '…' : 'Done Pack'}
          </button>
        )}

        {/* Packing Completed → Invoice Generated (auto invoice number) */}
        {o.status === 'Packing Completed' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => doStatusUpdate(oid, 'Invoice Generated', 'Invoice generated')}>
            <FileText style={{ width: 12 }} />{busy ? '…' : 'Invoice'}
          </button>
        )}

        {/* Invoice Generated → Ready for Dispatch */}
        {o.status === 'Invoice Generated' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => doStatusUpdate(oid, 'Ready for Dispatch', 'Ready for dispatch')}>
            <Layers style={{ width: 12 }} />{busy ? '…' : 'Ready'}
          </button>
        )}

        {/* Ready for Dispatch → open dispatch form */}
        {o.status === 'Ready for Dispatch' && (
          <button className="btn btn-primary btn-xs" onClick={() => { setDispatchForm(o); setDForm(f => ({ ...f, branch: o.branch_name || '' })) }}>
            <Truck style={{ width: 12 }} />Dispatch
          </button>
        )}

        {/* Dispatched → In Transit */}
        {o.status === 'Dispatched' && (
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => {
            if (o.dispatch_id) markInTransit?.(o.dispatch_id?._id || o.dispatch_id)
            else doStatusUpdate(oid, 'In Transit', 'In transit')
          }}>
            <Send style={{ width: 12 }} />{busy ? '…' : 'In Transit'}
          </button>
        )}

        {/* In Transit → Delivered */}
        {o.status === 'In Transit' && (
          <button className="btn btn-primary btn-xs" style={{ background:'var(--success)' }} disabled={busy} onClick={() => {
            if (o.dispatch_id) markDelivered?.(o.dispatch_id?._id || o.dispatch_id)
            else doStatusUpdate(oid, 'Delivered', 'Delivered')
          }}>
            <ShieldCheck style={{ width: 12 }} />{busy ? '…' : 'Delivered'}
          </button>
        )}

        {o.status === 'Delivered' && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Done</span>}
        {o.status === 'Cancelled' && <span className="badge badge-red"   style={{ fontSize: 10 }}>Cancelled</span>}
      </div>
    )
  }

  // ── Status history timeline ───────────────────────────────
  const StatusHistory = ({ history = [] }) => {
    if (!history.length) return (
      <div style={{ color:'var(--text-muted)', fontSize:12, padding:'8px 0' }}>
        No history available. Status updates will appear here.
      </div>
    )
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        {[...history].reverse().map((h, i) => (
          <div key={i} style={{ display:'flex', gap:10, paddingBottom:12, position:'relative' }}>
            {i < history.length - 1 && (
              <div style={{ position:'absolute', left:7, top:18, bottom:0, width:2, background:'var(--border)' }} />
            )}
            <div style={{
              width:16, height:16, borderRadius:'50%', flexShrink:0, marginTop:2,
              background: h.status==='Delivered' ? 'var(--success)' : h.status==='Cancelled' ? 'var(--danger)' : 'var(--primary)',
            }} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:12 }}>{h.status}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
                {h.updated_by_name && <span>{h.updated_by_name} </span>}
                {h.timestamp && <span>{new Date(h.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
              </div>
              {h.remarks && (
                <div style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', marginTop:1 }}>{h.remarks}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <div className="breadcrumb">
        <span>Marketplace</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Order Management</span>
      </div>

      <div className="page-header" style={{ marginBottom: 16 }}>
        <div className="page-header-left">
          <div className="page-title">Order Management</div>
          <div className="page-desc">Full pipeline: New → Pending Approval → Approved → Warehouse → Invoice → Dispatch → Delivery</div>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <CheckCircle style={{ color:'var(--success)', width:18, flexShrink:0 }} />
          <span style={{ fontWeight:600 }}>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-danger" style={{ marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <AlertCircle style={{ color:'var(--danger)', width:18, flexShrink:0 }} />
          <span style={{ fontWeight:600 }}>{errorMsg}</span>
        </div>
      )}

      {/* ── Summary Stat Cards ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:10, marginBottom:18 }}>
        {STAT_CARDS.map(({ s, bg, iconBg, ic, tc, bc, Icon }) => {
          const count  = orders.filter(o => o.status === s).length
          const active = statusFilter === s
          return (
            <div key={s} onClick={() => setStatusFilter(active ? 'All' : s)}
              style={{
                background:   active ? iconBg : bg,
                border:       `1.5px solid ${active ? ic : bc}`,
                borderRadius: 10, padding:'10px 12px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:8,
                boxShadow: active ? `0 0 0 3px ${bc}` : 'var(--shadow)',
                transition:'all 0.15s',
              }}
            >
              <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:iconBg, border:`1px solid ${bc}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon style={{ width:14, height:14, color:ic }} />
              </div>
              <div>
                <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.3px', color:tc, marginBottom:1, lineHeight:1.2 }}>{s}</div>
                <div style={{ fontSize:18, fontWeight:800, color:tc, lineHeight:1 }}>{count}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Orders Table ───────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Orders ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar">
              <Search />
              <input
                placeholder="Search order, customer, product, enquiry, branch…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {branchNames.length > 0 && (
              <select className="form-control" style={{ width:150 }} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                <option value="All">All Branches</option>
                {branchNames.map(b => <option key={b}>{b}</option>)}
              </select>
            )}
            <select className="form-control" style={{ width:170 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Enq. Ref</th>
                <th>Branch</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Total ₹</th>
                <th>Invoice No.</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={ordId(o)}>
                  <td style={{ color:'var(--primary)', fontWeight:700, whiteSpace:'nowrap' }}>{ordCode(o)}</td>

                  <td style={{ fontSize:11 }}>
                    {ordEnqCode(o)
                      ? <span style={{ color:'var(--primary)', fontWeight:600 }}>{ordEnqCode(o)}</span>
                      : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>

                  <td style={{ fontSize:12 }}>
                    {o.branch_name
                      ? <span className="badge badge-blue">{o.branch_name}</span>
                      : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>

                  <td>
                    <div className="user-name">{ordCustomer(o)}</div>
                    <div className="user-role">{o.delivery_address || o.location}</div>
                  </td>

                  <td style={{ fontSize:12, maxWidth:160 }}>{ordProduct(o)}</td>

                  <td style={{ fontWeight:600, whiteSpace:'nowrap' }}>{o.qty} {o.unit || 'Pcs'}</td>

                  <td style={{ fontWeight:700, color:'var(--success)', whiteSpace:'nowrap' }}>
                    ₹{ordTotal(o).toLocaleString()}
                  </td>

                  <td style={{ fontSize:11 }}>
                    {o.invoice_number
                      ? <span style={{ fontFamily:'monospace', fontWeight:700, color:'var(--primary)' }}>{o.invoice_number}</span>
                      : <span style={{ color:'var(--text-muted)' }}>—</span>}
                  </td>

                  <td style={{ fontSize:11, whiteSpace:'nowrap' }}>{ordDate(o)}</td>

                  <td>
                    <span className={`badge ${STATUS_COLOR[o.status] || 'badge-gray'}`} style={{ fontSize:10, whiteSpace:'nowrap' }}>
                      {o.status}
                    </span>
                  </td>

                  <td><ActionButtons o={o} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>
                  No orders found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ORDER DETAIL MODAL
      ══════════════════════════════════════════════════════ */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth:640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span className="modal-title">{ordCode(selected)}</span>
                <span className={`badge ${STATUS_COLOR[selected.status] || 'badge-gray'}`}>{selected.status}</span>
                {selected.invoice_number && (
                  <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:12, color:'var(--primary)', background:'var(--bg)', padding:'2px 8px', borderRadius:6 }}>
                    {selected.invoice_number}
                  </span>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button
                  className={`btn btn-xs ${showHistory ? 'btn-primary' : 'btn-ghost'}`}
                  title="Status History"
                  onClick={() => setShowHistory(h => !h)}
                >
                  <History style={{ width:13 }} />History
                </button>
                <button className="btn-ghost" onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>

            <div className="modal-body">
              {/* ── Pipeline progress bar ── */}
              <div style={{ overflowX:'auto', marginBottom:16, paddingBottom:4 }}>
                <div style={{ display:'flex', alignItems:'center', gap:2, minWidth:'max-content' }}>
                  {ALL_STATUSES.filter(s => s !== 'Cancelled').map((s, i, arr) => {
                    const curIdx  = ALL_STATUSES.indexOf(selected.status)
                    const sIdx    = ALL_STATUSES.indexOf(s)
                    const isDone  = sIdx < curIdx
                    const isNow   = s === selected.status
                    return (
                      <span key={s} style={{ display:'flex', alignItems:'center', gap:2 }}>
                        <span style={{
                          padding:'3px 8px', borderRadius:20, fontSize:10, fontWeight:600, whiteSpace:'nowrap',
                          background: isNow ? 'var(--primary)' : isDone ? '#d1fae5' : 'var(--bg)',
                          color:      isNow ? '#fff'           : isDone ? 'var(--success)' : 'var(--text-muted)',
                          border:     isNow ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                        }}>{s}</span>
                        {i < arr.length - 1 && <ChevronRight style={{ width:10, color:'var(--border)', flexShrink:0 }} />}
                      </span>
                    )
                  })}
                </div>
              </div>

              {showHistory ? (
                <StatusHistory history={selected.status_history || []} />
              ) : (
                <>
                  {/* Enquiry ref */}
                  {ordEnqCode(selected) && (
                    <div style={{ marginBottom:10, fontSize:12 }}>
                      <span style={{ color:'var(--text-muted)' }}>Enquiry: </span>
                      <strong style={{ color:'var(--primary)' }}>{ordEnqCode(selected)}</strong>
                    </div>
                  )}

                  {/* Customer + Address */}
                  <div className="form-row" style={{ marginBottom:0 }}>
                    <div>
                      <div className="form-label">Customer</div>
                      <p style={{ fontWeight:700, margin:0 }}>{ordCustomer(selected)}</p>
                      {selected.customer_mobile && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{selected.customer_mobile}</div>}
                    </div>
                    <div>
                      <div className="form-label">Delivery Address</div>
                      <p style={{ margin:0 }}>{selected.delivery_address || selected.location || '—'}</p>
                    </div>
                  </div>

                  {/* Branch */}
                  {selected.branch_name && (
                    <div style={{ marginTop:8 }}>
                      <div className="form-label">Branch</div>
                      <span className="badge badge-blue" style={{ fontSize:12 }}>{selected.branch_name}</span>
                    </div>
                  )}

                  {/* Product + Qty */}
                  <div className="form-row" style={{ marginBottom:0, marginTop:12 }}>
                    <div>
                      <div className="form-label">Product</div>
                      <p style={{ fontWeight:600, margin:0 }}>{ordProduct(selected)}</p>
                      {selected.product_code && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{selected.product_code}</div>}
                    </div>
                    <div>
                      <div className="form-label">Quantity</div>
                      <p style={{ fontWeight:700, margin:0 }}>{selected.qty} {selected.unit || 'Pcs'}</p>
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Financials */}
                  <div style={{ background:'var(--bg)', borderRadius:10, padding:'14px 16px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      {[
                        { label:`Rate / ${selected.unit||'Pcs'}`, val:`₹${(selected.rate||0).toLocaleString()}`,        color:'var(--text)'    },
                        { label:'Amount',          val:`₹${ordAmount(selected).toLocaleString()}`,                      color:'var(--text)'    },
                        { label:`GST (${selected.gst_percent||18}%)`, val:`₹${ordGst(selected).toLocaleString()}`,      color:'var(--text-muted)'},
                        { label:'Grand Total',     val:`₹${ordTotal(selected).toLocaleString()}`,                       color:'var(--success)', bold:true },
                        { label:'Purchase Cost',   val:`₹${(selected.purchase_cost||0).toLocaleString()}`,              color:'var(--danger)'  },
                        { label:'Gross Profit',    val:`₹${(ordAmount(selected)-(selected.purchase_cost||0)).toLocaleString()}`, color:'var(--primary)', bold:true },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="form-label" style={{ marginBottom:2 }}>{item.label}</div>
                          <div style={{ fontWeight:item.bold?700:500, color:item.color, fontSize:item.bold?15:13 }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Invoice */}
                  {selected.invoice_number && (
                    <div style={{ marginTop:12, padding:'10px 14px', background:'#eff6ff', borderRadius:8, border:'1px solid #bfdbfe', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase' }}>Invoice Number</div>
                        <div style={{ fontFamily:'monospace', fontWeight:700, fontSize:15 }}>{selected.invoice_number}</div>
                      </div>
                      {selected.invoice_date && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{fmtDate(selected.invoice_date)}</div>}
                    </div>
                  )}

                  {/* Dispatch info */}
                  {['Dispatched','In Transit','Delivered'].includes(selected.status) && selected.dispatch_id && (
                    <div style={{ marginTop:10, padding:'10px 14px', background:'#f5f3ff', borderRadius:8, border:'1px solid #ddd6fe', fontSize:12 }}>
                      <div style={{ fontWeight:700, color:'#6d28d9', marginBottom:4, fontSize:10, textTransform:'uppercase' }}>Dispatch</div>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                        {selected.dispatch_id?.dispatch_code  && <span>Code: <strong>{selected.dispatch_id.dispatch_code}</strong></span>}
                        {selected.dispatch_id?.lr_number      && <span>LR: <strong style={{ fontFamily:'monospace' }}>{selected.dispatch_id.lr_number}</strong></span>}
                        {selected.dispatch_id?.transport_name && <span>Transport: <strong>{selected.dispatch_id.transport_name}</strong></span>}
                        {selected.dispatch_id?.driver_name    && <span>Driver: <strong>{selected.dispatch_id.driver_name}</strong></span>}
                      </div>
                    </div>
                  )}

                  {/* Stock */}
                  <div className="divider" />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'var(--text-muted)' }}>Current Stock</span>
                    <span style={{ fontWeight:700, color:'var(--primary)' }}>
                      {getStock(selected.product_id)} {selected.unit || 'Pcs'}
                    </span>
                  </div>

                  {/* Next status quick actions */}
                  {(() => {
                    const nextList = NEXT_STATUS[selected.status] || []
                    if (!nextList.length) return null
                    return (
                      <div style={{ marginTop:14 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                          Move to Next Status
                        </div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {nextList.map(ns => (
                            <button
                              key={ns}
                              className={`btn btn-sm ${ns === 'Cancelled' ? 'btn-danger' : 'btn-primary'}`}
                              style={ns === 'Delivered' ? { background:'var(--success)' } : {}}
                              disabled={busyId === ordId(selected)}
                              onClick={() => openConfirm(selected, ns)}
                            >
                              <ArrowRight style={{ width:12 }} />{ns}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STATUS CONFIRM MODAL
      ══════════════════════════════════════════════════════ */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Confirm Status Update</span>
              <button className="btn-ghost" onClick={() => setConfirmModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg)', borderRadius:8, marginBottom:14 }}>
                <span className={`badge ${STATUS_COLOR[confirmModal.from] || 'badge-gray'}`}>{confirmModal.from}</span>
                <ArrowRight style={{ width:14, color:'var(--text-muted)', flexShrink:0 }} />
                <span className={`badge ${STATUS_COLOR[confirmModal.to] || 'badge-gray'}`}>{confirmModal.to}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Add notes for this status change…"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button
                className={`btn ${confirmModal.to === 'Cancelled' ? 'btn-danger' : 'btn-primary'}`}
                disabled={!!busyId}
                onClick={submitConfirm}
              >
                {busyId ? '…' : `Confirm → ${confirmModal.to}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          DISPATCH FORM MODAL
      ══════════════════════════════════════════════════════ */}
      {dispatchForm && (
        <div className="modal-overlay" onClick={() => setDispatchForm(null)}>
          <div className="modal" style={{ maxWidth:580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Dispatch — {ordCode(dispatchForm)}</span>
              <button className="btn-ghost" onClick={() => setDispatchForm(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Order summary */}
              <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13 }}>
                <strong>{ordCustomer(dispatchForm)}</strong> — {ordProduct(dispatchForm)} × {dispatchForm.qty} {dispatchForm.unit || 'Pcs'}
                <br />
                <span style={{ color:'var(--success)', fontWeight:700 }}>₹{ordTotal(dispatchForm).toLocaleString()}</span>
                {dispatchForm.delivery_address && <span style={{ marginLeft:12, color:'var(--text-muted)', fontSize:12 }}>{dispatchForm.delivery_address}</span>}
                {dispatchForm.invoice_number && (
                  <span style={{ marginLeft:12, fontFamily:'monospace', fontWeight:700, color:'var(--primary)', fontSize:12 }}>
                    {dispatchForm.invoice_number}
                  </span>
                )}
              </div>

              {branchNames.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select className="form-control" value={dForm.branch} onChange={e => setDForm(f => ({ ...f, branch:e.target.value }))}>
                    <option value="">Select Branch</option>
                    {branchNames.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vehicle Number *</label>
                  <input className="form-control" placeholder="e.g. KA01AB1234" value={dForm.vehicle}
                    onChange={e => setDForm(f => ({ ...f, vehicle:e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Transport Company *</label>
                  <input className="form-control" placeholder="e.g. VRL Logistics" value={dForm.transport}
                    onChange={e => setDForm(f => ({ ...f, transport:e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Driver Name *</label>
                  <input className="form-control" placeholder="Driver full name" value={dForm.driver}
                    onChange={e => setDForm(f => ({ ...f, driver:e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Mobile</label>
                  <input className="form-control" placeholder="Contact number" value={dForm.driverMobile}
                    onChange={e => setDForm(f => ({ ...f, driverMobile:e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">LR Number *</label>
                  <input className="form-control" placeholder="Lorry Receipt No." value={dForm.lr}
                    onChange={e => setDForm(f => ({ ...f, lr:e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Dispatch Date *</label>
                  <input className="form-control" type="date" value={dForm.dispatchDate}
                    onChange={e => setDForm(f => ({ ...f, dispatchDate:e.target.value }))} />
                </div>
              </div>

              {/* Expected delivery section */}
              <div style={{ background:'var(--bg)', borderRadius:8, padding:'12px 14px', marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                  Expected Delivery Timing
                </div>
                <div className="form-row" style={{ marginBottom:0 }}>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label">Delivery in Days</label>
                    <select className="form-control" value={dForm.expectedDays}
                      onChange={e => {
                        const days = e.target.value
                        let autoDate = ''
                        if (days && dForm.dispatchDate) {
                          const d = new Date(dForm.dispatchDate)
                          d.setDate(d.getDate() + parseInt(days))
                          autoDate = d.toISOString().split('T')[0]
                        }
                        setDForm(f => ({ ...f, expectedDays:days, expectedDelivery:autoDate }))
                      }}
                    >
                      <option value="">Select days</option>
                      {[1,2,3,4,5,6,7,10,14,15,20,21,25,30].map(d => (
                        <option key={d} value={d}>{d} {d===1?'day':'days'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label">Expected Delivery Date</label>
                    <input className="form-control" type="date" value={dForm.expectedDelivery}
                      onChange={e => setDForm(f => ({ ...f, expectedDelivery:e.target.value, expectedDays:'' }))} />
                  </div>
                </div>
                {dForm.expectedDays && dForm.expectedDelivery && (
                  <div style={{ marginTop:6, fontSize:12, color:'var(--warning)', fontWeight:600 }}>
                    📅 Expected: {new Date(dForm.expectedDelivery).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                  </div>
                )}
              </div>

              <div className="alert alert-info" style={{ fontSize:12 }}>
                ℹ️ Dispatching will automatically update the order to "Dispatched".
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDispatchForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDispatch}>
                <Truck style={{ width:14 }} />Dispatch Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
