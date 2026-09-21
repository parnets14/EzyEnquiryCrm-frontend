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
import { useState, useMemo } from 'react'
import {
  Gem, Layers, Box, Grid3x3, Plus, Search, Copy, Save, ArrowLeft,
  Trash2, Eye, Pencil, Share2, Download, Printer, X, Calculator, Calendar,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { stoneApi } from '../api/stoneApi'
import {
  UNITS, AREA_SYMBOL, unitLabel, rowArea, sumArea, fmtArea,
} from '../config/stoneUnits'

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
const productMeta = (key) => PRODUCTS.find(p => p.key === key) || PRODUCTS[0]

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

// ═══════════════════════════════════════════════════════════════════════════
export default function StoneCalculation() {
  const [view, setView]         = useState('list')      // 'list' | 'edit' | 'view'
  const [sheets, setSheets]     = useState(() => stoneApi.list())
  const [active, setActive]     = useState(null)        // sheet being edited / viewed
  const [search, setSearch]     = useState('')

  // modals
  const [newFor, setNewFor]     = useState(null)        // product key for New Sheet modal
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
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   LIST VIEW — product select + My Sheets
═══════════════════════════════════════════════════════════════════════ */
function ListView({ products, sheets, search, setSearch, onNew, onView, onEdit, onDelete, onShare }) {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={22} color={ORANGE} /> Stone Calculation
        </div>
        <div className="page-desc">Please select a product to create a measurement sheet</div>
      </div>

      {/* Product cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14, marginBottom: 26 }}>
        {products.map(p => (
          <button
            key={p.key}
            onClick={() => onNew(p.key)}
            className="card"
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
              cursor: 'pointer', border: '1.5px solid #E8EDF3', background: '#fff',
              textAlign: 'left', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8EDF3'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <p.icon size={24} color={p.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1E2D4A' }}>{p.label}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={11} /> New sheet
              </div>
            </div>
          </button>
        ))}
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
                    <div style={{ fontSize: 12, color: '#64748B' }}>{s.name ? `${s.name} ` : ''}({meta.label})</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{fmtDate(s.date)}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: TEAL, fontFamily: 'monospace' }}>
                      {fmtArea(s.total)} {AREA_SYMBOL[s.outputUnit]}
                    </div>
                  </div>
                  {/* actions */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
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
  const meta = productMeta(product)
  const [name, setName]   = useState('')
  const [party, setParty] = useState('')
  const [date, setDate]   = useState(todayISO())
  const [rows, setRows]   = useState('1')
  const [err, setErr]     = useState('')

  const create = () => {
    if (!name.trim())  return setErr(`${meta.label} name is required`)
    if (!party.trim()) return setErr('Party name is required')
    if (!date)         return setErr('Please choose a date')
    const n = Math.max(1, Math.min(200, parseInt(rows, 10) || 1))
    const sheet = {
      id: null,                       // unsaved yet
      product,
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
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1E2D4A' }}>New {meta.label} Sheet</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Fill the details to start</div>
        </div>
        <button onClick={onCancel} style={closeBtn}><X size={18} /></button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={lbl}>{meta.label} Name <span style={{ color: '#DC2626' }}>*</span></label>
          <input style={inputStyle} value={name} onChange={e => { setName(e.target.value); setErr('') }} placeholder={`e.g. Kajria`} autoFocus />
        </div>
        <div>
          <label style={lbl}>Party Name <span style={{ color: '#DC2626' }}>*</span></label>
          <input style={inputStyle} value={party} onChange={e => { setParty(e.target.value); setErr('') }} placeholder="e.g. Shubham" />
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
            <div style={{ fontSize: 12, color: '#64748B' }}>{sheet.name} ({meta.label}) · {fmtDate(sheet.date)}</div>
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .7 : 1 }}>
          <Save size={15} /> {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* unit selectors */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <UnitSelect label="Input unit"  value={inputUnit} onChange={setInputUnit} accent={TEAL} />
        <UnitSelect label="Output unit" value={outputUnit} onChange={setOutput} accent={ORANGE} />
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
    </>
  )
}

function UnitSelect({ label, value, onChange, accent }) {
  return (
    <div style={{ minWidth: 160 }}>
      <label style={lbl}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        ...inputStyle, cursor: 'pointer', fontWeight: 700, color: accent,
        borderColor: accent + '55', background: '#fff',
      }}>
        {UNITS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
      </select>
    </div>
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
            <div style={{ fontSize: 12, color: '#64748B' }}>{sheet.name} ({meta.label}) · {fmtDate(sheet.date)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={downloadExcel} style={btnTeal}><Download size={15} /> Download</button>
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
