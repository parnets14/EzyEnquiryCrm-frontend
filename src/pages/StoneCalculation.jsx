/**
 * Stone Calculation (Tools)
 *
 * Flow (matches the mobile app):
 *   1. Product select — Granite / Marble / Block / Italian.
 *   2. New Sheet modal — <Product> name, Party name, Choose date  (all mandatory).
 *   3. Add Rows modal — how many rows?  → Cancel / Create.
 *   4. Measurement grid — per-row Length × Width, input & output unit dropdowns,
 *      live per-row area + Sum Total.  Copy Previous fills a row from the row above.
 *   5. Save → appears in "My Sheets".
 *   6. View → excel-like table with Download (Excel) / Print.
 *
 * Real calc: convert Length & Width to the OUTPUT unit, then multiply.
 *   122 in × 38 in → feet  = 10.16667 × 3.16667 = 32.1944 ft²
 */
import { useState, useMemo, useEffect } from 'react'
import {
  Gem, Layers, Box, Grid3x3, Plus, Search, Copy, Save, ArrowLeft,
  Trash2, Eye, Pencil, Share2, Download, Printer, X, Calculator, Calendar,
  FileText, ReceiptText, Send,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { stoneApi } from '../api/stoneApi'
import {
  AREA_SYMBOL, unitLabel, rowArea, sumArea, fmtArea, allUnits, addCustomUnit,
} from '../config/stoneUnits'
import { companyApi } from '../api/companyApi'
import api from '../api'

// ── Products (with react-style icons from lucide) ────────────────────────────
// Brand palette (matches the app logo / sidebar)
const ORANGE = '#F26522'   // brand orange
const NAVY   = '#1E2D4A'   // brand navy/blue
const TEAL   = NAVY        // alias — accents use brand navy

const PRODUCTS = [
  { key: 'granite', label: 'Granite', icon: Gem,     color: ORANGE, bg: '#FFF3EC' },
  { key: 'marble',  label: 'Marble',  icon: Layers,  color: NAVY,   bg: '#EEF1F6' },
  { key: 'block',   label: 'Block',   icon: Box,     color: ORANGE, bg: '#FFF3EC' },
  { key: 'italian', label: 'Italian', icon: Grid3x3, color: NAVY,   bg: '#EEF1F6' },
]
// Fallback meta for custom / unknown sheet types.
const CUSTOM_META = { key: 'custom', label: 'Custom', icon: Calculator, color: ORANGE, bg: '#FFF3EC' }
const productMeta = (key) => PRODUCTS.find(p => p.key === key) || CUSTOM_META
// Display label for a sheet — custom sheets show their user-entered type.
const sheetLabel = (sheet) => (sheet?.product === 'custom' && sheet?.custom_type) ? sheet.custom_type : productMeta(sheet?.product).label

// ── tiny shared styles ───────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '11px 13px', border: '1.5px solid #E2E8F0',
  borderRadius: 9, fontSize: 14, color: '#1E2D4A', outline: 'none',
  background: '#F8FAFC', boxSizing: 'border-box',
}
const lbl = { fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6, display: 'block' }

const todayISO = () => new Date().toISOString().slice(0, 10)
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// (Quotation/Invoice generation moved into SendDocumentModal.)

// ═══════════════════════════════════════════════════════════════════════════
export default function StoneCalculation() {
  const [view, setView]         = useState('list')      // 'list' | 'edit' | 'view'
  const [sheets, setSheets]     = useState(() => stoneApi.list())
  const [active, setActive]     = useState(null)        // sheet being edited / viewed
  const [search, setSearch]     = useState('')

  // modals
  const [newFor, setNewFor]     = useState(null)        // product key for New Sheet modal
  const [docFor, setDocFor]     = useState(null)        // { kind, sheet } → Send modal
  const refresh = () => setSheets(stoneApi.list())

  // ── list view ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sheets
    return sheets.filter(s =>
      (s.party || '').toLowerCase().includes(q) ||
      (s.name || '').toLowerCase().includes(q) ||
      (s.product || '').toLowerCase().includes(q),
    )
  }, [sheets, search])

  const startNew = (sheet) => { setActive(sheet); setView('edit') }
  const openEdit = (sheet) => { setActive(sheet); setView('edit') }
  const openView = (sheet) => { setActive(sheet); setView('view') }

  const handleDelete = (sheet) => {
    if (!window.confirm(`Delete sheet for "${sheet.party}" (${productMeta(sheet.product).label})?`)) return
    stoneApi.remove(sheet.id)
    refresh()
  }

  const handleShare = async (sheet) => {
    const meta = productMeta(sheet.product)
    const lines = [
      `${sheet.party} — ${meta.label}${sheet.name ? ` (${sheet.name})` : ''}`,
      `Date: ${fmtDate(sheet.date)}`,
      '',
      ...sheet.rows.map((r, i) =>
        `${i + 1}. ${r.length} × ${r.width} = ${fmtArea(rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit))} ${AREA_SYMBOL[sheet.outputUnit]}`),
      '',
      `Total: ${fmtArea(sheet.total)} ${AREA_SYMBOL[sheet.outputUnit]}`,
    ]
    const text = lines.join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'Stone Sheet', text })
      else { await navigator.clipboard.writeText(text); alert('Sheet copied to clipboard') }
    } catch { /* user cancelled */ }
  }

  // ═══════════════════════════════════════════════════════════════════════
  return (
    <>
      <div className="breadcrumb">
        <span>Tools</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Stone Calculation</span>
      </div>

      {view === 'list' && (
        <ListView
          products={PRODUCTS}
          sheets={filtered}
          search={search} setSearch={setSearch}
          onNew={setNewFor}
          onView={openView} onEdit={openEdit}
          onDelete={handleDelete} onShare={handleShare}
          onDoc={(kind, sheet) => setDocFor({ kind, sheet })}
        />
      )}

      {view === 'edit' && active && (
        <EditView
          sheet={active}
          onBack={() => { setView('list'); refresh() }}
          onSaved={() => { refresh(); setView('list') }}
        />
      )}

      {view === 'view' && active && (
        <SheetView
          sheet={active}
          onBack={() => setView('list')}
        />
      )}

      {/* New Sheet modal */}
      {newFor && (
        <NewSheetModal
          product={newFor}
          onCancel={() => setNewFor(null)}
          onCreate={(sheet) => { setNewFor(null); startNew(sheet) }}
        />
      )}

      {/* Quotation / Invoice for a specific sheet */}
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

/* ═══════════════════════════════════════════════════════════════════════
   LIST VIEW — product select + My Sheets
═══════════════════════════════════════════════════════════════════════ */
function ListView({ products, sheets, search, setSearch, onNew, onView, onEdit, onDelete, onShare, onDoc }) {
  // Header-level quotation/invoice uses the most recent sheet (sheets[0]).
  // If no sheets exist, show a hint instead.
  const handleHeaderDoc = (kind) => {
    if (!sheets || sheets.length === 0) {
      alert('Please create a sheet first, then use Quotation or Invoice.')
      return
    }
    // Open with no pre-selected sheet — user picks from the list in Step 1.
    onDoc(kind, null)
  }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator size={22} color={ORANGE} /> Stone Calculation
          </div>
          <div className="page-desc">Please select a product to create a measurement sheet</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => handleHeaderDoc('quotation')} style={btnPrimary}><FileText size={15} /> Quotation</button>
          <button onClick={() => handleHeaderDoc('invoice')} style={btnTeal}><ReceiptText size={15} /> Invoice</button>
        </div>
      </div>

      {/* Product cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 26 }}>
        {products.map(p => (
          <button
            key={p.key}
            onClick={() => onNew(p.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
              cursor: 'pointer', border: '1px solid #E8EDF3', borderRadius: 14,
              background: '#fff', textAlign: 'left', transition: 'all .15s',
              boxShadow: '0 1px 2px rgba(1,21,45,.04)', minHeight: 78,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.boxShadow = '0 8px 20px rgba(1,21,45,.10)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDF3'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(1,21,45,.04)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ width: 46, height: 46, borderRadius: 12, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <p.icon size={23} color={p.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1E2D4A' }}>{p.label}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Plus size={11} /> New sheet
              </div>
            </div>
          </button>
        ))}

        {/* Add custom sheet type — same clean look, orange accent */}
        <button
          onClick={() => onNew('custom')}
          style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
            cursor: 'pointer', border: '1px solid #FFD9C2', borderRadius: 14,
            background: '#fff', textAlign: 'left', transition: 'all .15s',
            boxShadow: '0 1px 2px rgba(1,21,45,.04)', minHeight: 78,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.boxShadow = '0 8px 20px rgba(242,101,34,.14)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#FFD9C2'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(1,21,45,.04)'; e.currentTarget.style.transform = 'none' }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 12, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus size={23} color={ORANGE} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1E2D4A' }}>Add</div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Custom sheet type</div>
          </div>
        </button>
      </div>

      {/* My Sheets */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1E2D4A' }}>My Sheets</div>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customer or product…"
              style={{ ...inputStyle, paddingLeft: 34 }}
            />
          </div>
        </div>

        {sheets.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#CBD5E1' }}>
            <Calculator size={42} style={{ opacity: .3, marginBottom: 10 }} />
            <div style={{ fontSize: 14 }}>No sheets yet — pick a product above to start</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sheets.map((s, i) => {
              const meta = productMeta(s.product)
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                  border: '1px solid #EEF2F7', borderRadius: 11, background: '#FBFCFE',
                }}>
                  <div style={{ width: 30, textAlign: 'center', fontWeight: 800, color: '#94A3B8', flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <meta.icon size={18} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1E2D4A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.party || '—'}</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>{s.name ? `${s.name} ` : ''}({sheetLabel(s)})</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{fmtDate(s.date)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: TEAL, fontFamily: 'monospace' }}>
                      {fmtArea(s.total)} {AREA_SYMBOL[s.outputUnit]}
                    </div>
                  </div>
                  {/* actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <IconBtn title="Quotation" color={ORANGE}  onClick={() => onDoc('quotation', s)}><FileText size={15} /></IconBtn>
                    <IconBtn title="Invoice"   color={NAVY}    onClick={() => onDoc('invoice', s)}><ReceiptText size={15} /></IconBtn>
                    <IconBtn title="View"   color="#2563EB" onClick={() => onView(s)}><Eye size={15} /></IconBtn>
                    <IconBtn title="Edit"   color="#16A34A" onClick={() => onEdit(s)}><Pencil size={15} /></IconBtn>
                    <IconBtn title="Share"  color={TEAL}    onClick={() => onShare(s)}><Share2 size={15} /></IconBtn>
                    <IconBtn title="Delete" color="#DC2626" onClick={() => onDelete(s)}><Trash2 size={15} /></IconBtn>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function IconBtn({ title, color, onClick, children }) {
  return (
    <button title={title} onClick={onClick} style={{
      width: 32, height: 32, borderRadius: 8, border: '1px solid #E2E8F0',
      background: '#fff', color, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   NEW SHEET MODAL
═══════════════════════════════════════════════════════════════════════ */
function NewSheetModal({ product, onCancel, onCreate }) {
  const isCustom = product === 'custom'
  const meta = productMeta(product)
  const [customType, setCustomType] = useState('')   // custom sheet type name
  const [name, setName]   = useState('')
  const party = ''   // party name field removed from the sheet form
  const [date, setDate]   = useState(todayISO())
  const [rows, setRows]   = useState('1')
  const [err, setErr]     = useState('')

  const typeLabel = isCustom ? (customType.trim() || 'Custom') : meta.label

  const create = () => {
    if (isCustom) {
      // Custom "Add" needs only the sheet name — everything else defaults.
      if (!customType.trim()) return setErr('Sheet name is required')
      onCreate({
        id: null,
        product: 'custom',
        custom_type: customType.trim(),
        name: customType.trim(),
        party: '',
        date: todayISO(),
        inputUnit: 'inch',
        outputUnit: 'feet',
        rows: [{ length: '', width: '' }],
        total: 0,
      })
      return
    }
    if (!name.trim())  return setErr(`${typeLabel} name is required`)
    if (!date)         return setErr('Please choose a date')
    const n = Math.max(1, Math.min(200, parseInt(rows, 10) || 1))
    const sheet = {
      id: null,                       // unsaved yet
      product,
      custom_type: '',
      name: name.trim(),
      party: party.trim(),
      date,
      inputUnit: 'inch',
      outputUnit: 'feet',
      rows: Array.from({ length: n }, () => ({ length: '', width: '' })),
      total: 0,
    }
    onCreate(sheet)
  }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <meta.icon size={20} color={meta.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A' }}>New {typeLabel} Sheet</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Fill the details to start</div>
        </div>
        <button onClick={onCancel} style={closeBtn}><X size={18} /></button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isCustom ? (
          /* Custom "Add": ask ONLY for the sheet name. */
          <div>
            <label style={lbl}>Sheet Name <span style={{ color: '#DC2626' }}>*</span></label>
            <input style={inputStyle} value={customType} onChange={e => { setCustomType(e.target.value); setErr('') }} placeholder="e.g. Sandstone" autoFocus />
          </div>
        ) : (
          <>
            <div>
              <label style={lbl}>{typeLabel} Name <span style={{ color: '#DC2626' }}>*</span></label>
              <input style={inputStyle} value={name} onChange={e => { setName(e.target.value); setErr('') }} placeholder={`e.g. Kajria`} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={lbl}>Choose Date <span style={{ color: '#DC2626' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={15} color="#94A3B8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="date" style={{ ...inputStyle, paddingLeft: 34 }} value={date} onChange={e => { setDate(e.target.value); setErr('') }} />
                </div>
              </div>
              <div>
                <label style={lbl}>Add Rows</label>
                <input type="number" min="1" max="200" style={inputStyle} value={rows} onChange={e => setRows(e.target.value)} placeholder="Number of rows" />
              </div>
            </div>
          </>
        )}

        {err && <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{err}</div>}
      </div>

      <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #E8EDF3', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
        <button onClick={create} style={btnPrimary}>Create</button>
      </div>
    </Overlay>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   EDIT VIEW — measurement grid
═══════════════════════════════════════════════════════════════════════ */
function EditView({ sheet, onBack, onSaved }) {
  const meta = productMeta(sheet.product)
  const [rows, setRows]           = useState(sheet.rows.length ? sheet.rows : [{ length: '', width: '' }])
  const [inputUnit, setInputUnit] = useState(sheet.inputUnit || 'inch')
  const [outputUnit, setOutput]   = useState(sheet.outputUnit || 'feet')
  const [saving, setSaving]       = useState(false)
  const [units, setUnits]         = useState(() => allUnits())   // built-in + custom
  const [addUnitOpen, setAddUnitOpen] = useState(false)
  const [docKind, setDocKind]     = useState(null)   // 'quotation' | 'invoice' → opens SendDocumentModal

  const sym = AREA_SYMBOL[outputUnit]
  const total = useMemo(() => sumArea(rows, inputUnit, outputUnit), [rows, inputUnit, outputUnit])

  const setCell = (i, field, val) =>
    setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const addRow = () => setRows(rs => [...rs, { length: '', width: '' }])
  const removeRow = (i) => setRows(rs => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs)

  // Copy Previous: fill every empty row from the row above it.
  const copyPrevious = () =>
    setRows(rs => rs.map((r, i) => {
      if (i === 0) return r
      const prev = rs[i - 1]
      const length = r.length === '' ? prev.length : r.length
      const width  = r.width  === '' ? prev.width  : r.width
      return { ...r, length, width }
    }))

  const save = () => {
    setSaving(true)
    const payload = {
      product: sheet.product, name: sheet.name, party: sheet.party, date: sheet.date,
      inputUnit, outputUnit, rows, total,
    }
    if (sheet.id) stoneApi.update(sheet.id, payload)
    else          stoneApi.create(payload)
    setSaving(false)
    onSaved()
  }

  return (
    <>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={btnGhost}><ArrowLeft size={15} /> Back</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <meta.icon size={18} color={meta.color} /> {sheet.party}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{sheet.name} ({sheetLabel(sheet)}) · {fmtDate(sheet.date)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setDocKind('quotation')} style={btnPrimary}>
            <FileText size={15} /> Quotation
          </button>
          <button onClick={() => setDocKind('invoice')} style={btnTeal}>
            <ReceiptText size={15} /> Invoice
          </button>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>
            <Save size={15} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* unit selectors */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <UnitSelect label="Input unit"  value={inputUnit} onChange={setInputUnit} accent={TEAL}   units={units} onAddUnit={() => setAddUnitOpen(true)} />
        <UnitSelect label="Output unit" value={outputUnit} onChange={setOutput}   accent={ORANGE} units={units} onAddUnit={() => setAddUnitOpen(true)} />
      </div>

      {/* grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr 1.2fr 46px', background: TEAL, color: '#fff', fontWeight: 700, fontSize: 13 }}>
          <Cell head>SN</Cell>
          <Cell head>Length</Cell>
          <Cell head>Width</Cell>
          <Cell head style={{ background: ORANGE }}>Total ({sym})</Cell>
          <Cell head style={{ background: ORANGE }} />
        </div>

        {rows.map((r, i) => {
          const area = rowArea(r.length, r.width, inputUnit, outputUnit)
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 1fr 1.2fr 46px', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
              <Cell style={{ fontWeight: 700, color: '#64748B', justifyContent: 'center' }}>{i + 1}</Cell>
              <Cell>
                <input type="number" min="0" step="any" value={r.length} onChange={e => setCell(i, 'length', e.target.value)} placeholder="0" style={gridInput} />
              </Cell>
              <Cell>
                <input type="number" min="0" step="any" value={r.width} onChange={e => setCell(i, 'width', e.target.value)} placeholder="0" style={gridInput} />
              </Cell>
              <Cell style={{ fontWeight: 700, color: '#1E2D4A', fontFamily: 'monospace' }}>
                {area ? fmtArea(area) : ''}
              </Cell>
              <Cell style={{ justifyContent: 'center' }}>
                <button title="Remove row" onClick={() => removeRow(i)} style={{ border: 'none', background: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={15} />
                </button>
              </Cell>
            </div>
          )
        })}

        {/* footer sum */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '12px 16px', background: '#F8FAFC', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>Sum Total:</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: ORANGE, fontFamily: 'monospace' }}>{fmtArea(total)} {sym}</span>
        </div>
      </div>

      {/* action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={addRow} style={btnTeal}><Plus size={15} /> Add Row</button>
          <button onClick={copyPrevious} style={btnTeal}><Copy size={15} /> Copy Previous</button>
        </div>
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>
          <Save size={15} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Add custom unit modal */}
      {addUnitOpen && (
        <AddUnitModal
          onCancel={() => setAddUnitOpen(false)}
          onAdded={(newUnit) => {
            setUnits(allUnits())
            setAddUnitOpen(false)
            // Select the newly added unit as the output unit for convenience.
            if (newUnit?.key) setOutput(newUnit.key)
          }}
        />
      )}

      {/* Quotation / Invoice — box selection, pricing & send */}
      {docKind && (
        <SendDocumentModal
          kind={docKind}
          sheet={{ ...sheet, inputUnit, outputUnit, rows, total }}
          onClose={() => setDocKind(null)}
        />
      )}
    </>
  )
}

function UnitSelect({ label, value, onChange, accent, units, onAddUnit }) {
  const ADD = '__add__'
  return (
    <div style={{ minWidth: 170 }}>
      <label style={lbl}>{label}</label>
      <select
        value={value}
        onChange={e => { if (e.target.value === ADD) onAddUnit(); else onChange(e.target.value) }}
        style={{
          ...inputStyle, cursor: 'pointer', fontWeight: 700, color: accent,
          borderColor: accent + '55', background: '#fff',
        }}
      >
        {units.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
        <option value={ADD}>➕ Add new unit…</option>
      </select>
    </div>
  )
}

/* Add-unit modal — name + how many metres = 1 unit (for area conversion). */
function AddUnitModal({ onCancel, onAdded }) {
  const [name, setName]     = useState('')
  const [factor, setFactor] = useState('')
  const [symbol, setSymbol] = useState('')
  const [err, setErr]       = useState('')

  const submit = () => {
    try {
      addCustomUnit({ label: name, toMetre: factor, symbol: symbol || name })
      const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      onAdded({ key })
    } catch (e) { setErr(e.message || 'Could not add unit.') }
  }

  return (
    <Overlay onClose={onCancel}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={20} color={ORANGE} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A' }}>Add New Unit</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>It will appear in both Input & Output lists</div>
        </div>
        <button onClick={onCancel} style={closeBtn}><X size={18} /></button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>Unit Name <span style={{ color: '#DC2626' }}>*</span></label>
          <input style={inputStyle} value={name} onChange={e => { setName(e.target.value); setErr('') }} placeholder="e.g. Yard" autoFocus />
        </div>
        <div>
          <label style={lbl}>1 {name.trim() || 'unit'} = how many meters? <span style={{ color: '#DC2626' }}>*</span></label>
          <input type="number" min="0" step="any" style={inputStyle} value={factor} onChange={e => { setFactor(e.target.value); setErr('') }} placeholder="e.g. 0.9144 for Yard" />
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>
            Needed so areas convert correctly. Examples — Inch: 0.0254 · Feet: 0.3048 · Yard: 0.9144 · Meter: 1
          </div>
        </div>
        <div>
          <label style={lbl}>Short Symbol (optional)</label>
          <input style={inputStyle} value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="e.g. yd (shown as yd²)" />
        </div>
        {err && <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{err}</div>}
      </div>

      <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #E8EDF3', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
        <button onClick={submit} style={btnPrimary}>Add Unit</button>
      </div>
    </Overlay>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   SEND DOCUMENT MODAL — pick boxes, set per-box price, choose recipient, send.
   Everything happens in this one panel.
═══════════════════════════════════════════════════════════════════════ */
function SendDocumentModal({ kind, sheet: initialSheet, onClose, allSheets = [] }) {
  const title = kind === 'invoice' ? 'Invoice' : 'Quotation'

  // ── ALL HOOKS FIRST (Rules of Hooks — no hooks after conditional return) ──

  // Step 1 state — which sheet is selected
  const [selectedSheet, setSelectedSheet] = useState(initialSheet || null)

  // Step 2 state — boxes selection (rows of the chosen sheet)
  const sheetRows = useMemo(
    () => (Array.isArray(selectedSheet?.rows) ? selectedSheet.rows : []),
    [selectedSheet]
  )
  const [selectedRows, setSelectedRows] = useState(() => new Set())
  // Re-init selectedRows (select all) whenever the sheet changes
  const prevSheetId = useMemo(() => selectedSheet?.id, [selectedSheet])
  useEffect(() => {
    setSelectedRows(new Set(sheetRows.map((_, i) => i)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevSheetId])

  const toggleRow    = (i) => setSelectedRows(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })
  const selectAll    = () => setSelectedRows(new Set(sheetRows.map((_, i) => i)))
  const deselectAll  = () => setSelectedRows(new Set())

  // Step 2 state — rate + recipient
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
        const wanted = recipientType.toLowerCase()
        setCompanies(list.filter(c => String(c.biz_type || '').toLowerCase().includes(wanted)))
      })
      .catch(() => setCompanies([]))
      .finally(() => setLC(false))
  }, [recipientType])

  // ── DERIVED VALUES (need selectedSheet, so computed after all hooks) ──
  const sheet          = selectedSheet
  const sym            = sheet ? AREA_SYMBOL[sheet.outputUnit] : 'ft²'
  const sheetTypeLabel = sheet
    ? ((sheet.product === 'custom' && sheet.custom_type) ? sheet.custom_type : productMeta(sheet.product).label)
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
  const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  const canSend   = rateN > 0 && recipient

  const openDocument = () => {
    if (!sheet) return
    const docNo    = `${kind === 'invoice' ? 'INV' : 'QT'}-${Date.now().toString().slice(-6)}`
    const rowsHtml = sheetRows.filter((_, i) => selectedRows.has(i)).map((r, i) => {
      const a = rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)
      return `<tr><td>${i + 1}</td><td>${r.length}</td><td>${r.width}</td><td>${fmtArea(a)} ${sym}</td></tr>`
    }).join('')
    const html = `
      <html><head><title>${title} — ${recipient?.name || ''}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:28px;color:#1E2D4A}
        .h{display:flex;justify-content:space-between;border-bottom:2px solid #F26522;padding-bottom:12px;margin-bottom:16px}
        .t{font-size:24px;font-weight:800;color:#F26522;letter-spacing:1px}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px}
        th,td{border:1px solid #CBD5E1;padding:8px 10px;text-align:center}
        th{background:#1E2D4A;color:#fff}
        .totals{width:280px;margin-left:auto;font-size:14px}
        .totals td{border:none;padding:5px 8px;text-align:right}
        .totals .g{font-weight:800;font-size:16px;color:#F26522;border-top:2px solid #1E2D4A}
      </style></head><body>
        <div class="h">
          <div><div class="t">${title}</div><div style="font-size:12px;color:#64748B;margin-top:4px">${docNo} · ${fmtDate(sheet.date)}</div></div>
          <div style="text-align:right"><div style="font-weight:800">${sheetTypeLabel}${sheet.name ? ` · ${sheet.name}` : ''}</div>
          <div style="font-size:12px;color:#64748B">To: ${recipient?.name || '—'} (${recipientType || ''})</div></div>
        </div>
        <table>
          <thead><tr><th>No.</th><th>Length (${unitLabel(sheet.inputUnit)})</th><th>Width (${unitLabel(sheet.inputUnit)})</th><th>Area (${sym})</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <table class="totals">
          <tr><td>Selected Area</td><td>${fmtArea(totalArea)} ${sym}</td></tr>
          <tr><td>Rate (per ${sym})</td><td>${inr(rateN)}</td></tr>
          <tr><td>Amount</td><td>${inr(amount)}</td></tr>
          <tr><td>GST (${gstPct}%)</td><td>${inr(gstAmt)}</td></tr>
          <tr class="g"><td>Grand Total</td><td>${inr(grand)}</td></tr>
        </table>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html); w.document.close(); w.focus(); w.print()
  }

  const doSend = async () => {
    if (!canSend) return
    setSending(true)
    try {
      // 1. Build items from selected sheet rows.
      const items = sheetRows
        .filter((_, i) => selectedRows.has(i))
        .map((r, i) => {
          const a = rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)
          return {
            product_name: `${sheetTypeLabel} — Box ${i + 1}`,
            unit:         sym,
            qty:          Number(fmtArea(a)),
            rate:         rateN,
            gst_percent:  gstPct,
            total:        +(Number(fmtArea(a)) * rateN).toFixed(2),
          }
        })

      // 2. Create quotation in DB — recipient company can see it.
      const qtRes = await api.post('/quotations', {
        seller_company_id: recipient._id,
        customer_name:     recipient.name || recipient.company_code || '',
        items,
        subtotal:          amount,
        gst_amount:        gstAmt,
        grand_total:       grand,
        remarks:           `Stone Calculation — ${sheetTypeLabel}${sheet.name ? ` · ${sheet.name}` : ''} — Total ${fmtArea(totalArea)} ${sym}`,
        source:            'Stone Calculation',
        created_by_type:   'Admin',
      })
      const qtId = qtRes?.data?.data?._id || qtRes?.data?._id

      // 3. Send in-app notification — appears in recipient's app notification bell + push.
      await api.post('/notifications', {
        company_id:   recipient._id,
        title:        `New ${title} from Admin`,
        message:      `${sheetTypeLabel}${sheet.name ? ` · ${sheet.name}` : ''} — Total area ${fmtArea(totalArea)} ${sym} · Grand total ₹${grand.toLocaleString('en-IN')}`,
        type:         'quotation',
        reference_id: qtId || undefined,
      })

      // Print dialog removed — send silently, recipient gets notification in their app.
      alert(`✓ ${title} sent to ${recipient.name || recipient.company_code} (${recipientType}). They will receive a notification in their app.`)
      onClose()
    } catch (err) {
      alert(`Failed to send: ${err?.response?.data?.message || err?.message || 'Unknown error'}`)
    } finally {
      setSending(false)
    }
  }

  // ── RENDER ──

  // Step 1: no sheet selected → show sheet picker
  if (!sheet) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {kind === 'invoice' ? <ReceiptText size={20} color={ORANGE} /> : <FileText size={20} color={ORANGE} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A' }}>{title}</div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>Select a sheet to create {title.toLowerCase()} from</div>
          </div>
          <button onClick={onClose} style={closeBtn}><X size={18} /></button>
        </div>
        <div style={{ padding: '16px 22px', maxHeight: '60vh', overflowY: 'auto' }}>
          {allSheets.length === 0
            ? <div style={{ padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No sheets yet. Create a sheet first.</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allSheets.map(s => {
                  const meta = productMeta(s.product)
                  const ssym = AREA_SYMBOL[s.outputUnit]
                  return (
                    <div key={s.id} onClick={() => setSelectedSheet(s)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      border: '1.5px solid #E8EDF3', borderRadius: 10, background: '#fff',
                      cursor: 'pointer', transition: 'all .12s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = ORANGE; e.currentTarget.style.background = '#FFF8F3' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDF3'; e.currentTarget.style.background = '#fff' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <meta.icon size={18} color={meta.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1E2D4A' }}>{s.name || '—'}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>{sheetLabel(s)} · {fmtDate(s.date)}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: ORANGE, fontFamily: 'monospace' }}>{fmtArea(s.total)} {ssym}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
        <div style={{ padding: '12px 22px 16px', borderTop: '1px solid #E8EDF3', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
        </div>
      </Overlay>
    )
  }

  // Step 2: sheet chosen → boxes + rate + recipient
  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', gap: 12 }}>
        {!initialSheet && (
          <button onClick={() => setSelectedSheet(null)} style={{ ...btnGhost, padding: '6px 10px', gap: 4, fontSize: 12 }}>
            <ArrowLeft size={13} /> Back
          </button>
        )}
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
        {/* Box (row) selection */}
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
                  <div key={i} onClick={() => toggleRow(i)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    border: `1.5px solid ${sel ? ORANGE : '#E8EDF3'}`, borderRadius: 9,
                    background: sel ? '#FFF8F3' : '#fff', cursor: 'pointer',
                  }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${sel ? ORANGE : '#CBD5E1'}`, background: sel ? ORANGE : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {sel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: '#1E2D4A' }}>
                      Box {i + 1} — {r.length || 0} × {r.width || 0} {unitLabel(sheet.inputUnit)}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: ORANGE, flexShrink: 0 }}>
                      {fmtArea(a)} {sym}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Rate + summary */}
        <div style={{ background: '#F8FAFC', border: '1px solid #EEF2F7', borderRadius: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: '#64748B' }}>Selected Area</span>
            <b style={{ color: '#1E2D4A', fontFamily: 'monospace' }}>{fmtArea(totalArea)} {sym}</b>
          </div>
          <label style={lbl}>Rate (per {sym}) <span style={{ color: '#DC2626' }}>*</span></label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>₹</span>
            <input value={rate} onChange={e => setRate(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" style={{ ...inputStyle, paddingLeft: 26 }} />
          </div>
          <div style={{ marginTop: 10, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B' }}>Amount</span><span>{inr(amount)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748B' }}>GST ({gstPct}%)</span><span>{inr(gstAmt)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 6, marginTop: 2 }}>
              <b style={{ color: '#1E2D4A' }}>Grand Total</b><b style={{ color: ORANGE }}>{inr(grand)}</b>
            </div>
          </div>
        </div>

        {/* Recipient */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1E2D4A', marginBottom: 8 }}>Send To</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            {['Wholesaler', 'Retailer'].map(t => (
              <button key={t} onClick={() => setRecipientType(t)} style={{
                ...btnBase, flex: 1, justifyContent: 'center',
                background: recipientType === t ? NAVY : '#F1F5F9',
                color: recipientType === t ? '#fff' : '#64748B',
                border: recipientType === t ? 'none' : '1.5px solid #E2E8F0',
              }}>{t}</button>
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
                        <div key={c._id} onClick={() => setRecipient(c)} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                          border: `1.5px solid ${sel ? ORANGE : '#E8EDF3'}`, borderRadius: 9,
                          background: sel ? '#FFF8F3' : '#fff', cursor: 'pointer',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E2D4A' }}>{c.name || c.company_code || '—'}</div>
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
        <button onClick={onClose} style={btnGhost}>Cancel</button>
        <button onClick={doSend} disabled={!canSend || sending} style={{ ...btnPrimary, opacity: (!canSend || sending) ? .5 : 1 }}>
          <Send size={15} /> {sending ? 'Sending…' : `Send ${title}`}
        </button>
      </div>
    </Overlay>
  )
}
const gridInput = {
  width: '100%', padding: '9px 10px', border: '1.5px solid #CBD5E1',
  borderRadius: 7, fontSize: 14, color: '#1E2D4A', outline: 'none',
  background: '#fff', boxSizing: 'border-box', textAlign: 'center',
}
function Cell({ children, head, style }) {
  return (
    <div style={{
      padding: '10px 12px', display: 'flex', alignItems: 'center',
      ...(head ? { textTransform: 'none' } : {}), ...style,
    }}>{children}</div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   SHEET VIEW — excel-like read-only table + export
═══════════════════════════════════════════════════════════════════════ */
function SheetView({ sheet, onBack }) {
  const meta = productMeta(sheet.product)
  const sym = AREA_SYMBOL[sheet.outputUnit]
  const [docKind, setDocKind] = useState(null)

  const rowData = sheet.rows.map((r, i) => ({
    no: i + 1,
    length: r.length,
    width: r.width,
    total: fmtArea(rowArea(r.length, r.width, sheet.inputUnit, sheet.outputUnit)),
  }))

  const downloadExcel = () => {
    const header = ['No.', `Length (${unitLabel(sheet.inputUnit)})`, `Width (${unitLabel(sheet.inputUnit)})`, `Total (${sym})`]
    const body = rowData.map(r => [r.no, r.length, r.width, Number(r.total)])
    const meta1 = [
      [`${meta.label} Sheet`],
      ['Party', sheet.party],
      ['Name', sheet.name],
      ['Date', fmtDate(sheet.date)],
      [],
    ]
    const footer = [[], ['', '', 'Sum Total', Number(fmtArea(sheet.total))]]
    const aoa = [...meta1, header, ...body, ...footer]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{ wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet')
    const safe = `${sheet.party || 'sheet'}-${meta.label}`.replace(/[^\w-]+/g, '_')
    XLSX.writeFile(wb, `${safe}.xlsx`)
  }

  const printSheet = () => {
    const rowsHtml = rowData.map(r =>
      `<tr><td>${r.no}</td><td>${r.length}</td><td>${r.width}</td><td>${r.total}</td></tr>`).join('')
    const html = `
      <html><head><title>${sheet.party} — ${meta.label}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#1E2D4A}
        h2{margin:0 0 4px}
        .meta{color:#64748B;font-size:13px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #CBD5E1;padding:8px 10px;text-align:center}
        th{background:#0E6E7C;color:#fff}
        tfoot td{font-weight:800;background:#F8FAFC}
      </style></head><body>
        <h2>${meta.label} Sheet — ${sheet.party}</h2>
        <div class="meta">${sheet.name} · ${fmtDate(sheet.date)} · Input: ${unitLabel(sheet.inputUnit)} · Output: ${unitLabel(sheet.outputUnit)}</div>
        <table>
          <thead><tr><th>No.</th><th>Length (${unitLabel(sheet.inputUnit)})</th><th>Width (${unitLabel(sheet.inputUnit)})</th><th>Total (${sym})</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr><td colspan="3">Sum Total</td><td>${fmtArea(sheet.total)} ${sym}</td></tr></tfoot>
        </table>
      </body></html>`
    const w = window.open('', '_blank')
    if (!w) return alert('Please allow pop-ups to print.')
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={btnGhost}><ArrowLeft size={15} /> Go back to sheets</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A', display: 'flex', alignItems: 'center', gap: 8 }}>
              <meta.icon size={18} color={meta.color} /> {sheet.party}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{sheet.name} ({sheetLabel(sheet)}) · {fmtDate(sheet.date)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setDocKind('quotation')} style={btnPrimary}><FileText size={15} /> Quotation</button>
          <button onClick={() => setDocKind('invoice')} style={btnTeal}><ReceiptText size={15} /> Invoice</button>
          <button onClick={downloadExcel} style={btnGhost}><Download size={15} /> Download</button>
          <button onClick={printSheet} style={btnGhost}><Printer size={15} /> Print</button>
        </div>
      </div>

      <div className="card table-wrap" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: TEAL, color: '#fff' }}>
              <th style={th}>No.</th>
              <th style={th}>Length ({unitLabel(sheet.inputUnit)})</th>
              <th style={th}>Width ({unitLabel(sheet.inputUnit)})</th>
              <th style={{ ...th, background: ORANGE }}>Total ({sym})</th>
            </tr>
          </thead>
          <tbody>
            {rowData.map(r => (
              <tr key={r.no}>
                <td style={td}>{r.no}</td>
                <td style={td}>{r.length}</td>
                <td style={td}>{r.width}</td>
                <td style={{ ...td, fontWeight: 700, fontFamily: 'monospace' }}>{r.total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#F8FAFC' }}>
              <td style={{ ...td, fontWeight: 800 }} colSpan={3}>Sum Total</td>
              <td style={{ ...td, fontWeight: 900, color: ORANGE, fontFamily: 'monospace' }}>{fmtArea(sheet.total)} {sym}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {docKind && (
        <SendDocumentModal kind={docKind} sheet={sheet} onClose={() => setDocKind(null)} />
      )}
    </>
  )
}

const th = { padding: '11px 12px', textAlign: 'center', fontWeight: 700, borderRight: '1px solid rgba(255,255,255,.15)' }
const td = { padding: '9px 12px', textAlign: 'center', color: '#1E2D4A', borderBottom: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }

/* ═══════════════════════════════════════════════════════════════════════
   shared: overlay + buttons
═══════════════════════════════════════════════════════════════════════ */
function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,22,38,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 0 }}
      >
        {children}
      </div>
    </div>
  )
}

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '10px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700,
  cursor: 'pointer', border: 'none',
}
const btnPrimary = { ...btnBase, background: 'linear-gradient(135deg,#F26522,#FF8A4C)', color: '#fff', boxShadow: '0 4px 14px rgba(242,101,34,0.3)' }
const btnTeal    = { ...btnBase, background: NAVY, color: '#fff' }
const btnGhost   = { ...btnBase, background: '#F1F5F9', color: '#64748B', border: '1.5px solid #E2E8F0' }
const closeBtn   = { width: 34, height: 34, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
