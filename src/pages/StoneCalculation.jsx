/**
 * Stone Calculation — Purchase & Sales Workflow
 *
 * Flow:
 *   PURCHASE: Choose Purchase → Choose material (Granite/Marble/…) → Open Purchase Sheet
 *   SALES:    Choose Sales    → Choose material → Enter Customer Details → Open Sales Sheet
 *             Sales Sheet lets you set prices, mark items as Sold.
 *             Sold items are struck through and locked so they can't be re-sold.
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Gem, Layers, Box, Grid3x3, Plus, Search, Copy, Save, ArrowLeft,
  Trash2, Eye, Pencil, Share2, Download, Printer, X, Calculator, Calendar,
  FileText, ReceiptText, Send, CheckCircle, Package, ShoppingCart, Tag, ImagePlus,
  Users, UserCircle, Phone, MapPin, ChevronRight, AlertCircle, Lock,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { stoneApi } from '../api/stoneApi'
import {
  AREA_SYMBOL, unitLabel, rowArea, sumArea, fmtArea, allUnits, addCustomUnit,
} from '../config/stoneUnits'
import { companyApi } from '../api/companyApi'
import api from '../api'
import { useErp } from '../context/ErpContext'
import { productApi } from '../api/productApi'
import { StoneInvoiceModal } from './InvoiceManagement'

// ── Brand palette ────────────────────────────────────────────────────────────
const ORANGE = '#F26522'
const NAVY   = '#1E2D4A'
const TEAL   = NAVY
const GREEN  = '#059669'
const RED    = '#DC2626'

// ── Material options ─────────────────────────────────────────────────────────
const MATERIALS = [
  { key: 'granite', label: 'Granite', icon: Gem,     color: ORANGE, bg: '#FFF3EC' },
  { key: 'marble',  label: 'Marble',  icon: Layers,  color: NAVY,   bg: '#EEF1F6' },
  { key: 'block',   label: 'Block',   icon: Box,     color: ORANGE, bg: '#FFF3EC' },
  { key: 'italian', label: 'Italian', icon: Grid3x3, color: NAVY,   bg: '#EEF1F6' },
]
const CUSTOM_META = { key: 'custom', label: 'Custom', icon: Calculator, color: ORANGE, bg: '#FFF3EC' }
const materialMeta = (key) => MATERIALS.find(p => p.key === key) || CUSTOM_META
// Keep old alias so stoneApi / existing sheets still resolve correctly
const productMeta = materialMeta
const sheetLabel = (sheet) =>
  (sheet?.product === 'custom' && sheet?.custom_type) ? sheet.custom_type : materialMeta(sheet?.product).label

// ── Shared tiny styles ───────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '11px 13px', border: '1.5px solid #E2E8F0',
  borderRadius: 9, fontSize: 14, color: '#1E2D4A', outline: 'none',
  background: '#F8FAFC', boxSizing: 'border-box',
}
const lbl = { fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6, display: 'block' }
const th  = { padding: '11px 12px', textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,.15)' }
const td  = { padding: '9px 12px',  textAlign: 'center', color: '#1E2D4A', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }

const todayISO = () => new Date().toISOString().slice(0, 10)
const fmtDate  = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const inrFmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

// ── Shared button styles ─────────────────────────────────────────────────────
const btnBase    = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' }
const btnPrimary = { ...btnBase, background: 'linear-gradient(135deg,#F26522,#FF8A4C)', color: '#fff', boxShadow: '0 4px 14px rgba(242,101,34,0.3)' }
const btnTeal    = { ...btnBase, background: NAVY, color: '#fff' }
const btnGhost   = { ...btnBase, background: '#F1F5F9', color: '#64748B', border: '1.5px solid #E2E8F0' }
const btnGreen   = { ...btnBase, background: '#ECFDF5', color: GREEN, border: '1.5px solid #A7F3D0' }
const btnRed     = { ...btnBase, background: '#FEF2F2', color: RED,   border: '1.5px solid #FECACA' }
const closeBtn   = { width: 34, height: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

// ── localStorage key for sold items ─────────────────────────────────────────
const SOLD_KEY = 'stone_sold_items_v1'
function loadSoldMap() { try { return JSON.parse(localStorage.getItem(SOLD_KEY)) || {} } catch { return {} } }
function saveSoldMap(m) { try { localStorage.setItem(SOLD_KEY, JSON.stringify(m)) } catch {} }
// soldMap shape: { [sheetId]: Set<rowIndex> }  (stored as arrays)
function getSoldSet(sheetId) {
  const m = loadSoldMap()
  return new Set(Array.isArray(m[sheetId]) ? m[sheetId] : [])
}
function markRowSold(sheetId, rowIndex) {
  const m = loadSoldMap()
  const arr = Array.isArray(m[sheetId]) ? m[sheetId] : []
  if (!arr.includes(rowIndex)) arr.push(rowIndex)
  m[sheetId] = arr
  saveSoldMap(m)
}
function unmarkRowSold(sheetId, rowIndex) {
  const m = loadSoldMap()
  m[sheetId] = (m[sheetId] || []).filter(i => i !== rowIndex)
  saveSoldMap(m)
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function StoneCalculation() {
  // Top-level routing state
  // view: 'home' | 'purchase-sheet' | 'sales-customer' | 'sales-sheet' | 'view'
  const [view,         setView]         = useState('home')
  const [sheets,       setSheets]       = useState(() => stoneApi.list())
  const [active,       setActive]       = useState(null)    // sheet being worked on
  const [salesCustomer, setSalesCustomer] = useState(null)  // { name, phone, address, city }
  const [search,       setSearch]       = useState('')

  // Modals
  const [docFor, setDocFor] = useState(null)  // { kind, sheet }

  const refresh = () => setSheets(stoneApi.list())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sheets
    return sheets.filter(s =>
      (s.party || '').toLowerCase().includes(q) ||
      (s.name  || '').toLowerCase().includes(q) ||
      (s.product || '').toLowerCase().includes(q) ||
      (s.sheetType || '').toLowerCase().includes(q),
    )
  }, [sheets, search])

  // ── navigation helpers ────────────────────────────────────────────────────
  const goHome = () => { setView('home'); setActive(null); setSalesCustomer(null); refresh() }

  // Called from HomeView when user picks Purchase → material
  const openPurchaseSheet = (sheet) => { setActive(sheet); setView('purchase-sheet') }

  // Called from HomeView when user picks Sales → material → customer form confirmed
  const openSalesSheet = (sheet, customer) => {
    setActive(sheet)
    setSalesCustomer(customer)
    setView('sales-sheet')
  }

  const openView = (sheet) => { setActive(sheet); setView('view') }
  const openEdit = (sheet) => { setActive(sheet); setView('purchase-sheet') }

  const handleDelete = (sheet) => {
    if (!window.confirm(`Delete sheet "${sheet.name || sheet.party}" (${sheetLabel(sheet)})?`)) return
    stoneApi.remove(sheet.id)
    refresh()
  }

  const handleShare = async (sheet) => {
    const meta = materialMeta(sheet.product)
    const lines = [
      `${sheet.party} — ${meta.label}${sheet.name ? ` (${sheet.name})` : ''}`,
      `Date: ${fmtDate(sheet.date)}`, '',
      ...sheet.rows.map((r, i) =>
        `${i + 1}. ${r.length} × ${r.width} = ${fmtArea(rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit))} ${AREA_SYMBOL[sheet.outputUnit]}`),
      '', `Total: ${fmtArea(sheet.total)} ${AREA_SYMBOL[sheet.outputUnit]}`,
    ]
    const text = lines.join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'Stone Sheet', text })
      else { await navigator.clipboard.writeText(text); alert('Sheet copied to clipboard') }
    } catch { /* cancelled */ }
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Tools</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Stone Calculation</span>
      </div>

      {view === 'home' && (
        <HomeView
          sheets={filtered} search={search} setSearch={setSearch}
          onOpenPurchase={openPurchaseSheet}
          onOpenSales={openSalesSheet}
          onView={openView} onEdit={openEdit}
          onDelete={handleDelete} onShare={handleShare}
          onDoc={(kind, sheet) => setDocFor({ kind, sheet })}
          allSheets={sheets}
        />
      )}

      {view === 'purchase-sheet' && active && (
        <PurchaseSheet
          sheet={active}
          onBack={goHome}
          onSaved={goHome}
        />
      )}

      {view === 'sales-sheet' && active && salesCustomer && (
        <SalesSheet
          sheet={active}
          customer={salesCustomer}
          onBack={goHome}
          onSaved={goHome}
        />
      )}

      {view === 'view' && active && (
        <SheetView sheet={active} onBack={goHome} />
      )}

      {docFor && (
        <SendDocumentModal
          kind={docFor.kind}
          sheet={docFor.sheet}
          allSheets={sheets}
          onClose={() => setDocFor(null)}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// HOME VIEW  — Step 1: Purchase or Sales  →  Step 2: Material  →  navigate
// ════════════════════════════════════════════════════════════════════════════
function HomeView({ sheets, search, setSearch, onOpenPurchase, onOpenSales, onView, onEdit, onDelete, onShare, onDoc, allSheets }) {
  // step 1: null | 'purchase' | 'sales'
  const [mode, setMode] = useState(null)
  // step 2: null | material key
  const [material, setMaterial] = useState(null)
  // sales only: show customer form
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  // purchase only: show new-sheet config modal
  const [showPurchaseConfig, setShowPurchaseConfig] = useState(false)

  const handleMaterialPick = (matKey) => {
    setMaterial(matKey)
    if (mode === 'purchase') setShowPurchaseConfig(true)
    else                     setShowCustomerForm(true)
  }

  const handlePurchaseConfigDone = (sheet) => {
    setShowPurchaseConfig(false)
    onOpenPurchase(sheet)
  }

  const handleCustomerDone = (customer) => {
    setShowCustomerForm(false)
    // Create a blank sheet for the chosen material to open as sales sheet
    const meta = materialMeta(material)
    const sheet = {
      id: null,
      product: material,
      custom_type: '',
      name: `${meta.label} Sales`,
      party: customer.name,
      date: todayISO(),
      sheetType: 'sales',
      inputUnit: 'inch',
      outputUnit: 'feet',
      rows: [],
      total: 0,
    }
    onOpenSales(sheet, customer)
  }

  return (
    <>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator size={22} color={ORANGE} /> Stone Calculation
          </div>
          <div className="page-desc">Select Purchase or Sales, then choose your material to begin</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => onDoc('quotation', null)} style={btnPrimary}><FileText size={15} /> Quotation</button>
          <button onClick={() => onDoc('invoice',   null)} style={btnTeal}><ReceiptText size={15} /> Invoice</button>
        </div>
      </div>

      {/* Step 1: Purchase / Sales toggle */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
          Step 1 — Select workflow
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            { key: 'purchase', label: 'Purchase',  icon: ShoppingCart, color: NAVY,   bg: '#EEF1F6', desc: 'Record purchase measurements' },
            { key: 'sales',    label: 'Sales',      icon: Tag,          color: ORANGE, bg: '#FFF3EC', desc: 'Sell to a customer with pricing' },
          ].map(item => {
            const sel = mode === item.key
            return (
              <button key={item.key} type="button" onClick={() => { setMode(item.key); setMaterial(null) }} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 14,
                border: `2px solid ${sel ? item.color : '#E8EDF3'}`,
                background: sel ? item.bg : '#fff', color: item.color, cursor: 'pointer',
                boxShadow: sel ? '0 4px 16px rgba(30,45,74,.12)' : '0 1px 2px rgba(1,21,45,.04)',
                transition: 'all .15s', textAlign: 'left',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: sel ? '#fff' : item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={24} color={item.color} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{item.desc}</div>
                </div>
                {sel && <ChevronRight size={20} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2: material select — only visible after choosing mode */}
      {mode && (
        <div style={{ marginTop: 22, marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
            Step 2 — Select material ({mode === 'purchase' ? 'Purchase' : 'Sales'})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {MATERIALS.map(p => {
              const sel = material === p.key
              return (
                <button key={p.key} onClick={() => handleMaterialPick(p.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                  cursor: 'pointer', border: `2px solid ${sel ? p.color : '#E8EDF3'}`, borderRadius: 14,
                  background: sel ? p.bg : '#fff', textAlign: 'left', transition: 'all .15s',
                  boxShadow: sel ? '0 4px 14px rgba(30,45,74,.10)' : '0 1px 2px rgba(1,21,45,.04)',
                }}
                  onMouseEnter={e => { if (!sel) { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                  onMouseLeave={e => { if (!sel) { e.currentTarget.style.borderColor = '#E8EDF3'; e.currentTarget.style.transform = 'none' } }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <p.icon size={22} color={p.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1E2D4A' }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {mode === 'purchase' ? '+ Purchase sheet' : '+ Sales sheet'}
                    </div>
                  </div>
                </button>
              )
            })}
            {/* Custom */}
            <button onClick={() => handleMaterialPick('custom')} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              cursor: 'pointer', border: '1px dashed #FFD9C2', borderRadius: 14,
              background: '#fff', textAlign: 'left', transition: 'all .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#FFD9C2'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={22} color={ORANGE} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#1E2D4A' }}>Custom</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Other material</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* My Sheets list */}
      <div className="card" style={{ padding: '18px 20px', marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1E2D4A' }}>My Sheets</div>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer or material…" style={{ ...inputStyle, paddingLeft: 34 }} />
          </div>
        </div>
        {sheets.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#CBD5E1' }}>
            <Calculator size={42} style={{ opacity: .3, marginBottom: 10 }} />
            <div style={{ fontSize: 14 }}>No sheets yet — choose Purchase or Sales above to start</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sheets.map((s, i) => {
              const meta = materialMeta(s.product)
              const isSales = s.sheetType === 'sales'
              const soldSet = s.id ? getSoldSet(s.id) : new Set()
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', border: '1px solid #EEF2F7', borderRadius: 11, background: '#FBFCFE' }}>
                  <div style={{ width: 30, textAlign: 'center', fontWeight: 800, color: '#94A3B8', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <meta.icon size={18} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1E2D4A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.party || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                      {s.name && <span>{s.name} ·</span>}
                      <span>{sheetLabel(s)}</span>
                      <span style={{ padding: '1px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: isSales ? '#FFF3EC' : '#EEF1F6', color: isSales ? ORANGE : NAVY }}>
                        {isSales ? 'SALES' : 'PURCHASE'}
                      </span>
                      {soldSet.size > 0 && <span style={{ fontSize: 10, color: GREEN, fontWeight: 700 }}>{soldSet.size} sold</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{fmtDate(s.date)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: TEAL, fontFamily: 'monospace' }}>
                      {fmtArea(s.total)} {AREA_SYMBOL[s.outputUnit]}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <IconBtn title="Quotation" color={ORANGE} onClick={() => onDoc('quotation', s)}><FileText  size={15} /></IconBtn>
                    <IconBtn title="Invoice"   color={NAVY}   onClick={() => onDoc('invoice',   s)}><ReceiptText size={15} /></IconBtn>
                    <IconBtn title="View"      color="#2563EB" onClick={() => onView(s)}><Eye    size={15} /></IconBtn>
                    <IconBtn title="Edit"      color="#16A34A" onClick={() => onEdit(s)}><Pencil size={15} /></IconBtn>
                    <IconBtn title="Share"     color={TEAL}   onClick={() => onShare(s)}><Share2 size={15} /></IconBtn>
                    <IconBtn title="Delete"    color="#DC2626" onClick={() => onDelete(s)}><Trash2 size={15} /></IconBtn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      {showPurchaseConfig && (
        <PurchaseConfigModal
          material={material}
          onCancel={() => { setShowPurchaseConfig(false); setMaterial(null) }}
          onCreate={handlePurchaseConfigDone}
        />
      )}
      {showCustomerForm && (
        <CustomerDetailsModal
          material={material}
          onCancel={() => { setShowCustomerForm(false); setMaterial(null) }}
          onConfirm={handleCustomerDone}
        />
      )}
    </>
  )
}

function IconBtn({ title, color, onClick, children }) {
  return (
    <button title={title} onClick={onClick} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE CONFIG MODAL  — name/party/date before opening Purchase Sheet
// ════════════════════════════════════════════════════════════════════════════
function PurchaseConfigModal({ material, onCancel, onCreate }) {
  const meta      = materialMeta(material)
  const isCustom  = material === 'custom'
  const [customType, setCustomType] = useState('')
  const [name,  setName]  = useState('')
  const [party, setParty] = useState('')
  const [date,  setDate]  = useState(todayISO())
  const [truck, setTruck] = useState('')
  const [rows,  setRows]  = useState('1')
  const [quantityOption, setQuantityOption] = useState(false)
  const [pricePerUnit, setPricePerUnit] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [err,   setErr]   = useState('')

  const typeLabel = isCustom ? (customType.trim() || 'Custom') : meta.label

  const create = () => {
    if (isCustom && !customType.trim()) return setErr('Sheet name is required')
    if (!isCustom && !name.trim())      return setErr(`${typeLabel} name is required`)
    if (!date)                          return setErr('Please choose a date')
    if (!party.trim())                  return setErr('Party / supplier name is required')
    const n = Math.max(1, Math.min(200, parseInt(rows, 10) || 1))
    onCreate({
      id: null,
      product: material,
      custom_type: isCustom ? customType.trim() : '',
      name: isCustom ? customType.trim() : name.trim(),
      party: party.trim(),
      date,
      truckNumber: truck.trim(),
      quantityOption,
      imageDataUrl,
      sheetType: 'purchase',
      inputUnit: 'inch',
      outputUnit: 'feet',
      rows: Array.from({ length: n }, () => ({ length: '', width: '', blockNo: '', thickness: '', pieces: '1', purchaseRate: pricePerUnit, remarks: '' })),
      total: 0,
    })
  }

  return (
    <Overlay onClose={onCancel}>
      <ModalHeader icon={<ShoppingCart size={20} color={ORANGE} />} bg="#FFF3EC" title={`New Purchase — ${typeLabel}`} sub="Fill details to open Purchase Sheet" onClose={onCancel} />
      <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        {isCustom ? (
          <div>
            <label style={lbl}>Sheet / Material Name <Req /></label>
            <input style={inputStyle} value={customType} onChange={e => { setCustomType(e.target.value); setErr('') }} placeholder="e.g. Sandstone" autoFocus />
          </div>
        ) : (
          <div>
            <label style={lbl}>{typeLabel} Name <Req /></label>
            <input style={inputStyle} value={name} onChange={e => { setName(e.target.value); setErr('') }} placeholder={`e.g. Moon White`} autoFocus />
          </div>
        )}
        <div>
          <label style={lbl}>Supplier / Party Name <Req /></label>
          <input style={inputStyle} value={party} onChange={e => { setParty(e.target.value); setErr('') }} placeholder="Enter supplier name" />
        </div>
        <div>
          <label style={lbl}>Purchase Date <Req /></label>
          <div style={{ position: 'relative' }}>
            <Calendar size={15} color="#94A3B8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="date" style={{ ...inputStyle, paddingLeft: 34 }} value={date} onChange={e => { setDate(e.target.value); setErr('') }} />
          </div>
        </div>
        <div>
          <label style={lbl}>{typeLabel} Image <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span></label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 8, background: NAVY, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            <ImagePlus size={15} /> {imageDataUrl ? 'Change Image' : 'Choose Image'}
            <input type="file" accept="image/*" hidden onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 1024 * 1024) { setErr('Please choose an image smaller than 1 MB'); e.target.value = ''; return }
              const reader = new FileReader()
              reader.onload = () => { setImageDataUrl(String(reader.result || '')); setErr('') }
              reader.readAsDataURL(file)
            }} />
          </label>
          {imageDataUrl && <img src={imageDataUrl} alt="Granite preview" style={{ display: 'block', marginTop: 8, width: 64, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #CBD5E1' }} />}
        </div>
        <div>
          <label style={lbl}>Number of Rows (slabs / pieces)</label>
          <input type="number" min="1" max="200" style={inputStyle} value={rows} onChange={e => setRows(e.target.value)} placeholder="e.g. 10" />
        </div>
        <div>
          <label style={lbl}>Truck / Vehicle Number <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span></label>
          <input style={inputStyle} value={truck} onChange={e => setTruck(e.target.value)} placeholder="Enter vehicle number" />
        </div>
        <div>
          <label style={lbl}>Do you want quantity option?</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {[['Yes', true], ['No', false]].map(([label, value]) => <label key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: NAVY, fontSize: 13, cursor: 'pointer' }}><input type="radio" checked={quantityOption === value} onChange={() => setQuantityOption(value)} style={{ accentColor: ORANGE }} />{label}</label>)}
          </div>
        </div>
        <div>
          <label style={lbl}>Price Per Unit <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional, e.g. per sq. ft.)</span></label>
          <input type="number" min="0" style={inputStyle} value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value)} placeholder="Enter price" />
        </div>
        {err && <ErrMsg>{err}</ErrMsg>}
      </div>
      <ModalFooter onCancel={onCancel} onConfirm={create} confirmLabel="Open Purchase Sheet →" />
    </Overlay>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// CUSTOMER DETAILS MODAL  — name, phone, address before Sales Sheet
// ════════════════════════════════════════════════════════════════════════════
function CustomerDetailsModal({ material, onCancel, onConfirm }) {
  const meta = materialMeta(material)
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [address, setAddress] = useState('')
  const [city,    setCity]    = useState('')
  const [err,     setErr]     = useState('')

  const confirm = () => {
    if (!name.trim()) return setErr('Customer name is required')
    onConfirm({ name: name.trim(), phone: phone.trim(), address: address.trim(), city: city.trim() })
  }

  return (
    <Overlay onClose={onCancel}>
      <ModalHeader icon={<UserCircle size={20} color={ORANGE} />} bg="#FFF3EC" title="Customer Details" sub={`Sales — ${meta.label}`} onClose={onCancel} />
      <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div>
          <label style={lbl}><UserCircle size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Customer Name <Req /></label>
          <input style={inputStyle} value={name} onChange={e => { setName(e.target.value); setErr('') }} placeholder="Enter customer name" autoFocus />
        </div>
        <div>
          <label style={lbl}><Phone size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Phone Number <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span></label>
          <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label style={lbl}><MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />City <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span></label>
          <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Mumbai" />
        </div>
        <div>
          <label style={lbl}>Address <span style={{ fontWeight: 400, color: '#94A3B8' }}>(Optional)</span></label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter address" />
        </div>
        {err && <ErrMsg>{err}</ErrMsg>}
      </div>
      <ModalFooter onCancel={onCancel} onConfirm={confirm} confirmLabel="Open Sales Sheet →" />
    </Overlay>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PURCHASE SHEET  — spreadsheet-like grid for recording purchase measurements
// Columns: No | Block No | Length | Width | Thickness | Pieces | Sqft/Area | Purchase Rate | Amount | Remarks
// ════════════════════════════════════════════════════════════════════════════
function PurchaseSheet({ sheet, onBack, onSaved }) {
  const meta = materialMeta(sheet.product)
  const [rows,       setRows]       = useState(() =>
    sheet.rows.length ? sheet.rows : [emptyPurchaseRow()])
  const [inputUnit,  setInputUnit]  = useState(sheet.inputUnit  || 'inch')
  const [outputUnit, setOutputUnit] = useState(sheet.outputUnit || 'feet')
  const [name,       setName]       = useState(sheet.name  || '')
  const [party,      setParty]      = useState(sheet.party || '')
  const [date,       setDate]       = useState(sheet.date  || todayISO())
  const [saving,     setSaving]     = useState(false)
  const [units,      setUnits]      = useState(() => allUnits())
  const [addUnitOpen, setAddUnitOpen] = useState(false)
  const sym = AREA_SYMBOL[outputUnit]

  function emptyPurchaseRow() {
    return { length: '', width: '', blockNo: '', thickness: '', pieces: '', purchaseRate: '', remarks: '' }
  }

  const setCell = (i, field, val) =>
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const addRow = () => setRows(rs => [...rs, emptyPurchaseRow()])
  const removeRow = (i) => setRows(rs => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs)
  const copyPrev  = () =>
    setRows(rs => rs.map((r, i) => {
      if (i === 0) return r
      const p = rs[i - 1]
      return { ...r,
        length: r.length === '' ? p.length : r.length,
        width:  r.width  === '' ? p.width  : r.width,
        thickness: r.thickness === '' ? p.thickness : r.thickness,
        pieces: r.pieces === '' ? p.pieces : r.pieces,
      }
    }))

  const total = useMemo(() => sumArea(rows, inputUnit, outputUnit), [rows, inputUnit, outputUnit])

  // per-row sqft and amount
  const rowCalc = useMemo(() => rows.map(r => {
    const area   = rowArea(r.length, r.width, inputUnit, outputUnit)
    const sqft   = fmtArea(area)
    const pieces = sheet.quantityOption !== false ? (parseFloat(r.pieces) || 1) : 1
    const rate   = parseFloat(r.purchaseRate) || 0
    const amount = +(Number(sqft) * pieces * rate).toFixed(2)
    return { area, sqft, amount }
  }), [rows, inputUnit, outputUnit])

  const grandTotal = rowCalc.reduce((a, r) => a + r.amount, 0)

  const save = () => {
    setSaving(true)
    const payload = {
      product: sheet.product, custom_type: sheet.custom_type || '',
      name: name.trim() || sheet.name || meta.label,
      party: party.trim() || sheet.party || '',
      date, sheetType: 'purchase',
      truckNumber: sheet.truckNumber || '',
      quantityOption: sheet.quantityOption !== false,
      imageDataUrl: sheet.imageDataUrl || '',
      inputUnit, outputUnit, rows, total,
    }
    if (sheet.id) stoneApi.update(sheet.id, payload)
    else          stoneApi.create(payload)
    setSaving(false)
    onSaved()
  }

  const downloadExcel = () => {
    const header = ['No.', 'Block No', `Length (${unitLabel(inputUnit)})`, `Width (${unitLabel(inputUnit)})`, `Thickness`, ...(sheet.quantityOption !== false ? ['Pieces'] : []), `Area (${sym})`, 'Purchase Rate (₹)', 'Amount (₹)', 'Remarks']
    const body = rows.map((r, i) => [
      i + 1, r.blockNo || '', r.length || '', r.width || '', r.thickness || '',
      ...(sheet.quantityOption !== false ? [r.pieces || ''] : []), rowCalc[i].sqft,
      r.purchaseRate || '', rowCalc[i].amount, r.remarks || '',
    ])
    const aoa = [
      [`${meta.label} — Purchase Sheet`], ['Supplier', party], ['Name', name], ['Date', fmtDate(date)], [],
      header, ...body, [],
      [...Array(sheet.quantityOption !== false ? 6 : 5).fill(''), 'Total Area', '', grandTotal > 0 ? grandTotal : ''],
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = (sheet.quantityOption !== false ? [6, 12, 14, 14, 12, 10, 14, 18, 16, 22] : [6, 12, 14, 14, 12, 14, 18, 16, 22]).map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase')
    XLSX.writeFile(wb, `purchase_${(name || 'sheet').replace(/[^\w-]+/g,'_')}.xlsx`)
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={btnGhost}><ArrowLeft size={15} /> Back</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} color={ORANGE} />
              <meta.icon size={18} color={meta.color} />
              {sheet.imageDataUrl && <img src={sheet.imageDataUrl} alt={`${meta.label} image`} style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 7, border: '1px solid #E2E8F0' }} />}
              Purchase Sheet — {meta.label}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{party || 'Supplier'} · {fmtDate(date)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={downloadExcel} style={btnGhost}><Download size={15} /> Download</button>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Meta inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={lbl}>{meta.label} Name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. Moon White`} />
        </div>
        <div>
          <label style={lbl}>Supplier / Party</label>
          <input style={inputStyle} value={party} onChange={e => setParty(e.target.value)} placeholder="Supplier name" />
        </div>
        <div>
          <label style={lbl}>Date</label>
          <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <UnitSelect label="Input unit"  value={inputUnit}  onChange={setInputUnit}  accent={TEAL}   units={units} onAddUnit={() => setAddUnitOpen(true)} />
        <UnitSelect label="Output unit" value={outputUnit} onChange={setOutputUnit} accent={ORANGE} units={units} onAddUnit={() => setAddUnitOpen(true)} />
      </div>

      {/* Spreadsheet grid */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
          <thead>
            <tr style={{ background: NAVY, color: '#fff' }}>
              <th style={{ ...th, width: 44 }}>No.</th>
              <th style={{ ...th, width: 90 }}>Block No</th>
              <th style={th}>Length<br /><small style={{ fontWeight: 400, opacity: .7 }}>({unitLabel(inputUnit)})</small></th>
              <th style={th}>Width<br /><small style={{ fontWeight: 400, opacity: .7 }}>({unitLabel(inputUnit)})</small></th>
              <th style={th}>Thickness</th>
              {sheet.quantityOption !== false && <th style={th}>Pieces</th>}
              <th style={{ ...th, background: '#1F3A64' }}>Area<br /><small style={{ fontWeight: 400, opacity: .7 }}>({sym})</small></th>
              <th style={{ ...th, background: ORANGE }}>Rate (₹/{sym})</th>
              <th style={{ ...th, background: ORANGE }}>Amount (₹)</th>
              <th style={th}>Remarks</th>
              <th style={{ ...th, width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const calc = rowCalc[i]
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF8F3'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFBFC'}
                >
                  <td style={{ ...td, fontWeight: 700, color: '#64748B', background: '#F8FAFC' }}>{i + 1}</td>
                  <td style={td}><input value={r.blockNo  || ''} onChange={e => setCell(i,'blockNo',e.target.value)}   style={gridInput} placeholder="B-01" /></td>
                  <td style={td}><input type="number" value={r.length || ''} onChange={e => setCell(i,'length',e.target.value)}  style={gridInput} placeholder="0" /></td>
                  <td style={td}><input type="number" value={r.width  || ''} onChange={e => setCell(i,'width', e.target.value)}  style={gridInput} placeholder="0" /></td>
                  <td style={td}><input type="number" value={r.thickness||''} onChange={e => setCell(i,'thickness',e.target.value)} style={gridInput} placeholder="—" /></td>
                  {sheet.quantityOption !== false && <td style={td}><input type="number" value={r.pieces || ''} onChange={e => setCell(i,'pieces',e.target.value)}  style={gridInput} placeholder="1" min="1" /></td>}
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: NAVY, background: '#F0F4FF' }}>
                    {calc.sqft || '—'}
                  </td>
                  <td style={{ ...td, background: '#FFF8F3' }}>
                    <input type="number" value={r.purchaseRate||''} onChange={e => setCell(i,'purchaseRate',e.target.value)} style={{ ...gridInput, color: ORANGE }} placeholder="0" />
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: ORANGE, background: '#FFF8F3' }}>
                    {calc.amount > 0 ? inrFmt(calc.amount) : '—'}
                  </td>
                  <td style={td}><input value={r.remarks||''} onChange={e => setCell(i,'remarks',e.target.value)} style={gridInput} placeholder="Notes…" /></td>
                  <td style={{ ...td, padding: '6px 8px' }}>
                    <button onClick={() => removeRow(i)} title="Remove" style={{ border: 'none', background: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
              <td style={{ ...td, fontWeight: 800 }} colSpan={sheet.quantityOption !== false ? 6 : 5}>Total ({rows.length} rows)</td>
              <td style={{ ...td, fontWeight: 900, color: NAVY, fontFamily: 'monospace', background: '#F0F4FF' }}>{fmtArea(total)} {sym}</td>
              <td style={{ ...td, fontWeight: 800, background: '#FFF8F3' }}>Grand Total</td>
              <td style={{ ...td, fontWeight: 900, color: ORANGE, fontFamily: 'monospace', background: '#FFF8F3' }}>
                {grandTotal > 0 ? inrFmt(grandTotal) : '—'}
              </td>
              <td colSpan={2} style={td}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={addRow}    style={btnTeal}><Plus size={15} /> Add Row</button>
        <button onClick={copyPrev}  style={btnGhost}><Copy size={15} /> Copy Previous</button>
        <button onClick={downloadExcel} style={btnGhost}><Download size={15} /> Download Excel</button>
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, marginLeft: 'auto', opacity: saving ? .7 : 1 }}>
          <Save size={15} /> {saving ? 'Saving…' : 'Save Sheet'}
        </button>
      </div>

      {addUnitOpen && (
        <AddUnitModal onCancel={() => setAddUnitOpen(false)} onAdded={u => { setUnits(allUnits()); setAddUnitOpen(false); if (u?.key) setOutputUnit(u.key) }} />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SALES SHEET  — spreadsheet with pricing, sold-item marking
// Items can be loaded from existing purchase sheets OR entered manually.
// Sold items are struck through and locked.
// ════════════════════════════════════════════════════════════════════════════
function SalesSheet({ sheet, customer, onBack, onSaved }) {
  const meta = materialMeta(sheet.product)
  const sym  = AREA_SYMBOL[sheet.outputUnit || 'feet']

  // Each row: { length, width, blockNo, thickness, pieces, salesRate, gstPct, remarks }
  const [rows,       setRows]      = useState(() =>
    sheet.rows.length ? sheet.rows.map(r => ({
      length: r.length || '', width: r.width || '', blockNo: r.blockNo || '',
      thickness: r.thickness || '', pieces: r.pieces || '', salesRate: r.salesRate || '',
      gstPct: r.gstPct ?? 18, remarks: r.remarks || '',
    })) : [emptySalesRow()])
  const [inputUnit,  setInputUnit]  = useState(sheet.inputUnit  || 'inch')
  const [outputUnit, setOutputUnit] = useState(sheet.outputUnit || 'feet')
  const [saving,     setSaving]     = useState(false)
  const [units,      setUnits]      = useState(() => allUnits())
  const [addUnitOpen, setAddUnitOpen] = useState(false)

  // Sold items (persisted in localStorage by sheetId — temp id until saved)
  const tempId = useRef('sales_' + Date.now())
  const sheetId = sheet.id || tempId.current
  const [soldSet, setSoldSet] = useState(() => getSoldSet(sheetId))

  // Confirm-sell modal
  const [confirmSell, setConfirmSell] = useState(null) // rowIndex or null
  // Undo sell modal
  const [confirmUndo, setConfirmUndo] = useState(null)

  function emptySalesRow() {
    return { length: '', width: '', blockNo: '', thickness: '', pieces: '1', salesRate: '', gstPct: 18, remarks: '' }
  }

  const setCell = (i, field, val) =>
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const addRow    = () => setRows(rs => [...rs, emptySalesRow()])
  const removeRow = (i) => {
    if (soldSet.has(i)) return  // can't remove a sold row
    setRows(rs => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs)
    // shift sold indices
    setSoldSet(prev => {
      const next = new Set()
      prev.forEach(idx => { if (idx < i) next.add(idx); else if (idx > i) next.add(idx - 1) })
      return next
    })
  }

  // Sell a row
  const doSell = (i) => {
    markRowSold(sheetId, i)
    setSoldSet(prev => { const n = new Set(prev); n.add(i); return n })
    setConfirmSell(null)
  }
  // Undo sell
  const doUndo = (i) => {
    unmarkRowSold(sheetId, i)
    setSoldSet(prev => { const n = new Set(prev); n.delete(i); return n })
    setConfirmUndo(null)
  }

  // Per-row calculations
  const rowCalc = useMemo(() => rows.map(r => {
    const area    = rowArea(r.length, r.width, inputUnit, outputUnit)
    const sqft    = fmtArea(area)
    const pieces  = parseFloat(r.pieces) || 1
    const rate    = parseFloat(r.salesRate) || 0
    const gst     = parseFloat(r.gstPct)  || 0
    const taxable = +(Number(sqft) * pieces * rate).toFixed(2)
    const gstAmt  = +(taxable * gst / 100).toFixed(2)
    const total   = +(taxable + gstAmt).toFixed(2)
    return { area, sqft, taxable, gstAmt, total }
  }), [rows, inputUnit, outputUnit])

  const availRows = rows.filter((_, i) => !soldSet.has(i))
  const soldRows  = rows.filter((_, i) =>  soldSet.has(i))
  const grandTotal    = rowCalc.reduce((a, r) => a + r.total, 0)
  const soldTotal     = rowCalc.filter((_, i) => soldSet.has(i)).reduce((a, r) => a + r.total, 0)
  const availableTotal = rowCalc.filter((_, i) => !soldSet.has(i)).reduce((a, r) => a + r.total, 0)

  const sheetTotal = sumArea(rows, inputUnit, outputUnit)

  const save = () => {
    setSaving(true)
    const payload = {
      product: sheet.product, custom_type: sheet.custom_type || '',
      name: sheet.name || meta.label,
      party: customer.name,
      date: sheet.date || todayISO(),
      sheetType: 'sales',
      customerDetails: customer,
      inputUnit, outputUnit, rows, total: sheetTotal,
    }
    const saved = sheet.id ? stoneApi.update(sheet.id, payload) : stoneApi.create(payload)
    // If this was a fresh sheet, update the sheetId in soldMap
    if (!sheet.id && saved?.id) {
      const m = loadSoldMap()
      m[saved.id] = Array.from(soldSet)
      delete m[sheetId]
      saveSoldMap(m)
    }
    setSaving(false)
    onSaved()
  }

  const downloadExcel = () => {
    const header = ['No.', 'Block No', `Length (${unitLabel(inputUnit)})`, `Width (${unitLabel(inputUnit)})`, 'Thickness', 'Pieces', `Area (${sym})`, 'Rate (₹)', 'GST %', 'Taxable (₹)', 'GST Amt (₹)', 'Total (₹)', 'Status', 'Remarks']
    const body = rows.map((r, i) => {
      const c = rowCalc[i]
      return [i + 1, r.blockNo||'', r.length||'', r.width||'', r.thickness||'',
        r.pieces||'', c.sqft, r.salesRate||'', r.gstPct, c.taxable, c.gstAmt, c.total,
        soldSet.has(i) ? 'SOLD' : 'Available', r.remarks||'']
    })
    const aoa = [
      [`${meta.label} — Sales Sheet`],
      ['Customer', customer.name, '', 'Phone', customer.phone || ''],
      ['Date', fmtDate(sheet.date)], [],
      header, ...body, [],
      ['', '', '', '', '', '', '', '', '', '', 'Grand Total', grandTotal],
    ]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [6, 12, 14, 14, 12, 10, 14, 14, 8, 14, 14, 14, 12, 20].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sales')
    XLSX.writeFile(wb, `sales_${(customer.name || 'sheet').replace(/[^\w-]+/g,'_')}.xlsx`)
  }

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={btnGhost}><ArrowLeft size={15} /> Back</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={18} color={ORANGE} />
              <meta.icon size={18} color={meta.color} />
              Sales Sheet — {meta.label}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <UserCircle size={13} /> {customer.name}
              {customer.phone && <><Phone size={11} /> {customer.phone}</>}
              {customer.city  && <><MapPin size={11} /> {customer.city}</>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={downloadExcel} style={btnGhost}><Download size={15} /> Download</button>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <SummaryBadge label="Total Items" value={rows.length} color={NAVY} />
        <SummaryBadge label="Available" value={availRows.length} color={GREEN} />
        <SummaryBadge label="Sold" value={soldRows.length} color={RED} />
        {soldTotal > 0 && <SummaryBadge label="Sold Amount" value={inrFmt(soldTotal)} color={RED} />}
        {availableTotal > 0 && <SummaryBadge label="Available Value" value={inrFmt(availableTotal)} color={GREEN} />}
      </div>

      {/* Unit selectors */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <UnitSelect label="Input unit"  value={inputUnit}  onChange={setInputUnit}  accent={TEAL}   units={units} onAddUnit={() => setAddUnitOpen(true)} />
        <UnitSelect label="Output unit" value={outputUnit} onChange={setOutputUnit} accent={ORANGE} units={units} onAddUnit={() => setAddUnitOpen(true)} />
      </div>

      {/* Main spreadsheet */}
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1000 }}>
          <thead>
            <tr style={{ background: NAVY, color: '#fff' }}>
              <th style={{ ...th, width: 44 }}>No.</th>
              <th style={{ ...th, width: 90 }}>Block No</th>
              <th style={th}>Length<br /><small style={{ fontWeight: 400, opacity: .7 }}>({unitLabel(inputUnit)})</small></th>
              <th style={th}>Width<br /><small style={{ fontWeight: 400, opacity: .7 }}>({unitLabel(inputUnit)})</small></th>
              <th style={th}>Thickness</th>
              <th style={th}>Pieces</th>
              <th style={{ ...th, background: '#1F3A64' }}>Area ({sym})</th>
              <th style={{ ...th, background: ORANGE }}>Rate (₹/{sym})</th>
              <th style={{ ...th, background: ORANGE }}>GST %</th>
              <th style={{ ...th, background: ORANGE }}>Total (₹)</th>
              <th style={th}>Status</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const calc   = rowCalc[i]
              const sold   = soldSet.has(i)
              const rowBg  = sold ? '#FEF2F2' : (i % 2 === 0 ? '#fff' : '#FAFBFC')
              const strike = sold ? { textDecoration: 'line-through', color: '#94A3B8' } : {}
              return (
                <tr key={i} style={{ background: rowBg, opacity: sold ? 0.7 : 1 }}>
                  <td style={{ ...td, fontWeight: 700, color: sold ? '#94A3B8' : '#64748B', background: sold ? '#FEF2F2' : '#F8FAFC' }}>
                    {sold ? <Lock size={12} style={{ color: RED, verticalAlign: 'middle' }} /> : null} {i + 1}
                  </td>
                  <td style={td}>
                    {sold
                      ? <span style={{ ...strike, fontSize: 13 }}>{r.blockNo || '—'}</span>
                      : <input value={r.blockNo||''} onChange={e => setCell(i,'blockNo',e.target.value)} style={gridInput} placeholder="B-01" />}
                  </td>
                  <td style={td}>
                    {sold
                      ? <span style={{ ...strike }}>{r.length || '—'}</span>
                      : <input type="number" value={r.length||''} onChange={e => setCell(i,'length',e.target.value)} style={gridInput} placeholder="0" />}
                  </td>
                  <td style={td}>
                    {sold
                      ? <span style={{ ...strike }}>{r.width || '—'}</span>
                      : <input type="number" value={r.width||''} onChange={e => setCell(i,'width',e.target.value)} style={gridInput} placeholder="0" />}
                  </td>
                  <td style={td}>
                    {sold
                      ? <span style={{ ...strike }}>{r.thickness || '—'}</span>
                      : <input type="number" value={r.thickness||''} onChange={e => setCell(i,'thickness',e.target.value)} style={gridInput} placeholder="—" />}
                  </td>
                  <td style={td}>
                    {sold
                      ? <span style={{ ...strike }}>{r.pieces || '1'}</span>
                      : <input type="number" value={r.pieces||''} onChange={e => setCell(i,'pieces',e.target.value)} style={gridInput} placeholder="1" min="1" />}
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: sold ? '#94A3B8' : NAVY, background: sold ? '#FEF2F2' : '#F0F4FF' }}>
                    <span style={strike}>{calc.sqft || '—'}</span>
                  </td>
                  <td style={{ ...td, background: sold ? '#FEF2F2' : '#FFF8F3' }}>
                    {sold
                      ? <span style={{ ...strike, fontFamily: 'monospace', color: '#94A3B8' }}>{r.salesRate ? inrFmt(r.salesRate) : '—'}</span>
                      : <input type="number" value={r.salesRate||''} onChange={e => setCell(i,'salesRate',e.target.value)} style={{ ...gridInput, color: ORANGE }} placeholder="0" />}
                  </td>
                  <td style={{ ...td, background: sold ? '#FEF2F2' : '#FFF8F3' }}>
                    {sold
                      ? <span style={{ ...strike }}>{r.gstPct}%</span>
                      : <select value={r.gstPct} onChange={e => setCell(i,'gstPct',Number(e.target.value))} style={{ ...gridInput, cursor: 'pointer', width: 72 }}>
                          {[0,5,12,18,28].map(v => <option key={v} value={v}>{v}%</option>)}
                        </select>}
                  </td>
                  <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: sold ? '#94A3B8' : ORANGE, background: sold ? '#FEF2F2' : '#FFF8F3' }}>
                    <span style={strike}>{calc.total > 0 ? inrFmt(calc.total) : '—'}</span>
                  </td>
                  {/* Status badge */}
                  <td style={td}>
                    {sold
                      ? <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: RED }}>
                          ✗ SOLD
                        </span>
                      : <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: GREEN }}>
                          Available
                        </span>}
                  </td>
                  {/* Action */}
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {!sold && (
                        <button title="Mark as Sold" onClick={() => setConfirmSell(i)} style={{ ...btnRed, padding: '4px 10px', fontSize: 11, gap: 4 }}>
                          <CheckCircle size={12} /> Sell
                        </button>
                      )}
                      {sold && (
                        <button title="Undo Sale" onClick={() => setConfirmUndo(i)} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11, gap: 4 }}>
                          ↩ Undo
                        </button>
                      )}
                      {!sold && (
                        <button title="Remove row" onClick={() => removeRow(i)} style={{ border: 'none', background: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
              <td style={{ ...td, fontWeight: 800 }} colSpan={6}>Totals</td>
              <td style={{ ...td, fontWeight: 900, fontFamily: 'monospace', color: NAVY, background: '#F0F4FF' }}>{fmtArea(sheetTotal)} {sym}</td>
              <td style={{ ...td, fontWeight: 800, background: '#FFF8F3' }} colSpan={2}>Grand Total</td>
              <td style={{ ...td, fontWeight: 900, fontFamily: 'monospace', color: ORANGE, background: '#FFF8F3' }}>{grandTotal > 0 ? inrFmt(grandTotal) : '—'}</td>
              <td colSpan={2} style={td}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bottom actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <button onClick={addRow}        style={btnTeal}><Plus size={15} /> Add Row</button>
        <button onClick={downloadExcel} style={btnGhost}><Download size={15} /> Download Excel</button>
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, marginLeft: 'auto', opacity: saving ? .7 : 1 }}>
          <Save size={15} /> {saving ? 'Saving…' : 'Save Sheet'}
        </button>
      </div>

      {/* Confirm Sell dialog */}
      {confirmSell !== null && (
        <Overlay onClose={() => setConfirmSell(null)}>
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={20} color={RED} /> Mark Item {confirmSell + 1} as Sold?
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              This item will be marked as <b>SOLD</b> and locked. It will no longer appear as available.<br />
              Block: <b>{rows[confirmSell]?.blockNo || '—'}</b> · Area: <b>{rowCalc[confirmSell]?.sqft || '—'} {sym}</b>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmSell(null)} style={btnGhost}>Cancel</button>
              <button onClick={() => doSell(confirmSell)} style={{ ...btnRed, borderColor: RED }}>
                <CheckCircle size={14} /> Confirm Sold
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {/* Confirm Undo dialog */}
      {confirmUndo !== null && (
        <Overlay onClose={() => setConfirmUndo(null)}>
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A', marginBottom: 10 }}>
              Undo Sale for Item {confirmUndo + 1}?
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>
              This will mark the item as Available again.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmUndo(null)} style={btnGhost}>Cancel</button>
              <button onClick={() => doUndo(confirmUndo)} style={btnGreen}>↩ Undo Sale</button>
            </div>
          </div>
        </Overlay>
      )}

      {addUnitOpen && (
        <AddUnitModal onCancel={() => setAddUnitOpen(false)} onAdded={u => { setUnits(allUnits()); setAddUnitOpen(false); if (u?.key) setOutputUnit(u.key) }} />
      )}
    </>
  )
}

function SummaryBadge({ label, value, color }) {
  return (
    <div style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${color}22`, background: `${color}11`, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 90 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: 'monospace', marginTop: 2 }}>{value}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHEET VIEW  — read-only excel-like view with selection + pricing panel
// ════════════════════════════════════════════════════════════════════════════
function SheetView({ sheet, onBack }) {
  const meta = materialMeta(sheet.product)
  const sym  = AREA_SYMBOL[sheet.outputUnit]
  const [docKind, setDocKind] = useState(null)
  const erp = useErp()

  const sheetId = sheet.id || ('view_' + (sheet.name || 'new'))
  const savedSel = erp.getStoneSelections(sheetId)
  const [selectedRowIndices, setSelectedRowIndices] = useState(() =>
    new Set(Array.isArray(savedSel?.selectedRowIndices) ? savedSel.selectedRowIndices : [])
  )
  const [rate,   setRate]   = useState(savedSel?.rate != null ? String(savedSel.rate || '') : '')
  const [gstPct, setGstPct] = useState(savedSel?.gstPct ?? 18)

  const soldSet = getSoldSet(sheetId)

  const rowData = sheet.rows.map((r, i) => ({
    no: i + 1,
    length: r.length, width: r.width,
    blockNo: r.blockNo || '',
    total: fmtArea(rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)),
    sold: soldSet.has(i),
  }))

  const calculated = useMemo(() => {
    const rateN = parseFloat(rate) || 0
    const rowDetails = sheet.rows.map((r, i) => {
      const area = rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)
      const selected = selectedRowIndices.has(i)
      const qty = Number(fmtArea(area))
      const lineAmount = +(qty * rateN).toFixed(2)
      const gstAmt = +(lineAmount * (Number(gstPct) || 0) / 100).toFixed(2)
      return { index: i, length: r.length, width: r.width, area, selected, qty, lineAmount, gstAmt, lineTotal: +(lineAmount + gstAmt).toFixed(2) }
    })
    const selRows = rowDetails.filter(r => r.selected)
    const selectedArea = selRows.reduce((a, r) => a + r.area, 0)
    const selectedAreaFmt = Number(fmtArea(selectedArea)) || 0
    const subtotal = +(selectedAreaFmt * rateN).toFixed(2)
    const gstAmt   = +(subtotal * (Number(gstPct) || 0) / 100).toFixed(2)
    const grandTotal = +(subtotal + gstAmt).toFixed(2)
    return { rowDetails, selectedArea, selectedAreaFmt, subtotal, gstAmt, grandTotal, selectedCount: selRows.length }
  }, [sheet.rows, sheet.inputUnit, sheet.outputUnit, selectedRowIndices, rate, gstPct])

  useEffect(() => {
    erp.setStoneSelectionsForSheet(sheetId, {
      selectedRowIndices: Array.from(selectedRowIndices),
      rate: Number(rate) || 0, gstPct: Number(gstPct) || 0,
      calculatedPrices: {
        subtotal: calculated.subtotal, gstAmt: calculated.gstAmt,
        grandTotal: calculated.grandTotal, selectedArea: calculated.selectedAreaFmt,
        selectedCount: calculated.selectedCount,
      },
    })
  }, [selectedRowIndices, rate, gstPct, calculated, sheetId, erp])

  const toggleRow   = (i) => setSelectedRowIndices(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  const selectAll   = () => setSelectedRowIndices(new Set(sheet.rows.map((_, i) => i)))
  const deselectAll = () => setSelectedRowIndices(new Set())
  const allSelected  = sheet.rows.length > 0 && selectedRowIndices.size === sheet.rows.length
  const someSelected = selectedRowIndices.size > 0 && selectedRowIndices.size < sheet.rows.length

  const downloadExcel = () => {
    const header = ['No.', `Length (${unitLabel(sheet.inputUnit)})`, `Width (${unitLabel(sheet.inputUnit)})`, `Total (${sym})`, 'Status']
    const body   = rowData.map(r => [r.no, r.length, r.width, Number(r.total), r.sold ? 'SOLD' : 'Available'])
    const meta1  = [[`${meta.label} Sheet`], ['Party', sheet.party], ['Name', sheet.name], ['Date', fmtDate(sheet.date)], []]
    const footer = [[], ['', '', 'Sum Total', Number(fmtArea(sheet.total))]]
    const ws = XLSX.utils.aoa_to_sheet([...meta1, header, ...body, ...footer])
    ws['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }]
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet')
    XLSX.writeFile(wb, `${(sheet.party || 'sheet').replace(/[^\w-]+/g,'_')}-${meta.label}.xlsx`)
  }

  const printSheet = () => {
    const rowsHtml = rowData.map(r => `<tr${r.sold ? ' class="sold"' : ''}><td>${r.no}</td><td>${r.length}</td><td>${r.width}</td><td>${r.total}</td><td>${r.sold ? '✗ SOLD' : 'Available'}</td></tr>`).join('')
    const html = `<html><head><title>${sheet.party} — ${meta.label}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#1E2D4A}h2{margin:0 0 4px}.meta{color:#64748B;font-size:13px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #CBD5E1;padding:8px 10px;text-align:center}th{background:#1E2D4A;color:#fff}tfoot td{font-weight:800;background:#F8FAFC}tr.sold td{text-decoration:line-through;color:#94A3B8;background:#FEF2F2}</style>
      </head><body>
      <h2>${meta.label} Sheet — ${sheet.party}</h2>
      <div class="meta">${sheet.name} · ${fmtDate(sheet.date)}</div>
      <table><thead><tr><th>No.</th><th>Length</th><th>Width</th><th>Total (${sym})</th><th>Status</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot><tr><td colspan="3">Sum Total</td><td>${fmtArea(sheet.total)} ${sym}</td><td></td></tr></tfoot>
      </table></body></html>`
    const w = window.open('', '_blank')
    if (!w) return alert('Please allow pop-ups to print.')
    w.document.write(html); w.document.close(); w.focus(); w.print()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={btnGhost}><ArrowLeft size={15} /> Go back</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <meta.icon size={18} color={meta.color} /> {sheet.party}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{sheet.name} ({sheetLabel(sheet)}) · {fmtDate(sheet.date)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setDocKind('quotation')} style={btnPrimary}><FileText size={15} /> Quotation</button>
          <button onClick={() => setDocKind('invoice')}   style={btnTeal}><ReceiptText size={15} /> Invoice</button>
          <button onClick={downloadExcel} style={btnGhost}><Download size={15} /> Download</button>
          <button onClick={printSheet}    style={btnGhost}><Printer  size={15} /> Print</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #EEF2F7', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: someSelected || allSelected ? ORANGE : '#94A3B8' }}>
              {selectedRowIndices.size} of {sheet.rows.length} selected
            </span>
            {selectedRowIndices.size > 0 && <button onClick={deselectAll} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}>Clear</button>}
          </div>
          {soldSet.size > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: RED, background: '#FEF2F2', padding: '3px 10px', borderRadius: 6 }}>
              {soldSet.size} item{soldSet.size !== 1 ? 's' : ''} sold
            </span>
          )}
        </div>

        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: TEAL, color: '#fff' }}>
                <th style={{ ...th, cursor: 'pointer' }} onClick={() => allSelected ? deselectAll() : selectAll()} title={allSelected ? 'Deselect all' : 'Select all'}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid #fff', background: allSelected ? '#fff' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {allSelected  && <span style={{ color: TEAL, fontSize: 11, fontWeight: 900 }}>✓</span>}
                    {someSelected && <div style={{ position: 'absolute', width: 8, height: 2, background: '#fff' }} />}
                  </div>
                </th>
                <th style={th}>No.</th>
                {sheet.rows[0]?.blockNo !== undefined && <th style={th}>Block No</th>}
                <th style={th}>Length ({unitLabel(sheet.inputUnit)})</th>
                <th style={th}>Width ({unitLabel(sheet.inputUnit)})</th>
                <th style={{ ...th, background: ORANGE }}>Total ({sym})</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rowData.map((r, i) => {
                const selected = selectedRowIndices.has(i)
                const strike   = r.sold ? { textDecoration: 'line-through', color: '#94A3B8' } : {}
                return (
                  <tr key={r.no} style={{ background: r.sold ? '#FEF2F2' : selected ? '#FFF8F3' : '#fff', boxShadow: selected && !r.sold ? `inset 3px 0 0 ${ORANGE}` : 'none', opacity: r.sold ? .7 : 1 }}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {!r.sold && (
                        <div onClick={() => toggleRow(i)} style={{ width: 18, height: 18, borderRadius: 5, cursor: 'pointer', border: `2px solid ${selected ? ORANGE : '#CBD5E1'}`, background: selected ? ORANGE : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                        </div>
                      )}
                      {r.sold && <Lock size={13} style={{ color: RED }} />}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: r.sold ? '#94A3B8' : (selected ? ORANGE : '#1E2D4A') }}><span style={strike}>{r.no}</span></td>
                    {sheet.rows[0]?.blockNo !== undefined && <td style={td}><span style={strike}>{r.blockNo || '—'}</span></td>}
                    <td style={td}><span style={strike}>{r.length}</span></td>
                    <td style={td}><span style={strike}>{r.width}</span></td>
                    <td style={{ ...td, fontWeight: 700, fontFamily: 'monospace', color: r.sold ? '#94A3B8' : (selected ? ORANGE : '#1E2D4A') }}><span style={strike}>{r.total}</span></td>
                    <td style={td}>
                      {r.sold
                        ? <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: RED }}>✗ SOLD</span>
                        : <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: GREEN }}>Available</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F8FAFC' }}>
                <td style={{ ...td, fontWeight: 800 }} colSpan={sheet.rows[0]?.blockNo !== undefined ? 4 : 3}>Sum Total</td>
                <td style={{ ...td, fontWeight: 900, color: ORANGE, fontFamily: 'monospace' }} colSpan={2}>{fmtArea(sheet.total)} {sym}</td>
                <td style={td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Price Details */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1E2D4A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={16} color={ORANGE} /> Selected Calculations &amp; Price Details
        </div>
        {calculated.selectedCount === 0 ? (
          <div className="card" style={{ padding: '28px 20px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            <div style={{ opacity: .4, marginBottom: 8 }}><Calculator size={34} /></div>
            Select rows above using the checkboxes to view price &amp; calculation details.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 14 }}>
            <div className="card table-wrap" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: TEAL, color: '#fff' }}>
                    <th style={th}>#</th>
                    <th style={th}>Length ({unitLabel(sheet.inputUnit)})</th>
                    <th style={th}>Width ({unitLabel(sheet.inputUnit)})</th>
                    <th style={th}>Area ({sym})</th>
                    <th style={{ ...th, background: '#1F3A64' }}>Qty</th>
                    <th style={{ ...th, background: '#1F3A64' }}>Rate</th>
                    <th style={{ ...th, background: '#1F3A64' }}>Amount</th>
                    <th style={{ ...th, background: ORANGE }}>Line Total (incl. {gstPct}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {calculated.rowDetails.filter(r => r.selected).map(r => (
                    <tr key={r.index} style={{ background: '#FFF8F3' }}>
                      <td style={td}>{r.index + 1}</td>
                      <td style={td}>{r.length || 0}</td>
                      <td style={td}>{r.width  || 0}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{fmtArea(r.area)}</td>
                      <td style={{ ...td, fontFamily: 'monospace' }}>{fmtArea(r.area)}</td>
                      <td style={{ ...td, fontFamily: 'monospace' }}>{parseFloat(rate) > 0 ? inrFmt(rate) + '/' + sym : '—'}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{parseFloat(rate) > 0 ? inrFmt(r.lineAmount) : '—'}</td>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 800, color: ORANGE }}>{parseFloat(rate) > 0 ? inrFmt(r.lineTotal) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#F8FAFC' }}>
                    <td style={{ ...td, fontWeight: 800 }} colSpan={3}>Selected ({calculated.selectedCount})</td>
                    <td style={{ ...td, fontWeight: 900, color: ORANGE, fontFamily: 'monospace' }}>{fmtArea(calculated.selectedArea)} {sym}</td>
                    <td style={{ ...td, fontWeight: 800 }} colSpan={3}>Subtotal</td>
                    <td style={{ ...td, fontWeight: 800 }}>{parseFloat(rate) > 0 ? inrFmt(calculated.subtotal) : '—'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Rate (per {sym}) <Req /></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>₹</span>
                  <input value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0" style={{ ...inputStyle, paddingLeft: 26, fontWeight: 700, fontSize: 15, color: ORANGE }} />
                </div>
              </div>
              <div>
                <label style={lbl}>GST (%)</label>
                <select value={gstPct} onChange={e => setGstPct(Number(e.target.value))} style={{ ...inputStyle, cursor: 'pointer', fontWeight: 700 }}>
                  {['0','5','12','18','28'].map(v => <option key={v} value={v}>{v}%</option>)}
                </select>
              </div>
              <div style={{ borderTop: '1px solid #EEF2F7', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                {[
                  ['Selected Rows', calculated.selectedCount],
                  ['Selected Area', `${fmtArea(calculated.selectedArea)} ${sym}`],
                  ['Rate / ' + sym, parseFloat(rate) > 0 ? inrFmt(rate) : '—'],
                  ['Subtotal',      parseFloat(rate) > 0 ? inrFmt(calculated.subtotal) : '—'],
                  [`GST (${gstPct}%)`, parseFloat(rate) > 0 ? inrFmt(calculated.gstAmt) : '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>{k}</span>
                    <b style={{ color: '#1E2D4A', fontFamily: 'monospace' }}>{v}</b>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${ORANGE}`, paddingTop: 8, marginTop: 2 }}>
                  <b style={{ color: '#1E2D4A', fontSize: 14 }}>Grand Total</b>
                  <b style={{ color: ORANGE, fontSize: 16, fontFamily: 'monospace' }}>{parseFloat(rate) > 0 ? inrFmt(calculated.grandTotal) : '—'}</b>
                </div>
              </div>
              {parseFloat(rate) > 0 && (
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#065F46', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={15} color="#059669" />
                  Prices ready — use Quotation / Invoice buttons above to send.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {docKind && <SendDocumentModal kind={docKind} sheet={sheet} onClose={() => setDocKind(null)} />}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SEND DOCUMENT MODAL  (Quotation / Invoice) — unchanged from original
// ════════════════════════════════════════════════════════════════════════════
function SendDocumentModal({ kind, sheet: initialSheet, onClose, allSheets = [] }) {
  const title = kind === 'invoice' ? 'Invoice' : 'Quotation'

  const [selectedSheet, setSelectedSheet] = useState(initialSheet || null)
  const sheetRows = useMemo(
    () => (Array.isArray(selectedSheet?.rows) ? selectedSheet.rows : []),
    [selectedSheet]
  )
  const [selectedRows, setSelectedRows] = useState(() =>
    new Set((Array.isArray(initialSheet?.rows) ? initialSheet.rows : []).map((_, i) => i))
  )
  const prevSheetId = useMemo(() => selectedSheet?.id, [selectedSheet])
  useEffect(() => {
    setSelectedRows(new Set(sheetRows.map((_, i) => i)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevSheetId])

  const toggleRow   = (i) => setSelectedRows(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  const selectAll   = () => setSelectedRows(new Set(sheetRows.map((_, i) => i)))
  const deselectAll = () => setSelectedRows(new Set())

  const [rate, setRate]                   = useState('')
  const [recipientType, setRecipientType] = useState(null)
  const [companies, setCompanies]         = useState([])
  const [loadingCos, setLC]               = useState(false)
  const [recipient, setRecipient]         = useState(null)
  const [sending, setSending]             = useState(false)

  useEffect(() => {
    if (!recipientType) return
    setLC(true); setRecipient(null)
    companyApi.list({ limit: 500 })
      .then(r => {
        const payload = r?.data || r
        const list = Array.isArray(payload?.companies) ? payload.companies : Array.isArray(payload) ? payload : []
        setCompanies(list.filter(c => String(c.biz_type || '').toLowerCase().includes(recipientType.toLowerCase())))
      })
      .catch(() => setCompanies([]))
      .finally(() => setLC(false))
  }, [recipientType])

  const sheet          = selectedSheet
  const sym            = sheet ? AREA_SYMBOL[sheet.outputUnit] : 'ft²'
  const sheetTypeLabel = sheet
    ? ((sheet.product === 'custom' && sheet.custom_type) ? sheet.custom_type : materialMeta(sheet.product).label)
    : ''

  const selectedArea = sheetRows.reduce((acc, r, i) => {
    if (!selectedRows.has(i)) return acc
    return acc + rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)
  }, 0)
  const totalArea = Number(fmtArea(selectedArea)) || 0
  const rateN     = parseFloat(rate) || 0
  const amount    = +(totalArea * rateN).toFixed(2)
  const gstPct    = 18
  const gstAmt    = +(amount * gstPct / 100).toFixed(2)
  const grand     = +(amount + gstAmt).toFixed(2)
  const canSend   = rateN > 0 && recipient

  if (kind === 'invoice' && sheet) {
    const invoiceItems = sheetRows.filter((_, i) => selectedRows.has(i)).map((r, i) => {
      const qty = Number(fmtArea(rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit))) || 0
      const itemRate = Number(sheet.pricePerUnit) || 0
      const taxable  = +(qty * itemRate).toFixed(2)
      const gstAmount = +(taxable * 18 / 100).toFixed(2)
      return { product_name: `${sheetTypeLabel}${sheet.name ? ` · ${sheet.name}` : ''} — Box ${i + 1}`, unit: sym, qty, rate: itemRate, gst_percent: 18, taxable_amount: taxable, gst_amount: gstAmount, total: +(taxable + gstAmount).toFixed(2) }
    })
    return <StoneInvoiceModal key={sheet.id || sheet.name} onClose={onClose} prefillData={{ customer_name: sheet.party || '', invoice_date: sheet.date || todayISO(), items: invoiceItems, remarks: `Stone Calculation — ${sheetTypeLabel}${sheet.name ? ` · ${sheet.name}` : ''}` }} />
  }
  if (kind === 'invoice') return <StoneInvoiceModal onClose={onClose} prefillData={null} />

  const openDocument = () => {
    if (!sheet) return
    const docNo   = `${kind === 'invoice' ? 'INV' : 'QT'}-${Date.now().toString().slice(-6)}`
    const rowsHtml = sheetRows.filter((_, i) => selectedRows.has(i)).map((r, i) => {
      const a = rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)
      return `<tr><td>${i + 1}</td><td>${r.length}</td><td>${r.width}</td><td>${fmtArea(a)} ${sym}</td></tr>`
    }).join('')
    const html = `<html><head><title>${title} — ${recipient?.name || ''}</title>
      <style>body{font-family:Arial,sans-serif;padding:28px;color:#1E2D4A}.h{display:flex;justify-content:space-between;border-bottom:2px solid #F26522;padding-bottom:12px;margin-bottom:16px}.t{font-size:24px;font-weight:800;color:#F26522}table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px}th,td{border:1px solid #CBD5E1;padding:8px 10px;text-align:center}th{background:#1E2D4A;color:#fff}.totals{width:280px;margin-left:auto}.totals td{border:none;padding:5px 8px;text-align:right}.totals .g{font-weight:800;font-size:16px;color:#F26522;border-top:2px solid #1E2D4A}</style></head><body>
      <div class="h"><div><div class="t">${title}</div><div style="font-size:12px;color:#64748B;margin-top:4px">${docNo} · ${fmtDate(sheet.date)}</div></div>
      <div style="text-align:right"><div style="font-weight:800">${sheetTypeLabel}${sheet.name ? ` · ${sheet.name}` : ''}</div><div style="font-size:12px;color:#64748B">To: ${recipient?.name || '—'} (${recipientType || ''})</div></div></div>
      <table><thead><tr><th>No.</th><th>Length (${unitLabel(sheet.inputUnit)})</th><th>Width (${unitLabel(sheet.inputUnit)})</th><th>Area (${sym})</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      <table class="totals"><tr><td>Selected Area</td><td>${fmtArea(totalArea)} ${sym}</td></tr><tr><td>Rate (per ${sym})</td><td>${inrFmt(rateN)}</td></tr><tr><td>Amount</td><td>${inrFmt(amount)}</td></tr><tr><td>GST (${gstPct}%)</td><td>${inrFmt(gstAmt)}</td></tr><tr class="g"><td>Grand Total</td><td>${inrFmt(grand)}</td></tr></table>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus(); w.print()
  }

  const doSend = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const items = sheetRows.filter((_, i) => selectedRows.has(i)).map((r, i) => {
        const a = rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)
        return { product_name: `${sheetTypeLabel} — Box ${i + 1}`, unit: sym, qty: Number(fmtArea(a)), rate: rateN, gst_percent: gstPct, total: +(Number(fmtArea(a)) * rateN).toFixed(2) }
      })
      const qtRes = await api.post('/quotations', {
        seller_company_id: recipient._id, customer_name: recipient.name || recipient.company_code || '',
        items, subtotal: amount, gst_amount: gstAmt, grand_total: grand,
        remarks: `Stone Calculation — ${sheetTypeLabel}${sheet.name ? ` · ${sheet.name}` : ''} — Total ${fmtArea(totalArea)} ${sym}`,
        source: 'Stone Calculation', created_by_type: 'Admin',
      })
      const qtId = qtRes?.data?.data?._id || qtRes?.data?._id
      await api.post('/notifications', {
        company_id: recipient._id, title: `New ${title} from Admin`,
        message: `${sheetTypeLabel}${sheet.name ? ` · ${sheet.name}` : ''} — Total area ${fmtArea(totalArea)} ${sym} · Grand total ₹${grand.toLocaleString('en-IN')}`,
        type: 'quotation', reference_id: qtId || undefined,
      })
      alert(`✓ ${title} sent to ${recipient.name || recipient.company_code} (${recipientType}).`)
      onClose()
    } catch (err) {
      alert(`Failed to send: ${err?.response?.data?.message || err?.message || 'Unknown error'}`)
    } finally { setSending(false) }
  }

  // Step 1: sheet picker
  if (!sheet) {
    return (
      <Overlay onClose={onClose}>
        <ModalHeader icon={kind === 'invoice' ? <ReceiptText size={20} color={ORANGE} /> : <FileText size={20} color={ORANGE} />} bg="#FFF3EC" title={title} sub={`Select a sheet to create ${title.toLowerCase()} from`} onClose={onClose} />
        <div style={{ padding: '16px 22px', maxHeight: '60vh', overflowY: 'auto' }}>
          {allSheets.length === 0
            ? <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No sheets yet.</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allSheets.map(s => {
                  const meta = materialMeta(s.product)
                  const ssym = AREA_SYMBOL[s.outputUnit]
                  return (
                    <div key={s.id} onClick={() => { setSelectedRows(new Set((s.rows || []).map((_, i) => i))); setSelectedSheet(s) }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1.5px solid #E8EDF3', borderRadius: 10, background: '#fff', cursor: 'pointer', transition: 'all .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.background = '#FFF8F3' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDF3'; e.currentTarget.style.background = '#fff' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><meta.icon size={18} color={meta.color} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E2D4A' }}>{s.name || s.party || '—'}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>{sheetLabel(s)} · {fmtDate(s.date)}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: ORANGE, fontFamily: 'monospace' }}>{fmtArea(s.total)} {ssym}</div>
                    </div>
                  )
                })}
              </div>}
        </div>
        <div style={{ padding: '12px 22px 16px', borderTop: '1px solid #E8EDF3', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
        </div>
      </Overlay>
    )
  }

  // Step 2: boxes + rate + recipient
  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', gap: 12 }}>
        {!initialSheet && <button onClick={() => setSelectedSheet(null)} style={{ ...btnGhost, padding: '6px 10px', gap: 4, fontSize: 12 }}><ArrowLeft size={13} /> Back</button>}
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {kind === 'invoice' ? <ReceiptText size={20} color={ORANGE} /> : <FileText size={20} color={ORANGE} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>{sheetTypeLabel}{sheet.name ? ` · ${sheet.name}` : ''} · {fmtArea(sheet.total)} {sym}</div>
        </div>
        <button onClick={onClose} style={closeBtn}><X size={18} /></button>
      </div>

      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '62vh', overflowY: 'auto' }}>
        {sheetRows.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1E2D4A' }}>Select Boxes</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={selectAll}   style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}>All</button>
                <button onClick={deselectAll} style={{ ...btnGhost, padding: '4px 10px', fontSize: 11 }}>None</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {sheetRows.map((r, i) => {
                const a = rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)
                const sel = selectedRows.has(i)
                return (
                  <div key={i} onClick={() => toggleRow(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${sel ? ORANGE : '#E8EDF3'}`, borderRadius: 9, background: sel ? '#FFF8F3' : '#fff', cursor: 'pointer' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${sel ? ORANGE : '#CBD5E1'}`, background: sel ? ORANGE : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: '#1E2D4A' }}>Box {i + 1} — {r.length || 0} × {r.width || 0} {unitLabel(sheet.inputUnit)}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: ORANGE }}>{fmtArea(a)} {sym}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ background: '#F8FAFC', border: '1px solid #EEF2F7', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: '#64748B' }}>Selected Area</span>
            <b style={{ fontFamily: 'monospace' }}>{fmtArea(totalArea)} {sym}</b>
          </div>
          <label style={lbl}>Rate (per {sym}) <Req /></label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>₹</span>
            <input value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g,''))} placeholder="0" style={{ ...inputStyle, paddingLeft: 26 }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[['Amount', inrFmt(amount)], [`GST (${gstPct}%)`, inrFmt(gstAmt)]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B' }}>{k}</span><span>{v}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 6, marginTop: 2 }}>
              <b style={{ color: '#1E2D4A' }}>Grand Total</b><b style={{ color: ORANGE }}>{inrFmt(grand)}</b>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1E2D4A', marginBottom: 8 }}>Send To</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {['Wholesaler', 'Retailer'].map(t => (
              <button key={t} onClick={() => setRecipientType(t)} style={{ ...btnBase, flex: 1, justifyContent: 'center', background: recipientType === t ? NAVY : '#F1F5F9', color: recipientType === t ? '#fff' : '#64748B', border: recipientType === t ? 'none' : '1.5px solid #E2E8F0' }}>{t}</button>
            ))}
          </div>
          {recipientType && (
            loadingCos
              ? <div style={{ padding: 14, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading…</div>
              : companies.length === 0
                ? <div style={{ padding: 14, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No {recipientType.toLowerCase()}s found.</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {companies.map(c => {
                      const sel = recipient && recipient._id === c._id
                      return (
                        <div key={c._id} onClick={() => setRecipient(c)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${sel ? ORANGE : '#E8EDF3'}`, borderRadius: 9, background: sel ? '#FFF8F3' : '#fff', cursor: 'pointer' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name || c.company_code || '—'}</div>
                            <div style={{ fontSize: 11, color: '#94A3B8' }}>{c.company_code || ''}{c.city ? ` · ${c.city}` : ''}</div>
                          </div>
                          {sel && <span style={{ color: ORANGE, fontWeight: 900 }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 22px 18px', borderTop: '1px solid #E8EDF3', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={openDocument} style={btnGhost}><Printer size={14} /> Print Preview</button>
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={doSend} disabled={!canSend || sending} style={{ ...btnPrimary, opacity: (!canSend || sending) ? .5 : 1 }}>
          <Send size={15} /> {sending ? 'Sending…' : `Send ${title}`}
        </button>
      </div>
    </Overlay>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// ADD UNIT MODAL  (unchanged from original)
// ════════════════════════════════════════════════════════════════════════════
function AddUnitModal({ onCancel, onAdded }) {
  const [name,   setName]   = useState('')
  const [factor, setFactor] = useState('')
  const [symbol, setSymbol] = useState('')
  const [err,    setErr]    = useState('')

  const submit = () => {
    try {
      addCustomUnit({ label: name, toMetre: factor, symbol: symbol || name })
      const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')
      onAdded({ key })
    } catch (e) { setErr(e.message || 'Could not add unit.') }
  }

  return (
    <Overlay onClose={onCancel}>
      <ModalHeader icon={<Plus size={20} color={ORANGE} />} bg="#FFF3EC" title="Add New Unit" sub="It will appear in both Input & Output lists" onClose={onCancel} />
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Unit Name <Req /></label>
          <input style={inputStyle} value={name} onChange={e => { setName(e.target.value); setErr('') }} placeholder="e.g. Yard" autoFocus />
        </div>
        <div>
          <label style={lbl}>1 {name.trim() || 'unit'} = how many meters? <Req /></label>
          <input type="number" min="0" step="any" style={inputStyle} value={factor} onChange={e => { setFactor(e.target.value); setErr('') }} placeholder="e.g. 0.9144 for Yard" />
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>
            Examples — Inch: 0.0254 · Feet: 0.3048 · Yard: 0.9144 · Meter: 1
          </div>
        </div>
        <div>
          <label style={lbl}>Short Symbol (optional)</label>
          <input style={inputStyle} value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="e.g. yd" />
        </div>
        {err && <ErrMsg>{err}</ErrMsg>}
      </div>
      <ModalFooter onCancel={onCancel} onConfirm={submit} confirmLabel="Add Unit" />
    </Overlay>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHARED SMALL COMPONENTS
// ════════════════════════════════════════════════════════════════════════════
function Overlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,22,38,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ icon, bg, title, sub, onClose }) {
  return (
    <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg || '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#94A3B8' }}>{sub}</div>}
      </div>
      <button onClick={onClose} style={closeBtn}><X size={18} /></button>
    </div>
  )
}

function ModalFooter({ onCancel, onConfirm, confirmLabel = 'Confirm' }) {
  return (
    <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #E8EDF3', display: 'flex', justifyContent: 'flex-end', gap: 10, position: 'sticky', bottom: 0, background: '#fff' }}>
      <button onClick={onCancel}  style={btnGhost}>Cancel</button>
      <button onClick={onConfirm} style={{ ...btnPrimary, minWidth: 160, justifyContent: 'center' }}>{confirmLabel}</button>
    </div>
  )
}

function UnitSelect({ label, value, onChange, accent, units, onAddUnit }) {
  const ADD = '__add__'
  return (
    <div style={{ minWidth: 160 }}>
      <label style={lbl}>{label}</label>
      <select value={value} onChange={e => e.target.value === ADD ? onAddUnit() : onChange(e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer', fontWeight: 700, color: accent, borderColor: accent + '55', background: '#fff' }}>
        {units.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
        <option value={ADD}>➕ Add new unit…</option>
      </select>
    </div>
  )
}

const gridInput = {
  width: '100%', padding: '8px 10px', border: '1.5px solid #CBD5E1',
  borderRadius: 7, fontSize: 13, color: '#1E2D4A', outline: 'none',
  background: '#fff', boxSizing: 'border-box', textAlign: 'center',
}

function Req() { return <span style={{ color: '#DC2626' }}> *</span> }
function ErrMsg({ children }) { return <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, padding: '6px 10px', background: '#FEF2F2', borderRadius: 7 }}>{children}</div> }
