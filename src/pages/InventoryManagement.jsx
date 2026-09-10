import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, AlertTriangle, TrendingDown, TrendingUp, Package,
  Warehouse as WarehouseIcon, RefreshCw, X, ChevronDown, ChevronUp,
  ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Edit3, Clock,
  BarChart2, Boxes, ShieldAlert, Truck,
} from 'lucide-react'
import { inventoryApi } from '../api/inventoryApi'

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
const fmtN  = n => Number(n || 0).toLocaleString('en-IN')
const fmtD  = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const fmtDT = d => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'

function stockStatus(row) {
  // Backward-compat: old records only have current_stock, not available_stock
  const avail = (Number(row.available_stock) || 0) > 0
    ? Number(row.available_stock)
    : (Number(row.current_stock) || 0)
  const alert = Number(row.low_stock_alert) || 0
  if (avail <= 0)                  return 'out'
  if (alert > 0 && avail <= alert) return 'low'
  return 'ok'
}

const STATUS_STYLE = {
  ok:  { bg:'#ecfdf5', color:'#059669', border:'#a7f3d0', label:'In Stock' },
  low: { bg:'#fffbeb', color:'#d97706', border:'#fde68a', label:'Low Stock' },
  out: { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', label:'Out of Stock' },
}

const MOVEMENT_STYLE = {
  'Stock In':    { bg:'#ecfdf5', color:'#059669', border:'#a7f3d0', icon:<ArrowUpCircle   size={13}/>, label:'Stock In'    },
  'Stock Out':   { bg:'#fef2f2', color:'#dc2626', border:'#fecaca', icon:<ArrowDownCircle size={13}/>, label:'Stock Out'   },
  'Transfer In': { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe', icon:<ArrowLeftRight  size={13}/>, label:'Transfer In' },
  'Transfer Out':{ bg:'#fef9c3', color:'#b45309', border:'#fde68a', icon:<ArrowLeftRight  size={13}/>, label:'Transfer Out'},
  Reversal:      { bg:'#f3f4f6', color:'#6b7280', border:'#e5e7eb', icon:<RefreshCw       size={13}/>, label:'Reversal'    },
}

/* ─────────────────────────────────────────────────────────────
   Bucket chip
───────────────────────────────────────────────────────────── */
function Bucket({ label, value, color = '#1d4ed8', bg = '#eff6ff', border = '#bfdbfe', unit = '' }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 10,
      padding: '10px 14px', textAlign: 'center', minWidth: 0,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{fmtN(value)}</div>
      {unit && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{unit}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────── */
export default function InventoryManagement({ branches = [], inventory: inventoryProp = [], warehouses: warehousesProp = [] }) {
  const [tab,          setTab]          = useState('stock')
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')   // all | ok | low | out
  const [warehouseFilter, setWFilter]   = useState('all')
  const [expandedId,   setExpandedId]   = useState(null)

  // ── Data state ──────────────────────────────────────────
  const [inventory,  setInventory]  = useState(inventoryProp || [])
  const [movements,  setMovements]  = useState([])
  const [summary,    setSummary]    = useState(null)
  const [warehouses, setWarehouses] = useState(warehousesProp || [])
  const [loading,    setLoading]    = useState(false)
  const [loadingMov, setLoadingMov] = useState(false)

  // ── Adjust modal state ──────────────────────────────────
  const [adjustTarget, setAdjustTarget] = useState(null)  // inventory row
  const [adjForm,      setAdjForm]      = useState({ adjustment: '', reason: '', purchase_rate: '' })
  const [adjSaving,    setAdjSaving]    = useState(false)
  const [adjMsg,       setAdjMsg]       = useState('')

  // ── Movements filter state ──────────────────────────────
  const [movType,    setMovType]    = useState('all')
  const [movSearch,  setMovSearch]  = useState('')
  const [movPage,    setMovPage]    = useState(1)
  const [movTotal,   setMovTotal]   = useState(0)
  const MOV_LIMIT = 50

  // ── Load inventory + summary ─────────────────────────────
  // Always fetches ALL records (no server-side status/warehouse filter).
  // Status and warehouse filtering is done client-side so switching chips
  // never triggers a network round-trip.
  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      // _t busts the 304 browser cache so every Refresh click hits the server
      const params = { limit: 500, _t: Date.now() }
      if (warehouseFilter !== 'all') params.warehouse_id = warehouseFilter

      const [invRes, sumRes, whRes] = await Promise.allSettled([
        inventoryApi.list(params),
        inventoryApi.getSummary ? inventoryApi.getSummary() : Promise.resolve(null),
        inventoryApi.listWarehouses ? inventoryApi.listWarehouses() : Promise.resolve(null),
      ])

      if (invRes.status === 'fulfilled') {
        const d = invRes.value?.data || invRes.value
        const rows = Array.isArray(d) ? d : (Array.isArray(d?.inventory) ? d.inventory : [])
        setInventory(rows)
      }
      if (sumRes.status === 'fulfilled' && sumRes.value) {
        const d = sumRes.value?.data || sumRes.value
        setSummary(d)
      }
      if (whRes.status === 'fulfilled' && whRes.value) {
        const d = whRes.value?.data || whRes.value
        setWarehouses(Array.isArray(d) ? d : (Array.isArray(d?.warehouses) ? d.warehouses : []))
      }
    } finally {
      setLoading(false)
    }
  }, [warehouseFilter])   // statusFilter intentionally NOT here — filtering is client-side

  // ── Load movements ────────────────────────────────────────
  const loadMovements = useCallback(async (page = 1) => {
    setLoadingMov(true)
    try {
      const params = { limit: MOV_LIMIT, page }
      if (movType !== 'all') params.movement_type = movType
      if (movSearch)         params.search        = movSearch

      const res = await inventoryApi.listMovements(params)
      const d   = res?.data || res
      setMovements(d?.movements || (Array.isArray(d) ? d : []))
      setMovTotal(d?.pagination?.total || 0)
      setMovPage(page)
    } finally {
      setLoadingMov(false)
    }
  }, [movType, movSearch])

  useEffect(() => { loadInventory() }, [loadInventory])

  useEffect(() => {
    if (tab === 'movements') loadMovements(1)
  }, [tab, loadMovements])

  // ── Filtered inventory rows ──────────────────────────────
  const q = search.toLowerCase()
  const filtered = inventory.filter(inv => {
    if (!inv.product_id) return false
    const name = (inv.product_name || '').toLowerCase()
    const code = (inv.product_code || '').toLowerCase()
    const brand= (inv.brand_name   || '').toLowerCase()
    const cat  = (inv.category_name|| '').toLowerCase()
    const wh   = (inv.warehouse_name|| '').toLowerCase()
    const matchSearch = !q || name.includes(q) || code.includes(q) || brand.includes(q) || cat.includes(q) || wh.includes(q)
    const st = stockStatus(inv)
    const matchStatus = statusFilter === 'all' || st === statusFilter
    return matchSearch && matchStatus
  })

  // ── Adjust submit ────────────────────────────────────────
  const handleAdjust = async () => {
    if (!adjustTarget) return
    const adj = parseFloat(adjForm.adjustment)
    if (!adj || isNaN(adj)) { setAdjMsg('Enter a valid non-zero adjustment.'); return }
    setAdjSaving(true); setAdjMsg('')
    try {
      const payload = {
        product_id:   adjustTarget.product_id?._id || adjustTarget.product_id,
        warehouse_id: adjustTarget.warehouse_id?._id || adjustTarget.warehouse_id || undefined,
        adjustment:   adj,
        reason:       adjForm.reason || (adj > 0 ? 'Manual stock in' : 'Manual stock out'),
        reference_type: 'Manual',
      }
      if (adjForm.purchase_rate) payload.purchase_rate = parseFloat(adjForm.purchase_rate)
      await inventoryApi.adjust(payload)
      setAdjMsg(`✓ Stock ${adj > 0 ? 'added' : 'deducted'} successfully.`)
      setTimeout(() => {
        setAdjustTarget(null)
        setAdjForm({ adjustment: '', reason: '', purchase_rate: '' })
        setAdjMsg('')
        loadInventory()
      }, 1200)
    } catch (e) {
      setAdjMsg(e?.response?.data?.message || 'Adjustment failed.')
    } finally {
      setAdjSaving(false)
    }
  }

  // ── KPI cards — always from full inventory, not filtered subset ──
  const allRows        = inventory  // alias for clarity
  const totalPhysical  = summary?.total_physical   ?? allRows.reduce((a,r) => a + (Number(r.physical_stock)  || Number(r.current_stock) || 0), 0)
  const totalAvailable = summary?.total_available  ?? allRows.reduce((a,r) => a + (Number(r.available_stock) || Number(r.current_stock) || 0), 0)
  const totalReserved  = summary?.total_reserved   ?? allRows.reduce((a,r) => a + (Number(r.reserved_stock)  || 0), 0)
  const totalBlocked   = summary?.total_blocked    ?? allRows.reduce((a,r) => a + (Number(r.blocked_stock)   || 0), 0)
  const lowCount       = summary?.low_stock        ?? allRows.filter(r => stockStatus(r) === 'low').length
  const outCount       = summary?.out_of_stock     ?? allRows.filter(r => stockStatus(r) === 'out').length
  const stockValue     = summary?.total_stock_value ?? 0

  return (
    <>
      <div className="breadcrumb">
        <span>Purchase &amp; Inventory</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Inventory Management</span>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Available Stock', val: fmtN(totalAvailable), icon:<Boxes size={18}/>,        color:'#059669', bg:'#ecfdf5', border:'#a7f3d0' },
          { label:'Physical Stock',  val: fmtN(totalPhysical),  icon:<BarChart2 size={18}/>,    color:'#1d4ed8', bg:'#eff6ff', border:'#bfdbfe' },
          { label:'Low Stock SKUs',  val: fmtN(lowCount),       icon:<AlertTriangle size={18}/>,color:'#d97706', bg:'#fffbeb', border:'#fde68a', clickFilter:'low' },
          { label:'Out of Stock',    val: fmtN(outCount),       icon:<ShieldAlert size={18}/>,  color:'#dc2626', bg:'#fef2f2', border:'#fecaca', clickFilter:'out' },
        ].map(k => (
          <div key={k.label}
            onClick={() => k.clickFilter && setStatusFilter(prev => prev === k.clickFilter ? 'all' : k.clickFilter)}
            style={{
              background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 12,
              padding: '14px 18px', display:'flex', alignItems:'center', gap:12,
              cursor: k.clickFilter ? 'pointer' : 'default',
              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              outline: statusFilter === k.clickFilter ? `2px solid ${k.color}` : 'none',
            }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,.7)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: k.color }}>
              {k.icon}
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color: k.color, marginBottom:2 }}>{k.label}</div>
              <div style={{ fontSize:22, fontWeight:900, color: k.color, lineHeight:1 }}>{k.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Secondary KPIs: reserved / blocked / stock value ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'Reserved (for orders)', val: fmtN(totalReserved), color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe' },
          { label:'Blocked / QC Hold',     val: fmtN(totalBlocked),  color:'#b45309', bg:'#fffbeb', border:'#fde68a' },
          { label:'Stock Value (Cost)',     val: stockValue > 0 ? `₹${fmtN(stockValue)}` : '—', color:'#0f766e', bg:'#f0fdfa', border:'#99f6e4' },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius:10, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:600, color: k.color }}>{k.label}</span>
            <span style={{ fontSize:16, fontWeight:800, color: k.color }}>{k.val}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom:0 }}>
        {[
          ['stock',     'Current Stock'],
          ['movements', 'Stock Movements'],
        ].map(([k, l]) => (
          <button key={k} className={`tab-btn${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: CURRENT STOCK
      ══════════════════════════════════════════════════════ */}
      {tab === 'stock' && (
        <div className="card" style={{ marginTop:0, borderTopLeftRadius:0 }}>
          {/* Toolbar */}
          <div className="card-header" style={{ flexWrap:'wrap', gap:10 }}>
            <span className="card-title">Live Stock ({filtered.length})</span>
            <div className="header-actions" style={{ flexWrap:'wrap', gap:8 }}>
              <div className="search-bar">
                <Search size={14}/>
                <input placeholder="Search product, code, brand, warehouse…" value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              {/* Status filter */}
              <select className="form-control" style={{ width:140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="ok">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
              {/* Warehouse filter */}
              {warehouses.length > 0 && (
                <select className="form-control" style={{ width:150 }} value={warehouseFilter} onChange={e => setWFilter(e.target.value)}>
                  <option value="all">All Warehouses</option>
                  {warehouses.map(w => <option key={w._id||w.id} value={w._id||w.id}>{w.name}</option>)}
                </select>
              )}
              <button className="btn btn-secondary" onClick={loadInventory} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
                Refresh
              </button>
            </div>
          </div>

          {/* Status filter pills (quick access) */}
          <div style={{ display:'flex', gap:8, padding:'0 20px 14px', flexWrap:'wrap' }}>
            {Object.entries(STATUS_STYLE).map(([k, s]) => (
              <button key={k}
                onClick={() => setStatusFilter(prev => prev === k ? 'all' : k)}
                style={{
                  padding:'3px 12px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer',
                  background: statusFilter === k ? s.color : s.bg,
                  color:      statusFilter === k ? '#fff'   : s.color,
                  border:`1.5px solid ${s.border}`,
                }}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Product</th>
                  <th style={th}>Warehouse</th>
                  <th style={{ ...th, textAlign:'center' }}>Available</th>
                  <th style={{ ...th, textAlign:'center' }}>Physical</th>
                  <th style={{ ...th, textAlign:'center' }}>Reserved</th>
                  <th style={{ ...th, textAlign:'center' }}>Packed</th>
                  <th style={{ ...th, textAlign:'center' }}>Blocked</th>
                  <th style={{ ...th, textAlign:'center' }}>Min Alert</th>
                  <th style={{ ...th, textAlign:'center' }}>Status</th>
                  <th style={{ ...th, textAlign:'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={11} style={emptyCell}>
                    <RefreshCw size={24} style={{ opacity:.3, display:'block', margin:'0 auto 8px' }}/>
                    Loading inventory…
                  </td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={11} style={emptyCell}>
                    <Package size={32} style={{ opacity:.2, display:'block', margin:'0 auto 8px' }}/>
                    {search || statusFilter !== 'all' ? 'No matching records.' : 'No inventory records found. Create a purchase order to add stock.'}
                  </td></tr>
                )}
                {!loading && filtered.map((inv, i) => {
                  const id  = String(inv._id || inv.id || i)
                  const st  = stockStatus(inv)
                  const ss  = STATUS_STYLE[st]
                  const isExpanded = expandedId === id
                  const avail = Number(inv.available_stock) || 0
                  const phys  = Number(inv.physical_stock)  || 0
                  const res   = Number(inv.reserved_stock)  || 0
                  const pkd   = Number(inv.packed_stock)    || 0
                  const blk   = Number(inv.blocked_stock)   || 0
                  const alert = Number(inv.low_stock_alert) || 0
                  const unit  = inv.unit || ''

                  return (
                    <>
                      <tr key={id} style={{ background: isExpanded ? '#f8fafc' : undefined }}>
                        <td style={{ ...td, color:'var(--text-muted)', fontSize:12 }}>{i+1}</td>

                        {/* Product info */}
                        <td style={td}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{inv.product_name || '—'}</div>
                          {inv.product_code && (
                            <div style={{ fontFamily:'monospace', fontSize:11, color:'var(--primary)', marginTop:2 }}>{inv.product_code}</div>
                          )}
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                            {[inv.brand_name, inv.category_name].filter(Boolean).join(' · ')}
                          </div>
                        </td>

                        {/* Warehouse */}
                        <td style={{ ...td, fontSize:12 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <WarehouseIcon size={12} style={{ color:'var(--text-muted)', flexShrink:0 }}/>
                            <span style={{ fontWeight:600 }}>{inv.warehouse_name || '—'}</span>
                          </div>
                        </td>

                        {/* Available — most prominent */}
                        <td style={{ ...td, textAlign:'center' }}>
                          <div style={{
                            display:'inline-block', padding:'4px 12px', borderRadius:20, fontSize:14, fontWeight:900,
                            background: st === 'out' ? '#fef2f2' : st === 'low' ? '#fffbeb' : '#ecfdf5',
                            color:      st === 'out' ? '#dc2626' : st === 'low' ? '#d97706' : '#059669',
                          }}>
                            {fmtN(avail)}
                          </div>
                          <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{unit}</div>
                        </td>

                        {/* Physical */}
                        <td style={{ ...td, textAlign:'center', fontWeight:700, color:'#1d4ed8' }}>{fmtN(phys)}</td>

                        {/* Reserved */}
                        <td style={{ ...td, textAlign:'center', color: res > 0 ? '#7c3aed' : 'var(--text-muted)', fontWeight: res > 0 ? 700 : 400 }}>
                          {res > 0 ? fmtN(res) : '—'}
                        </td>

                        {/* Packed */}
                        <td style={{ ...td, textAlign:'center', color: pkd > 0 ? '#0e7490' : 'var(--text-muted)', fontWeight: pkd > 0 ? 700 : 400 }}>
                          {pkd > 0 ? fmtN(pkd) : '—'}
                        </td>

                        {/* Blocked */}
                        <td style={{ ...td, textAlign:'center', color: blk > 0 ? '#b45309' : 'var(--text-muted)', fontWeight: blk > 0 ? 700 : 400 }}>
                          {blk > 0 ? fmtN(blk) : '—'}
                        </td>

                        {/* Min Alert */}
                        <td style={{ ...td, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>
                          {alert > 0 ? fmtN(alert) : '—'}
                        </td>

                        {/* Status badge */}
                        <td style={{ ...td, textAlign:'center' }}>
                          <span style={{
                            background:ss.bg, color:ss.color, border:`1px solid ${ss.border}`,
                            borderRadius:20, padding:'3px 10px', fontWeight:700, fontSize:11, whiteSpace:'nowrap',
                          }}>
                            {ss.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ ...td, textAlign:'center' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            {/* Expand row */}
                            <button title="View breakdown" onClick={() => setExpandedId(prev => prev === id ? null : id)}
                              style={{ ...iconBtn, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#2563eb' }}>
                              {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </button>
                            {/* Adjust stock */}
                            <button title="Adjust stock" onClick={() => { setAdjustTarget(inv); setAdjForm({ adjustment:'', reason:'', purchase_rate: inv.purchase_rate||'' }) }}
                              style={{ ...iconBtn, background:'#f0fdf4', border:'1px solid #a7f3d0', color:'#059669' }}>
                              <Edit3 size={14}/>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr key={`${id}-exp`}>
                          <td colSpan={11} style={{ padding:'0 0 0 0', background:'#f8fafc', borderBottom:'2px solid var(--border)' }}>
                            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>

                              {/* Bucket breakdown grid */}
                              <div>
                                <div style={secLabel}>Stock Bucket Breakdown</div>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8 }}>
                                  <Bucket label="Available"  value={avail} color="#059669" bg="#ecfdf5" border="#a7f3d0" unit={unit}/>
                                  <Bucket label="Physical"   value={phys}  color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" unit={unit}/>
                                  <Bucket label="Reserved"   value={res}   color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" unit={unit}/>
                                  <Bucket label="Picking"    value={Number(inv.picking_stock)||0} color="#0e7490" bg="#ecfeff" border="#a5f3fc" unit={unit}/>
                                  <Bucket label="Packed"     value={pkd}   color="#0f766e" bg="#f0fdfa" border="#99f6e4" unit={unit}/>
                                  <Bucket label="Blocked"    value={blk}   color="#b45309" bg="#fffbeb" border="#fde68a" unit={unit}/>
                                </div>
                              </div>

                              {/* Stock flow equation */}
                              <div style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>
                                Physical = Available + Reserved + Picking + Packed + Blocked&nbsp;
                                ({fmtN(avail)} + {fmtN(res)} + {fmtN(Number(inv.picking_stock)||0)} + {fmtN(pkd)} + {fmtN(blk)} = {fmtN(phys)})
                              </div>

                              {/* Stats row */}
                              <div style={{ display:'flex', gap:24, flexWrap:'wrap', fontSize:12 }}>
                                <span><strong>Dispatched (total):</strong> {fmtN(inv.dispatched_qty)} {unit}</span>
                                <span><strong>Stock In (total):</strong>   {fmtN(inv.stock_in)} {unit}</span>
                                <span><strong>Stock Out (total):</strong>  {fmtN(inv.stock_out)} {unit}</span>
                                {inv.purchase_rate > 0 && <span><strong>Purchase Rate:</strong> ₹{fmtN(inv.purchase_rate)}</span>}
                                {Number(inv.reorder_level) > 0 && <span><strong>Reorder Level:</strong> {fmtN(inv.reorder_level)} {unit}</span>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: STOCK MOVEMENTS
      ══════════════════════════════════════════════════════ */}
      {tab === 'movements' && (
        <div className="card" style={{ marginTop:0, borderTopLeftRadius:0 }}>
          <div className="card-header" style={{ flexWrap:'wrap', gap:10 }}>
            <span className="card-title">
              Stock Movements{movTotal > 0 ? ` (${fmtN(movTotal)} total)` : ''}
            </span>
            <div className="header-actions" style={{ flexWrap:'wrap', gap:8 }}>
              <div className="search-bar">
                <Search size={14}/>
                <input placeholder="Search product or reference…" value={movSearch} onChange={e => { setMovSearch(e.target.value); loadMovements(1) }}/>
              </div>
              <select className="form-control" style={{ width:150 }} value={movType} onChange={e => { setMovType(e.target.value); loadMovements(1) }}>
                <option value="all">All Types</option>
                <option value="Stock In">Stock In</option>
                <option value="Stock Out">Stock Out</option>
                <option value="Transfer In">Transfer In</option>
                <option value="Transfer Out">Transfer Out</option>
                <option value="Reversal">Reversal</option>
              </select>
              <button className="btn btn-secondary" onClick={() => loadMovements(movPage)} disabled={loadingMov} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <RefreshCw size={14} style={{ animation: loadingMov ? 'spin 1s linear infinite' : 'none' }}/>
                Refresh
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={th}>Type</th>
                  <th style={th}>Product</th>
                  <th style={th}>Warehouse</th>
                  <th style={{ ...th, textAlign:'right' }}>Qty</th>
                  <th style={{ ...th, textAlign:'right' }}>Before</th>
                  <th style={{ ...th, textAlign:'right' }}>After</th>
                  <th style={th}>Reference</th>
                  <th style={th}>Notes</th>
                  <th style={th}>By</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {loadingMov && (
                  <tr><td colSpan={10} style={emptyCell}>
                    <RefreshCw size={22} style={{ opacity:.3, display:'block', margin:'0 auto 8px', animation:'spin 1s linear infinite' }}/>
                    Loading movements…
                  </td></tr>
                )}
                {!loadingMov && movements.length === 0 && (
                  <tr><td colSpan={10} style={emptyCell}>
                    <Clock size={28} style={{ opacity:.2, display:'block', margin:'0 auto 8px' }}/>
                    No stock movements found.
                  </td></tr>
                )}
                {!loadingMov && movements.map((m, i) => {
                  const ms = MOVEMENT_STYLE[m.movement_type] || MOVEMENT_STYLE['Reversal']
                  const isIn  = m.movement_type === 'Stock In'   || m.movement_type === 'Transfer In'
                  const isOut = m.movement_type === 'Stock Out'  || m.movement_type === 'Transfer Out'
                  return (
                    <tr key={m._id || i}>
                      <td style={td}>
                        <span style={{
                          display:'inline-flex', alignItems:'center', gap:5,
                          background:ms.bg, color:ms.color, border:`1px solid ${ms.border}`,
                          borderRadius:20, padding:'3px 10px', fontWeight:700, fontSize:11, whiteSpace:'nowrap',
                        }}>
                          {ms.icon} {ms.label}
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight:700, fontSize:12 }}>{m.product_name || m.product_id?.name || '—'}</div>
                        {(m.product_code || m.product_id?.code) && (
                          <div style={{ fontFamily:'monospace', fontSize:10, color:'var(--text-muted)' }}>{m.product_code || m.product_id?.code}</div>
                        )}
                      </td>
                      <td style={{ ...td, fontSize:12 }}>{m.warehouse_name || m.warehouse_id?.name || '—'}</td>
                      <td style={{ ...td, textAlign:'right', fontWeight:800, fontSize:14,
                        color: isIn ? '#059669' : isOut ? '#dc2626' : '#7c3aed' }}>
                        {isIn ? '+' : isOut ? '−' : '⇄'}{fmtN(m.quantity)}
                      </td>
                      <td style={{ ...td, textAlign:'right', fontSize:12, color:'var(--text-muted)' }}>{fmtN(m.previous_stock)}</td>
                      <td style={{ ...td, textAlign:'right', fontSize:12, fontWeight:700, color: isIn ? '#059669' : '#dc2626' }}>{fmtN(m.new_stock)}</td>
                      <td style={{ ...td, fontSize:11 }}>
                        <div style={{ color:'var(--primary)', fontFamily:'monospace', fontWeight:600 }}>{m.reference_type || '—'}</div>
                        {m.invoice_number && <div style={{ fontFamily:'monospace', fontSize:10, color:'var(--text-muted)' }}>{m.invoice_number}</div>}
                      </td>
                      <td style={{ ...td, fontSize:11, color:'var(--text-muted)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {m.notes || '—'}
                      </td>
                      <td style={{ ...td, fontSize:11 }}>{m.created_by?.name || '—'}</td>
                      <td style={{ ...td, fontSize:11, whiteSpace:'nowrap' }}>{fmtDT(m.movement_date || m.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {movTotal > MOV_LIMIT && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:10, padding:'12px 20px', borderTop:'1px solid var(--border)' }}>
              <button className="btn btn-secondary btn-sm" disabled={movPage <= 1 || loadingMov} onClick={() => loadMovements(movPage-1)}>← Prev</button>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>Page {movPage} of {Math.ceil(movTotal/MOV_LIMIT)}</span>
              <button className="btn btn-secondary btn-sm" disabled={movPage >= Math.ceil(movTotal/MOV_LIMIT) || loadingMov} onClick={() => loadMovements(movPage+1)}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ADJUST STOCK MODAL
      ══════════════════════════════════════════════════════ */}
      {adjustTarget && (
        <div className="modal-overlay" onClick={() => { setAdjustTarget(null); setAdjMsg('') }}>
          <div className="modal" style={{ maxWidth:500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Edit3 size={16} style={{ color:'var(--primary)' }}/>
                <span className="modal-title">Adjust Stock</span>
              </div>
              <button className="btn-ghost" onClick={() => { setAdjustTarget(null); setAdjMsg('') }}><X size={16}/></button>
            </div>
            <div className="modal-body">
              {/* Product info strip */}
              <div style={{ background:'var(--bg)', borderRadius:8, padding:'10px 14px', marginBottom:16 }}>
                <div style={{ fontWeight:800, fontSize:14 }}>{adjustTarget.product_name}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                  {adjustTarget.product_code && <span style={{ fontFamily:'monospace' }}>{adjustTarget.product_code} · </span>}
                  <WarehouseIcon size={11} style={{ display:'inline', marginRight:3 }}/>{adjustTarget.warehouse_name || '—'}
                </div>
              </div>

              {/* Current stock summary */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
                {[
                  { l:'Available', v: Number(adjustTarget.available_stock)||0, hi:true },
                  { l:'Physical',  v: Number(adjustTarget.physical_stock) ||0 },
                  { l:'Reserved',  v: Number(adjustTarget.reserved_stock) ||0 },
                ].map(f => (
                  <div key={f.l} style={{ textAlign:'center', background: f.hi ? '#ecfdf5' : 'var(--bg)', borderRadius:8, padding:'8px 10px', border:`1px solid ${f.hi ? '#a7f3d0' : 'var(--border)'}` }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', color: f.hi ? '#059669' : 'var(--text-muted)', marginBottom:3 }}>{f.l}</div>
                    <div style={{ fontSize:18, fontWeight:800, color: f.hi ? '#059669' : 'var(--text)' }}>{fmtN(f.v)}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{adjustTarget.unit}</div>
                  </div>
                ))}
              </div>

              {/* Form */}
              <div className="form-group">
                <label className="form-label">Adjustment Quantity *</label>
                <input
                  className="form-control"
                  type="number"
                  step="any"
                  placeholder="+ to add stock  /  − to deduct"
                  value={adjForm.adjustment}
                  onChange={e => setAdjForm(f => ({ ...f, adjustment: e.target.value }))}
                />
                {adjForm.adjustment && Number(adjForm.adjustment) !== 0 && (
                  <div style={{ marginTop:6, fontSize:12, fontWeight:600,
                    color: Number(adjForm.adjustment) > 0 ? '#059669' : '#dc2626' }}>
                    {Number(adjForm.adjustment) > 0
                      ? `▲ Add ${fmtN(Math.abs(Number(adjForm.adjustment)))} ${adjustTarget.unit} to available stock`
                      : `▼ Remove ${fmtN(Math.abs(Number(adjForm.adjustment)))} ${adjustTarget.unit} from available stock`}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Reason / Note</label>
                <input
                  className="form-control"
                  placeholder="e.g. Physical count correction, damaged goods, opening stock"
                  value={adjForm.reason}
                  onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Rate (₹) <span style={{ fontWeight:400, color:'var(--text-muted)' }}>— optional, updates cost</span></label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={adjustTarget.purchase_rate ? `Current: ₹${adjustTarget.purchase_rate}` : '0.00'}
                  value={adjForm.purchase_rate}
                  onChange={e => setAdjForm(f => ({ ...f, purchase_rate: e.target.value }))}
                />
              </div>

              {adjMsg && (
                <div style={{
                  padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:600, marginTop:4,
                  background: adjMsg.startsWith('✓') ? '#ecfdf5' : '#fef2f2',
                  color:      adjMsg.startsWith('✓') ? '#059669' : '#dc2626',
                  border:     `1px solid ${adjMsg.startsWith('✓') ? '#a7f3d0' : '#fecaca'}`,
                }}>
                  {adjMsg}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setAdjustTarget(null); setAdjMsg('') }}>Cancel</button>
              <button className="btn btn-primary" disabled={adjSaving || !adjForm.adjustment} onClick={handleAdjust}>
                {adjSaving ? 'Saving…' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

/* ── Shared micro-styles ── */
const th = {
  padding: '9px 12px', textAlign:'left',
  fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px',
  color:'var(--text-muted)', whiteSpace:'nowrap', borderBottom:'1px solid var(--border)',
}
const td = { padding:'10px 12px', fontSize:13, verticalAlign:'middle' }
const emptyCell = { textAlign:'center', padding:40, color:'var(--text-muted)' }
const iconBtn = { display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:7, cursor:'pointer', flexShrink:0 }
const secLabel = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--text-muted)', marginBottom:8 }
