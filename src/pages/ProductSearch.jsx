import { useState, useMemo } from 'react'
import { Search, Filter, Package, MapPin, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

const IMG_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000'

function imgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${IMG_BASE}${path}`
}

// ── Requirement §5: All search filters ──
const EMPTY_FILTERS = {
  code:     '',
  name:     '',
  size:     '',
  category: '',
  brand:    '',
  finish:   '',
  color:    '',
  location: '',
}

export default function ProductSearch({ inventory, products: sharedProducts = [] }) {
  const [query,   setQuery]   = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [lightbox, setLightbox] = useState(null)

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const clearAll = () => {
    setQuery('')
    setFilters(EMPTY_FILTERS)
  }

  const hasActiveFilter = query || Object.values(filters).some(Boolean)

  // ── Merge products with live inventory stock ──
  const products = useMemo(() => sharedProducts.map(p => {
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
      mrp:       mrpVal,
      stock:     inv ? (Number(inv.current_stock) || Number(inv.current) || 0) : (p.stock ?? 0),
      warehouse: inv ? (inv.warehouse_name || inv.warehouse || 'Main Warehouse') : 'Main Warehouse',
      unit:      p.unit || 'Sq Ft',
    }
  }), [sharedProducts, inventory])

  // ── Unique options for dropdowns ──
  const categories = useMemo(() => [...new Set(products.map(p => p.category_name || p.category).filter(Boolean))], [products])
  const brands      = useMemo(() => [...new Set(products.map(p => p.brand_name    || p.brand).filter(Boolean))],    [products])
  const sizes       = useMemo(() => [...new Set(products.map(p => p.size).filter(Boolean))],                        [products])
  const finishes    = useMemo(() => [...new Set(products.map(p => p.finish).filter(Boolean))],                      [products])
  const colors      = useMemo(() => [...new Set(products.map(p => p.color).filter(Boolean))],                       [products])

  // ── Filter logic — all Requirement §5 filters ──
  const results = useMemo(() => products.filter(p => {
    const q = query.toLowerCase()
    const matchQ = !query ||
      (p.name   || '').toLowerCase().includes(q) ||
      (p.code   || '').toLowerCase().includes(q) ||
      (p.brand_name || p.brand || '').toLowerCase().includes(q) ||
      (p.category_name || p.category || '').toLowerCase().includes(q) ||
      (p.size   || '').toLowerCase().includes(q) ||
      (p.finish || '').toLowerCase().includes(q) ||
      (p.color  || '').toLowerCase().includes(q)

    const matchCode     = !filters.code     || (p.code || '').toLowerCase().includes(filters.code.toLowerCase())
    const matchName     = !filters.name     || (p.name || '').toLowerCase().includes(filters.name.toLowerCase())
    const matchSize     = !filters.size     || (p.size || '') === filters.size
    const matchCategory = !filters.category || (p.category_name || p.category) === filters.category
    const matchBrand    = !filters.brand    || (p.brand_name    || p.brand)    === filters.brand
    const matchFinish   = !filters.finish   || (p.finish || '') === filters.finish
    const matchColor    = !filters.color    || (p.color  || '').toLowerCase().includes(filters.color.toLowerCase())
    const matchLocation = !filters.location || (p.warehouse || '').toLowerCase().includes(filters.location.toLowerCase())

    return matchQ && matchCode && matchName && matchSize && matchCategory && matchBrand && matchFinish && matchColor && matchLocation
  }), [products, query, filters])

  return (
    <>
      <div className="breadcrumb">
        <span>Business</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Product Search</span>
      </div>

      {/* ── Main Search Bar ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          {/* Global search */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg)', border: '2px solid var(--primary)',
              borderRadius: 10, padding: '10px 16px',
            }}>
              <Search style={{ width: 20, color: 'var(--primary)', flexShrink: 0 }} />
              <input
                style={{ border: 'none', background: 'none', outline: 'none', flex: 1, fontSize: 15 }}
                placeholder="Search by product name, code, brand, size, finish, color…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                  <X size={16} />
                </button>
              )}
            </div>
            {hasActiveFilter && (
              <button className="btn btn-secondary btn-sm" onClick={clearAll}>
                <X style={{ width: 13 }} />Clear All
              </button>
            )}
          </div>

          {/* ── Requirement §5: All filters ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {/* Product Code */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Product Code</label>
              <input
                className="form-control"
                placeholder="e.g. TL-001"
                value={filters.code}
                onChange={e => setFilter('code', e.target.value)}
              />
            </div>

            {/* Design Name */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Design Name</label>
              <input
                className="form-control"
                placeholder="Design name…"
                value={filters.name}
                onChange={e => setFilter('name', e.target.value)}
              />
            </div>

            {/* Size */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Size</label>
              <select className="form-control" value={filters.size} onChange={e => setFilter('size', e.target.value)}>
                <option value="">All Sizes</option>
                {sizes.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Category */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Category</label>
              <select className="form-control" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Brand</label>
              <select className="form-control" value={filters.brand} onChange={e => setFilter('brand', e.target.value)}>
                <option value="">All Brands</option>
                {brands.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>

            {/* Finish */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Finish</label>
              <select className="form-control" value={filters.finish} onChange={e => setFilter('finish', e.target.value)}>
                <option value="">All Finishes</option>
                {finishes.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            {/* Color */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Color</label>
              <input
                className="form-control"
                placeholder="e.g. White, Beige…"
                value={filters.color}
                onChange={e => setFilter('color', e.target.value)}
              />
            </div>

            {/* Location (warehouse) */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Location</label>
              <input
                className="form-control"
                placeholder="Warehouse / city…"
                value={filters.location}
                onChange={e => setFilter('location', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>
        {results.length} product{results.length !== 1 ? 's' : ''} found
        {hasActiveFilter && <span style={{ marginLeft: 8, color: 'var(--primary)', fontWeight: 600 }}>— filters active</span>}
      </div>

      {/* No products */}
      {sharedProducts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <Package style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No products available</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Add products from Product Management first.</div>
        </div>
      )}

      {results.length === 0 && sharedProducts.length > 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <Search style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>No products match your filters</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Try adjusting or clearing the filters above.</div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={clearAll}>Clear Filters</button>
        </div>
      )}

      {/* ── Product Cards Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
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
              {/* Image area */}
              <div
                style={{ height: 170, background: 'linear-gradient(135deg,#e0e7ff 0%,#f0f4ff 100%)', position: 'relative', overflow: 'hidden', flexShrink: 0, cursor: p.image_urls?.[0] ? 'zoom-in' : 'default' }}
                onClick={() => p.image_urls?.length && setLightbox({ images: p.image_urls, index: 0, productName: p.name })}
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
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>{p.brand_name || p.brand || '—'}</span>
                </div>
                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span className={`badge ${stockColor}`} style={{ fontSize: 11 }}>
                    {p.stock > 0 ? `${Number(p.stock).toLocaleString()} ${p.unit}` : 'Out of Stock'}
                  </span>
                </div>
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

              {/* Card body */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                  {p.code}
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, lineHeight: 1.3 }}>
                  {p.name}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(p.category_name || p.category) && <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.category_name || p.category}</span>}
                  {(p.sub_category_name || p.sub_category) && <span className="badge badge-gray" style={{ fontSize: 10 }}>{p.sub_category_name || p.sub_category}</span>}
                  {p.unit && <span className="badge badge-gray" style={{ fontSize: 10 }}>{p.unit}</span>}
                </div>

                {/* Spec chips */}
                {[
                  p.size        && { label: 'Size',      val: p.size },
                  p.finish      && { label: 'Finish',    val: p.finish },
                  p.tile_type   && { label: 'Type',      val: p.tile_type },
                  p.grade       && { label: 'Grade',     val: p.grade },
                  p.material    && { label: 'Material',  val: p.material },
                  p.color       && { label: 'Color',     val: p.color },
                  p.thickness   && { label: 'Thickness', val: p.thickness },
                  p.gst_percent && { label: 'GST',       val: `${p.gst_percent}%` },
                  p.pcs_per_box && { label: 'Pcs/Box',   val: String(p.pcs_per_box) },
                  p.sqft_per_box&& { label: 'Sqft/Box',  val: parseFloat(p.sqft_per_box).toFixed(2) },
                  p.hsn_code    && { label: 'HSN',       val: p.hsn_code },
                ].filter(Boolean).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {[
                      p.size        && { label: 'Size',      val: p.size },
                      p.finish      && { label: 'Finish',    val: p.finish },
                      p.tile_type   && { label: 'Type',      val: p.tile_type },
                      p.grade       && { label: 'Grade',     val: p.grade },
                      p.material    && { label: 'Material',  val: p.material },
                      p.color       && { label: 'Color',     val: p.color },
                      p.thickness   && { label: 'Thickness', val: p.thickness },
                      p.gst_percent && { label: 'GST',       val: `${p.gst_percent}%` },
                      p.pcs_per_box && { label: 'Pcs/Box',   val: String(p.pcs_per_box) },
                      p.sqft_per_box&& { label: 'Sqft/Box',  val: parseFloat(p.sqft_per_box).toFixed(2) },
                      p.hsn_code    && { label: 'HSN',       val: p.hsn_code },
                    ].filter(Boolean).map(({ label, val }) => (
                      <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 7px', fontSize: 11, display: 'flex', gap: 3 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                        <span style={{ fontWeight: 600 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {p.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                    {p.description.length > 80 ? p.description.slice(0, 80) + '…' : p.description}
                  </div>
                )}

                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 12px' }} />

                {/* Pricing */}
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

                {/* Footer — warehouse only, NO enquiry button */}
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                  <MapPin style={{ width: 12 }} />
                  {p.warehouse}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══════ LIGHTBOX ═══════ */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 2 }}
          >
            <X size={20} />
          </button>
          <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontWeight: 700, fontSize: 15, background: 'rgba(0,0,0,0.5)', padding: '5px 16px', borderRadius: 20, whiteSpace: 'nowrap', maxWidth: '70vw', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lightbox.productName}
          </div>
          {lightbox.images.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length })) }}
              style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <img
            src={imgUrl(lightbox.images[lightbox.index])}
            alt="product"
            style={{ maxHeight: '80vh', maxWidth: '80vw', borderRadius: 10, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          />
          {lightbox.images.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: (lb.index + 1) % lb.images.length })) }}
              style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            >
              <ChevronRight size={22} />
            </button>
          )}
          <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
            {lightbox.index + 1} / {lightbox.images.length}
          </div>
        </div>
      )}
    </>
  )
}
