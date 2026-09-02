import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Search, Trash2, Package, Eye, Edit2, X, ChevronDown, RotateCcw, Layers, Box, DollarSign, Info, Image as ImageIcon, CheckCircle, XCircle, ChevronLeft, ChevronRight, Download } from 'lucide-react'

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SIZES = [
  '300x300','300x450','300x600','400x400','450x900',
  '600x600','600x1200','800x800','800x1600',
  '1000x1000','1200x1200','1200x2400',
]
const FINISHES   = ['Glossy','Matte','Satin','Anti-Skid','Polished','Rustic','Textured','Natural']
const SURFACES   = ['Polished','Unpolished','Matt','Glossy','Rough','Structured']
const GRADES     = ['Grade A','Grade B','Grade C','First Quality','Second Quality','Commercial']
const TILE_TYPES = ['Floor Tile','Wall Tile','Floor & Wall','Outdoor','Pool Tile','Mosaic','Subway']
const AREAS      = ['Living Room','Bedroom','Bathroom','Kitchen','Outdoor','Commercial','Swimming Pool']
const ANTI_SKIDS = ['R9','R10','R11','R12','Non Slip','Normal']
const ORIGINS    = ['India','Italy','Spain','China','Portugal','Brazil','Turkey','UAE']
const UNITS      = ['Sq Ft','Sq Mtr','Piece','Box','Nos']
const GST_OPTS   = ['5','12','18','28']
const SALE_MODES = ['Box Only','Sq.Ft Only','Piece Only','Box + Sq.Ft']
const SALE_TYPES = ['Regular Sale','B2B Sale','Export Sale','Project Sale']
const PROD_TYPES = ['Regular Product','Premium Product','Economy Product','Exclusive Product']

const IMG_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000'

const EMPTY_FORM = {
  code:'', name:'', alias:'', description:'', hsn_code:'',
  brand_id:'', category_id:'', sub_category_id:'',
  unit:'Box', gst_percent:'18',
  size:'', finish:'', color:'', surface:'', thickness:'', grade:'',
  tile_type:'', application:'', anti_skid:'', origin:'', manufacturer:'', barcode:'',
  design:'', collection:'', pcs_per_box:'', sqft_per_box:'', weight_per_box:'',
  purchase_rate:'', landing_cost:'', mrp:'', retail_rate:'', dealer_rate:'',
  wholesale_rate:'', project_rate:'', min_selling_rate:'',
  // discount % fields (off MRP)
  retail_discount:'', dealer_discount:'', wholesale_discount:'', project_discount:'',
  min_stock_level:'', reorder_level:'',
  status:'Active', sales_type:'Regular Sale', product_type:'Regular Product',
  new_arrival: false, featured: false, online_visible: true, dealer_visible: true,
}

function imgUrl(p) {
  if (!p) return null
  if (p.startsWith('http')) return p
  return `${IMG_BASE}${p}`
}

// â”€â”€ Generate & print full product details sheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function downloadProduct(p) {
  const fmtP = (v) => {
    const n = parseFloat(v) || 0
    return n > 0 ? `â‚¹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
  }
  const v = (x) => (x && String(x).trim()) ? String(x).trim() : null

  const row = (label, value) => value
    ? `<tr><td class="lbl">${label}</td><td class="val">${value}</td></tr>`
    : ''

  const priceCard = (label, value) => {
    const n = parseFloat(value) || 0
    if (n <= 0) return ''
    return `<div class="price-card"><div class="pc-label">${label}</div><div class="pc-value">â‚¹${n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>`
  }

  const chip = (label, value) => v(value)
    ? `<div class="chip"><div class="chip-label">${label}</div><div class="chip-value">${value}</div></div>`
    : ''

  const flag = (label, on) =>
    `<div class="flag ${on ? 'flag-on' : 'flag-off'}">${on ? 'âœ“' : 'âœ—'} ${label}</div>`

  const imgTags = (p.image_urls || []).filter(Boolean).slice(0, 6).map(u =>
    `<img src="${imgUrl(u)}" class="prod-img" alt="product" />`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Product — ${p.name || 'Details'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a2540; background: #fff; padding: 32px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #FD5C02; padding-bottom: 14px; margin-bottom: 22px; }
  .header-left h1 { font-size: 20px; font-weight: 800; color: #01152D; }
  .header-left .code { font-size: 12px; font-family: monospace; color: #FD5C02; font-weight: 700; margin-top: 3px; background: #FFF3EC; padding: 2px 10px; border-radius: 5px; display: inline-block; }
  .header-right { text-align: right; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-active { background: #ECFDF5; color: #059669; }
  .badge-inactive { background: #F1F5F9; color: #64748B; }
  .print-date { font-size: 11px; color: #64748B; margin-top: 4px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #FD5C02; border-bottom: 1px solid #E2E8F0; padding-bottom: 5px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  .lbl { width: 180px; padding: 6px 8px; font-size: 12px; color: #64748B; font-weight: 600; vertical-align: top; border-bottom: 1px solid #F1F5F9; }
  .val { padding: 6px 8px; font-size: 13px; color: #1a2540; font-weight: 500; border-bottom: 1px solid #F1F5F9; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 7px 12px; min-width: 130px; }
  .chip-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #64748B; margin-bottom: 2px; }
  .chip-value { font-size: 13px; font-weight: 700; color: #1a2540; }
  .price-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .price-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; min-width: 150px; text-align: center; }
  .price-card:first-child { background: #FFF3EC; border-color: #FD5C02; }
  .pc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #64748B; margin-bottom: 4px; }
  .price-card:first-child .pc-label { color: #FD5C02; }
  .pc-value { font-size: 17px; font-weight: 800; color: #1a2540; }
  .price-card:first-child .pc-value { color: #FD5C02; }
  .flags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
  .flag { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .flag-on  { background: #ECFDF5; color: #059669; }
  .flag-off { background: #F1F5F9; color: #94A3B8; }
  .img-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .prod-img { width: 120px; height: 120px; object-fit: cover; border-radius: 10px; border: 1px solid #E2E8F0; }
  .footer { margin-top: 32px; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 11px; color: #94A3B8; display: flex; justify-content: space-between; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>${v(p.name) || 'Product Details'}</h1>
    ${v(p.code) ? `<span class="code">${p.code}</span>` : ''}
    ${v(p.alias) ? `<div style="font-size:12px;color:#64748B;margin-top:4px;">Alias: ${p.alias}</div>` : ''}
  </div>
  <div class="header-right">
    <span class="badge ${p.is_active !== false ? 'badge-active' : 'badge-inactive'}">${p.is_active !== false ? 'Active' : 'Inactive'}</span>
    <div class="print-date">Printed: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</div>
  </div>
</div>

<!-- Basic Information -->
<div class="section">
  <div class="section-title">Basic Information</div>
  <table>
    ${row('Brand',          v(p.brand_name)       || v(p.brand_id?.name))}
    ${row('Category',       v(p.category_name)    || v(p.category_id?.name))}
    ${row('Sub-Category',   v(p.sub_category_name)|| v(p.sub_category_id?.name))}
    ${row('Unit',           v(p.unit))}
    ${row('GST %',          p.gst_percent ? p.gst_percent + '%' : null)}
    ${row('HSN Code',       v(p.hsn_code))}
    ${row('Description',    v(p.description))}
    ${row('Product Type',   v(p.product_type))}
    ${row('Sales Type',     v(p.sales_type))}
  </table>
</div>

<!-- Tile Specifications -->
${(v(p.size)||v(p.finish)||v(p.color)||v(p.surface)||v(p.thickness)||v(p.grade)||v(p.tile_type)||v(p.application)||v(p.anti_skid)||v(p.origin)||v(p.manufacturer)||v(p.barcode)) ? `
<div class="section">
  <div class="section-title">Tile Specifications</div>
  <div class="chips">
    ${chip('Size',         p.size ? p.size.toUpperCase() + ' MM' : null)}
    ${chip('Finish',       p.finish)}
    ${chip('Colour',       p.color)}
    ${chip('Surface',      p.surface)}
    ${chip('Thickness',    p.thickness)}
    ${chip('Grade',        p.grade)}
    ${chip('Tile Type',    p.tile_type)}
    ${chip('Application',  p.application)}
    ${chip('Anti Skid',    p.anti_skid)}
    ${chip('Origin',       p.origin)}
    ${chip('Manufacturer', p.manufacturer)}
    ${chip('Barcode',      p.barcode)}
  </div>
</div>` : ''}

<!-- Packing -->
${(v(p.design)||v(p.collection)||v(p.pcs_per_box)||v(p.sqft_per_box)||v(p.weight_per_box)) ? `
<div class="section">
  <div class="section-title">Packing &amp; Collection</div>
  <div class="chips">
    ${chip('Design',       p.design)}
    ${chip('Collection',   p.collection)}
    ${chip('Pcs / Box',    p.pcs_per_box    ? String(p.pcs_per_box) : null)}
    ${chip('Sqft / Box',   p.sqft_per_box   ? parseFloat(p.sqft_per_box).toFixed(2) + ' Sq.Ft' : null)}
    ${chip('Weight / Box', p.weight_per_box ? parseFloat(p.weight_per_box).toFixed(2) + ' Kg'   : null)}
  </div>
</div>` : ''}

<!-- Pricing -->
<div class="section">
  <div class="section-title">Pricing</div>
  <div class="price-grid">
    ${priceCard('MRP',             p.mrp)}
    ${priceCard('Retail Rate',     p.retail_price  || p.retail_rate)}
    ${priceCard('Dealer Rate',     p.dealer_price  || p.dealer_rate)}
    ${priceCard('Wholesale Rate',  p.wholesale_rate)}
    ${priceCard('Project Rate',    p.project_rate)}
    ${priceCard('Purchase Rate',   p.purchase_price || p.purchase_rate)}
    ${priceCard('Landing Cost',    p.landing_cost)}
    ${priceCard('Min Selling Rate',p.min_selling_rate)}
  </div>
  ${(parseFloat(p.min_stock_level)>0||parseFloat(p.reorder_level)>0) ? `
  <table style="margin-top:10px;max-width:400px;">
    ${row('Min Stock Level', v(p.min_stock_level))}
    ${row('Reorder Level',   v(p.reorder_level))}
  </table>` : ''}
</div>

<!-- Flags -->
<div class="section">
  <div class="section-title">Visibility &amp; Flags</div>
  <div class="flags">
    ${flag('New Arrival',    !!p.new_arrival)}
    ${flag('Featured',       !!p.featured)}
    ${flag('Online Visible', p.online_visible !== false)}
    ${flag('Dealer Visible', p.dealer_visible !== false)}
  </div>
</div>

<!-- Images -->
${(p.image_urls||[]).filter(Boolean).length > 0 ? `
<div class="section">
  <div class="section-title">Product Images</div>
  <div class="img-row">${imgTags}</div>
</div>` : ''}

<div class="footer">
  <span>Product Code: ${v(p.code) || '—'} &nbsp;|&nbsp; Brand: ${v(p.brand_name) || '—'} &nbsp;|&nbsp; Category: ${v(p.category_name) || '—'}</span>
  <span>${p.created_at ? 'Created: ' + new Date(p.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : ''}</span>
</div>

<script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

  // Download as .html file — no new tab, no print popup
  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = "Product_" + (p.code || '') + "_" + (p.name || 'product').replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".html"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// â”€â”€ Searchable Dropdown Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SearchableSelect({ label, required, placeholder, value, onChange, options, disabled }) {
  const [open, setOpen]   = useState(false)
  const [q, setQ]         = useState('')
  const ref               = useRef()

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    (o.label || '').toLowerCase().includes(q.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (val) => { onChange(val); setOpen(false); setQ('') }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {label && (
        <label className="form-label">
          {label}{required && <span style={{ color:'var(--danger)' }}> *</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen(o => !o); setQ('') } }}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'8px 11px', border:'1px solid var(--border)', borderRadius:7,
          background: disabled ? 'var(--bg)' : 'var(--surface)',
          fontSize:13, color: selected ? 'var(--text)' : 'var(--text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline:'none', transition:'border-color .15s',
          ...(open && { borderColor:'#FD5C02', boxShadow:'0 0 0 3px rgba(253,92,2,.12)' }),
        }}
      >
        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, textAlign:'left' }}>
          {selected ? selected.label : (placeholder || `Search ${label || ''}...`)}
        </span>
        <ChevronDown size={14} style={{ flexShrink:0, marginLeft:6, color:'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'none', transition:'transform .15s' }} />
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:999, marginTop:2,
          background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
          boxShadow:'0 8px 24px rgba(0,0,0,.12)', overflow:'hidden',
        }}>
          <div style={{ padding:'8px 8px 4px' }}>
            <input
              autoFocus
              className="form-control"
              style={{ fontSize:12, padding:'6px 9px' }}
              placeholder="Type to search..."
              value={q}
              onChange={e => setQ(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div style={{ maxHeight:200, overflowY:'auto' }}>
            <div
              style={{ padding:'7px 14px', fontSize:13, color:'var(--text-muted)', cursor:'pointer' }}
              onMouseDown={() => pick('')}
            >— None —</div>
            {filtered.length === 0 && (
              <div style={{ padding:'10px 14px', fontSize:12, color:'var(--text-muted)' }}>No results</div>
            )}
            {filtered.map(o => (
              <div
                key={o.value}
                onMouseDown={() => pick(o.value)}
                style={{
                  padding:'7px 14px', fontSize:13, cursor:'pointer',
                  background: o.value === value ? 'var(--primary-light)' : 'transparent',
                  color: o.value === value ? 'var(--primary)' : 'var(--text)',
                  fontWeight: o.value === value ? 600 : 400,
                }}
                onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background='var(--bg)' }}
                onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background='transparent' }}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// â”€â”€ Simple dropdown (native select styled) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SelectField({ label, required, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      {label && (
        <label className="form-label">
          {label}{required && <span style={{ color:'var(--danger)' }}> *</span>}
        </label>
      )}
      <div style={{ position:'relative' }}>
        <select
          disabled={disabled}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width:'100%', padding:'8px 32px 8px 11px',
            border:'1px solid var(--border)', borderRadius:7,
            background: disabled ? 'var(--bg)' : 'var(--surface)',
            fontSize:13, color: value ? 'var(--text)' : 'var(--text-muted)',
            appearance:'none', cursor: disabled ? 'not-allowed' : 'pointer',
            outline:'none',
          }}
          onFocus={e => { e.target.style.borderColor='#FD5C02'; e.target.style.boxShadow='0 0 0 3px rgba(253,92,2,.12)' }}
          onBlur={e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} style={{
          position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
          color:'var(--text-muted)', pointerEvents:'none',
        }} />
      </div>
    </div>
  )
}

// â”€â”€ Toggle Switch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Toggle({ label, checked, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {label && <label className="form-label" style={{ marginBottom:0 }}>{label}</label>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width:44, height:24, borderRadius:12, border:'none', cursor:'pointer',
          background: checked ? '#FD5C02' : 'var(--border)',
          position:'relative', transition:'background .2s', flexShrink:0,
        }}
      >
        <span style={{
          position:'absolute', top:2,
          left: checked ? 22 : 2,
          width:20, height:20, borderRadius:'50%',
          background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.2)',
          transition:'left .2s',
        }} />
      </button>
    </div>
  )
}

// â”€â”€ Image Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ImagePicker({ existingUrls = [], onFilesChange, onRemoveExisting, resetKey }) {
  const inputRef = useRef()
  const [previews, setPreviews] = useState([])
  useEffect(() => { setPreviews([]) }, [resetKey])

  const handlePick = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const added = files.map(f => ({ file: f, url: URL.createObjectURL(f) }))
    setPreviews(prev => {
      const all = [...prev, ...added]
      onFilesChange(all.map(p => p.file))
      return all
    })
    e.target.value = ''
  }
  const removeNew = (idx) => {
    setPreviews(prev => {
      const u = prev.filter((_, i) => i !== idx)
      onFilesChange(u.map(p => p.file))
      return u
    })
  }
  return (
    <div>
      <label className="form-label">Product Images</label>
      <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>
        Upload product images (JPG, PNG, WEBP). Max 5MB each, up to 10 images.
      </p>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
        {existingUrls.map((url, i) => (
          <div key={`ex-${i}`} style={{ position:'relative', width:80, height:80 }}>
            <img src={imgUrl(url)} alt="product"
              style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'1px solid var(--border)' }} />
            <button type="button" onClick={() => onRemoveExisting(i)}
              style={{ position:'absolute', top:-6, right:-6, background:'var(--danger)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', padding:0 }}>
              <X style={{ width:11 }} />
            </button>
          </div>
        ))}
        {previews.map((p, i) => (
          <div key={`new-${i}`} style={{ position:'relative', width:80, height:80 }}>
            <img src={p.url} alt="preview"
              style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'2px dashed var(--primary)' }} />
            <button type="button" onClick={() => removeNew(i)}
              style={{ position:'absolute', top:-6, right:-6, background:'var(--danger)', border:'none', borderRadius:'50%', width:20, height:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', padding:0 }}>
              <X style={{ width:11 }} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => inputRef.current?.click()}
          style={{ width:80, height:80, border:'2px dashed var(--border)', borderRadius:8, background:'var(--bg)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, color:'var(--text-muted)' }}>
          <Plus style={{ width:22 }} />
          <span style={{ fontSize:11 }}>Add</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handlePick} />
    </div>
  )
}

// â”€â”€ Section Header inside form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FormSection({ title }) {
  return (
    <div style={{ margin:'20px 0 14px', borderBottom:'2px solid var(--border)', paddingBottom:6 }}>
      <span style={{ fontSize:12, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--text-muted)' }}>
        {title}
      </span>
    </div>
  )
}

// â”€â”€ Price Input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PriceInput({ label, required, value, onChange, placeholder }) {
  return (
    <div>
      {label && (
        <label className="form-label">
          {label}{required && <span style={{ color:'var(--danger)' }}> *</span>}
        </label>
      )}
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--text-muted)', pointerEvents:'none' }}>â‚¹</span>
        <input
          type="number" min="0" step="0.01"
          className="form-control"
          style={{ paddingLeft:24 }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '0.00'}
        />
      </div>
    </div>
  )
}


// ── Price + Discount combo input ──────────────────────────────
// Shows a price field with a discount % off MRP helper below it.
// When discount% is filled and price is empty, auto-fills the price.
function PriceDiscountInput({ label, required, priceValue, onPriceChange, discountValue, onDiscountChange, baseMrp, placeholder }) {
  const mrp      = parseFloat(baseMrp) || 0
  const discount = parseFloat(discountValue) || 0
  const computed = mrp > 0 && discount > 0 ? mrp * (1 - discount / 100) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      {/* Price field */}
      <div>
        {label && (
          <label className="form-label">
            {label}{required && <span style={{ color:'var(--danger)' }}> *</span>}
          </label>
        )}
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--text-muted)', pointerEvents:'none' }}>&#8377;</span>
          <input
            type="number" min="0" step="0.01"
            className="form-control"
            style={{ paddingLeft:24 }}
            value={priceValue}
            onChange={e => onPriceChange(e.target.value)}
            placeholder={placeholder || '0.00'}
          />
        </div>
        {computed > 0 && (
          <div style={{ fontSize:10, color:'var(--primary)', marginTop:2, fontWeight:600 }}>
            = &#8377;{computed.toFixed(2)} @ {discount}% off MRP
          </div>
        )}
      </div>

      {/* Discount % field */}
      <div>
        <label className="form-label" style={{ fontSize:10, color:'var(--text-muted)', marginBottom:2 }}>
          Discount % (off MRP)
        </label>
        <div style={{ position:'relative' }}>
          <input
            type="number" min="0" max="100" step="0.01"
            className="form-control"
            style={{ paddingRight:28, fontSize:12, background:'var(--bg)' }}
            value={discountValue}
            onChange={e => {
              const d = e.target.value
              onDiscountChange(d)
              if (!priceValue && mrp > 0 && d) {
                onPriceChange((mrp * (1 - parseFloat(d) / 100)).toFixed(2))
              }
            }}
            placeholder="0.00"
          />
          <span style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--text-muted)', pointerEvents:'none' }}>%</span>
        </div>
      </div>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRODUCT FORM MODAL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ProductFormModal({ editProduct, brands, categories, subCategories, onSave, onClose, saving }) {
  const [form, setForm]         = useState(EMPTY_FORM)
  const [errors, setErrors]     = useState({})
  const [imageFiles, setImageFiles]         = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [imgResetKey, setImgResetKey]       = useState(0)

  // Filter subcategories based on selected category
  const filteredSubs = subCategories.filter(s => {
    const pid = s.parent_id?.toString() || s.category_id?.toString()
    return pid === form.category_id
  })

  // Populate form on edit
  useEffect(() => {
    if (editProduct) {
      setForm({
        code:              editProduct.code              || '',
        name:              editProduct.name              || '',
        alias:             editProduct.alias             || '',
        description:       editProduct.description       || '',
        hsn_code:          editProduct.hsn_code          || '',
        brand_id:          editProduct.brand_id?._id     || editProduct.brand_id     || '',
        category_id:       editProduct.category_id?._id  || editProduct.category_id  || '',
        sub_category_id:   editProduct.sub_category_id?._id || editProduct.sub_category_id || '',
        unit:              editProduct.unit              || 'Box',
        gst_percent:       String(editProduct.gst_percent ?? '18'),
        size:              editProduct.size              || '',
        finish:            editProduct.finish            || '',
        color:             editProduct.color             || '',
        surface:           editProduct.surface           || '',
        thickness:         editProduct.thickness         || '',
        grade:             editProduct.grade             || '',
        tile_type:         editProduct.tile_type         || '',
        application:       editProduct.application       || '',
        anti_skid:         editProduct.anti_skid         || '',
        origin:            editProduct.origin            || '',
        manufacturer:      editProduct.manufacturer      || '',
        barcode:           editProduct.barcode           || '',
        design:            editProduct.design            || '',
        collection:        editProduct.collection        || '',
        pcs_per_box:       editProduct.pcs_per_box       || '',
        sqft_per_box:      editProduct.sqft_per_box      || '',
        weight_per_box:    editProduct.weight_per_box    || '',
        purchase_rate:     editProduct.purchase_price    || editProduct.purchase_rate || '',
        landing_cost:      editProduct.landing_cost      || '',
        mrp:               editProduct.mrp               || '',
        retail_rate:       editProduct.retail_price      || editProduct.retail_rate  || '',
        dealer_rate:       editProduct.dealer_price      || editProduct.dealer_rate  || '',
        wholesale_rate:    editProduct.wholesale_rate    || '',
        project_rate:      editProduct.project_rate      || '',
        min_selling_rate:  editProduct.min_selling_rate  || '',
        retail_discount:   editProduct.retail_discount   || '',
        dealer_discount:   editProduct.dealer_discount   || '',
        wholesale_discount:editProduct.wholesale_discount|| '',
        project_discount:  editProduct.project_discount  || '',
        min_stock_level:   editProduct.min_stock_level   || '',
        reorder_level:     editProduct.reorder_level     || '',
        status:            editProduct.is_active !== false ? 'Active' : 'Inactive',
        sales_type:        editProduct.sales_type        || 'Regular Sale',
        product_type:      editProduct.product_type      || 'Regular Product',
        new_arrival:       !!editProduct.new_arrival,
        featured:          !!editProduct.featured,
        online_visible:    editProduct.online_visible    !== false,
        dealer_visible:    editProduct.dealer_visible    !== false,
      })
      setExistingImages(editProduct.image_urls || [])
    } else {
      setForm(EMPTY_FORM)
      setExistingImages([])
    }
    setErrors({})
    setImageFiles([])
    setImgResetKey(k => k + 1)
  }, [editProduct])

  const set = useCallback((field, val) => setForm(f => ({ ...f, [field]: val })), [])

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required'
    if (!form.brand_id)    e.brand_id = 'Brand is required'
    if (!form.category_id) e.category_id = 'Category is required'
    if (!form.unit)        e.unit = 'Unit is required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    // Build a plain object -- productApi.create / productApi.update handle FormData internally
    // when imageFiles is present. Field name 'file' matches multer's uploadImages middleware.
    const payload = {
      name:            form.name.trim(),
      brand_id:        form.brand_id        || null,
      category_id:     form.category_id     || null,
      sub_category_id: form.sub_category_id || null,
      unit:            form.unit,
      gst_percent:     parseFloat(form.gst_percent) || 18,
      description:     form.description,
      hsn_code:        form.hsn_code,
      size:            form.size,
      finish:          form.finish,
      color:           form.color,
      surface:         form.surface,
      thickness:       form.thickness,
      grade:           form.grade,
      tile_type:       form.tile_type,
      application:     form.application,
      anti_skid:       form.anti_skid,
      origin:          form.origin,
      manufacturer:    form.manufacturer,
      barcode:         form.barcode,
      design:          form.design,
      collection:      form.collection,
      pcs_per_box:     form.pcs_per_box    ? parseFloat(form.pcs_per_box)     : null,
      sqft_per_box:    form.sqft_per_box   ? parseFloat(form.sqft_per_box)    : null,
      weight_per_box:  form.weight_per_box ? parseFloat(form.weight_per_box)  : null,
      purchase_price:  parseFloat(form.purchase_rate)    || 0,
      landing_cost:    parseFloat(form.landing_cost)     || 0,
      mrp:             parseFloat(form.mrp)              || 0,
      retail_price:    parseFloat(form.retail_rate)      || 0,
      dealer_price:    parseFloat(form.dealer_rate)      || 0,
      wholesale_rate:  parseFloat(form.wholesale_rate)   || 0,
      project_rate:    parseFloat(form.project_rate)     || 0,
      min_selling_rate:parseFloat(form.min_selling_rate) || 0,
      retail_discount:   parseFloat(form.retail_discount)   || 0,
      dealer_discount:   parseFloat(form.dealer_discount)   || 0,
      wholesale_discount:parseFloat(form.wholesale_discount)|| 0,
      project_discount:  parseFloat(form.project_discount)  || 0,
      min_stock_level: parseFloat(form.min_stock_level)  || 0,
      reorder_level:   parseFloat(form.reorder_level)    || 0,
      is_active:       form.status === 'Active',
      sales_type:      form.sales_type,
      product_type:    form.product_type,
      new_arrival:     form.new_arrival,
      featured:        form.featured,
      online_visible:  form.online_visible,
      dealer_visible:  form.dealer_visible,
      // For update: kept existing image URLs
      image_urls:      existingImages,
      // imageFiles is the key productApi looks for -- File[] array, field name 'file' for multer
      imageFiles:      imageFiles,
    }

    if (!editProduct && form.code.trim()) {
      payload.code = form.code.trim()
    }

    await onSave(payload)
  }

  const brandOpts    = brands.map(b => ({ value: b._id || b.id, label: b.name }))
  const catOpts      = categories.filter(c => !c.parent_id).map(c => ({ value: c._id || c.id, label: c.name }))
  const subCatOpts   = filteredSubs.map(s => ({ value: s._id || s.id, label: s.name }))
  const sizeOpts     = SIZES.map(s => ({ value: s, label: s + ' MM' }))
  const finishOpts   = FINISHES.map(s => ({ value: s, label: s }))
  const surfaceOpts  = SURFACES.map(s => ({ value: s, label: s }))
  const gradeOpts    = GRADES.map(s => ({ value: s, label: s }))
  const tileTypeOpts = TILE_TYPES.map(s => ({ value: s, label: s }))
  const areaOpts     = AREAS.map(s => ({ value: s, label: s }))
  const antiSkidOpts = ANTI_SKIDS.map(s => ({ value: s, label: s }))
  const originOpts   = ORIGINS.map(s => ({ value: s, label: s }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth:900, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ position:'sticky', top:0, background:'var(--surface)', zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Package size={18} style={{ color:'var(--primary)' }} />
            <span className="modal-title">{editProduct ? 'Edit Product' : 'Add New Product'}</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-secondary btn-sm" type="button"
              onClick={() => { setForm(EMPTY_FORM); setErrors({}); setImgResetKey(k=>k+1); setImageFiles([]); setExistingImages([]) }}>
              Clear Form
            </button>
            <button className="modal-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="modal-body">

          {/* â”€â”€ BASIC INFO â”€â”€ */}
          <FormSection title="Basic Information" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
            {/* Brand */}
            <div>
              <SearchableSelect
                label="Brand" required
                placeholder="Search brands..."
                value={form.brand_id}
                onChange={v => set('brand_id', v)}
                options={brandOpts}
              />
              {errors.brand_id && <span className="form-error">{errors.brand_id}</span>}
            </div>
            {/* Category */}
            <div>
              <SearchableSelect
                label="Category" required
                placeholder="Search categories..."
                value={form.category_id}
                onChange={v => { set('category_id', v); set('sub_category_id', '') }}
                options={catOpts}
              />
              {errors.category_id && <span className="form-error">{errors.category_id}</span>}
            </div>
            {/* Subcategory */}
            <SearchableSelect
              label="Subcategory"
              placeholder="Search subcategories..."
              value={form.sub_category_id}
              onChange={v => set('sub_category_id', v)}
              options={subCatOpts}
              disabled={!form.category_id}
            />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginTop:14 }}>
            {/* Product Code */}
            <div>
              <label className="form-label">Product Code</label>
              <input className="form-control" placeholder="Will be auto-generated if left empty"
                value={form.code} onChange={e => set('code', e.target.value)} disabled={!!editProduct} />
            </div>
            {/*Product Name*/}
            <div>
              <label className="form-label">Product Name <span style={{ color:'var(--danger)' }}>*</span></label>
              <input className={`form-control${errors.name ? ' error' : ''}`} placeholder="Enter product name"
                value={form.name} onChange={e => set('name', e.target.value)} />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            {/* HSN Code */}
            <div>
              <label className="form-label">HSN Code</label>
              <input className="form-control" placeholder="Enter HSN code (optional)"
                value={form.hsn_code} onChange={e => set('hsn_code', e.target.value)} />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr 1fr', gap:14, marginTop:14 }}>
            {/* Alias */}
            <div>
              <label className="form-label">Alias Name (optional)</label>
              <input className="form-control" placeholder="Enter alias / alternate name"
                value={form.alias} onChange={e => set('alias', e.target.value)} />
            </div>
            {/* Description */}
            <div>
              <label className="form-label">Description</label>
              <input className="form-control" placeholder="Enter product description"
                value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            {/* Unit */}
            <div>
              <SelectField
                label="Unit" required
                value={form.unit}
                onChange={v => set('unit', v)}
                options={UNITS}
              />
              {errors.unit && <span className="form-error">{errors.unit}</span>}
            </div>
            {/* GST % */}
            <SelectField
              label="GST %"
              value={form.gst_percent}
              onChange={v => set('gst_percent', v)}
              options={GST_OPTS.map(g => ({ value: g, label: g + '%' }))}
            />
          </div>

          {/* â”€â”€ TILE SPECIFICATIONS â”€â”€ */}
          <FormSection title="Tile Specifications" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
            <SearchableSelect label="Tile Size"  placeholder="Size"    value={form.size}        onChange={v=>set('size',v)}        options={sizeOpts} />
            <SearchableSelect label="Finish"     placeholder="Finish"  value={form.finish}      onChange={v=>set('finish',v)}      options={finishOpts} />
            <div>
              <label className="form-label">Colour</label>
              <input className="form-control" placeholder="Colour" value={form.color} onChange={e=>set('color',e.target.value)} />
            </div>
            <SearchableSelect label="Surface"    placeholder="Surface" value={form.surface}     onChange={v=>set('surface',v)}     options={surfaceOpts} />
            <div>
              <label className="form-label">Thickness</label>
              <input className="form-control" placeholder="e.g. 10mm" value={form.thickness} onChange={e=>set('thickness',e.target.value)} />
            </div>
            <SearchableSelect label="Grade"      placeholder="Grade"   value={form.grade}       onChange={v=>set('grade',v)}       options={gradeOpts} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginTop:12 }}>
            <SearchableSelect label="Tile Type"   placeholder="Type"    value={form.tile_type}   onChange={v=>set('tile_type',v)}   options={tileTypeOpts} />
            <SearchableSelect label="Application" placeholder="Area"    value={form.application} onChange={v=>set('application',v)} options={areaOpts} />
            <SearchableSelect label="Anti Skid"   placeholder="Rating"  value={form.anti_skid}   onChange={v=>set('anti_skid',v)}   options={antiSkidOpts} />
            <SearchableSelect label="Origin"      placeholder="Country" value={form.origin}      onChange={v=>set('origin',v)}      options={originOpts} />
            <div>
              <label className="form-label">Manufacturer</label>
              <input className="form-control" placeholder="If different from brand" value={form.manufacturer} onChange={e=>set('manufacturer',e.target.value)} />
            </div>
            <div>
              <label className="form-label">Barcode</label>
              <input className="form-control" placeholder="Barcode/EAN" value={form.barcode} onChange={e=>set('barcode',e.target.value)} />
            </div>
          </div>

          {/* â”€â”€ PACKING â”€â”€ */}
          <FormSection title="Packing & Collection" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
            <div>
              <label className="form-label">Design</label>
              <input className="form-control" placeholder="Design name" value={form.design} onChange={e=>set('design',e.target.value)} />
            </div>
            <div>
              <label className="form-label">Collection</label>
              <input className="form-control" placeholder="Collection" value={form.collection} onChange={e=>set('collection',e.target.value)} />
            </div>
            <div>
              <label className="form-label">Pcs/Box</label>
              <input className="form-control" type="number" min="0" placeholder="0" value={form.pcs_per_box} onChange={e=>set('pcs_per_box',e.target.value)} />
            </div>
            <div>
              <label className="form-label">Sqft/Box</label>
              <input className="form-control" type="number" min="0" step="0.01" placeholder="0.00" value={form.sqft_per_box} onChange={e=>set('sqft_per_box',e.target.value)} />
            </div>
            <div>
              <label className="form-label">Weight/Box (Kg)</label>
              <input className="form-control" type="number" min="0" step="0.01" placeholder="0.00" value={form.weight_per_box} onChange={e=>set('weight_per_box',e.target.value)} />
            </div>
          </div>

          {/* â”€â”€ PRICING â”€â”€ */}
          <FormSection title="Pricing" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
            <PriceInput label="Purchase Rate"   value={form.purchase_rate}   onChange={v=>set('purchase_rate',v)} />
            <PriceInput label="Landing Cost"    value={form.landing_cost}    onChange={v=>set('landing_cost',v)} />
            <PriceInput label="MRP"             value={form.mrp}             onChange={v=>set('mrp',v)} />
            <PriceInput label="Retail Rate"     value={form.retail_rate}     onChange={v=>set('retail_rate',v)} />
            <PriceInput label="Dealer Rate"     value={form.dealer_rate}     onChange={v=>set('dealer_rate',v)} />
            <PriceInput label="Wholesale Rate"  value={form.wholesale_rate}  onChange={v=>set('wholesale_rate',v)} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:12 }}>
            <PriceInput label="Project Rate"      value={form.project_rate}      onChange={v=>set('project_rate',v)} />
            <PriceInput label="Min Selling Rate"  value={form.min_selling_rate}  onChange={v=>set('min_selling_rate',v)} />
            <div>
              <label className="form-label">Min Stock Level</label>
              <input className="form-control" type="number" min="0" placeholder="0" value={form.min_stock_level} onChange={e=>set('min_stock_level',e.target.value)} />
            </div>
            <div>
              <label className="form-label">Reorder Level</label>
              <input className="form-control" type="number" min="0" placeholder="0" value={form.reorder_level} onChange={e=>set('reorder_level',e.target.value)} />
            </div>
          </div>

          {/* â”€â”€ STATUS & TYPE â”€â”€ */}
          <FormSection title="Status & Type" />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            <SelectField
              label="Status"
              value={form.status}
              onChange={v=>set('status',v)}
              options={['Active','Inactive']}
            />
            <SelectField
              label="Sales Type"
              value={form.sales_type}
              onChange={v=>set('sales_type',v)}
              options={SALE_TYPES}
            />
            <SelectField
              label="Product Type"
              value={form.product_type}
              onChange={v=>set('product_type',v)}
              options={PROD_TYPES}
            />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20, marginTop:16 }}>
            <Toggle label="New Arrival"    checked={form.new_arrival}    onChange={v=>set('new_arrival',v)} />
            <Toggle label="Featured"       checked={form.featured}       onChange={v=>set('featured',v)} />
            <Toggle label="Online Visible" checked={form.online_visible} onChange={v=>set('online_visible',v)} />
            <Toggle label="Dealer Visible" checked={form.dealer_visible} onChange={v=>set('dealer_visible',v)} />
          </div>

          {/* â”€â”€ IMAGES â”€â”€ */}
          <FormSection title="Product Images" />
          <ImagePicker
            existingUrls={existingImages}
            onFilesChange={setImageFiles}
            onRemoveExisting={idx => setExistingImages(p => p.filter((_,i)=>i!==idx))}
            resetKey={imgResetKey}
          />

        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ position:'sticky', bottom:0, background:'var(--surface)', zIndex:10 }}>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="button" disabled={saving} onClick={handleSave}
            style={{ minWidth:120 }}>
            {saving ? 'Saving...' : 'Preview & Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRODUCT DETAIL VIEW MODAL
// ══════════════════════════════════════════════════════════════
// PRODUCT DETAIL VIEW MODAL — clean full-detail layout
// ══════════════════════════════════════════════════════════════
function ProductViewModal({ product: p, loading, onClose, onEdit }) {
  const [imgIdx, setImgIdx] = useState(0)
  if (!p) return null

  const images = (p.image_urls || []).filter(Boolean)
  const v   = (x) => (x && String(x).trim()) ? String(x).trim() : null
  const fmtN = (n) => {
    const num = parseFloat(n) || 0
    return num > 0 ? `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null
  }
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : null

  // ── helpers ──
  const SectionTitle = ({ icon, title }) => (
    <div style={{ display:'flex', alignItems:'center', gap:7, padding:'14px 0 8px', borderBottom:'2px solid var(--border)', marginBottom:12 }}>
      <span style={{ fontSize:14 }}>{icon}</span>
      <span style={{ fontSize:12, fontWeight:800, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-muted)' }}>{title}</span>
    </div>
  )

  const Field = ({ label, value, mono, highlight, full }) => {
    if (!v(value)) return null
    return (
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-muted)', marginBottom:3 }}>{label}</div>
        <div style={{
          fontSize: highlight ? 14 : 13,
          fontWeight: highlight ? 700 : 500,
          color: highlight ? 'var(--text)' : 'var(--text)',
          fontFamily: mono ? 'monospace' : 'inherit',
          wordBreak: 'break-word',
        }}>{value}</div>
      </div>
    )
  }

  const PriceBox = ({ label, value, primary }) => {
    const txt = fmtN(value)
    if (!txt) return null
    return (
      <div style={{
        background: primary ? '#FFF3EC' : 'var(--bg)',
        border: `1px solid ${primary ? '#FD5C02' : 'var(--border)'}`,
        borderRadius: 10, padding:'12px 14px', textAlign:'center',
      }}>
        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color: primary ? '#FD5C02' : 'var(--text-muted)', marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:17, fontWeight:800, color: primary ? '#FD5C02' : 'var(--text)' }}>{txt}</div>
      </div>
    )
  }

  const Flag = ({ label, on }) => (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background: on ? 'var(--success)' : 'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontSize:9, color:'#fff', fontWeight:800 }}>{on ? '✓' : '✗'}</span>
      </div>
      <span style={{ fontSize:12, color: on ? 'var(--text)' : 'var(--text-muted)', fontWeight: on ? 600 : 400 }}>{label}</span>
    </div>
  )

  // pricing array — only show non-zero
  const prices = [
    { label:'MRP',            value: p.mrp,                                primary: true },
    { label:'Retail Rate',    value: p.retail_price  || p.retail_rate },
    { label:'Dealer Rate',    value: p.dealer_price  || p.dealer_rate },
    { label:'Wholesale Rate', value: p.wholesale_rate },
    { label:'Project Rate',   value: p.project_rate },
    { label:'Purchase Rate',  value: p.purchase_price || p.purchase_rate },
    { label:'Landing Cost',   value: p.landing_cost },
    { label:'Min Sell Rate',  value: p.min_selling_rate },
  ].filter(x => (parseFloat(x.value) || 0) > 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:900, width:'100%', maxHeight:'92vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Sticky Header ── */}
        <div className="modal-header" style={{ position:'sticky', top:0, background:'var(--surface)', zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
            <Package size={18} style={{ color:'var(--primary)', flexShrink:0 }}/>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
              {p.code && (
                <span style={{ fontSize:11, fontFamily:'monospace', color:'var(--primary)', background:'rgba(253,92,2,.08)', padding:'1px 8px', borderRadius:5 }}>{p.code}</span>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:7, flexShrink:0 }}>
            <button className="btn btn-sm" onClick={() => downloadProduct(p)}
              style={{ background:'var(--info)', color:'#fff', gap:5 }}>
              <Download size={13}/> Download
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => onEdit(p)} style={{ gap:5 }}>
              <Edit2 size={13}/> Edit
            </button>
            <button className="modal-close" onClick={onClose}><X size={16}/></button>
          </div>
        </div>
        {/* Loading bar — shows while fetching full data */}
        {loading && (
          <div style={{ height:3, background:'var(--border)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', height:'100%', width:'40%', background:'var(--primary)',
              animation:'slideBar 1s ease-in-out infinite alternate',
              borderRadius:2 }}/>
          </div>
        )}
        <style>{`@keyframes slideBar{from{left:-40%}to{left:100%}}`}</style>

        <div className="modal-body" style={{ padding:'20px 22px' }}>
          {/* ── Top: Image + Basic Info side by side ── */}
          <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20, marginBottom:4 }}>

            {/* Image Gallery */}
            <div>
              <div style={{
                width:'100%', aspectRatio:'1/1', borderRadius:10,
                background:'var(--bg)', border:'1px solid var(--border)',
                overflow:'hidden', position:'relative',
              }}>
                {images.length > 0
                  ? <img src={imgUrl(images[imgIdx])} alt={p.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                  : <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', gap:6 }}>
                      <Package size={36} style={{ opacity:.2 }}/>
                      <span style={{ fontSize:11 }}>No image</span>
                    </div>
                }
                {images.length > 1 && (
                  <>
                    <button onClick={() => setImgIdx(i => (i-1+images.length)%images.length)}
                      style={{ position:'absolute', left:4, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.4)', border:'none', borderRadius:'50%', width:24, height:24, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <ChevronLeft size={13}/>
                    </button>
                    <button onClick={() => setImgIdx(i => (i+1)%images.length)}
                      style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', background:'rgba(0,0,0,.4)', border:'none', borderRadius:'50%', width:24, height:24, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <ChevronRight size={13}/>
                    </button>
                    <div style={{ position:'absolute', bottom:5, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4 }}>
                      {images.map((_,i) => (
                        <div key={i} onClick={() => setImgIdx(i)} style={{ width:6, height:6, borderRadius:'50%', background: i===imgIdx ? '#FD5C02' : 'rgba(255,255,255,.6)', cursor:'pointer' }}/>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:7 }}>
                  {images.map((u,i) => (
                    <img key={i} src={imgUrl(u)} alt="" onClick={() => setImgIdx(i)}
                      style={{ width:40, height:40, objectFit:'cover', borderRadius:6, cursor:'pointer',
                        border: `2px solid ${i===imgIdx ? '#FD5C02' : 'var(--border)'}` }}/>
                  ))}
                </div>
              )}
              {/* Status badge */}
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                <span className={`badge ${p.is_active !== false ? 'badge-green' : 'badge-gray'}`} style={{ alignSelf:'flex-start' }}>
                  {p.is_active !== false ? '● Active' : '● Inactive'}
                </span>
                {v(p.product_type) && <span className="badge badge-blue" style={{ alignSelf:'flex-start', fontSize:11 }}>{p.product_type}</span>}
                {v(p.sales_type)   && <span className="badge badge-purple" style={{ alignSelf:'flex-start', fontSize:11 }}>{p.sales_type}</span>}
              </div>
            </div>

            {/* Basic Info grid */}
            <div>
              <SectionTitle icon="📋" title="Basic Information" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px 16px' }}>
                <Field label="Product Code"  value={v(p.code)}                                       mono highlight />
                <Field label="Product Name"  value={v(p.name)}                                       highlight />
                <Field label="Alias"         value={v(p.alias)} />
                <Field label="Brand"         value={v(p.brand_name)    || v(p.brand_id?.name)} />
                <Field label="Category"      value={v(p.category_name) || v(p.category_id?.name)} />
                <Field label="Sub-Category"  value={v(p.sub_category_name) || v(p.sub_category_id?.name)} />
                <Field label="Unit"          value={v(p.unit)} />
                <Field label="GST %"         value={p.gst_percent ? `${p.gst_percent}%` : null} />
                <Field label="HSN Code"      value={v(p.hsn_code)} />
              </div>
              {v(p.description) && (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-muted)', marginBottom:3 }}>Description</div>
                  <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.5, background:'var(--bg)', padding:'8px 12px', borderRadius:7, border:'1px solid var(--border)' }}>{p.description}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tile Specifications ── */}
          {(v(p.size)||v(p.finish)||v(p.color)||v(p.surface)||v(p.thickness)||v(p.grade)||v(p.tile_type)||v(p.application)||v(p.anti_skid)||v(p.origin)||v(p.manufacturer)||v(p.barcode)) && (
            <div>
              <SectionTitle icon="🔲" title="Tile Specifications" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px 16px' }}>
                <Field label="Tile Size"    value={p.size ? p.size.toUpperCase()+' MM' : null} />
                <Field label="Finish"       value={v(p.finish)} />
                <Field label="Colour"       value={v(p.color)} />
                <Field label="Surface"      value={v(p.surface)} />
                <Field label="Thickness"    value={v(p.thickness)} />
                <Field label="Grade"        value={v(p.grade)} />
                <Field label="Tile Type"    value={v(p.tile_type)} />
                <Field label="Application"  value={v(p.application)} />
                <Field label="Anti Skid"    value={v(p.anti_skid)} />
                <Field label="Origin"       value={v(p.origin)} />
                <Field label="Manufacturer" value={v(p.manufacturer)} />
                <Field label="Barcode / EAN"value={v(p.barcode)} />
              </div>
            </div>
          )}

          {/* ── Packing & Collection ── */}
          {(v(p.design)||v(p.collection)||v(p.pcs_per_box)||v(p.sqft_per_box)||v(p.weight_per_box)) && (
            <div>
              <SectionTitle icon="📦" title="Packing & Collection" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'10px 16px' }}>
                <Field label="Design"        value={v(p.design)} />
                <Field label="Collection"    value={v(p.collection)} />
                <Field label="Pcs / Box"     value={p.pcs_per_box    ? String(p.pcs_per_box)                                    : null} />
                <Field label="Sqft / Box"    value={p.sqft_per_box   ? `${parseFloat(p.sqft_per_box).toFixed(2)} Sq.Ft`          : null} />
                <Field label="Weight / Box"  value={p.weight_per_box ? `${parseFloat(p.weight_per_box).toFixed(2)} Kg`           : null} />
              </div>
            </div>
          )}

          {/* ── Pricing ── */}
          {prices.length > 0 && (
            <div>
              <SectionTitle icon="₹" title="Pricing" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {prices.map(px => <PriceBox key={px.label} label={px.label} value={px.value} primary={px.primary}/>)}
              </div>
              {(parseFloat(p.min_stock_level)>0 || parseFloat(p.reorder_level)>0) && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px 16px', marginTop:12 }}>
                  {parseFloat(p.min_stock_level)>0 && <Field label="Min Stock Level" value={String(p.min_stock_level)}/>}
                  {parseFloat(p.reorder_level)>0    && <Field label="Reorder Level"   value={String(p.reorder_level)}/>}
                </div>
              )}
            </div>
          )}

          {/* ── Sales & Type ── */}
          {(v(p.sales_type) || v(p.product_type)) && (
            <div>
              <SectionTitle icon="🏷️" title="Sales & Product Type" />
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px 16px' }}>
                <Field label="Sales Type"    value={v(p.sales_type)} />
                <Field label="Product Type"  value={v(p.product_type)} />
              </div>
            </div>
          )}

          {/* ── Visibility & Flags ── */}
          <div>
            <SectionTitle icon="🔖" title="Visibility & Flags" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              <Flag label="New Arrival"    on={!!p.new_arrival} />
              <Flag label="Featured"       on={!!p.featured} />
              <Flag label="Online Visible" on={p.online_visible !== false} />
              <Flag label="Dealer Visible" on={p.dealer_visible !== false} />
            </div>
          </div>

          {/* ── Timestamps ── */}
          {(p.created_at || p.updated_at) && (
            <div style={{ marginTop:14, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', gap:20 }}>
              {fmtDate(p.created_at) && <span style={{ fontSize:11, color:'var(--text-muted)' }}>Created: {fmtDate(p.created_at)}</span>}
              {fmtDate(p.updated_at) && <span style={{ fontSize:11, color:'var(--text-muted)' }}>Updated: {fmtDate(p.updated_at)}</span>}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="modal-footer" style={{ position:'sticky', bottom:0, background:'var(--surface)', zIndex:10 }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-sm" onClick={() => downloadProduct(p)}
            style={{ background:'var(--info)', color:'#fff', gap:5 }}>
            <Download size={13}/> Download Sheet
          </button>
          <button className="btn btn-primary" onClick={() => onEdit(p)}>
            <Edit2 size={13}/> Edit Product
          </button>
        </div>
      </div>
    </div>
  )
}

function RecycleBinModal({ onClose, onRestored, onPermanentDeleted }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [busy,    setBusy]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { productApi } = await import('../api/productApi')
      const res = await productApi.getRecycleBin({ search })
      const data = res?.data
      setItems(Array.isArray(data) ? data : Array.isArray(res) ? res : [])
    } catch { setItems([]) }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleRestore = async (id) => {
    setBusy(id)
    try {
      const { productApi } = await import('../api/productApi')
      await productApi.restore(id)
      setItems(p => p.filter(x => (x._id || x.id) !== id))
      onRestored()
    } catch (e) { alert('Restore failed: ' + (e?.message || 'Error')) }
    finally { setBusy(null) }
  }

  const handlePermanentDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"? This CANNOT be undone.`)) return
    setBusy(id)
    try {
      const { productApi } = await import('../api/productApi')
      await productApi.delete(id)
      setItems(p => p.filter(x => (x._id || x.id) !== id))
      onPermanentDeleted()
    } catch (e) { alert('Delete failed: ' + (e?.message || 'Error')) }
    finally { setBusy(null) }
  }

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
    : '—'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:720, width:'100%', maxHeight:'88vh', overflowY:'auto' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ position:'sticky', top:0, background:'var(--surface)', zIndex:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Trash2 size={16} style={{ color:'var(--danger)' }}/>
            <span className="modal-title">Recycle Bin</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', background:'var(--bg)', padding:'2px 8px', borderRadius:10 }}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        <div className="modal-body">
          {/* Search */}
          <div className="search-bar" style={{ marginBottom:14 }}>
            <Search size={14}/>
            <input placeholder="Search deleted products…" value={search}
              onChange={e => setSearch(e.target.value)}/>
          </div>

          {loading && (
            <div style={{ textAlign:'center', padding:40 }}><div className="spinner"/></div>
          )}

          {!loading && items.length === 0 && (
            <div className="empty-state" style={{ padding:'40px 20px' }}>
              <div className="empty-state-icon">🗑️</div>
              <h3>Recycle Bin is empty</h3>
              <p>Deleted products will appear here and can be restored.</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {items.map(p => {
                const id     = p._id || p.id
                const isBusy = busy === id
                const thumb  = (p.image_urls || []).filter(Boolean)[0]
                return (
                  <div key={id} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'12px 14px', background:'var(--bg)',
                    borderRadius:10, border:'1px solid var(--border)',
                  }}>
                    {/* Thumbnail */}
                    {thumb
                      ? <img src={imgUrl(thumb)} alt="" style={{ width:48, height:48, borderRadius:7, objectFit:'cover', flexShrink:0, border:'1px solid var(--border)' }}/>
                      : <div style={{ width:48, height:48, borderRadius:7, background:'var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Package size={18} style={{ color:'var(--text-muted)' }}/>
                        </div>
                    }

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, display:'flex', gap:8, flexWrap:'wrap' }}>
                        {p.code         && <span style={{ fontFamily:'monospace', color:'var(--primary)' }}>{p.code}</span>}
                        {p.brand_name   && <span>{p.brand_name}</span>}
                        {p.category_name && <span>{p.category_name}</span>}
                        {p.size         && <span>{p.size.toUpperCase()}</span>}
                        {p.finish       && <span>{p.finish}</span>}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                        Deleted: {fmtDate(p.deleted_at)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button
                        className="btn btn-sm"
                        disabled={isBusy}
                        onClick={() => handleRestore(id)}
                        style={{ background:'var(--success)', color:'#fff', fontSize:12, gap:5 }}
                      >
                        <RotateCcw size={12}/> {isBusy ? '…' : 'Restore'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={isBusy}
                        onClick={() => handlePermanentDelete(id, p.name)}
                        style={{ fontSize:12, gap:5 }}
                      >
                        <Trash2 size={12}/> {isBusy ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ position:'sticky', bottom:0, background:'var(--surface)', zIndex:10 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)', flex:1 }}>
            Restore to bring back to products list · Permanent delete cannot be undone
          </span>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function ProductManagement({
  products = [], categories = [], subCategories = [], brands = [],
  addProduct, updateProduct, deleteProduct, loadingData,
}) {
  const [search,       setSearch]       = useState('')
  const [filterBrand,  setFilterBrand]  = useState('')
  const [filterCat,    setFilterCat]    = useState('')
  const [filterSubCat, setFilterSubCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSize,   setFilterSize]   = useState('')
  const [filterFinish, setFilterFinish] = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterApp,    setFilterApp]    = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [viewItem,     setViewItem]     = useState(null)
  const [viewLoading,  setViewLoading]  = useState(false)
  const [showBin,      setShowBin]      = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)  // { id, name, step } step=1|2
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState({ msg:'', type:'success' })

  const fire = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg:'', type:'success' }), 3200)
  }

  const topLevelCats = categories.filter(c => !c.parent_id)

  const filteredSubs = subCategories.filter(s => {
    const pid = s.parent_id?.toString() || s.category_id?.toString()
    return pid === filterCat
  })

  // unique values for dynamic filter dropdowns
  const uniqueSizes  = [...new Set(products.map(p => p.size).filter(Boolean))].sort()
  const uniqueFinish = [...new Set(products.map(p => p.finish).filter(Boolean))].sort()
  const uniqueTypes  = [...new Set(products.map(p => p.tile_type).filter(Boolean))].sort()
  const uniqueApps   = [...new Set(products.map(p => p.application).filter(Boolean))].sort()

  const activeFilters = [filterBrand, filterCat, filterSubCat, filterStatus,
    filterSize, filterFinish, filterType, filterApp].filter(Boolean).length

  const clearAll = () => {
    setSearch(''); setFilterBrand(''); setFilterCat(''); setFilterSubCat('')
    setFilterStatus(''); setFilterSize(''); setFilterFinish('')
    setFilterType(''); setFilterApp('')
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    if (q && !((p.name||'').toLowerCase().includes(q) ||
               (p.code||'').toLowerCase().includes(q) ||
               (p.brand_name||'').toLowerCase().includes(q) ||
               (p.category_name||'').toLowerCase().includes(q))) return false
    const bid = p.brand_id?._id    || p.brand_id    || ''
    const cid = p.category_id?._id || p.category_id || ''
    const sid = p.sub_category_id?._id || p.sub_category_id || ''
    if (filterBrand  && bid !== filterBrand)  return false
    if (filterCat    && cid !== filterCat)    return false
    if (filterSubCat && sid !== filterSubCat) return false
    if (filterStatus === 'active'   && p.is_active === false) return false
    if (filterStatus === 'inactive' && p.is_active !== false) return false
    if (filterSize   && (p.size   ||'').toLowerCase() !== filterSize.toLowerCase())   return false
    if (filterFinish && (p.finish ||'').toLowerCase() !== filterFinish.toLowerCase()) return false
    if (filterType   && (p.tile_type   ||'').toLowerCase() !== filterType.toLowerCase())   return false
    if (filterApp    && (p.application ||'').toLowerCase() !== filterApp.toLowerCase())    return false
    return true
  })

  const openAdd    = ()  => { setEditItem(null); setShowModal(true) }
  const openEdit   = (p) => { setEditItem(p); setViewItem(null); setShowModal(true) }
  const openView   = async (p) => {
    // Show modal immediately with list data, then fetch full details
    setViewItem(p)
    setViewLoading(true)
    try {
      const { productApi } = await import('../api/productApi')
      const id  = p._id || p.id
      const res = await productApi.get(id)
      const full = res?.data || res
      if (full) setViewItem(full)
    } catch { /* keep showing list data on error */ }
    finally { setViewLoading(false) }
  }
  const closeModal = ()  => { setShowModal(false); setEditItem(null) }
  const closeView  = ()  => { setViewItem(null); setViewLoading(false) }

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      const res = editItem
        ? await updateProduct?.(editItem._id || editItem.id, payload)
        : await addProduct?.(payload)
      if (res?.success === false) { fire(`Error: ${res.message}`, 'error'); return }
      fire(editItem ? 'Product updated successfully' : 'Product created successfully')
      closeModal()
    } catch (err) {
      fire(`Error: ${err.message || 'Something went wrong'}`, 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = (id, name) => {
    setDeleteTarget({ id, name, step: 1 })
  }

  const handleDeleteStep2 = () => {
    setDeleteTarget(t => t ? { ...t, step: 2 } : null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    const res = await deleteProduct?.(id)
    if (res?.success === false) fire(`Error: ${res.message}`, 'error')
    else fire('Product moved to Recycle Bin')
  }

  const fmtP = (v) => {
    const n = parseFloat(v) || 0
    return n > 0 ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits:2 })}` : '—'
  }

  // inline filter select — polished look
  const FS = ({ val, setVal, opts, ph }) => (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <select
        value={val}
        onChange={e => setVal(e.target.value)}
        style={{
          fontSize: 12,
          padding: '7px 28px 7px 12px',
          border: val ? '1.5px solid #FD5C02' : '1.5px solid var(--border)',
          borderRadius: 8,
          appearance: 'none',
          cursor: 'pointer',
          outline: 'none',
          background: val ? '#FFF3EC' : 'var(--surface)',
          color: val ? '#D94B00' : 'var(--text-muted)',
          fontWeight: val ? 700 : 500,
          minWidth: 110,
          boxShadow: val ? '0 0 0 3px rgba(253,92,2,0.10)' : 'var(--shadow)',
          transition: 'all 0.15s',
        }}
      >
        <option value="" style={{ color: 'var(--text-muted)' }}>{ph}</option>
        {opts.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value} style={{ color: 'var(--text)' }}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: val ? '#FD5C02' : 'var(--text-muted)' }}
      />
    </div>
  )

  const chipX = (label, onClear) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px 3px 10px',
      borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: '#FFF3EC',
      color: '#D94B00',
      border: '1px solid #FED7B8',
    }}>
      {label}
      <button
        onClick={onClear}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#D94B00', lineHeight: 1, padding: '0 1px', fontSize: 14, display: 'flex', alignItems: 'center' }}
      >×</button>
    </span>
  )

  return (
    <>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span>Product Setup</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Products</span>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Product Management</div>
          <div className="page-desc">Manage your complete product catalogue with pricing and specifications</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => setShowBin(true)} style={{ gap:6 }}>
            <Trash2 size={14} style={{ color:'var(--danger)' }}/> Recycle Bin
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={14}/> New Product
          </button>
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const STAT_STYLES = {
          all:      { bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB', textColor: '#1D4ED8', borderColor: '#BFDBFE' },
          active:   { bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#059669', textColor: '#047857', borderColor: '#A7F3D0' },
          inactive: { bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626', textColor: '#B91C1C', borderColor: '#FECACA' },
        }
        const stats = [
          { label: 'Total Products', val: products.length,                                     type: 'all'      },
          { label: 'Active',         val: products.filter(p => p.is_active !== false).length,  type: 'active'   },
          { label: 'Inactive',       val: products.filter(p => p.is_active === false).length,  type: 'inactive' },
        ]
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            {stats.map(s => {
              const st = STAT_STYLES[s.type]
              const isSelected = s.type === 'all' ? !filterStatus : filterStatus === s.type
              return (
                <div
                  key={s.label}
                  onClick={() => {
                    if (s.type === 'all') setFilterStatus('')
                    else setFilterStatus(prev => prev === s.type ? '' : s.type)
                    document.querySelector('.table-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  style={{
                    background:   isSelected ? st.iconBg : st.bg,
                    border:       `1.5px solid ${isSelected ? st.iconColor : st.borderColor}`,
                    borderRadius: 10,
                    padding:      '13px 15px',
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          11,
                    boxShadow:    isSelected ? `0 0 0 3px ${st.borderColor}` : 'var(--shadow)',
                    transition:   'all 0.15s',
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 9, flexShrink: 0, background: st.iconBg, border: `1px solid ${st.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={17} style={{ color: st.iconColor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: st.textColor, marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: st.textColor, lineHeight: 1 }}>{s.val}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ── FILTER BAR ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        {/* Top row — search + primary filters */}
        <div style={{ padding: '12px 16px', borderBottom: activeFilters > 0 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

          {/* Search */}
          <div className="search-bar" style={{ flex: '1 1 200px', maxWidth: 260 }}>
            <Search size={14} />
            <input placeholder="Search name, code…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />

          {/* Filters label */}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>Filters:</span>

          <FS val={filterBrand} setVal={setFilterBrand} ph="Brand"
            opts={brands.map(b => ({ value: b._id || b.id, label: b.name }))} />

          <FS val={filterCat} setVal={v => { setFilterCat(v); setFilterSubCat('') }} ph="Category"
            opts={topLevelCats.map(c => ({ value: c._id || c.id, label: c.name }))} />

          {filterCat && (
            <FS val={filterSubCat} setVal={setFilterSubCat} ph="Subcategory"
              opts={filteredSubs.map(s => ({ value: s._id || s.id, label: s.name }))} />
          )}

          <FS val={filterStatus} setVal={setFilterStatus} ph="Status"
            opts={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />

          <FS val={filterSize} setVal={setFilterSize} ph="Tile Size"
            opts={uniqueSizes.map(s => ({ value: s, label: s.toUpperCase() + ' MM' }))} />

          <FS val={filterFinish} setVal={setFilterFinish} ph="Finish"
            opts={uniqueFinish} />

          <FS val={filterType} setVal={setFilterType} ph="Tile Type"
            opts={uniqueTypes} />

          <FS val={filterApp} setVal={setFilterApp} ph="Application"
            opts={uniqueApps} />

          {(search || activeFilters > 0) && (
            <button
              onClick={clearAll}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.13s',
              }}
            >
              <RotateCcw size={12} /> Clear {activeFilters > 0 ? `(${activeFilters})` : ''}
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilters > 0 && (
          <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginRight: 2 }}>Active:</span>
            {filterBrand  && chipX(`Brand: ${brands.find(b => (b._id || b.id) === filterBrand)?.name || filterBrand}`,          () => setFilterBrand(''))}
            {filterCat    && chipX(`Category: ${topLevelCats.find(c => (c._id || c.id) === filterCat)?.name || filterCat}`,     () => { setFilterCat(''); setFilterSubCat('') })}
            {filterSubCat && chipX(`Sub: ${filteredSubs.find(s => (s._id || s.id) === filterSubCat)?.name || filterSubCat}`,    () => setFilterSubCat(''))}
            {filterStatus && chipX(`Status: ${filterStatus}`,   () => setFilterStatus(''))}
            {filterSize   && chipX(`Size: ${filterSize}`,       () => setFilterSize(''))}
            {filterFinish && chipX(`Finish: ${filterFinish}`,   () => setFilterFinish(''))}
            {filterType   && chipX(`Type: ${filterType}`,       () => setFilterType(''))}
            {filterApp    && chipX(`Area: ${filterApp}`,        () => setFilterApp(''))}
          </div>
        )}
      </div>

      {/* ── TABLE CARD ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            All Products
            <span style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)', marginLeft:6 }}>
              ({filtered.length}{filtered.length !== products.length ? ` of ${products.length}` : ''})
            </span>
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width:36 }}>#</th>
                <th style={{ width:52 }}>Image</th>
                <th>Code</th>
                <th>Product Name</th>
                <th>Brand</th>
                <th>Category / Sub-Cat</th>
                <th>Size</th>
                <th>Finish</th>
                <th>Tile Type</th>
                <th>Grade</th>
                <th>Unit / GST</th>
                <th>MRP</th>
                <th>Retail Rate</th>
                <th>Dealer Rate</th>
                <th>Purchase Rate</th>
                <th>Pcs/Box · Sqft/Box</th>
                <th>Status / Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingData && (
                <tr><td colSpan={18} style={{ textAlign:'center', padding:32 }}>
                  <div className="spinner"/>
                </td></tr>
              )}

              {!loadingData && filtered.map((p, i) => {
                const id    = p._id || p.id
                const thumb = (p.image_urls || []).filter(Boolean)[0]
                return (
                  <tr key={id}>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{i+1}</td>

                    {/* Thumbnail */}
                    <td>
                      {thumb
                        ? <img src={imgUrl(thumb)} alt="" style={{ width:40, height:40, borderRadius:6, objectFit:'cover', border:'1px solid var(--border)' }}/>
                        : <div style={{ width:40, height:40, borderRadius:6, background:'var(--bg)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Package size={14} style={{ color:'var(--text-muted)' }}/>
                          </div>
                      }
                    </td>

                    {/* Code */}
                    <td>
                      <span style={{ fontFamily:'monospace', fontSize:11, fontWeight:700, color:'var(--primary)', background:'rgba(253,92,2,.08)', padding:'2px 7px', borderRadius:5 }}>
                        {p.code || '—'}
                      </span>
                    </td>

                    {/* Product Name + alias */}
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                      {p.alias && (
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>Alias: {p.alias}</div>
                      )}
                      {p.collection && (
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.collection}</div>
                      )}
                    </td>

                    {/* Brand */}
                    <td style={{ fontSize:12 }}>{p.brand_name || '—'}</td>

                    {/* Category / Sub-Cat */}
                    <td>
                      <div style={{ fontSize:12 }}>{p.category_name || '—'}</div>
                      {p.sub_category_name && (
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.sub_category_name}</div>
                      )}
                    </td>

                    {/* Size */}
                    <td style={{ fontSize:12 }}>
                      {p.size ? (
                        <span style={{ fontWeight:600 }}>{p.size.toUpperCase()} MM</span>
                      ) : '—'}
                    </td>

                    {/* Finish + Surface */}
                    <td>
                      <div style={{ fontSize:12 }}>{p.finish || '—'}</div>
                      {p.surface && p.surface !== p.finish && (
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.surface}</div>
                      )}
                    </td>

                    {/* Tile Type + Application */}
                    <td>
                      <div style={{ fontSize:12 }}>{p.tile_type || '—'}</div>
                      {p.application && (
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.application}</div>
                      )}
                    </td>

                    {/* Grade */}
                    <td style={{ fontSize:12 }}>{p.grade || '—'}</td>

                    {/* Unit / GST */}
                    <td>
                      <div style={{ fontSize:12 }}>{p.unit || '—'}</div>
                      {p.gst_percent != null && (
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>GST {p.gst_percent}%</div>
                      )}
                    </td>

                    {/* MRP */}
                    <td style={{ fontSize:12, fontWeight:600, color:'#FD5C02' }}>
                      {fmtP(p.mrp)}
                    </td>

                    {/* Retail Rate */}
                    <td style={{ fontSize:12, fontWeight:600, color:'var(--success)' }}>
                      {fmtP(p.retail_price || p.retail_rate)}
                    </td>

                    {/* Dealer Rate */}
                    <td style={{ fontSize:12 }}>
                      {fmtP(p.dealer_price || p.dealer_rate)}
                    </td>

                    {/* Purchase Rate */}
                    <td style={{ fontSize:12 }}>
                      {fmtP(p.purchase_price || p.purchase_rate)}
                    </td>

                    {/* Pcs/Box · Sqft/Box */}
                    <td>
                      {p.pcs_per_box ? (
                        <div style={{ fontSize:12 }}>{p.pcs_per_box} pcs</div>
                      ) : null}
                      {p.sqft_per_box ? (
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{parseFloat(p.sqft_per_box).toFixed(2)} sqft</div>
                      ) : null}
                      {!p.pcs_per_box && !p.sqft_per_box && (
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Status + Type */}
                    <td>
                      <span className={`badge ${p.is_active !== false ? 'badge-green' : 'badge-gray'}`} style={{ display:'block', marginBottom:3 }}>
                        {p.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                      {p.product_type && p.product_type !== 'Regular Product' && (
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>{p.product_type}</span>
                      )}
                      <div style={{ display:'flex', gap:3, marginTop:3, flexWrap:'wrap' }}>
                        {p.new_arrival   && <span style={{ fontSize:9, background:'#FFF3EC', color:'#FD5C02', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>NEW</span>}
                        {p.featured      && <span style={{ fontSize:9, background:'#EFF6FF', color:'#3B82F6', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>FEAT</span>}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-xs" title="Edit" onClick={()=>openEdit(p)}>
                          <Edit2 size={13}/>
                        </button>
                        <button className="btn btn-ghost btn-xs" title="View Full Details" onClick={()=>openView(p)}>
                          <Eye size={13}/>
                        </button>
                        <button className="btn btn-ghost btn-xs" title="Download Product Sheet"
                          style={{ color:'var(--info)' }} onClick={()=>downloadProduct(p)}>
                          <Download size={13}/>
                        </button>
                        <button className="btn btn-ghost btn-xs" title="Move to Recycle Bin"
                          style={{ color:'var(--danger)' }} onClick={()=>handleDelete(id, p.name)}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!loadingData && filtered.length === 0 && (
                <tr>
                  <td colSpan={18}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📦</div>
                      <h3>No products found</h3>
                      <p>{(search || activeFilters > 0)
                        ? 'Try adjusting your search or filters.'
                        : 'Click "New Product" to add your first product.'
                      }</p>
                      {activeFilters > 0 && (
                        <button className="btn btn-secondary btn-sm" onClick={clearAll} style={{ marginTop:8 }}>
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showModal && (
        <ProductFormModal
          editProduct={editItem}
          brands={brands}
          categories={categories}
          subCategories={subCategories}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}

      {viewItem && (
        <ProductViewModal
          product={viewItem}
          loading={viewLoading}
          onClose={closeView}
          onEdit={(p) => { closeView(); openEdit(p) }}
        />
      )}

      {showBin && (
        <RecycleBinModal
          onClose={() => setShowBin(false)}
          onRestored={() => fire('Product restored successfully')}
          onPermanentDeleted={() => fire('Product permanently deleted', 'error')}
        />
      )}

      {/* ── 2-STEP DELETE CONFIRMATION ── */}
      {deleteTarget && deleteTarget.step === 1 && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#FFF3EC', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Trash2 size={18} style={{ color:'var(--danger)' }}/>
                </div>
                <span className="modal-title">Move to Recycle Bin?</span>
              </div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}><X size={16}/></button>
            </div>
            <div className="modal-body" style={{ paddingTop:14 }}>
              <p style={{ fontSize:13, color:'var(--text)', marginBottom:8 }}>
                You are about to move <strong>"{deleteTarget.name}"</strong> to the Recycle Bin.
              </p>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>
                The product will be hidden from all listings. You can restore it from the Recycle Bin anytime.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteStep2}>
                Yes, Move to Bin
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && deleteTarget.step === 2 && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#FEF2F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Trash2 size={18} style={{ color:'var(--danger)' }}/>
                </div>
                <span className="modal-title" style={{ color:'var(--danger)' }}>Final Confirmation</span>
              </div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}><X size={16}/></button>
            </div>
            <div className="modal-body" style={{ paddingTop:14 }}>
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'12px 14px', marginBottom:12 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#991B1B', marginBottom:4 }}>
                  ⚠️ Are you absolutely sure?
                </p>
                <p style={{ fontSize:12, color:'#991B1B' }}>
                  "<strong>{deleteTarget.name}</strong>" will be moved to Recycle Bin.
                </p>
              </div>
              <p style={{ fontSize:12, color:'var(--text-muted)' }}>
                This is your final confirmation. The product will be soft-deleted and can be restored later from Recycle Bin.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}
                style={{ background:'#DC2626' }}>
                <Trash2 size={13}/> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.msg && (
        <div
          className={`alert alert-${toast.type === 'error' ? 'danger' : 'success'}`}
          style={{ position:'fixed', bottom:24, right:24, zIndex:9999, boxShadow:'0 4px 16px rgba(0,0,0,.15)', minWidth:280 }}
        >
          {toast.type === 'error' ? '✕ ' : '✓ '}{toast.msg}
        </div>
      )}
    </>
  )
}

