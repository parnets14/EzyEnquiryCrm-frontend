import { useState } from 'react'
import { Search, Eye, Truck, Package, CheckCircle, ClipboardList, Settings, Layers, Send, ShieldCheck, XCircle } from 'lucide-react'

// API field helpers — backend returns snake_case
const ordId       = o => o._id          || o.id              || ''
const ordCode     = o => o.order_code   || o.id              || ''
const ordCustomer = o => o.customer_name|| o.customer        || ''
const ordMobile   = o => o.customer_mobile || o.mobile       || ''
const ordProduct  = o => o.product_name || o.product         || ''
const ordTotal    = o => o.total_amount || o.total           || 0
const ordAmount   = o => o.amount                            || 0
const ordGst      = o => o.gst_amount   || o.gst             || 0
const ordDate     = o => o.created_at
  ? new Date(o.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
  : (o.date || '')
const ordWarehouse = o => o.warehouse_status || o.warehouseStatus || ''
const ordEnquiryId = o => o.enquiry_id  || o.enquiryId       || null

const STATUS_FLOW  = ['Accepted', 'Processing', 'Ready', 'Dispatched', 'Delivered', 'Cancelled']

const statusColor  = {
  New: 'badge-blue', Accepted: 'badge-cyan', Processing: 'badge-yellow', Ready: 'badge-orange',
  Dispatched: 'badge-purple', Delivered: 'badge-green', Cancelled: 'badge-red',
}

// Per-status card styling: { bg, iconBg, iconColor, textColor, borderColor, icon }
const STATUS_CARD_STYLE = {
  Accepted:   { bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB', textColor: '#1D4ED8', borderColor: '#BFDBFE', Icon: ClipboardList },
  Processing: { bg: '#FFFBEB', iconBg: '#FEF3C7', iconColor: '#D97706', textColor: '#B45309', borderColor: '#FDE68A', Icon: Settings       },
  Ready:      { bg: '#FFF7ED', iconBg: '#FFEDD5', iconColor: '#EA580C', textColor: '#C2410C', borderColor: '#FED7AA', Icon: Layers          },
  Dispatched: { bg: '#F5F3FF', iconBg: '#EDE9FE', iconColor: '#7C3AED', textColor: '#6D28D9', borderColor: '#DDD6FE', Icon: Send            },
  Delivered:  { bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#059669', textColor: '#047857', borderColor: '#A7F3D0', Icon: ShieldCheck      },
  Cancelled:  { bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626', textColor: '#B91C1C', borderColor: '#FECACA', Icon: XCircle         },
}

export default function OrderManagement({
  orders = [], inventory = [],
  startPacking, markReadyForDispatch, createDispatch, markDelivered, setOrders, updateOrderStatus,
}) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected,     setSelected]     = useState(null)
  const [dispatchForm, setDispatchForm] = useState(null) // show dispatch form for this order
  const [successMsg,   setSuccessMsg]   = useState('')

  const [dForm, setDForm] = useState({
    vehicle: '', driver: '', driverMobile: '', transport: '',
    lr: '', dispatchDate: '', expectedDelivery: '',
  })

  const filtered = orders.filter(o =>
    (statusFilter === 'All' || o.status === statusFilter) &&
    (
      ordCustomer(o).toLowerCase().includes(search.toLowerCase()) ||
      ordCode(o).includes(search) ||
      ordProduct(o).toLowerCase().includes(search.toLowerCase())
    )
  )

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000) }

  const handleStartPacking = (orderId) => {
    startPacking?.(orderId)
    toast(`Warehouse packing started for Order ${orderId}`)
    if (ordId(selected) === orderId) setSelected(prev => ({ ...prev, status: 'Processing', warehouse_status: 'Packing' }))
  }

  const handleReadyForDispatch = (orderId) => {
    markReadyForDispatch?.(orderId)
    toast(`Order marked Ready for Dispatch`)
    if (ordId(selected) === orderId) setSelected(prev => ({ ...prev, status: 'Ready', warehouse_status: 'Ready for Dispatch' }))
  }

  const handleDispatch = () => {
    if (!dForm.vehicle || !dForm.driver || !dForm.transport || !dForm.lr || !dForm.dispatchDate) {
      alert('Please fill Vehicle, Driver, Transport Company, LR Number and Dispatch Date')
      return
    }
    createDispatch?.({
      order_id: ordId(dispatchForm),
      customer_name: ordCustomer(dispatchForm),
      vehicle_number: dForm.vehicle,
      driver_name: dForm.driver,
      driver_mobile: dForm.driverMobile,
      transport_name: dForm.transport,
      lr_number: dForm.lr,
      dispatch_date: dForm.dispatchDate,
      expected_delivery: dForm.expectedDelivery,
    }).then(res => {
      if (res?.success !== false) {
        toast(`Order dispatched! LR: ${dForm.lr} — Inventory auto-updated`)
        setDispatchForm(null)
        setDForm({ vehicle: '', driver: '', driverMobile: '', transport: '', lr: '', dispatchDate: '', expectedDelivery: '' })
      }
    })
  }

  const handleMarkDelivered = (orderId) => {
    markDelivered?.(orderId)
    toast(`Order DELIVERED → Sales entry & outstanding created automatically`)
    if (ordId(selected) === orderId) setSelected(prev => ({ ...prev, status: 'Delivered' }))
  }

  // Get live stock for a product
  const getStock = (productId) => {
    const inv = inventory.find(i => (i.product_id?._id || i.product_id || i.productCode) === productId)
    return inv ? (inv.current_stock ?? inv.current ?? 0) : 0
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Business</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Order Management</span>
      </div>

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div className="page-header-left">
          <div className="page-title">Order Management</div>
          <div className="page-desc">Track, pack and dispatch customer orders</div>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle style={{ color: 'var(--success)', width: 18, flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      {/* Status filter cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {STATUS_FLOW.map(s => {
          const style  = STATUS_CARD_STYLE[s] || {}
          const Icon   = style.Icon || Package
          const count  = orders.filter(o => o.status === s).length
          const active = statusFilter === s
          return (
            <div
              key={s}
              onClick={() => setStatusFilter(active ? 'All' : s)}
              style={{
                background:    active ? style.iconBg  : style.bg,
                border:        `1.5px solid ${active ? style.iconColor : style.borderColor}`,
                borderRadius:  10,
                padding:       '13px 14px',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                gap:           10,
                boxShadow:     active ? `0 0 0 3px ${style.borderColor}` : 'var(--shadow)',
                transition:    'all 0.15s',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: style.iconBg,
                border:     `1px solid ${style.borderColor}`,
                display:    'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 16, height: 16, color: style.iconColor }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: style.textColor, marginBottom: 2 }}>{s}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: style.textColor, lineHeight: 1 }}>{count}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Orders ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar">
              <Search />
              <input placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order ID</th><th>Customer</th><th>Product</th><th>Qty</th>
                <th>Rate</th><th>GST</th><th>Total</th><th>Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const oid = ordId(o)
                return (
                  <tr key={oid}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{ordCode(o)}</td>
                    <td>
                      <div className="user-name">{ordCustomer(o)}</div>
                      <div className="user-role">{o.location}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{ordProduct(o)}</td>
                    <td style={{ fontWeight: 600 }}>{o.qty} {o.unit || 'Pcs'}</td>
                    <td>₹{(o.rate || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)' }}>₹{ordGst(o).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{ordTotal(o).toLocaleString()}</td>
                    <td style={{ fontSize: 12 }}>{ordDate(o)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className={`badge ${statusColor[o.status] || 'badge-gray'}`}>{o.status}</span>
                        {ordWarehouse(o) && (
                          <span className="badge badge-blue" style={{ fontSize: 9 }}>{ordWarehouse(o)}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-xs" onClick={() => setSelected(o)}>
                          <Eye style={{ width: 13 }} />
                        </button>
                        {o.status === 'Accepted' && (
                          <button className="btn btn-primary btn-xs" onClick={() => handleStartPacking(oid)}>
                            <Package style={{ width: 13 }} />Pack
                          </button>
                        )}
                        {o.status === 'Processing' && (
                          <button className="btn btn-primary btn-xs" onClick={() => handleReadyForDispatch(oid)}>
                            <CheckCircle style={{ width: 13 }} />Ready
                          </button>
                        )}
                        {o.status === 'Ready' && (
                          <button className="btn btn-primary btn-xs" onClick={() => { setDispatchForm(o); }}>
                            <Truck style={{ width: 13 }} />Dispatch
                          </button>
                        )}
                        {o.status === 'Dispatched' && (
                          <button className="btn btn-primary btn-xs" style={{ background: 'var(--success)' }} onClick={() => handleMarkDelivered(oid)}>
                            <CheckCircle style={{ width: 13 }} />Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Order Detail Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Order — {ordCode(selected)}</span>
              <span className={`badge ${statusColor[selected.status] || 'badge-gray'}`}>{selected.status}</span>
            </div>
            <div className="modal-body">
              {/* Status flow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
                {STATUS_FLOW.map((s, i) => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                      background: s === selected.status ? 'var(--primary)' : STATUS_FLOW.indexOf(selected.status) > i ? '#d1fae5' : 'var(--bg)',
                      color: s === selected.status ? '#fff' : STATUS_FLOW.indexOf(selected.status) > i ? 'var(--success)' : 'var(--text-muted)',
                    }}>{s}</span>
                    {i < STATUS_FLOW.length - 1 && <span style={{ color: 'var(--border)' }}>›</span>}
                  </span>
                ))}
              </div>

              <div className="form-row" style={{ marginBottom: 0 }}>
                <div><div className="form-label">Customer</div><p style={{ fontWeight: 700 }}>{ordCustomer(selected)}</p></div>
                <div><div className="form-label">Location</div><p>{selected.location}</p></div>
              </div>
              <div className="form-row" style={{ marginBottom: 0, marginTop: 12 }}>
                <div><div className="form-label">Product</div><p style={{ fontWeight: 600 }}>{ordProduct(selected)}</p></div>
                <div><div className="form-label">Quantity</div><p style={{ fontWeight: 700 }}>{selected.qty} Pcs</p></div>
              </div>
              <div className="divider" />

              {/* Financial breakdown */}
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Rate / Pcs',   val: `₹${(selected.rate || 0).toLocaleString()}`,                           color: 'var(--text)' },
                    { label: 'Amount',       val: `₹${ordAmount(selected).toLocaleString()}`,                             color: 'var(--text)' },
                    { label: `GST (${selected.gst_percent || 18}%)`, val: `₹${ordGst(selected).toLocaleString()}`,         color: 'var(--text-muted)' },
                    { label: 'Total',        val: `₹${ordTotal(selected).toLocaleString()}`,                              color: 'var(--success)', bold: true },
                    { label: 'Purchase Cost',val: `₹${(selected.purchase_cost || 0).toLocaleString()}`,                   color: 'var(--danger)' },
                    { label: 'Gross Profit', val: `₹${(ordAmount(selected) - (selected.purchase_cost || 0)).toLocaleString()}`, color: 'var(--primary)', bold: true },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="form-label" style={{ marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontWeight: item.bold ? 700 : 500, color: item.color, fontSize: item.bold ? 15 : 13 }}>{item.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live stock info */}
              <div className="divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Stock (after order)</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                  {getStock(selected.product_id || selected.productCode)} Pcs
                </span>
              </div>

              {ordEnquiryId(selected) && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Created from Enquiry: <strong style={{ color: 'var(--primary)' }}>{String(ordEnquiryId(selected)).slice(0, 10)}…</strong>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'Accepted' && (
                <button className="btn btn-primary" onClick={() => { handleStartPacking(ordId(selected)); setSelected(null) }}>
                  <Package style={{ width: 14 }} />Start Packing
                </button>
              )}
              {selected.status === 'Processing' && (
                <button className="btn btn-primary" onClick={() => { handleReadyForDispatch(ordId(selected)); setSelected(null) }}>
                  <CheckCircle style={{ width: 14 }} />Mark Ready for Dispatch
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dispatch Form Modal ── */}
      {dispatchForm && (
        <div className="modal-overlay" onClick={() => setDispatchForm(null)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Dispatch — {ordCode(dispatchForm)}</span>
              <button className="btn-ghost" onClick={() => setDispatchForm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                <strong>{ordCustomer(dispatchForm)}</strong> — {ordProduct(dispatchForm)} × {dispatchForm.qty} Pcs
                <br /><span style={{ color: 'var(--success)', fontWeight: 700 }}>Total: ₹{ordTotal(dispatchForm).toLocaleString()}</span>
                <span style={{ marginLeft: 16, color: 'var(--text-muted)' }}>Delivery: {dispatchForm.location}</span>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Vehicle Number *</label><input className="form-control" placeholder="e.g. KA01AB1234" value={dForm.vehicle} onChange={e => setDForm(f => ({ ...f, vehicle: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Transport Company *</label><input className="form-control" placeholder="e.g. VRL Logistics" value={dForm.transport} onChange={e => setDForm(f => ({ ...f, transport: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Driver Name *</label><input className="form-control" placeholder="Driver full name" value={dForm.driver} onChange={e => setDForm(f => ({ ...f, driver: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Driver Mobile</label><input className="form-control" placeholder="Contact number" value={dForm.driverMobile} onChange={e => setDForm(f => ({ ...f, driverMobile: e.target.value }))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">LR Number *</label><input className="form-control" placeholder="Lorry Receipt No." value={dForm.lr} onChange={e => setDForm(f => ({ ...f, lr: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Dispatch Date *</label><input className="form-control" type="date" value={dForm.dispatchDate} onChange={e => setDForm(f => ({ ...f, dispatchDate: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Expected Delivery Date</label><input className="form-control" type="date" value={dForm.expectedDelivery} onChange={e => setDForm(f => ({ ...f, expectedDelivery: e.target.value }))} /></div>
              <div className="alert alert-info" style={{ fontSize: 12, marginTop: 8 }}>
                ℹ️ Dispatching will automatically deduct {dispatchForm.qty} units from inventory.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDispatchForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDispatch}>
                <Truck style={{ width: 14 }} />Dispatch Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
