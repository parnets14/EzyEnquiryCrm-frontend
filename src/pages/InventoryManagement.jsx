import { useState } from 'react'
import { Search, AlertTriangle, TrendingDown, TrendingUp, Eye, X, Package, Warehouse as WarehouseIcon, RefreshCw } from 'lucide-react'

export default function InventoryManagement({ inventory = [], orders = [], purchases = [], products = [], transfers = [], loadingData = false }) {
  const [tab,       setTab]      = useState('stock')
  const [search,    setSearch]   = useState('')
  const [viewItem,  setViewItem] = useState(null)

  // ── Enrich inventory rows with all product details ──────────
  const stockRows = inventory.map(inv => {
    // Try to find full product details from products list
    const prodId = inv.product_id?._id || inv.product_id?.id || inv.product_id || ''
    const fullProd = products.find(p => (p._id || p.id) === prodId) || {}

    const stockIn  = Number(inv.stock_in)        || 0
    const stockOut = Number(inv.stock_out)       || 0
    const current  = Number(inv.current_stock)   || 0
    const lowAlert = Number(inv.low_stock_alert) || 0

    return {
      ...inv,
      stockIn,
      stockOut,
      current,
      lowAlert,
      // product info — from populated API response or full product
      name:          inv.product_name  || fullProd.name || inv.product_code || '',
      productCode:   inv.product_code  || fullProd.code || '',
      brand:         inv.brand_name    || fullProd.brand_name || '',
      category:      inv.category_name || fullProd.category_name || '',
      unit:          inv.unit          || fullProd.unit || 'Sq Ft',
      warehouse:     inv.warehouse_name || '—',
      // extra product details from full product object
      size:          fullProd.size          || inv.product_id?.size    || '',
      finish:        fullProd.finish        || inv.product_id?.finish  || '',
      tile_type:     fullProd.tile_type     || '',
      grade:         fullProd.grade         || '',
      mrp:           fullProd.mrp           || 0,
      retail_price:  fullProd.retail_price  || fullProd.retail_rate   || 0,
      dealer_price:  fullProd.dealer_price  || fullProd.dealer_rate   || 0,
      purchase_price:fullProd.purchase_price|| fullProd.purchase_rate || 0,
      pcs_per_box:   fullProd.pcs_per_box   || '',
      sqft_per_box:  fullProd.sqft_per_box  || '',
      gst_percent:   fullProd.gst_percent   || '',
      description:   fullProd.description  || '',
      is_active:     fullProd.is_active !== undefined ? fullProd.is_active : true,
      // status
      status: current === 0 ? 'Out' : current <= lowAlert ? 'Low' : 'OK',
    }
  })

  const filtered = stockRows.filter(s =>
    (s.name        ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.brand       ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.productCode ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Stock movements ─────────────────────────────────────────
  const purchaseMovements = purchases.map(p => ({
    type:      'IN',
    product:   p.product_name  || p.product_code || p.product || '',
    batch:     p.batch_number  || p.batch_no     || '',
    qty:       p.qty           || p.quantity     || 0,
    party:     p.supplier_name || p.supplier     || '',
    warehouse: p.warehouse_name || '—',
    date:      p.purchase_date || p.date         || '',
    ref:       p.purchase_code || p._id          || p.id      || '',
  }))

  const orderMovements = orders
    .filter(o => ['Dispatched', 'Delivered'].includes(o.status))
    .map(o => ({
      type:      'OUT',
      product:   o.product_name  || o.product     || '',
      batch:     o.batch_number  || o.batch_no    || '',
      qty:       o.qty           || o.quantity     || 0,
      party:     o.customer_name || o.customer     || '',
      warehouse: o.warehouse_name || '—',
      date:      o.order_date    || o.date         || '',
      ref:       o.order_code    || o._id          || o.id     || '',
    }))

  // Warehouse transfers → two movement records per transfer (TRANSFER OUT + TRANSFER IN)
  const transferMovements = transfers.flatMap(t => {
    const product   = t.product_name  || t.product_code || ''
    const batch     = t.batch_number  || t.batch_no     || ''
    const qty       = t.quantity      || 0
    const ref       = t.transfer_code || t._id          || t.id || ''
    const date      = t.transfer_date || t.created_at   || ''
    return [
      {
        type:      'TRANSFER OUT',
        product,
        batch,
        qty,
        party:     '—',
        warehouse: t.from_warehouse_name || t.from_warehouse?.name || '—',
        date,
        ref,
      },
      {
        type:      'TRANSFER IN',
        product,
        batch,
        qty,
        party:     '—',
        warehouse: t.to_warehouse_name || t.to_warehouse?.name || '—',
        date,
        ref,
      },
    ]
  })

  const allMovements = [...purchaseMovements, ...orderMovements, ...transferMovements]
    .sort((a, b) => {
      // Sort by date descending, fall back to ref
      const da = a.date ? new Date(a.date) : 0
      const db = b.date ? new Date(b.date) : 0
      return db - da || (b.ref ?? '').localeCompare(a.ref ?? '')
    })

  // ── Movement badge style helper ──────────────────────────────
  const movementStyle = (type) => {
    if (type === 'IN')           return { bg: '#dcfce7', color: '#16a34a', border: '#86efac', label: '↑ IN' }
    if (type === 'OUT')          return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: '↓ OUT' }
    if (type === 'TRANSFER OUT') return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: '⇄ TRANSFER OUT' }
    if (type === 'TRANSFER IN')  return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: '⇄ TRANSFER IN' }
    return                              { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: type }
  }

  // ── Status badge style helper ───────────────────────────────
  const statusStyle = (status) => {
    if (status === 'OK')  return { bg: '#dcfce7', color: '#16a34a', border: '#86efac', label: 'In Stock' }
    if (status === 'Low') return { bg: '#fef9c3', color: '#b45309', border: '#fde68a', label: 'Low Stock' }
    return                       { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: 'Out of Stock' }
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Products &amp; Stock</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Inventory Management</span>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Products',   val: stockRows.length,                                            color: 'blue',   icon: <TrendingUp /> },
          { label: 'Low Stock',        val: stockRows.filter(s => s.status === 'Low').length,            color: 'orange', icon: <AlertTriangle /> },
          { label: 'Out of Stock',     val: stockRows.filter(s => s.status === 'Out').length,            color: 'red',    icon: <TrendingDown /> },
          { label: 'Total Sq Ft Held', val: stockRows.reduce((a, s) => a + s.current, 0).toLocaleString(), color: 'green',  icon: <TrendingUp /> },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['stock', 'Current Stock'], ['movements', 'Stock Movements']].map(([k, l]) => (
          <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ═══ CURRENT STOCK TAB ═══ */}
      {tab === 'stock' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Live Stock Levels ({filtered.length})</span>
            <div className="header-actions">
              <div className="search-bar">
                <Search size={14} />
                <input
                  placeholder="Search product, brand, code…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Product Name</th>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Brand</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Warehouse</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Stock In</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Stock Out</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Current Stock</th>
                  <th style={thStyle}>Unit</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Low Alert</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loadingData && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      <RefreshCw size={24} style={{ opacity: .4, display: 'block', margin: '0 auto 8px' }} />
                      Loading inventory...
                    </td>
                  </tr>
                )}
                {!loadingData && filtered.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      <Package size={32} style={{ opacity: .25, display: 'block', margin: '0 auto 8px' }} />
                      {search
                        ? 'No records found.'
                        : inventory.length === 0
                          ? 'No stock available.'
                          : 'No records found.'}
                    </td>
                  </tr>
                )}
                {!loadingData && filtered.map((s, i) => {
                  const ss = statusStyle(s.status)
                  return (
                    <tr key={s._id || s.id || i}>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>

                      {/* Product Name */}
                      <td style={{ ...tdStyle, fontWeight: 700, maxWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name || '—'}</div>
                        {s.size && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {s.size}{s.finish ? ` · ${s.finish}` : ''}
                          </div>
                        )}
                      </td>

                      {/* Code */}
                      <td style={{ ...tdStyle, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {s.productCode || '—'}
                      </td>

                      <td style={{ ...tdStyle, fontSize: 12 }}>{s.brand || '—'}</td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>{s.category || '—'}</td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <WarehouseIcon size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          {s.warehouse}
                        </span>
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                        +{s.stockIn.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: s.stockOut > 0 ? '#dc2626' : 'var(--text-muted)', fontWeight: 600 }}>
                        {s.stockOut > 0 ? `-${s.stockOut.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, fontSize: 15,
                        color: s.current === 0 ? '#dc2626' : s.current <= s.lowAlert ? '#d97706' : 'var(--text)' }}>
                        {s.current.toLocaleString()}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>{s.unit}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
                        {s.lowAlert}
                      </td>

                      {/* Status + View button */}
                      <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <span style={{
                            background: ss.bg, color: ss.color,
                            border: `1px solid ${ss.border}`,
                            borderRadius: 20, padding: '3px 10px',
                            fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap',
                          }}>
                            {ss.label}
                          </span>
                          <button
                            title="View Product Details"
                            onClick={() => setViewItem(s)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 6,
                              background: '#eff6ff', border: '1px solid #bfdbfe',
                              color: '#2563eb', cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            <Eye size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ MOVEMENTS TAB ═══ */}
      {tab === 'movements' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Stock Movements (Auto-tracked)</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Batch No.</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                  <th style={thStyle}>Party / Customer</th>
                  <th style={thStyle}>Warehouse</th>
                  <th style={thStyle}>Reference</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {loadingData && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      <RefreshCw size={24} style={{ opacity: .4, display: 'block', margin: '0 auto 8px' }} />
                      Loading movements...
                    </td>
                  </tr>
                )}
                {!loadingData && allMovements.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No stock movements found.
                    </td>
                  </tr>
                )}
                {!loadingData && allMovements.map((m, i) => {
                  const ms = movementStyle(m.type)
                  return (
                    <tr key={i}>
                      <td style={tdStyle}>
                        <span style={{
                          background: ms.bg, color: ms.color,
                          border: `1px solid ${ms.border}`,
                          borderRadius: 20, padding: '3px 10px',
                          fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap',
                        }}>
                          {ms.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 600, fontSize: 13 }}>{m.product || '—'}</td>
                      <td style={{ ...tdStyle, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {m.batch || '—'}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, textAlign: 'right' }}>{m.qty}</td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>{m.party || '—'}</td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>{m.warehouse}</td>
                      <td style={{ ...tdStyle, color: 'var(--primary)', fontSize: 12, fontFamily: 'monospace' }}>{m.ref}</td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>
                        {m.date ? new Date(m.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ PRODUCT DETAIL VIEW MODAL ═══════════ */}
      {viewItem && (
        <div
          className="modal-overlay"
          onClick={() => setViewItem(null)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="modal"
            style={{ maxWidth: 680, width: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Package style={{ color: 'var(--primary)', width: 20 }} />
                <span className="modal-title">Product Inventory Details</span>
              </div>
              <button className="btn-ghost" onClick={() => setViewItem(null)}><X size={18} /></button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: 0, overflowY: 'auto', flex: 1 }}>

              {/* Top header strip */}
              <div style={{
                padding: '16px 22px',
                background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Product Name</div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--text)', lineHeight: 1.2 }}>
                    {viewItem.name || '—'}
                  </div>
                  {viewItem.productCode && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'monospace' }}>
                      Code: {viewItem.productCode}
                    </div>
                  )}
                </div>
                {/* Status badge */}
                {(() => {
                  const ss = statusStyle(viewItem.status)
                  return (
                    <span style={{
                      background: ss.bg, color: ss.color,
                      border: `1.5px solid ${ss.border}`,
                      borderRadius: 20, padding: '6px 16px',
                      fontWeight: 700, fontSize: 14, flexShrink: 0,
                    }}>
                      {viewItem.status === 'OK' ? '✅' : viewItem.status === 'Low' ? '⚠️' : '❌'} {ss.label}
                    </span>
                  )
                })()}
              </div>

              <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Stock Summary */}
                <div>
                  <div style={sectionTitle}>Stock Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    {[
                      { label: 'Stock In',      val: `+${viewItem.stockIn.toLocaleString()}`,  color: '#16a34a', bg: '#f0fdf4' },
                      { label: 'Stock Out',     val: viewItem.stockOut > 0 ? `-${viewItem.stockOut.toLocaleString()}` : '—', color: viewItem.stockOut > 0 ? '#dc2626' : 'var(--text-muted)', bg: viewItem.stockOut > 0 ? '#fff1f2' : 'var(--bg)' },
                      { label: 'Current Stock', val: viewItem.current.toLocaleString(),         color: viewItem.current === 0 ? '#dc2626' : viewItem.current <= viewItem.lowAlert ? '#d97706' : 'var(--text)', bg: 'var(--bg)', bold: true },
                      { label: 'Low Alert',     val: viewItem.lowAlert || '—',                 color: 'var(--text-muted)', bg: 'var(--bg)' },
                    ].map((f, idx) => (
                      <div key={f.label} style={{
                        padding: '14px 16px', textAlign: 'center',
                        borderRight: idx < 3 ? '1px solid var(--border)' : 'none',
                        background: f.bg,
                      }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{f.label}</div>
                        <div style={{ fontSize: f.bold ? 22 : 18, fontWeight: f.bold ? 800 : 700, color: f.color }}>{f.val}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{viewItem.unit}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Product Details */}
                <div>
                  <div style={sectionTitle}>Product Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px' }}>
                    {[
                      { label: 'Brand',        val: viewItem.brand    || '—' },
                      { label: 'Category',     val: viewItem.category || '—' },
                      { label: 'Size',         val: viewItem.size     || '—' },
                      { label: 'Finish',       val: viewItem.finish   || '—' },
                      { label: 'Tile Type',    val: viewItem.tile_type|| '—' },
                      { label: 'Grade',        val: viewItem.grade    || '—' },
                      { label: 'Unit',         val: viewItem.unit     || '—' },
                      { label: 'GST %',        val: viewItem.gst_percent ? `${viewItem.gst_percent}%` : '—' },
                      { label: 'Pcs / Box',    val: viewItem.pcs_per_box  ? String(viewItem.pcs_per_box)  : '—' },
                      { label: 'Sqft / Box',   val: viewItem.sqft_per_box ? parseFloat(viewItem.sqft_per_box).toFixed(2) : '—' },
                    ].map(f => (
                      <div key={f.label} style={{ background: 'var(--bg)', borderRadius: 7, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 3 }}>{f.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: f.val === '—' ? 'var(--text-muted)' : 'var(--text)' }}>{f.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                {(viewItem.mrp > 0 || viewItem.retail_price > 0 || viewItem.dealer_price > 0 || viewItem.purchase_price > 0) && (
                  <div>
                    <div style={sectionTitle}>Pricing</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px 12px' }}>
                      {[
                        { label: 'MRP',            val: viewItem.mrp            > 0 ? `₹${parseFloat(viewItem.mrp).toLocaleString('en-IN')}` : '—' },
                        { label: 'Retail Price',   val: viewItem.retail_price   > 0 ? `₹${parseFloat(viewItem.retail_price).toLocaleString('en-IN')}` : '—' },
                        { label: 'Dealer Price',   val: viewItem.dealer_price   > 0 ? `₹${parseFloat(viewItem.dealer_price).toLocaleString('en-IN')}` : '—' },
                        { label: 'Purchase Price', val: viewItem.purchase_price > 0 ? `₹${parseFloat(viewItem.purchase_price).toLocaleString('en-IN')}` : '—', highlight: true },
                      ].map(f => (
                        <div key={f.label} style={{ background: f.highlight ? '#f0fdf4' : 'var(--bg)', border: f.highlight ? '1px solid #86efac' : '1px solid var(--border)', borderRadius: 7, padding: '10px 12px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 4 }}>{f.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: f.highlight ? '#059669' : f.val === '—' ? 'var(--text-muted)' : 'var(--text)' }}>{f.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warehouse */}
                <div>
                  <div style={sectionTitle}>Warehouse</div>
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <WarehouseIcon size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{viewItem.warehouse}</span>
                  </div>
                </div>

                {/* Description */}
                {viewItem.description && (
                  <div>
                    <div style={sectionTitle}>Description</div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                      {viewItem.description}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ── Table cell styles ── */
const thStyle = {
  padding: '9px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
}

const tdStyle = {
  padding: '10px 12px',
  fontSize: 13,
  verticalAlign: 'middle',
}

const sectionTitle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  color: 'var(--text-muted)',
  marginBottom: 8,
}
