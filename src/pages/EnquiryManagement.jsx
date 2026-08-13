import { useState } from 'react'
import { Plus, Search, Eye, ArrowRight, MessageCircle, CheckCircle, X, LayoutList, Sparkles, ScanEye, Reply, Handshake, BadgeCheck, Ban, Package } from 'lucide-react'

// ── API field helpers (backend snake_case → frontend) ─────────
const eid         = e => e._id            || e.id           || ''
const enqCode     = e => e.enq_code       || e.id           || ''
const enqRetailer = e => e.retailer_name  || e.retailer     || ''
const enqMobile   = e => e.retailer_mobile|| e.mobile       || ''
const enqEmail    = e => e.retailer_email || e.email        || ''
const enqProduct  = e => e.product_name   || e.product      || ''
const enqPrice    = e => +(e.offered_price   || e.offeredPrice  || 0)
const enqDate     = e => e.created_at
  ? new Date(e.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : (e.date || '')
const enqReply    = e => e.distributor_reply || e.distributorReply || ''
const enqNote     = e => e.negotiation_note  || e.negotiationNote  || ''
const enqOrderId  = e => e.order_id || e.orderId || null
const enqRemarks  = e => e.remarks || ''

// ── Scope-defined status flow (Day 13) ────────────────────────
// New → Viewed → Replied → Negotiation → Confirmed → Cancelled
const STATUS_FLOW = ['New', 'Viewed', 'Replied', 'Negotiation', 'Confirmed', 'Cancelled']

const STATUS_META = {
  New:         { color: 'badge-blue',   label: 'New',         dot: '#3B82F6' },
  Viewed:      { color: 'badge-cyan',   label: 'Viewed',      dot: '#06B6D4' },
  Replied:     { color: 'badge-yellow', label: 'Replied',     dot: '#F59E0B' },
  Negotiation: { color: 'badge-orange', label: 'Negotiation', dot: '#F97316' },
  Confirmed:   { color: 'badge-green',  label: 'Confirmed',   dot: '#10B981' },
  Cancelled:   { color: 'badge-red',    label: 'Cancelled',   dot: '#EF4444' },
}

// Which statuses are valid transitions from each state
const NEXT_STATUSES = {
  New:         ['Viewed', 'Cancelled'],
  Viewed:      ['Replied', 'Cancelled'],
  Replied:     ['Negotiation', 'Confirmed', 'Cancelled'],
  Negotiation: ['Confirmed', 'Cancelled'],
  Confirmed:   [],
  Cancelled:   [],
}

export default function EnquiryManagement({
  enquiries = [], inventory = [], orders = [], products = [],
  addEnquiry, updateEnquiry, convertEnquiryToOrder,
}) {
  const [search,        setSearch]       = useState('')
  const [statusFilter,  setStatusFilter] = useState('All')
  const [selected,      setSelected]     = useState(null)
  const [showNewModal,  setShowNewModal] = useState(false)
  const [replyText,     setReplyText]    = useState('')
  const [negText,       setNegText]      = useState('')
  const [offerPrice,    setOfferPrice]   = useState('')
  const [successMsg,    setSuccessMsg]   = useState('')
  const [saving,        setSaving]       = useState(false)

  // ── New Enquiry form ──────────────────────────────────────────
  const EMPTY_FORM = { retailer: '', mobile: '', email: '', product_id: '', productCode: '', product: '',
    qty: '', unit: 'Sq Ft', offeredPrice: '', location: '', remarks: '' }
  const [newForm,   setNewForm]  = useState(EMPTY_FORM)
  const [enqErrors, setEnqErrors]= useState({})

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000) }

  // ── Product select in New Enquiry ──────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState(null)

  const handleProductSelect = (prodId) => {
    const prod = products.find(p => (p._id || p.id) === prodId)
    if (prod) {
      setSelectedProduct(prod)
      setNewForm(f => ({
        ...f,
        product_id:   prod._id || prod.id,
        productCode:  prod.code,
        product:      prod.name,
        offeredPrice: String(prod.selling_price || prod.sellingPrice || ''),
        unit:         prod.unit || 'Sq Ft',
        size:         prod.size || '',
        finish:       prod.finish || '',
        material:     prod.material || '',
        color:        prod.color || '',
        gst_percent:  prod.gst_percent || 18,
      }))
    } else {
      setSelectedProduct(null)
      setNewForm(f => ({ ...f, product_id: '', productCode: '', product: '', offeredPrice: '', size: '', finish: '', material: '', color: '' }))
    }
  }

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = enquiries.filter(e =>
    (statusFilter === 'All' || e.status === statusFilter) &&
    (
      enqRetailer(e).toLowerCase().includes(search.toLowerCase()) ||
      enqCode(e).toLowerCase().includes(search.toLowerCase()) ||
      enqProduct(e).toLowerCase().includes(search.toLowerCase()) ||
      (e.location || '').toLowerCase().includes(search.toLowerCase())
    )
  )

  // ── Open detail panel ─────────────────────────────────────────
  const openDetail = (e) => {
    setSelected(e)
    setReplyText(enqReply(e))
    setNegText(enqNote(e))
    setOfferPrice(enqPrice(e) ? String(enqPrice(e)) : '')
    // Auto-advance to Viewed if New
    if (e.status === 'New') {
      updateEnquiry?.(eid(e), { status: 'Viewed' })
      setSelected({ ...e, status: 'Viewed' })
    }
  }

  // ── Update status + reply ────────────────────────────────────
  const handleUpdate = async (newStatus) => {
    setSaving(true)
    const payload = { status: newStatus }
    if (replyText.trim())       payload.distributor_reply  = replyText.trim()
    if (negText.trim())         payload.negotiation_note   = negText.trim()
    if (offerPrice)             payload.offered_price      = parseFloat(offerPrice)
    const result = await updateEnquiry?.(eid(selected), payload)
    setSaving(false)
    const updated = result?.data || { ...selected, ...payload }
    setSelected(updated)
    toast(`✓ Enquiry ${enqCode(selected)} → ${newStatus}`)
  }

  // ── Send reply only (keep current status, just save reply) ───
  const handleSendReply = async () => {
    if (!replyText.trim()) return
    setSaving(true)
    const nextStatus = selected.status === 'Viewed' ? 'Replied' : selected.status
    const payload = { status: nextStatus, distributor_reply: replyText.trim() }
    if (offerPrice) payload.offered_price = parseFloat(offerPrice)
    const result = await updateEnquiry?.(eid(selected), payload)
    setSaving(false)
    const updated = result?.data || { ...selected, ...payload }
    setSelected(updated)
    toast(`✓ Reply sent — status updated to "${nextStatus}"`)
  }

  // ── Convert Confirmed → Order ─────────────────────────────────
  const handleConvertToOrder = async () => {
    setSaving(true)
    const agreedRate = offerPrice ? parseFloat(offerPrice) : enqPrice(selected)
    const result = await convertEnquiryToOrder?.(selected, agreedRate)
    setSaving(false)
    if (result?.success === false) { toast(`Error: ${result.message}`); return }
    const orderCode = result?.data?.order_code || 'New'
    const total     = result?.data?.total_amount || 0
    setSelected(prev => ({ ...prev, status: 'Confirmed', order_id: result?.data?._id }))
    toast(`✓ Order ${orderCode} created! Total ₹${total.toLocaleString()} (GST 18% incl.)`)
  }

  // ── Submit New Enquiry ────────────────────────────────────────
  const handleNewEnquiry = async () => {
    const errs = {}
    if (!newForm.retailer.trim()) errs.retailer = 'Retailer name required'
    if (!newForm.mobile.trim() || !/^\d{10}$/.test(newForm.mobile)) errs.mobile = 'Valid 10-digit mobile required'
    if (!newForm.product_id)      errs.product  = 'Select a product'
    if (!newForm.location.trim()) errs.location = 'Delivery location required'
    if (!newForm.qty || isNaN(newForm.qty) || +newForm.qty < 1) errs.qty = 'Valid quantity required'
    if (Object.keys(errs).length) { setEnqErrors(errs); return }

    setSaving(true)
    await addEnquiry?.({
      retailer_name:   newForm.retailer.trim(),
      retailer_mobile: newForm.mobile.trim(),
      retailer_email:  newForm.email.trim(),
      product_id:      newForm.product_id,
      product_code:    newForm.productCode,
      product_name:    newForm.product,
      qty:             Number(newForm.qty),
      unit:            newForm.unit,
      offered_price:   newForm.offeredPrice ? Number(newForm.offeredPrice) : null,
      location:        newForm.location.trim(),
      remarks:         newForm.remarks.trim(),
    })
    setSaving(false)
    setShowNewModal(false)
    setNewForm(EMPTY_FORM)
    setSelectedProduct(null)
    setEnqErrors({})
    toast('✓ Enquiry submitted successfully')
  }

  // ── Status flow progress bar ──────────────────────────────────
  const FlowBar = ({ current }) => {
    const activeIdx = STATUS_FLOW.indexOf(current)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {STATUS_FLOW.map((s, i) => {
          const done    = activeIdx > i
          const active  = activeIdx === i
          const meta    = STATUS_META[s]
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: active ? meta.dot : done ? '#d1fae5' : 'var(--bg)',
                color: active ? '#fff' : done ? '#065f46' : 'var(--text-muted)',
                border: active ? `2px solid ${meta.dot}` : '2px solid transparent',
                transition: 'all .2s',
              }}>
                {done && <CheckCircle style={{ width: 11 }} />}
                {s}
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div style={{ width: 20, height: 2, background: done ? '#10B981' : 'var(--border)', flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Marketplace</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Enquiry Management</span>
      </div>

      {/* Toast */}
      {successMsg && (
        <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle style={{ color: 'var(--success)', width: 18, flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      {/* ── Status summary cards ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10, marginBottom: 24, width: '100%' }}>
        {[
          { label: 'All',         count: enquiries.length,                                        dot: '#6366F1', Icon: LayoutList,  bg: 'linear-gradient(135deg,#6366f110 0%,#818cf818 100%)' },
          { label: 'New',         count: enquiries.filter(e => e.status === 'New').length,         dot: '#3B82F6', Icon: Sparkles,     bg: 'linear-gradient(135deg,#3b82f610 0%,#60a5fa18 100%)' },
          { label: 'Viewed',      count: enquiries.filter(e => e.status === 'Viewed').length,      dot: '#06B6D4', Icon: ScanEye,      bg: 'linear-gradient(135deg,#06b6d410 0%,#22d3ee18 100%)' },
          { label: 'Replied',     count: enquiries.filter(e => e.status === 'Replied').length,     dot: '#F59E0B', Icon: Reply,        bg: 'linear-gradient(135deg,#f59e0b10 0%,#fbbf2418 100%)' },
          { label: 'Negotiation', count: enquiries.filter(e => e.status === 'Negotiation').length, dot: '#F97316', Icon: Handshake,    bg: 'linear-gradient(135deg,#f9731610 0%,#fb923c18 100%)' },
          { label: 'Confirmed',   count: enquiries.filter(e => e.status === 'Confirmed').length,   dot: '#10B981', Icon: BadgeCheck,   bg: 'linear-gradient(135deg,#10b98110 0%,#34d39918 100%)' },
          { label: 'Cancelled',   count: enquiries.filter(e => e.status === 'Cancelled').length,   dot: '#EF4444', Icon: Ban,          bg: 'linear-gradient(135deg,#ef444410 0%,#f8717118 100%)' },
        ].map(({ label, count, dot, Icon, bg }) => {
          const active = statusFilter === label
          return (
            <div
              key={label}
              onClick={() => setStatusFilter(active ? 'All' : label)}
              style={{
                padding: '14px 10px 12px',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'center',
                background: active ? `${dot}22` : bg,
                border: active ? `2px solid ${dot}` : `1.5px solid ${dot}28`,
                boxShadow: active ? `0 4px 14px ${dot}28` : '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'all .18s ease',
                transform: active ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: dot, borderRadius: '12px 12px 0 0', opacity: active ? 1 : 0.45,
              }} />
              <div style={{
                width: 34, height: 34, borderRadius: 10, margin: '0 auto 8px',
                background: active ? `${dot}25` : `${dot}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 16, height: 16, color: dot, strokeWidth: 2 }} />
              </div>
              <div style={{
                fontSize: 24, fontWeight: 800, lineHeight: 1,
                color: active ? dot : 'var(--text)',
                marginBottom: 5,
              }}>{count}</div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                color: active ? dot : 'var(--text-muted)',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{label}</div>
            </div>
          )
        })}
      </div>

      {/* ── Main table ─────────────────────────────────────────── */}
      <div className="card" style={{ width: '100%' }}>
        <div className="card-header">
          <span className="card-title">Enquiries ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar">
              <Search />
              <input
                placeholder="Search ID, retailer, product, location…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="form-control" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => { setShowNewModal(true); setNewForm(EMPTY_FORM); setSelectedProduct(null); setEnqErrors({}) }}>
              <Plus />New Enquiry
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Enq ID</th><th>Retailer</th><th>Product</th>
                <th>Qty</th><th>Location</th><th>Offered ₹</th><th>Date</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={eid(e)}>
                  <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>{enqCode(e)}</td>
                  <td>
                    <div className="user-name">{enqRetailer(e)}</div>
                    <div className="user-role">{enqMobile(e)}</div>
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 180 }}>{enqProduct(e)}</td>
                  <td style={{ fontWeight: 600 }}>{e.qty} {e.unit}</td>
                  <td style={{ fontSize: 12 }}>{e.location}</td>
                  <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                    {enqPrice(e) ? `₹${enqPrice(e).toLocaleString()}` : '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{enqDate(e)}</td>
                  <td>
                    <span className={`badge ${STATUS_META[e.status]?.color || 'badge-gray'}`}>{e.status}</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      {/* View/Reply */}
                      <button className="btn btn-ghost btn-xs" title="View & Reply" onClick={() => openDetail(e)}>
                        <Eye style={{ width: 13 }} />
                      </button>
                      {/* Quick reply button for Viewed */}
                      {e.status === 'Viewed' && (
                        <button className="btn btn-primary btn-xs" title="Send Reply" onClick={() => openDetail(e)}>
                          <MessageCircle style={{ width: 13 }} />Reply
                        </button>
                      )}
                      {/* Convert to Order when Confirmed */}
                      {e.status === 'Confirmed' && !enqOrderId(e) && (
                        <button className="btn btn-primary btn-xs" title="Convert to Order" onClick={() => { openDetail(e) }}>
                          <ArrowRight style={{ width: 13 }} />Order
                        </button>
                      )}
                      {enqOrderId(e) && (
                        <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Ordered</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No enquiries found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          DETAIL / WHOLESALER REPLY MODAL  (Day 13)
          Flow: New → Viewed → Replied → Negotiation → Confirmed → Cancelled
      ══════════════════════════════════════════════════════ */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="modal-title">Enquiry — {enqCode(selected)}</span>
                <span className={`badge ${STATUS_META[selected.status]?.color || 'badge-gray'}`}>
                  {selected.status}
                </span>
              </div>
              <button className="btn-ghost" onClick={() => setSelected(null)}><X style={{ width: 16 }} /></button>
            </div>

            <div className="modal-body">
              {/* ── Status Flow Progress Bar ── */}
              <FlowBar current={selected.status} />

              {/* ── Retailer Info ── */}
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: 'var(--text-muted)', letterSpacing: 0.5 }}>RETAILER</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Name</div>
                    <div style={{ fontWeight: 700 }}>{enqRetailer(selected)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mobile</div>
                    <div style={{ fontWeight: 600 }}>{enqMobile(selected)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Email</div>
                    <div style={{ fontSize: 12 }}>{enqEmail(selected) || '—'}</div>
                  </div>
                </div>
              </div>

              {/* ── Product + Enquiry Details ── */}
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-muted)', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package style={{ width: 14, height: 14, color: '#6366F1' }} />
                  PRODUCT & ENQUIRY DETAILS
                </div>

                {/* Product info card */}
                <div style={{
                  background: '#fff', borderRadius: 8, border: '1px solid #e0e7ff',
                  marginBottom: 10, overflow: 'hidden',
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg,#6366F1 0%,#818cf8 100%)',
                    padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{enqProduct(selected)}</div>
                      {(selected.product_code || selected.product_name) && (
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                          Code: {selected.product_code || '—'}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: 8 }}>
                      {selected.unit || 'Sq Ft'}
                    </span>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '7px 10px', marginBottom: 8 }}>
                      {[
                        { label: 'Size',      value: selected.size      || selected.product_size      || '—' },
                        { label: 'Finish',    value: selected.finish    || selected.product_finish    || '—' },
                        { label: 'Material',  value: selected.material  || selected.product_material  || '—' },
                        { label: 'Color',     value: selected.color     || selected.product_color     || '—' },
                        { label: 'Surface',   value: selected.surface   || '—' },
                        { label: 'Grade',     value: selected.grade     || '—' },
                        { label: 'Thickness', value: selected.thickness || '—' },
                        { label: 'Tile Type', value: selected.tile_type || '—' },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 1 }}>{label}</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: value === '—' ? 'var(--text-light)' : 'var(--text)' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Packing chips */}
                    {(selected.pcs_per_box || selected.sqft_per_box || selected.gst_percent) && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {selected.pcs_per_box && <span style={{ fontSize: 10, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{selected.pcs_per_box} Pcs/Box</span>}
                        {selected.sqft_per_box && <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{selected.sqft_per_box} Sq Ft/Box</span>}
                        {selected.gst_percent && <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>GST {selected.gst_percent}%</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity / Price / Value row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                  {[
                    { label: 'Quantity',      value: `${selected.qty} ${selected.unit || ''}`,           color: 'var(--text)',     big: true },
                    { label: 'Offered Price', value: enqPrice(selected) ? `₹${enqPrice(selected).toLocaleString()}` : '—', color: 'var(--success)', big: true },
                    { label: 'Est. Value',    value: `₹${(enqPrice(selected) * (selected.qty || 0)).toLocaleString()}`, color: 'var(--primary)', big: true },
                    { label: 'GST Amount',    value: enqPrice(selected) ? `₹${((enqPrice(selected) * (selected.qty || 0)) * ((selected.gst_percent || 18) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—', color: '#6366F1', big: false },
                  ].map(({ label, value, color, big }) => (
                    <div key={label} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: big ? 15 : 13, fontWeight: 800, color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Location + Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Delivery Location</div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{selected.location || '—'}</div>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Enquiry Date</div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{enqDate(selected)}</div>
                  </div>
                </div>

                {enqRemarks(selected) && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#fefce8', borderRadius: 6, fontSize: 12, color: '#92400e', border: '1px solid #fde68a' }}>
                    <strong>Remarks:</strong> {enqRemarks(selected)}
                  </div>
                )}
              </div>

              {/* ── Existing Distributor Reply (if any) ── */}
              {enqReply(selected) && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>✓ DISTRIBUTOR REPLY SENT</div>
                  <div style={{ fontSize: 13 }}>{enqReply(selected)}</div>
                </div>
              )}

              {/* ── Existing Negotiation Note (if any) ── */}
              {enqNote(selected) && (
                <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#78350f', marginBottom: 4 }}>⟳ NEGOTIATION NOTE</div>
                  <div style={{ fontSize: 13 }}>{enqNote(selected)}</div>
                </div>
              )}

              {/* ── Order Created Banner ── */}
              {enqOrderId(selected) && (
                <div className="alert alert-info" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle style={{ color: 'var(--success)', width: 18, flexShrink: 0 }} />
                  <span>Order has been created from this enquiry. Check Order Management for details.</span>
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  WHOLESALER ACTION AREA
                  Show only if enquiry is still actionable
              ═══════════════════════════════════════════════ */}
              {!['Confirmed', 'Cancelled'].includes(selected.status) && !enqOrderId(selected) && (
                <>
                  <div className="divider" />
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>
                    Wholesaler Reply Screen
                  </div>

                  {/* Offered / Counter Price */}
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Your Offered Price (₹ / {selected.unit || 'Sq Ft'}) *</label>
                      <input
                        className="form-control"
                        type="number"
                        placeholder={`e.g. ${enqPrice(selected) || 75}`}
                        value={offerPrice}
                        onChange={e => setOfferPrice(e.target.value)}
                      />
                      {offerPrice && selected.qty && (
                        <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>
                          Total Value: ₹{(parseFloat(offerPrice) * selected.qty).toLocaleString()}
                          &nbsp;(excl. GST)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reply to Retailer */}
                  <div className="form-group">
                    <label className="form-label">Reply to Retailer *</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Available – 2400 Sq Ft in stock. Rate ₹80/Sq Ft. Delivery within 2 days."
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                    />
                  </div>

                  {/* Negotiation Note (visible for Replied / Negotiation) */}
                  {['Replied', 'Negotiation'].includes(selected.status) && (
                    <div className="form-group">
                      <label className="form-label">Negotiation Notes</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="e.g. Retailer counter-offered ₹77. Holding at ₹78. Final offer."
                        value={negText}
                        onChange={e => setNegText(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Action buttons — only valid next transitions */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                      MOVE TO STATUS:
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {NEXT_STATUSES[selected.status]?.map(s => (
                        <button
                          key={s}
                          className={`btn btn-sm ${s === 'Confirmed' ? 'btn-primary' : s === 'Cancelled' ? 'btn-danger' : 'btn-secondary'}`}
                          disabled={saving}
                          onClick={() => handleUpdate(s)}
                          style={s === 'Confirmed' ? { background: 'var(--success)', borderColor: 'var(--success)' } : {}}
                        >
                          {s === 'Replied' && <MessageCircle style={{ width: 13 }} />}
                          {s === 'Confirmed' && <CheckCircle style={{ width: 13 }} />}
                          {s === 'Cancelled' && <X style={{ width: 13 }} />}
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Convert to Order (Confirmed + no order yet) ── */}
              {selected.status === 'Confirmed' && !enqOrderId(selected) && (
                <>
                  <div className="divider" />
                  <div style={{ background: '#f0fdf4', border: '1px solid #6ee7b7', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>✓ Enquiry Confirmed — Ready to Convert</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      Product: <strong>{enqProduct(selected)}</strong> &nbsp;|&nbsp;
                      Qty: <strong>{selected.qty} {selected.unit}</strong> &nbsp;|&nbsp;
                      Rate: <strong>₹{enqPrice(selected).toLocaleString()}</strong> &nbsp;|&nbsp;
                      Total: <strong>₹{(enqPrice(selected) * selected.qty * 1.18).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong> (incl. 18% GST)
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', fontWeight: 700 }}
                      disabled={saving}
                      onClick={handleConvertToOrder}
                    >
                      <ArrowRight style={{ width: 15 }} />
                      {saving ? 'Creating Order…' : 'Convert to Order — Inventory will auto-update'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {!['Confirmed', 'Cancelled'].includes(selected.status) && replyText.trim() && (
                <button className="btn btn-primary" disabled={saving} onClick={handleSendReply}>
                  <MessageCircle style={{ width: 14 }} />
                  {saving ? 'Sending…' : 'Send Reply & Update Status'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          NEW ENQUIRY MODAL  (Day 12 — Retailer Enquiry Form)
      ══════════════════════════════════════════════════════ */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Raise New Enquiry</span>
              <button className="btn-ghost" onClick={() => setShowNewModal(false)}><X style={{ width: 16 }} /></button>
            </div>
            <div className="modal-body">

              {/* Retailer details */}
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5 }}>RETAILER DETAILS</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Retailer Name *</label>
                  <input
                    className={`form-control${enqErrors.retailer ? ' input-error' : ''}`}
                    placeholder="e.g. Ramesh Tiles Store"
                    value={newForm.retailer}
                    onChange={e => setNewForm(f => ({ ...f, retailer: e.target.value }))}
                  />
                  {enqErrors.retailer && <div className="form-error">{enqErrors.retailer}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile *</label>
                  <input
                    className={`form-control${enqErrors.mobile ? ' input-error' : ''}`}
                    placeholder="10-digit mobile"
                    maxLength={10}
                    value={newForm.mobile}
                    onChange={e => setNewForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g,'') }))}
                  />
                  {enqErrors.mobile && <div className="form-error">{enqErrors.mobile}</div>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  placeholder="retailer@example.com"
                  value={newForm.email}
                  onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div className="divider" />
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5 }}>PRODUCT & QUANTITY</div>

              {/* Product select — live from API */}
              <div className="form-group">
                <label className="form-label">Select Product *</label>
                <select
                  className={`form-control${enqErrors.product ? ' input-error' : ''}`}
                  value={newForm.product_id || ''}
                  onChange={e => handleProductSelect(e.target.value)}
                >
                  <option value="">— Select a Tile Product —</option>
                  {products.map(p => {
                    const pid = p._id || p.id
                    return (
                      <option key={pid} value={pid}>
                        [{p.code}] {p.name}{p.size ? ` · ${p.size}` : ''}{p.finish ? ` · ${p.finish}` : ''} — ₹{p.selling_price || 0}/{p.unit || 'Sq Ft'}
                      </option>
                    )
                  })}
                </select>
                {enqErrors.product && <div className="form-error">{enqErrors.product}</div>}

                {/* ── Product Detail Card (shown after selection) ── */}
                {selectedProduct && (
                  <div style={{
                    marginTop: 10, borderRadius: 10, overflow: 'hidden',
                    border: '1.5px solid #6366f130',
                    background: 'linear-gradient(135deg,#f8faff 0%,#f0f4ff 100%)',
                  }}>
                    {/* Header strip */}
                    <div style={{
                      background: 'linear-gradient(90deg,#6366F1 0%,#818cf8 100%)',
                      padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Package style={{ width: 14, height: 14, color: '#fff' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{selectedProduct.name}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>Code: {selectedProduct.code}</div>
                        </div>
                      </div>
                      {selectedProduct.new_arrival && (
                        <span style={{ fontSize: 9, fontWeight: 700, background: '#FD5C02', color: '#fff', padding: '2px 7px', borderRadius: 10 }}>NEW</span>
                      )}
                    </div>

                    {/* Details grid */}
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 12px', marginBottom: 8 }}>
                        {[
                          { label: 'Size',     value: selectedProduct.size     || '—' },
                          { label: 'Finish',   value: selectedProduct.finish   || '—' },
                          { label: 'Material', value: selectedProduct.material || '—' },
                          { label: 'Color',    value: selectedProduct.color    || '—' },
                          { label: 'Surface',  value: selectedProduct.surface  || '—' },
                          { label: 'Grade',    value: selectedProduct.grade    || '—' },
                          { label: 'Thickness',value: selectedProduct.thickness|| '—' },
                          { label: 'Tile Type',value: selectedProduct.tile_type|| '—' },
                          { label: 'Unit',     value: selectedProduct.unit     || 'Sq Ft' },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 }}>{label}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Packing info */}
                      {(selectedProduct.pcs_per_box || selectedProduct.sqft_per_box) && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          {selectedProduct.pcs_per_box && (
                            <span style={{ fontSize: 10, background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                              {selectedProduct.pcs_per_box} Pcs/Box
                            </span>
                          )}
                          {selectedProduct.sqft_per_box && (
                            <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                              {selectedProduct.sqft_per_box} Sq Ft/Box
                            </span>
                          )}
                          {selectedProduct.gst_percent && (
                            <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                              GST {selectedProduct.gst_percent}%
                            </span>
                          )}
                        </div>
                      )}

                      {/* Pricing row */}
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8,
                        background: '#fff', borderRadius: 8, padding: '8px 10px',
                        border: '1px solid #e0e7ff',
                      }}>
                        {[
                          { label: 'Selling Price', value: selectedProduct.selling_price, color: '#10B981' },
                          { label: 'MRP',           value: selectedProduct.mrp,           color: '#6366F1' },
                          { label: 'Dealer Price',  value: selectedProduct.dealer_price,  color: '#F59E0B' },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color }}>{value ? `₹${value.toLocaleString()}` : '—'}</div>
                          </div>
                        ))}
                      </div>

                      {/* Description */}
                      {selectedProduct.description && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {selectedProduct.description}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    className={`form-control${enqErrors.qty ? ' input-error' : ''}`}
                    type="number"
                    min={1}
                    placeholder="e.g. 500"
                    value={newForm.qty}
                    onChange={e => setNewForm(f => ({ ...f, qty: e.target.value }))}
                  />
                  {enqErrors.qty && <div className="form-error">{enqErrors.qty}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input className="form-control" readOnly value={newForm.unit || 'Sq Ft'} style={{ background: 'var(--bg)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Offered Price (₹/{newForm.unit || 'Sq Ft'})</label>
                  <input
                    className="form-control"
                    type="number"
                    placeholder="Retailer's budget price"
                    value={newForm.offeredPrice}
                    onChange={e => setNewForm(f => ({ ...f, offeredPrice: e.target.value }))}
                  />
                </div>
              </div>

              {/* Live calc */}
              {newForm.qty && newForm.offeredPrice && (
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Est. Value: </span>
                  <strong style={{ color: 'var(--primary)' }}>
                    ₹{(+newForm.qty * +newForm.offeredPrice).toLocaleString()}
                  </strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 12 }}>With 18% GST: </span>
                  <strong style={{ color: 'var(--success)' }}>
                    ₹{(+newForm.qty * +newForm.offeredPrice * 1.18).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </strong>
                </div>
              )}

              <div className="divider" />
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5 }}>DELIVERY & REMARKS</div>

              <div className="form-group">
                <label className="form-label">Delivery Location *</label>
                <input
                  className={`form-control${enqErrors.location ? ' input-error' : ''}`}
                  placeholder="City, State — e.g. Mumbai, Maharashtra"
                  value={newForm.location}
                  onChange={e => setNewForm(f => ({ ...f, location: e.target.value }))}
                />
                {enqErrors.location && <div className="form-error">{enqErrors.location}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Remarks / Special Requirements</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Colour preference, finish, delivery urgency, packaging…"
                  value={newForm.remarks}
                  onChange={e => setNewForm(f => ({ ...f, remarks: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNewModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleNewEnquiry}>
                {saving ? 'Submitting…' : 'Submit Enquiry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
