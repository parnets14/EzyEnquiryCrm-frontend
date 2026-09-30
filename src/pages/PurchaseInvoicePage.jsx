import { useState, useMemo } from 'react'
import { Send, Plus, Search, Eye, X, CheckCircle, Package, Building2, Warehouse, Calendar, AlertTriangle, RefreshCw, Filter, ChevronDown, Trash2, PackageX, FileX } from 'lucide-react'

const fmtN = n => Number(n||0).toLocaleString('en-IN')
const fmtMoney = n => '₹'+Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:2,maximumFractionDigits:2})
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—'

const STATUS_COLORS = {
  Draft:              { bg:'#F1F5F9', fg:'#64748B' },
  'Pending Approval': { bg:'#FFFBEB', fg:'#D97706' },
  Approved:           { bg:'#EFF6FF', fg:'#2563EB' },
  Dispatched:         { bg:'#ECFEFF', fg:'#0891B2' },
  Completed:          { bg:'#ECFDF5', fg:'#059669' },
  Cancelled:          { bg:'#FEF2F2', fg:'#DC2626' },
}

const RETURN_REASONS = ['Damaged','Wrong Item','Quality Issue','Expired','Other']

const emptyLine = () => ({ uid: Date.now()+Math.random(), product_id:'', batch:'', lot:'', shade:'', qty:'', unit:'Piece', rate:'', gstPct:'18', reason:'' })

const genReturnNo = () => {
  const d = new Date()
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth()+1).padStart(2,'0')
  return `PR/${y}${m}/${String(Math.floor(Math.random()*9000)+1000)}`
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Draft
  return (
    <span style={{ display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:c.bg, color:c.fg }}>
      {status}
    </span>
  )
}

function KpiCard({ icon:Icon, label, value, sub, color }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16, display:'flex', gap:12, alignItems:'flex-start' }}>
      <div style={{ width:42, height:42, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:color?.bg || '#FFF3EC', color:color?.fg || '#FD5C02' }}>
        <Icon size={20} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, marginBottom:4 }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', lineHeight:1.1 }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function PurchaseReturn({ purchases = [], products = [], suppliers = [], warehouses = [], inventory = [] }) {
  const supOpts = suppliers.map(s => ({ value: s._id || s.id || s.name, label: s.name || s.company_name || String(s._id||s.id) }))
  const poOpts = purchases.filter(p => (p.status||'').includes('Received') || (p.status||'')==='Approved' || (p.status||'')==='Sent')
    .map(p => ({ value: p._id || p.id, label: `${p.po_no||p.po_number||p.code||'PO'} · ${p.supplier_name||p.supplier_id?.name||''}` }))
  const prodOpts = products.map(p => ({ value: p._id || p.id, label: `${p.code ? p.code+' · ' : ''}${p.name||String(p._id||p.id)}` }))
  const statuses = Object.keys(STATUS_COLORS)

  const [search, setSearch] = useState('')
  const [supFilter, setSupFilter] = useState('')
  const [stFilter, setStFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [toast, setToast] = useState('')
  const showToast = m => { setToast(m); setTimeout(() => setToast(''), 4000) }

  const demoReturns = [
    { _id:'1', return_no:'PR/2409/1234', date:'2024-09-15', supplier_id:'SUP001', supplier_name:'Asian Tiles Ltd', original_po:'PO-0012', original_grn:'GRN-0034', status:'Pending Approval', reason:'Damaged',
      items: [{ product_name:'Vitrified Tile 600x600mm', product_id:'P001', qty:20, unit:'Box', rate:1250, gstPct:18, reason:'Damaged' }], remarks:'Received damaged in transit', approval_status:'Pending' },
    { _id:'2', return_no:'PR/2409/1235', date:'2024-09-18', supplier_id:'SUP002', supplier_name:'Kajaria Ceramics', original_po:'PO-0015', original_grn:'GRN-0042', status:'Approved', reason:'Wrong Item',
      items: [{ product_name:'Polished Porcelain 800x800', product_id:'P004', qty:5, unit:'Box', rate:2400, gstPct:18, reason:'Wrong Item' }], remarks:'Wrong items delivered', approval_status:'Approved' },
    { _id:'3', return_no:'PR/2409/1236', date:'2024-09-20', supplier_id:'SUP001', supplier_name:'Asian Tiles Ltd', original_po:'PO-0018', original_grn:'GRN-0051', status:'Completed', reason:'Quality Issue',
      items: [{ product_name:'Matt Finish Tile 300x600', product_id:'P007', qty:10, unit:'Sq Ft', rate:85, gstPct:18, reason:'Quality Issue' }], remarks:'Uneven finish', approval_status:'Approved' },
  ]

  const [returns, setReturns] = useState(demoReturns)
  const [showCreate, setShowCreate] = useState(false)
  const [viewRet, setViewRet] = useState(null)

  const [retNo, setRetNo] = useState(genReturnNo())
  const [retDate, setRetDate] = useState(new Date().toISOString().slice(0,10))
  const [retSup, setRetSup] = useState('')
  const [retPO, setRetPO] = useState('')
  const [retGRN, setRetGRN] = useState('')
  const [retRemarks, setRetRemarks] = useState('')
  const [retApproval, setRetApproval] = useState('Draft')
  const [lines, setLines] = useState([emptyLine()])
  const [errors, setErrors] = useState({})

  const kpis = useMemo(() => {
    const counts = { 'Pending Approval':0, Approved:0, Completed:0 }
    let value = 0
    returns.forEach(r => {
      const s = r.status || 'Draft'
      if (s==='Pending Approval') counts['Pending Approval']++
      if (s==='Approved') counts.Approved++
      if (s==='Completed') counts.Completed++
      const rv = (r.items||[]).reduce((a,i)=>a+(Number(i.qty||0)*Number(i.rate||0))*(1+Number(i.gstPct||0)/100),0)
      value += rv || (r.return_value||0)
    })
    return { total: returns.length, ...counts, value }
  }, [returns])

  const filtered = useMemo(() => returns.filter(r => {
    const s = r.status || 'Draft'
    const rn = r.return_no || (r._id?'PR-'+String(r._id).slice(-6):'')
    const supName = r.supplier_name || suppliers.find(x=>(x._id||x.id)===(r.supplier_id||r.supplier))?.name || ''
    const matchQ = !search || (rn.toLowerCase().includes(search.toLowerCase()) || supName.toLowerCase().includes(search.toLowerCase()))
    const matchSup = !supFilter || supName === suppliers.find(x=>(x._id||x.id)===supFilter)?.name || (r.supplier_id||r.supplier)===supFilter
    const matchSt = !stFilter || s === stFilter
    const rDate = (r.date||r.created_at||'').toString().slice(0,10)
    const matchFrom = !dateFrom || rDate >= dateFrom
    const matchTo = !dateTo || rDate <= dateTo
    return matchQ && matchSup && matchSt && matchFrom && matchTo
  }), [returns, search, supFilter, stFilter, dateFrom, dateTo, suppliers])

  const setLine = (uid, f, v) => setLines(prev => prev.map(r => r.uid===uid ? {...r, [f]:v} : r))
  const addLine = () => setLines(p => [...p, emptyLine()])
  const removeLine = uid => setLines(p => p.length > 1 ? p.filter(r => r.uid!==uid) : p)

  const lineCalc = r => {
    const qty = Number(r.qty)||0, rate = Number(r.rate)||0
    const net = qty*rate
    const gst = net * (Number(r.gstPct)||0) / 100
    return { qty, rate, net, gst, total: net+gst }
  }

  const totals = useMemo(() => lines.reduce((a, r) => {
    const c = lineCalc(r)
    return { net: a.net+c.net, gst: a.gst+c.gst, total: a.total+c.total, qty: a.qty+c.qty }
  }, { net:0, gst:0, total:0, qty:0 }), [lines])

  const resetForm = () => {
    setRetNo(genReturnNo()); setRetDate(new Date().toISOString().slice(0,10))
    setRetSup(''); setRetPO(''); setRetGRN(''); setRetRemarks('')
    setRetApproval('Draft'); setLines([emptyLine()]); setErrors({})
  }

  const openCreate = () => { resetForm(); setShowCreate(true) }

  const handleSave = () => {
    const errs = {}
    if (!retSup) errs.supplier = 'Supplier required'
    lines.forEach((r,i) => {
      if (!r.product_id) errs[`p_${i}`] = 'Select product'
      if (!r.qty || Number(r.qty)<1) errs[`q_${i}`] = 'Valid qty'
      if (!r.reason) errs[`rsn_${i}`] = 'Select reason'
    })
    if (Object.keys(errs).length) { setErrors(errs); return }
    const items = lines.map(r => {
      const prod = products.find(p=>(p._id||p.id)===r.product_id)
      return {
        product_id: r.product_id, product_name: prod?.name||'',
        batch: r.batch, lot: r.lot, shade: r.shade,
        qty: Number(r.qty), unit: r.unit, rate: Number(r.rate),
        gst_percent: Number(r.gstPct)||0, reason: r.reason, amount: lineCalc(r).total,
      }
    })
    const supName = suppliers.find(x=>(x._id||x.id)===retSup)?.name || ''
    const newRet = {
      _id: String(Date.now()), return_no: retNo, date: retDate,
      supplier_id: retSup, supplier_name: supName,
      original_po: retPO, original_grn: retGRN,
      remarks: retRemarks, status: retApproval, approval_status: retApproval,
      items, return_value: totals.total,
    }
    setReturns(prev => [newRet, ...prev])
    showToast(`✓ Return ${retNo} created`)
    setShowCreate(false)
  }

  const handleAction = (r, action) => {
    const code = r.return_no || 'PR'
    const map = {
      approve:  { st:'Approved',  msg:`Return ${code} approved` },
      complete: { st:'Completed', msg:`Return ${code} marked completed` },
      cancel:   { st:'Cancelled', msg:`Return ${code} cancelled` },
    }
    const cfg = map[action]
    if (!cfg) return
    setReturns(prev => prev.map(x => (x._id===r._id ? {...x, status: cfg.st, approval_status: cfg.st} : x)))
    showToast('✓ '+cfg.msg)
  }

  const handleDelete = (r) => {
    setReturns(prev => prev.filter(x => x._id !== r._id))
    showToast(`✓ Return ${r.return_no||''} deleted`)
  }

  return (
    <div style={{ padding: 20 }}>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, background:'#059669', color:'#fff', padding:'10px 18px', borderRadius:10, fontSize:13, fontWeight:600, boxShadow:'0 8px 24px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>
        <span style={{ cursor:'pointer' }}>Purchase</span>
        <ChevronDown size={14} style={{transform:'rotate(-90deg)'}}/>
        <span style={{ color:'var(--text)', fontWeight:600 }}>Purchase Return</span>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', margin:0, display:'flex', alignItems:'center', gap:10 }}>
            <PackageX size={26} style={{ color:'#DC2626' }} /> Purchase Return
          </h1>
          <p style={{ fontSize:13, color:'var(--text-muted)', margin:'4px 0 0' }}>Manage supplier returns and reversals</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary" style={{ display:'inline-flex', alignItems:'center', gap:6 }} onClick={openCreate}>
            <Plus size={14}/> New Return
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        <KpiCard icon={FileX} label="Total Returns" value={fmtN(kpis.total)} color={{bg:'#FEF2F2',fg:'#DC2626'}} />
        <KpiCard icon={AlertTriangle} label="Pending Approval" value={fmtN(kpis['Pending Approval'])} color={{bg:'#FFFBEB',fg:'#D97706'}} />
        <KpiCard icon={CheckCircle} label="Approved" value={fmtN(kpis.Approved)} color={{bg:'#EEF2FF',fg:'#4F46E5'}} />
        <KpiCard icon={CheckCircle} label="Completed" value={fmtN(kpis.Completed)} color={{bg:'#ECFDF5',fg:'#059669'}} />
        <KpiCard icon={Package} label="Returned Value" value={fmtMoney(kpis.value)} color={{bg:'#FFF7ED',fg:'#EA580C'}} />
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:12, alignItems:'end' }}>
          <div>
            <label className="form-label"><Search size={12} style={{marginRight:4}}/> Search</label>
            <input className="form-control" placeholder="Return No, Supplier..." value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Supplier</label>
            <div style={{position:'relative'}}>
              <select className="form-control" value={supFilter} onChange={e=>setSupFilter(e.target.value)} style={{paddingRight:32,appearance:'none',color:supFilter?'var(--text)':'var(--text-muted)'}} onFocus={e=>{e.target.style.borderColor='#FD5C02';e.target.style.boxShadow='0 0 0 3px rgba(253,92,2,.12)'}} onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}>
                <option value="">All Suppliers</option>
                {supOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown size={14} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
            </div>
          </div>
          <div>
            <label className="form-label">Status</label>
            <div style={{position:'relative'}}>
              <select className="form-control" value={stFilter} onChange={e=>setStFilter(e.target.value)} style={{paddingRight:32,appearance:'none',color:stFilter?'var(--text)':'var(--text-muted)'}} onFocus={e=>{e.target.style.borderColor='#FD5C02';e.target.style.boxShadow='0 0 0 3px rgba(253,92,2,.12)'}} onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}>
                <option value="">All Statuses</option>
                {statuses.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
            </div>
          </div>
          <div>
            <label className="form-label"><Calendar size={12} style={{marginRight:4}}/> From</label>
            <input type="date" className="form-control" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label"><Calendar size={12} style={{marginRight:4}}/> To</label>
            <input type="date" className="form-control" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button className="btn btn-outline" style={{flex:1}} onClick={() => { setSearch(''); setSupFilter(''); setStFilter(''); setDateFrom(''); setDateTo('') }}>
              <RefreshCw size={14} style={{marginRight:4}}/> Reset
            </button>
            <button className="btn btn-primary" style={{flex:1}}>
              <Filter size={14} style={{marginRight:4}}/> Apply
            </button>
          </div>
        </div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'var(--bg)' }}>
                {['Return No','Date','Supplier','Original GRN/PO','Product','Returned Qty','Unit','Rate','Amount','Reason','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontWeight:700, color:'var(--text-muted)', fontSize:11, textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={12} style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                  <PackageX size={36} style={{ margin:'0 auto 10px', opacity:.4 }} />
                  <div style={{ fontSize:14, fontWeight:600 }}>No Purchase Returns found</div>
                  <div style={{ fontSize:12, marginTop:4 }}>Create your first return to track supplier reversals</div>
                </td></tr>
              )}
              {filtered.map(r => {
                const rn = r.return_no || (r._id?'PR-'+String(r._id).slice(-6).toUpperCase():'')
                const supName = r.supplier_name || suppliers.find(x=>(x._id||x.id)===(r.supplier_id||r.supplier))?.name || '—'
                const firstItem = (r.items||[])[0] || {}
                const tQty = (r.items||[]).reduce((a,i)=>a+Number(i.qty||0),0)
                const tAmt = (r.items||[]).reduce((a,i)=>a+(Number(i.qty||0)*Number(i.rate||0))*(1+Number(i.gst_percent||i.gstPct||0)/100),0)
                const st = r.status || 'Draft'
                return (
                  <tr key={r._id||rn} style={{ borderBottom:'1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 14px', fontWeight:700, color:'#DC2626', fontFamily:'monospace' }}>{rn}</td>
                    <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>{fmtDate(r.date)}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Building2 size={14} style={{ color:'var(--text-muted)' }} />
                        <span>{supName}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:12 }}>
                      <div style={{ fontWeight:600 }}>{r.original_grn || '—'}</div>
                      <div style={{ color:'var(--text-muted)' }}>{r.original_po || '—'}</div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Package size={14} style={{ color:'var(--text-muted)' }} />
                        <span>{firstItem.product_name || firstItem.product_id || '—'}</span>
                        {(r.items||[]).length > 1 && <span style={{ fontSize:10, background:'var(--bg)', padding:'1px 6px', borderRadius:10 }}>+{(r.items||[]).length-1}</span>}
                      </div>
                    </td>
                    <td style={{ padding:'12px 14px', textAlign:'right', fontWeight:600 }}>{fmtN(tQty)}</td>
                    <td style={{ padding:'12px 14px' }}>{firstItem.unit || '—'}</td>
                    <td style={{ padding:'12px 14px', textAlign:'right' }}>{fmtMoney(firstItem.rate||0)}</td>
                    <td style={{ padding:'12px 14px', textAlign:'right', fontWeight:700, color:'#DC2626' }}>{fmtMoney(tAmt||r.return_value||0)}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ display:'inline-block', padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:600, background:'#FEF2F2', color:'#DC2626' }}>
                        {r.reason || firstItem.reason || '—'}
                      </span>
                    </td>
                    <td style={{ padding:'12px 14px' }}><StatusBadge status={st}/></td>
                    <td style={{ padding:'12px 14px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-sm btn-outline" title="View" onClick={() => setViewRet(r)}><Eye size={13}/></button>
                        {(st==='Pending Approval'||st==='Draft') && (
                          <button className="btn btn-sm btn-outline" title="Approve" onClick={() => handleAction(r,'approve')} style={{color:'#2563EB'}}><CheckCircle size={13}/></button>
                        )}
                        {st==='Approved' && (
                          <button className="btn btn-sm btn-outline" title="Mark Complete" onClick={() => handleAction(r,'complete')} style={{color:'#059669'}}><Send size={13}/></button>
                        )}
                        {(st==='Draft'||st==='Pending Approval') && (
                          <button className="btn btn-sm btn-outline" title="Delete" onClick={() => handleDelete(r)} style={{color:'#DC2626'}}><Trash2 size={13}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, color:'var(--text-muted)' }}>
          <div>Showing {filtered.length} of {returns.length} Returns</div>
          <div>Total: <span style={{fontWeight:700,color:'#DC2626'}}>{fmtMoney(filtered.reduce((a,r)=>a+((r.items||[]).reduce((b,i)=>b+(Number(i.qty||0)*Number(i.rate||0))*(1+Number(i.gst_percent||i.gstPct||0)/100),0)||r.return_value||0),0))}</span></div>
        </div>
      </div>

      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setShowCreate(false)}>
          <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:1100, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
              <div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                  <PackageX size={20} style={{color:'#DC2626'}}/>
                  Create Purchase Return
                </h3>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                  {retNo} · {fmtDate(retDate)}
                </div>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setShowCreate(false)}><X size={16}/></button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:20 }}>
              {errors._global && <div style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, marginBottom:14 }}>{errors._global}</div>}

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:16 }}>
                <div>
                  <label className="form-label">Return No</label>
                  <input className="form-control" value={retNo} onChange={e=>setRetNo(e.target.value)} style={{fontFamily:'monospace',fontWeight:600,color:'#DC2626'}} />
                </div>
                <div>
                  <label className="form-label"><Calendar size={12} style={{marginRight:4}}/> Date<span style={{color:'var(--danger)'}}> *</span></label>
                  <input type="date" className="form-control" value={retDate} onChange={e=>setRetDate(e.target.value)} />
                </div>
                <div style={errors.supplier?{marginBottom:0}:{}}>
                  <label className="form-label"><Building2 size={12} style={{marginRight:4}}/> Supplier<span style={{color:'var(--danger)'}}> *</span></label>
                  <div style={{position:'relative'}}>
                    <select className="form-control" value={retSup} onChange={e=>{ setRetSup(e.target.value) }} style={{paddingRight:32,appearance:'none',color:retSup?'var(--text)':'var(--text-muted)'}} onFocus={e=>{e.target.style.borderColor='#FD5C02';e.target.style.boxShadow='0 0 0 3px rgba(253,92,2,.12)'}} onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}>
                      <option value="">Select Supplier...</option>
                      {supOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={14} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
                  </div>
                  {errors.supplier && <div style={{fontSize:11,color:'#DC2626',marginTop:4}}>{errors.supplier}</div>}
                </div>
                <div>
                  <label className="form-label"><FileX size={12} style={{marginRight:4}}/> Original PO</label>
                  <div style={{position:'relative'}}>
                    <select className="form-control" value={retPO} onChange={e=>setRetPO(e.target.value)} style={{paddingRight:32,appearance:'none',color:retPO?'var(--text)':'var(--text-muted)'}} onFocus={e=>{e.target.style.borderColor='#FD5C02';e.target.style.boxShadow='0 0 0 3px rgba(253,92,2,.12)'}} onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}>
                      <option value="">Select PO...</option>
                      {poOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={14} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
                  </div>
                </div>
                <div>
                  <label className="form-label"><Warehouse size={12} style={{marginRight:4}}/> Original GRN</label>
                  <input className="form-control" value={retGRN} onChange={e=>setRetGRN(e.target.value)} placeholder="GRN No..." />
                </div>
                <div>
                  <label className="form-label">Approval Status</label>
                  <div style={{position:'relative'}}>
                    <select className="form-control" value={retApproval} onChange={e=>setRetApproval(e.target.value)} style={{paddingRight:32,appearance:'none'}} onFocus={e=>{e.target.style.borderColor='#FD5C02';e.target.style.boxShadow='0 0 0 3px rgba(253,92,2,.12)'}} onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}>
                      {['Draft','Pending Approval','Approved','Cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
                  </div>
                </div>
                <div style={{gridColumn:'1 / -1'}}>
                  <label className="form-label">Remarks</label>
                  <textarea className="form-control" rows={2} value={retRemarks} onChange={e=>setRetRemarks(e.target.value)} placeholder="Reason for return, additional notes..." />
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'8px 0 10px' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}><Package size={14} style={{display:'inline',marginRight:6,verticalAlign:'-2px'}}/> Return Items</div>
                <button className="btn btn-sm btn-outline" onClick={addLine}><Plus size={13} style={{marginRight:4}}/>Add Item</button>
              </div>

              <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:'var(--bg)' }}>
                        {['Product','Batch','Lot','Shade','Return Qty','Unit','Rate','GST%','Amount','Reason',''].map((h,i)=>(
                          <th key={h+i} style={{ padding:'10px 8px', textAlign:i===9?'center':'left', fontWeight:700, fontSize:11, color:'var(--text-muted)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((r, i) => {
                        const c = lineCalc(r)
                        return (
                          <tr key={r.uid} style={{ borderBottom: i < lines.length-1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={{ padding:'8px 10px', minWidth:200 }}>
                              <select
                                className="form-control" style={{ fontSize:12, padding:'5px 28px 5px 8px', appearance:'none', color:r.product_id?'var(--text)':'var(--text-muted)' }}
                                value={r.product_id} onChange={e => {
                                  const val = e.target.value
                                  setLine(r.uid,'product_id', val)
                                  const prod = products.find(p=>(p._id||p.id)===val)
                                  if (prod) {
                                    setLine(r.uid,'rate', String(prod.purchase_price||prod.purchase_rate||prod.landing_cost||''))
                                    setLine(r.uid,'unit', prod.unit||'Piece')
                                    setLine(r.uid,'gstPct', String(prod.gst_percent||'18'))
                                  }
                                }}
                                onFocus={e=>{e.target.style.borderColor='#FD5C02';e.target.style.boxShadow='0 0 0 3px rgba(253,92,2,.12)'}} onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}
                              >
                                <option value="">Select...</option>
                                {prodOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              {errors[`p_${i}`] && <div style={{fontSize:10,color:'#DC2626',marginTop:3}}>{errors[`p_${i}`]}</div>}
                            </td>
                            <td style={{ padding:'8px 6px', width:80 }}>
                              <input className="form-control" style={{ fontSize:12, padding:'5px 7px' }} value={r.batch} onChange={e=>setLine(r.uid,'batch',e.target.value)} placeholder="Batch" />
                            </td>
                            <td style={{ padding:'8px 6px', width:75 }}>
                              <input className="form-control" style={{ fontSize:12, padding:'5px 7px' }} value={r.lot} onChange={e=>setLine(r.uid,'lot',e.target.value)} placeholder="Lot" />
                            </td>
                            <td style={{ padding:'8px 6px', width:75 }}>
                              <input className="form-control" style={{ fontSize:12, padding:'5px 7px' }} value={r.shade} onChange={e=>setLine(r.uid,'shade',e.target.value)} placeholder="Shade" />
                            </td>
                            <td style={{ padding:'8px 6px', width:80 }}>
                              <input type="number" min="0" className="form-control" style={{ fontSize:12, padding:'5px 7px', textAlign:'right' }}
                                value={r.qty} onChange={e=>setLine(r.uid,'qty',e.target.value)} />
                              {errors[`q_${i}`] && <div style={{fontSize:10,color:'#DC2626',marginTop:3,textAlign:'right'}}>{errors[`q_${i}`]}</div>}
                            </td>
                            <td style={{ padding:'8px 6px', width:75 }}>
                              <input className="form-control" style={{ fontSize:12, padding:'5px 7px', textAlign:'center' }}
                                value={r.unit} onChange={e=>setLine(r.uid,'unit',e.target.value)} />
                            </td>
                            <td style={{ padding:'8px 6px', width:90 }}>
                              <input type="number" min="0" step="0.01" className="form-control" style={{ fontSize:12, padding:'5px 7px', textAlign:'right' }}
                                value={r.rate} onChange={e=>setLine(r.uid,'rate',e.target.value)} />
                            </td>
                            <td style={{ padding:'8px 6px', width:65 }}>
                              <input type="number" min="0" max="100" className="form-control" style={{ fontSize:12, padding:'5px 7px', textAlign:'right' }}
                                value={r.gstPct} onChange={e=>setLine(r.uid,'gstPct',e.target.value)} />
                            </td>
                            <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#DC2626', width:100 }}>{fmtMoney(c.total)}</td>
                            <td style={{ padding:'8px 8px', width:110 }}>
                              <div style={{position:'relative'}}>
                                <select className="form-control" value={r.reason} onChange={e=>setLine(r.uid,'reason',e.target.value)} style={{fontSize:12,padding:'5px 26px 5px 7px',appearance:'none',color:r.reason?'var(--text)':'var(--text-muted)'}} onFocus={e=>{e.target.style.borderColor='#FD5C02';e.target.style.boxShadow='0 0 0 3px rgba(253,92,2,.12)'}} onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none'}}>
                                  <option value="">Reason...</option>
                                  {RETURN_REASONS.map(rs=><option key={rs} value={rs}>{rs}</option>)}
                                </select>
                                <ChevronDown size={12} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',pointerEvents:'none'}}/>
                              </div>
                              {errors[`rsn_${i}`] && <div style={{fontSize:10,color:'#DC2626',marginTop:3}}>{errors[`rsn_${i}`]}</div>}
                            </td>
                            <td style={{ padding:'8px 6px' }}>
                              <button className="btn btn-sm btn-outline" onClick={() => removeLine(r.uid)} style={{color:'#DC2626'}} disabled={lines.length<=1}>
                                <Trash2 size={12}/>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:14, width:320 }}>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}>
                    <span style={{color:'#B91C1C'}}>Subtotal</span>
                    <span style={{fontWeight:600,color:'#B91C1C'}}>{fmtMoney(totals.net)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}>
                    <span style={{color:'#B91C1C'}}>GST</span>
                    <span style={{fontWeight:600,color:'#B91C1C'}}>{fmtMoney(totals.gst)}</span>
                  </div>
                  <div style={{ borderTop:'2px solid #FECACA', marginTop:8, paddingTop:10, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:700, fontSize:14, color:'#991B1B' }}>Total Return Value</span>
                    <span style={{ fontWeight:800, fontSize:17, color:'#DC2626' }}>{fmtMoney(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderTop:'1px solid var(--border)', background:'var(--bg)' }}>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                <AlertTriangle size={13} style={{display:'inline',marginRight:5,verticalAlign:'-2px',color:'#D97706'}}/>
                {lines.length} item(s) · Total Qty: {fmtN(totals.qty)}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>
                  <CheckCircle size={14} style={{marginRight:6}}/>
                  Create Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewRet && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setViewRet(null)}>
          <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:800, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)' }}>
              <div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:700 }}>Return Details</h3>
                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3,fontFamily:'monospace'}}>{viewRet.return_no||''}</div>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => setViewRet(null)}><X size={16}/></button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:20 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
                {[
                  ['Status', <StatusBadge status={viewRet.status||'Draft'}/>],
                  ['Return Date', fmtDate(viewRet.date)],
                  ['Supplier', viewRet.supplier_name || '—'],
                  ['Original PO', viewRet.original_po || '—'],
                  ['Original GRN', viewRet.original_grn || '—'],
                  ['Approval', viewRet.approval_status || '—'],
                ].map(([l,v]) => (
                  <div key={l} style={{ background:'var(--bg)', borderRadius:8, padding:'10px 14px' }}>
                    <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{v}</div>
                  </div>
                ))}
              </div>
              {(viewRet.items||[]).length > 0 && (
                <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead><tr style={{background:'var(--bg)'}}>
                      {['Product','Batch/Lot','Qty','Unit','Rate','Reason','Amount'].map(h=>(
                        <th key={h} style={{padding:'10px 12px',textAlign:'left',fontWeight:700,fontSize:11,color:'var(--text-muted)',borderBottom:'1px solid var(--border)'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {(viewRet.items||[]).map((it,i)=>{
                        const amt = (Number(it.qty||0)*Number(it.rate||0))*(1+Number(it.gst_percent||it.gstPct||0)/100)
                        return (
                          <tr key={i} style={{borderBottom:i<(viewRet.items||[]).length-1?'1px solid var(--border)':'none'}}>
                            <td style={{padding:'10px 12px',fontWeight:600}}>{it.product_name||it.product_id||'—'}</td>
                            <td style={{padding:'10px 12px',fontSize:11}}>{[it.batch,it.lot,it.shade].filter(Boolean).join(' / ') || '—'}</td>
                            <td style={{padding:'10px 12px',textAlign:'right'}}>{fmtN(it.qty||0)}</td>
                            <td style={{padding:'10px 12px'}}>{it.unit||'—'}</td>
                            <td style={{padding:'10px 12px',textAlign:'right'}}>{fmtMoney(it.rate||0)}</td>
                            <td style={{padding:'10px 12px'}}><span style={{fontSize:11,fontWeight:600,color:'#DC2626',background:'#FEF2F2',padding:'2px 8px',borderRadius:6}}>{it.reason||'—'}</span></td>
                            <td style={{padding:'10px 12px',textAlign:'right',fontWeight:700,color:'#DC2626'}}>{fmtMoney(amt||it.amount||0)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {viewRet.remarks && (
                <div style={{ marginTop:16, padding:14, background:'var(--bg)', borderRadius:10 }}>
                  <div style={{fontSize:11,color:'var(--text-muted)',fontWeight:600,marginBottom:6}}>Remarks</div>
                  <div style={{fontSize:13,color:'var(--text)'}}>{viewRet.remarks}</div>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, padding:14, width:280 }}>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}>
                    <span style={{color:'#991B1B',fontWeight:700}}>Total Return Value</span>
                    <span style={{fontWeight:800,fontSize:17,color:'#DC2626'}}>{fmtMoney(viewRet.return_value||(viewRet.items||[]).reduce((a,i)=>a+(Number(i.qty||0)*Number(i.rate||0))*(1+Number(i.gst_percent||i.gstPct||0)/100),0)||0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
