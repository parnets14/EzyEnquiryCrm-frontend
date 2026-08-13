import { useState } from 'react'
import { Search, Filter, Package, MapPin, MessageSquare, CheckCircle, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

const IMG_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000'

function imgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${IMG_BASE}${path}`
}

export default function ProductSearch({ inventory, addEnquiry, products: sharedProducts = [] }) {
  const [query, setQuery]     = useState('')
  const [filters, setFilters] = useState({ category: '', brand: '', location: '' })
  const [enquireModal, setEnquireModal] = useState(null)
  const [successMsg, setSuccessMsg]     = useState('')

  // Lightbox state
  const [lightbox, setLightbox] = useState(null)   // { images: [], index: 0 }

  const [form, setForm] = useState({
    retailer: '', mobile: '', qty: 1, location: '', remarks: '',
  })

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  // Merge shared products with live inventory stock
  const products = sharedProducts.map(p => {
    const pid = p._id || p.id || ''
    const inv = inventory?.find(i => {
      const invProdId = i.product_id?._id || i.product_id?.id || i.product_id || ''
      return String(invProdId) === String(pid) || i.product_code === p.code
    })
    const sellingPrice = p.selling_price ?? p.sellingPrice ?? 0
    const mrpVal       = p.mrp ?? p.retail_price ?? p.retailPrice ?? sellingPrice ?? 0
    return {
      ...p,
      sellingPrice,
      mrp: mrpVal,
      stock:     inv ? (Number(inv.current_stock) || Number(inv.current) || 0) : (p.stock ?? 0),
      warehouse: inv ? (inv.warehouse_name || inv.warehouse || 'Main Warehouse') : 'Main Warehouse',
      unit:      p.unit || 'Sq Ft',
    }
  })

  const results = products.filter(p => {
    const q = query.toLowerCase()
    const matchQ = !query ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.brand_name || p.brand || '').toLowerCase().includes(q) ||
      (p.category_name || p.category || '').toLowerCase().includes(q) ||
      (p.size || '').toLowerCase().includes(q) ||
      (p.finish || '').toLowerCase().includes(q)
    const matchF =
      (!filters.category || (p.category_name || p.category) === filters.category) &&
      (!filters.brand    || (p.brand_name    || p.brand)    === filters.brand)
    return matchQ && matchF
  })

  const categories = [...new Set(sharedProducts.map(p => p.category_name || p.category).filter(Boolean))]
  const brands      = [...new Set(sharedProducts.map(p => p.brand_name    || p.brand).filter(Boolean))]

  const handleEnquire = () => {
    if (!form.retailer || !form.mobile || !form.location) {
      alert('Please fill Retailer Name, Mobile and Location')
      return
    }
    addEnquiry?.({
      retailer_name:    form.retailer.trim(),
      retailer_mobile:  form.mobile.trim(),
      location:         form.location.trim(),
      product_id:       enquireModal._id || enquireModal.id || null,
      product_code:     enquireModal.code || '',
      product_name:     enquireModal.name || '',
      qty:              Number(form.qty) || 1,
      unit:             enquireModal.unit || 'Sq Ft',
      offered_price:    enquireModal.sellingPrice || 0,
      remarks:          form.remarks.trim(),
    })
    setSuccessMsg(`Enquiry raised for "${enquireModal.name}" — Distributor will reply shortly!`)
    setEnquireModal(null)
    setForm({ retailer: '', mobile: '', qty: 1, location: '', remarks: '' })
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Business</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Product Search</span>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle style={{ color: 'var(--success)', width: 18 }} />
          <span style={{ fontWeight: 600 }}>{successMsg}</span>
        </div>
      )}

      {/* Search bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', border: '2px solid var(--primary)', borderRadius: 10, padding: '10px 16px' }}>
              <Search style={{ width: 20, color: 'var(--primary)' }} />
              <input
                style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: 15 }}
                placeholder="Search by product name, brand, size, finish…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Filter style={{ width: 14, color: 'var(--text-muted)' }} />
            <select className="form-control" style={{ width: 160 }} value={filters.category} onChange={e => setFilter('category', e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="form-control" style={{ width: 140 }} value={filters.brand} onChange={e => setFilter('brand', e.target.value)}>
              <option value="">All Brands</option>
              {brands.map(b => <option key={b}>{b}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ category: '', brand: '', location: '' })}>Clear</button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>
        {results.length} product{results.length !== 1 ? 's' : ''} found
      </div>

      {/* No products message */}
      {sharedProducts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Package style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No products available</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Add products from Product Management first.</div>
        </div>
      )}

      {/* Product cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {results.map(p => {
          const stockColor = p.stock > 10 ? 'badge-green' : p.stock > 0 ? 'badge-yellow' : 'badge-red'
          return (
            <div key={p._id || p.id || p.code} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'box-shadow .2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'}
            >
              {/* ── Image area ── */}
              <div
                style={{ height: 170, background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%)', position: 'relative', overflow: 'hidden', flexShrink: 0, cursor: p.image_urls?.[0] ? 'zoom-in' : 'default' }}
                onClick={() => {
                  if (p.image_urls?.length) {
                    setLightbox({ images: p.image_urls, index: 0, productName: p.name })
                  }
                }}
              >
                {p.image_urls?.[0]
                  ? <img src={imgUrl(p.image_urls[0])} alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
                      onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                      onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                      onError={e => { e.target.style.display = 'none' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package style={{ width: 52, height: 52, color: 'var(--primary)', opacity: 0.3 }} />
                    </div>
                }
                {/* Brand badge top-left */}
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>{p.brand_name || p.brand || '—'}</span>
                </div>
                {/* Stock badge top-right */}
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span className={`badge ${stockColor}`} style={{ fontSize: 11 }}>
                    {p.stock > 0 ? `${Number(p.stock).toLocaleString()} ${p.unit || 'Sq Ft'}` : 'Out of Stock'}
                  </span>
                </div>
                {/* Zoom icon hint */}
                {p.image_urls?.[0] && (
                  <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.45)', borderRadius: 6, padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: 11 }}>
                    <ZoomIn size={12} /> View
                  </div>
                )}
                {p.image_urls?.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>
                    +{p.image_urls.length - 1} more
                  </div>
                )}
              </div>

              {/* ── Card body ── */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>

                {/* Code */}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                  {p.code}
                </div>

                {/* Product name */}
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, lineHeight: 1.3, color: 'var(--text)' }}>
                  {p.name}
                </div>

                {/* Category + sub-category + unit badges */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(p.category_name || p.category) && <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.category_name || p.category}</span>}
                  {(p.sub_category_name || p.sub_category) && <span className="badge badge-gray" style={{ fontSize: 10 }}>{p.sub_category_name || p.sub_category}</span>}
                  {p.unit && <span className="badge badge-gray" style={{ fontSize: 10 }}>{p.unit}</span>}
                </div>

                {/* ── Spec grid ── */}
                {[p.size, p.finish, p.tile_type, p.grade, p.material, p.surface, p.color, p.thickness,
                  p.gst_percent ? `GST ${p.gst_percent}%` : null,
                  p.pcs_per_box ? `${p.pcs_per_box} pcs/box` : null,
                  p.sqft_per_box ? `${parseFloat(p.sqft_per_box).toFixed(2)} sqft/box` : null,
                  p.hsn_code ? `HSN: ${p.hsn_code}` : null,
                ].filter(Boolean).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {[
                      p.size        && { label: 'Size',      val: p.size },
                      p.finish      && { label: 'Finish',    val: p.finish },
                      p.tile_type   && { label: 'Type',      val: p.tile_type },
                      p.grade       && { label: 'Grade',     val: p.grade },
                      p.material    && { label: 'Material',  val: p.material },
                      p.surface     && { label: 'Surface',   val: p.surface },
                      p.color       && { label: 'Color',     val: p.color },
                      p.thickness   && { label: 'Thickness', val: p.thickness },
                      p.gst_percent && { label: 'GST',       val: `${p.gst_percent}%` },
                      p.pcs_per_box && { label: 'Pcs/Box',   val: String(p.pcs_per_box) },
                      p.sqft_per_box&& { label: 'Sqft/Box',  val: parseFloat(p.sqft_per_box).toFixed(2) },
                      p.hsn_code    && { label: 'HSN',       val: p.hsn_code },
                    ].filter(Boolean).map(({ label, val }) => (
                      <div key={label} style={{
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '3px 7px', fontSize: 11,
                        display: 'flex', gap: 3,
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                {p.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                    {p.description.length > 80 ? p.description.slice(0, 80) + '…' : p.description}
                  </div>
                )}

                {/* ── Divider ── */}
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 12px' }} />

                {/* ── Pricing block ── */}
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                  {p.mrp > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--text-muted)' }}>MRP</span>
                      <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>₹{Number(p.mrp).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {p.dealer_price > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Dealer Price</span>
                      <span style={{ fontWeight: 600 }}>₹{Number(p.dealer_price).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Selling Price</span>
                    <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--success)' }}>
                      {p.sellingPrice > 0 ? `₹${Number(p.sellingPrice).toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                </div>

                {/* ── Footer: warehouse + enquire button ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin style={{ width: 11 }} />
                    {p.warehouse}
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={p.stock === 0}
                    onClick={() => { setEnquireModal(p); setForm(f => ({ ...f, qty: 1 })) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <MessageSquare style={{ width: 13 }} />
                    Enquire
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══════ ENQUIRY MODAL ═══════ */}
      {enquireModal && (
        <div className="modal-overlay" onClick={() => setEnquireModal(null)}>
          <div className="modal" style={{ maxWidth: 520, width: '96vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Raise Enquiry</span>
              <button className="btn-ghost" onClick={() => setEnquireModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">

              {/* Product summary in modal — full details with image */}
              <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px', marginBottom: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
                  {/* Product Image — bigger */}
                  <div
                    style={{ width: 110, height: 110, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0, background: 'linear-gradient(135deg,#e0e7ff,#f0f4ff)', cursor: enquireModal.image_urls?.[0] ? 'zoom-in' : 'default' }}
                    onClick={() => enquireModal.image_urls?.length && setLightbox({ images: enquireModal.image_urls, index: 0, productName: enquireModal.name })}
                  >
                    {enquireModal.image_urls?.[0]
                      ? <img src={imgUrl(enquireModal.image_urls[0])} alt={enquireModal.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package style={{ width: 36, color: 'var(--primary)', opacity: 0.3 }} />
                        </div>
                    }
                  </div>

                  {/* Product Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2, color: 'var(--text)', lineHeight: 1.3 }}>{enquireModal.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'monospace', letterSpacing: '.04em' }}>{enquireModal.code}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                      {(enquireModal.brand_name || enquireModal.brand) && (
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{enquireModal.brand_name || enquireModal.brand}</span>
                      )}
                      {(enquireModal.category_name || enquireModal.category) && (
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>{enquireModal.category_name || enquireModal.category}</span>
                      )}
                      {(enquireModal.sub_category_name || enquireModal.sub_category) && (
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>{enquireModal.sub_category_name || enquireModal.sub_category}</span>
                      )}
                    </div>
                    {/* Price & Stock inline */}
                    <div style={{ display: 'flex', gap: 14, fontSize: 13, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Price: <strong style={{ color: 'var(--success)', fontSize: 15 }}>
                        {enquireModal.sellingPrice > 0 ? `₹${Number(enquireModal.sellingPrice).toLocaleString('en-IN')}` : '—'}
                      </strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>Stock: <strong style={{ color: 'var(--primary)' }}>
                        {Number(enquireModal.stock || 0).toLocaleString()} {enquireModal.unit || 'Sq Ft'}
                      </strong></span>
                    </div>
                  </div>
                </div>

                {/* Spec chips */}
                {[
                  enquireModal.size        && { label: 'Size',      val: enquireModal.size },
                  enquireModal.finish      && { label: 'Finish',    val: enquireModal.finish },
                  enquireModal.tile_type   && { label: 'Type',      val: enquireModal.tile_type },
                  enquireModal.grade       && { label: 'Grade',     val: enquireModal.grade },
                  enquireModal.material    && { label: 'Material',  val: enquireModal.material },
                  enquireModal.surface     && { label: 'Surface',   val: enquireModal.surface },
                  enquireModal.color       && { label: 'Color',     val: enquireModal.color },
                  enquireModal.thickness   && { label: 'Thickness', val: enquireModal.thickness },
                  enquireModal.gst_percent && { label: 'GST',       val: `${enquireModal.gst_percent}%` },
                  enquireModal.pcs_per_box && { label: 'Pcs/Box',   val: String(enquireModal.pcs_per_box) },
                  enquireModal.sqft_per_box&& { label: 'Sqft/Box',  val: parseFloat(enquireModal.sqft_per_box).toFixed(2) },
                  enquireModal.hsn_code    && { label: 'HSN',       val: enquireModal.hsn_code },
                  enquireModal.mrp > 0     && { label: 'MRP',       val: `₹${Number(enquireModal.mrp).toLocaleString('en-IN')}` },
                  enquireModal.dealer_price> 0 && { label: 'Dealer', val: `₹${Number(enquireModal.dealer_price).toLocaleString('en-IN')}` },
                ].filter(Boolean).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {[
                      enquireModal.size        && { label: 'Size',      val: enquireModal.size },
                      enquireModal.finish      && { label: 'Finish',    val: enquireModal.finish },
                      enquireModal.tile_type   && { label: 'Type',      val: enquireModal.tile_type },
                      enquireModal.grade       && { label: 'Grade',     val: enquireModal.grade },
                      enquireModal.material    && { label: 'Material',  val: enquireModal.material },
                      enquireModal.surface     && { label: 'Surface',   val: enquireModal.surface },
                      enquireModal.color       && { label: 'Color',     val: enquireModal.color },
                      enquireModal.thickness   && { label: 'Thickness', val: enquireModal.thickness },
                      enquireModal.gst_percent && { label: 'GST',       val: `${enquireModal.gst_percent}%` },
                      enquireModal.pcs_per_box && { label: 'Pcs/Box',   val: String(enquireModal.pcs_per_box) },
                      enquireModal.sqft_per_box&& { label: 'Sqft/Box',  val: parseFloat(enquireModal.sqft_per_box).toFixed(2) },
                      enquireModal.hsn_code    && { label: 'HSN',       val: enquireModal.hsn_code },
                      enquireModal.mrp > 0     && { label: 'MRP',       val: `₹${Number(enquireModal.mrp).toLocaleString('en-IN')}` },
                      enquireModal.dealer_price> 0 && { label: 'Dealer', val: `₹${Number(enquireModal.dealer_price).toLocaleString('en-IN')}` },
                    ].filter(Boolean).map(({ label, val }) => (
                      <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', fontSize: 11, display: 'flex', gap: 3 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                {enquireModal.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                    {enquireModal.description}
                  </div>
                )}

                {/* Multiple images thumbnails */}
                {enquireModal.image_urls?.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {enquireModal.image_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={imgUrl(url)}
                        alt={`img-${idx}`}
                        onClick={() => setLightbox({ images: enquireModal.image_urls, index: idx, productName: enquireModal.name })}
                        style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6, border: '2px solid var(--border)', cursor: 'zoom-in' }}
                        onError={e => { e.target.style.display = 'none' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Enquiry form */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Your Shop / Company Name *</label>
                  <input className="form-control" placeholder="e.g. Ganesh Tiles" value={form.retailer} onChange={e => setForm(f => ({ ...f, retailer: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile *</label>
                  <input className="form-control" placeholder="10-digit mobile" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity Required *</label>
                  <input className="form-control" type="number" min={1} value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivery Location *</label>
                  <input className="form-control" placeholder="City, State" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Special Requirements</label>
                <textarea className="form-control" rows={2} placeholder="Any special requirements or delivery timeline…" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
              </div>
              <div className="alert alert-info" style={{ fontSize: 12 }}>
                ℹ️ Distributor will review your enquiry and reply with availability &amp; best price.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEnquireModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEnquire}>
                <MessageSquare style={{ width: 14 }} />Submit Enquiry
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══════ LIGHTBOX ═══════ */}
      {lightbox && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setLightbox(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 2 }}
          >
            <X size={20} />
          </button>

          {/* Product name top */}
          <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontWeight: 700, fontSize: 15, background: 'rgba(0,0,0,0.5)', padding: '5px 16px', borderRadius: 20, whiteSpace: 'nowrap', maxWidth: '70vw', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lightbox.productName}
          </div>

          {/* Prev button */}
          {lightbox.images.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length })) }}
              style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Main Image */}
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={imgUrl(lightbox.images[lightbox.index])}
              alt={lightbox.productName}
              style={{ maxWidth: '88vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
            />
          </div>

          {/* Next button */}
          {lightbox.images.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: (lb.index + 1) % lb.images.length })) }}
              style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Thumbnail strip */}
          {lightbox.images.length > 1 && (
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}
            >
              {lightbox.images.map((url, idx) => (
                <img
                  key={idx}
                  src={imgUrl(url)}
                  alt={`thumb-${idx}`}
                  onClick={() => setLightbox(lb => ({ ...lb, index: idx }))}
                  style={{
                    width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                    border: `3px solid ${lightbox.index === idx ? 'var(--primary)' : 'rgba(255,255,255,0.3)'}`,
                    opacity: lightbox.index === idx ? 1 : 0.6,
                    transition: 'opacity .2s, border-color .2s',
                  }}
                  onError={e => { e.target.style.display = 'none' }}
                />
              ))}
            </div>
          )}

          {/* Image counter */}
          {lightbox.images.length > 1 && (
            <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}