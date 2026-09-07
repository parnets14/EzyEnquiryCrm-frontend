import { useState, useCallback } from 'react'
import {
  Search, Eye, Truck, Package, CheckCircle, ClipboardList,
  Layers, Send, ShieldCheck, XCircle, FileText, Box, AlertCircle,
  History, ArrowRight, ChevronRight, Plus, Trash2, Edit2, X,
} from 'lucide-react'

// ── Requirement §7: Simplified display statuses ──────────────
const DISPLAY_STATUSES = ['New','Accepted','Processing','Ready','Dispatched','Delivered','Cancelled']

// Map display status → backend status group for filtering
const DISPLAY_TO_BACKEND = {
  New:        ['New'],
  Accepted:   ['Pending Approval','Approved'],
  Processing: ['Picking Started','Picking Completed','Sorting Started','Sorting Completed','Packing Started','Packing Completed','Invoice Generated','Partially Dispatched'],
  Ready:      ['Ready for Dispatch'],
  Dispatched: ['Dispatched','In Transit'],
  Delivered:  ['Delivered'],
  Cancelled:  ['Cancelled'],
}

// Map any backend status → display status
function toDisplay(status) {
  for (const [disp, backends] of Object.entries(DISPLAY_TO_BACKEND)) {
    if (backends.includes(status)) return disp
  }
  return status
}

// Backend transition map (unchanged)
const NEXT_STATUS = {
  'New':               ['Pending Approval','Cancelled'],
  'Pending Approval':  ['Approved','Cancelled'],
  'Approved':          ['Picking Started','Cancelled'],
  'Picking Started':   ['Picking Completed','Cancelled'],
  'Picking Completed': ['Sorting Started'],
  'Sorting Started':   ['Sorting Completed'],
  'Sorting Completed': ['Packing Started'],
  'Packing Started':   ['Packing Completed'],
  'Packing Completed': ['Invoice Generated'],
  'Invoice Generated': ['Ready for Dispatch'],
  'Ready for Dispatch':['Dispatched'],
  'Dispatched':        ['In Transit'],
  'In Transit':        ['Delivered'],
  'Delivered':         [],
  'Cancelled':         [],
}

// Human-readable action labels for each backend status transition
const STATUS_ACTION_LABEL = {
  'Pending Approval': 'Accept',
  'Approved':         'Approve',
  'Picking Started':  'Start Picking',
  'Picking Completed':'Picking Done',
  'Sorting Started':  'Start Sorting',
  'Sorting Completed':'Sorting Done',
  'Packing Started':  'Start Packing',
  'Packing Completed':'Packing Done',
  'Invoice Generated':'Generate Invoice',
  'Ready for Dispatch':'Mark Ready',
  'Dispatched':       'Dispatch',
  'In Transit':       'In Transit',
  'Delivered':        'Delivered',
  'Cancelled':        'Cancel',
}

const STATUS_COLOR = {
  New:'badge-blue', Accepted:'badge-cyan', Processing:'badge-yellow',
  Ready:'badge-orange', Dispatched:'badge-purple', Delivered:'badge-green', Cancelled:'badge-red',
  'Pending Approval':'badge-cyan','Approved':'badge-green',
  'Picking Started':'badge-yellow','Picking Completed':'badge-yellow',
  'Sorting Started':'badge-orange','Sorting Completed':'badge-orange',
  'Packing Started':'badge-purple','Packing Completed':'badge-purple',
  'Invoice Generated':'badge-blue','Ready for Dispatch':'badge-orange',
  'In Transit':'badge-yellow',
}

const STAT_CARDS = [
  { s:'New',        ic:'#2563EB', bc:'#BFDBFE', bg:'#EFF6FF', iconBg:'#DBEAFE', Icon:ClipboardList },
  { s:'Accepted',   ic:'#059669', bc:'#A7F3D0', bg:'#F0FDF4', iconBg:'#D1FAE5', Icon:CheckCircle   },
  { s:'Processing', ic:'#7C3AED', bc:'#DDD6FE', bg:'#F5F3FF', iconBg:'#EDE9FE', Icon:Box           },
  { s:'Ready',      ic:'#D97706', bc:'#FDE68A', bg:'#FFFBEB', iconBg:'#FEF3C7', Icon:Layers        },
  { s:'Dispatched', ic:'#7C3AED', bc:'#DDD6FE', bg:'#F5F3FF', iconBg:'#EDE9FE', Icon:Send          },
  { s:'Delivered',  ic:'#059669', bc:'#A7F3D0', bg:'#ECFDF5', iconBg:'#D1FAE5', Icon:ShieldCheck   },
  { s:'Cancelled',  ic:'#DC2626', bc:'#FECACA', bg:'#FEF2F2', iconBg:'#FEE2E2', Icon:XCircle       },
]

const ordId       = o => o._id           || o.id      || ''
const ordCode     = o => o.order_code    || o.id      || ''
const ordCustomer = o => o.customer_name || ''
const ordProduct  = o => o.product_name  || ''
const ordTotal    = o => o.total_amount  || o.total   || 0
const ordAmount   = o => o.amount        || 0
const ordGst      = o => o.gst_amount    || o.gst     || 0
const ordDate     = o => {
  const d = o.order_date || o.created_at
  return d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : ''
}
const ordEnqCode    = o => o.enquiry_code || ''
const ordHasEnqLink = o => !!(o.enquiry_id)
const ordEnqLabel   = o => o.enquiry_code || (o.enquiry_id ? String(o.enquiry_id).slice(-8) : '')
const fmtDate    = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'

// Partial-fulfillment quantity accessors
const ordQtyNum      = o => Number(o.qty)||0
const ordDispatched  = o => Number(o.dispatched_qty)||0
const ordRemaining   = o => Math.max(0, Math.round((ordQtyNum(o)-ordDispatched(o))*100)/100)

const EMPTY_FORM = {
  customer_name:'', customer_mobile:'', delivery_address:'',
  product_id:'', product_name:'', product_code:'', product_size:'',
  product_finish:'', product_color:'', product_category:'', product_brand:'',
  qty:'', rate:'', gst_percent:'18', branch_id:'', notes:'',
}

export default function OrderManagement({
  branches=[], orders=[], inventory=[], products=[], customers=[], dispatches=[], enquiries=[], employees=[],
  updateOrderStatus, createDispatch, markDelivered, markInTransit, addOrder, deleteOrder, packOrder, assignOrder,
}) {
  const branchNames = branches.map(b=>b.name||b).filter(Boolean)

  const [search,       setSearch]      = useState('')
  const [statusFilter, setStatusFilter]= useState('All')
  const [branchFilter, setBranchFilter]= useState('All')
  const [selected,     setSelected]    = useState(null)
  const [showHistory,  setShowHistory] = useState(false)
  const [showCreate,   setShowCreate]  = useState(false)
  const [editOrder,    setEditOrder]   = useState(null)
  const [dispatchForm, setDispatchForm]= useState(null)
  const [successMsg,   setSuccessMsg]  = useState('')
  const [errorMsg,     setErrorMsg]    = useState('')
  const [busyId,       setBusyId]      = useState(null)
  const [deleteConfirm,setDeleteConfirm]=useState(null)

  // Enquiry detail popup state
  const [selectedEnquiry, setSelectedEnquiry] = useState(null)

  const [form,       setForm]      = useState(EMPTY_FORM)
  const [formErrors, setFormErrors]= useState({})
  const [saving,     setSaving]    = useState(false)

  const [dForm, setDForm] = useState({
    packQty:'',vehicle:'',driver:'',driverMobile:'',transport:'',
    lr:'',dispatchDate:'',expectedDelivery:'',expectedDays:'',branch:'',
  })

  const toast = (msg,err=false) => {
    if(err){setErrorMsg(msg);setTimeout(()=>setErrorMsg(''),5000)}
    else{setSuccessMsg(msg);setTimeout(()=>setSuccessMsg(''),4000)}
  }

  // Computed totals for form
  const coAmount = (Number(form.qty)*Number(form.rate))||0
  const coGst    = Math.round(coAmount*(Number(form.gst_percent)||0)/100)
  const coTotal  = coAmount+coGst

  // Product select handler — auto-fills all product details
  const handleProductSelect = (prodId) => {
    const prod = products.find(p=>(p._id||p.id)===prodId)
    if(prod){
      setForm(f=>({
        ...f,
        product_id:       prodId,
        product_name:     prod.name||'',
        product_code:     prod.code||'',
        product_size:     prod.size||'',
        product_finish:   prod.finish||'',
        product_color:    prod.color||'',
        product_category: prod.category_name||prod.category||'',
        product_brand:    prod.brand_name||prod.brand||'',
        rate:             String(prod.selling_price||prod.sellingPrice||prod.selling_rate||''),
        gst_percent:      String(prod.gst_percent||'18'),
      }))
    } else {
      setForm(f=>({...f,product_id:'',product_name:'',product_code:'',
        product_size:'',product_finish:'',product_color:'',product_category:'',product_brand:''}))
    }
  }

  // Customer select handler
  const handleCustomerSelect = (name) => {
    const cust = customers.find(c=>c.name===name)
    setForm(f=>({
      ...f,
      customer_name:    name,
      customer_mobile:  cust?.mobile||f.customer_mobile,
      delivery_address: cust?.address||f.delivery_address,
    }))
  }

  const validateForm = () => {
    const e = {}
    if(!form.customer_name.trim())  e.customer_name   = 'Customer name required'
    if(!form.customer_mobile.trim()) e.customer_mobile = 'Mobile required'
    if(!form.product_id && !form.product_name.trim()) e.product_name = 'Product required'
    if(!form.qty||Number(form.qty)<=0) e.qty = 'Valid quantity required'
    if(!form.rate||Number(form.rate)<=0) e.rate = 'Valid rate required'
    return e
  }

  const handleSave = async () => {
    const e = validateForm()
    if(Object.keys(e).length){setFormErrors(e);return}
    setSaving(true)
    const payload = {
      customer_name:    form.customer_name.trim(),
      customer_mobile:  form.customer_mobile.trim(),
      delivery_address: form.delivery_address.trim(),
      product_id:       form.product_id||undefined,
      product_name:     form.product_name.trim(),
      product_code:     form.product_code,
      qty:              Number(form.qty),
      rate:             Number(form.rate),
      gst_percent:      Number(form.gst_percent)||18,
      branch_id:        form.branch_id||undefined,
      branch_name:      branches.find(b=>(b._id||b.id)===form.branch_id)?.name||'',
      notes:            form.notes,
    }
    const res = await addOrder?.(payload)
    setSaving(false)
    if(res?.success===false){toast(res.message||'Failed to create order',true);return}
    toast(`✓ Order ${res?.data?.order_code||''} created!`)
    setForm(EMPTY_FORM); setFormErrors({}); setShowCreate(false)
  }

  // Status update
  const doStatusUpdate = useCallback(async(orderId,newStatus,rem='')=>{
    setBusyId(orderId)
    const res = await updateOrderStatus?.(orderId,{status:newStatus,remarks:rem})
    setBusyId(null)
    if(res?.success===false){toast(res.message||`Cannot move to ${newStatus}`,true);return false}
    toast(`✓ Status → ${newStatus}`)
    if(selected&&ordId(selected)===orderId) setSelected(p=>({...p,...res?.data,status:newStatus}))
    return true
  },[updateOrderStatus,selected])

  // Delete order
  const handleDelete = async(id)=>{
    setBusyId(id)
    const res = await deleteOrder?.(id)
    setBusyId(null)
    if(res?.success===false){toast(res.message||'Delete failed',true)}
    else{toast('✓ Order deleted');setDeleteConfirm(null);if(selected&&ordId(selected)===id)setSelected(null)}
  }

  // Assign order to staff — uses ErpContext.assignOrder which also
  // updates the orders list in-place so the row refreshes immediately.
  const handleAssignStaff = async (orderId, staffId) => {
    if (!staffId) return
    const staffName = employees.find(u => String(u._id || u.id) === String(staffId) || String(u.user_id) === String(staffId))?.name || ''
    setBusyId(orderId)
    const res = await assignOrder(orderId, staffId, staffName)
    setBusyId(null)
    if (res?.success === false) {
      toast(res.message || 'Assignment failed', true)
    } else {
      toast(`✓ Order assigned to ${staffName || 'staff'}`)
      // Also patch the currently-selected detail panel if it's this order
      if (selected && String(ordId(selected)) === String(orderId)) {
        setSelected(p => ({ ...p, assigned_to: staffId, assigned_to_name: staffName }))
      }
    }
  }

  const resetDForm = ()=>setDForm({packQty:'',vehicle:'',driver:'',driverMobile:'',transport:'',lr:'',dispatchDate:'',expectedDelivery:'',expectedDays:'',branch:''})

  // Pack a (partial) quantity → backend creates invoice + dispatch for it.
  const handleDispatch = async ()=>{
    if(!dispatchForm)return
    const remaining = ordRemaining(dispatchForm)
    const packQty = Number(dForm.packQty)
    if(!packQty||packQty<=0){toast('Enter the quantity you are packing',true);return}
    if(packQty>remaining){toast(`You can pack at most ${remaining} ${dispatchForm.unit||''} (remaining)`,true);return}
    if(!dForm.vehicle||!dForm.driver||!dForm.driverMobile||!dForm.transport||!dForm.dispatchDate){
      toast('Fill Vehicle, Driver, Driver Mobile, Transport and Dispatch Date',true);return
    }
    const orderId = dispatchForm._id||dispatchForm.id
    let exp = dForm.expectedDelivery
    if(dForm.expectedDays&&dForm.dispatchDate&&!exp){
      const d=new Date(dForm.dispatchDate); d.setDate(d.getDate()+parseInt(dForm.expectedDays))
      exp=d.toISOString().split('T')[0]
    }
    setBusyId(orderId)
    const res = await packOrder?.(orderId,{
      pack_qty:packQty,
      branch_name:dForm.branch||dispatchForm.branch_name||'',
      vehicle_number:dForm.vehicle, driver_name:dForm.driver,
      driver_mobile:dForm.driverMobile, transport_name:dForm.transport,
      lr_number:dForm.lr, dispatch_date:dForm.dispatchDate,
      expected_delivery_days:dForm.expectedDays?parseInt(dForm.expectedDays):null,
      expected_delivery:exp||null,
    })
    setBusyId(null)
    if(res?.success===false){toast(res.message||'Packing failed',true);return}
    const inv = res?.data?.invoice?.invoice_no || ''
    const stillLeft = Math.max(0, remaining-packQty)
    toast(stillLeft>0
      ? `✓ Packed ${packQty} ${dispatchForm.unit||''}. Invoice ${inv}. ${stillLeft} remaining — pack again anytime.`
      : `✓ Order fully packed & dispatched! Invoice ${inv}.`)
    setDispatchForm(null)
    resetDForm()
  }

  const getStock = pid=>{
    if(!pid)return 0
    const inv=inventory.find(i=>(i.product_id?._id||i.product_id)===pid)
    return inv?(inv.current_stock??0):0
  }

  // Filter — map display status to backend statuses
  const filtered = orders.filter(o=>{
    const disp = toDisplay(o.status)
    const matchStatus = statusFilter==='All' || disp===statusFilter || o.status===statusFilter
    const matchBranch = branchFilter==='All' || (o.branch_name||'')=== branchFilter
    const q = search.toLowerCase()
    const matchSearch = !search||
      ordCustomer(o).toLowerCase().includes(q)||
      ordCode(o).toLowerCase().includes(q)||
      ordProduct(o).toLowerCase().includes(q)||
      ordEnqCode(o).toLowerCase().includes(q)||
      (o.branch_name||'').toLowerCase().includes(q)
    return matchStatus&&matchBranch&&matchSearch
  })

  // Simplified per-row actions:
  //   New            → Accept + Cancel
  //   Accepted/proc. → single "Packing" button (opens packing form)
  //   Ready          → "Packing" (opens packing form)
  //   Dispatched     → In Transit
  //   In Transit     → Delivered
  const PACK_READY = ['Pending Approval','Approved','Picking Started','Picking Completed',
    'Sorting Started','Sorting Completed','Packing Started','Packing Completed',
    'Invoice Generated','Ready for Dispatch','Partially Dispatched']
  const openPacking = (o)=>{ setDispatchForm(o); resetDForm(); setDForm(f=>({...f,branch:o.branch_name||'',packQty:String(ordRemaining(o))})) }
  const ActionBtns = ({o})=>{
    const oid=ordId(o); const busy=busyId===oid
    return (
      <div className="table-actions">
        <button className="btn btn-ghost btn-xs" title="View Details" onClick={()=>{setSelected(o);setShowHistory(false)}}>
          <Eye style={{width:13}}/>
        </button>
        {/* Edit/Delete only for manually created orders (no enquiry/buyer link) */}
        {!o.enquiry_id && !o.buyer_company_id && (
          <button className="btn btn-ghost btn-xs" title="Edit"
            onClick={()=>{
              setEditOrder(o)
              setForm({
                customer_name:o.customer_name||'',customer_mobile:o.customer_mobile||'',
                delivery_address:o.delivery_address||'',
                product_id:o.product_id||'',product_name:o.product_name||'',product_code:o.product_code||'',
                product_size:o.size||'',product_finish:o.finish||'',product_color:o.color||'',
                product_category:o.category_name||'',product_brand:o.brand_name||'',
                qty:String(o.qty||''),rate:String(o.rate||''),gst_percent:String(o.gst_percent||'18'),
                branch_id:o.branch_id||'',notes:o.notes||'',
              })
              setFormErrors({})
              setShowCreate(true)
            }}>
            <Edit2 style={{width:13}}/>
          </button>
        )}
        {!o.enquiry_id && !o.buyer_company_id && (
          <button className="btn btn-ghost btn-xs" title="Delete" style={{color:'var(--danger)'}}
            onClick={()=>setDeleteConfirm({id:oid,code:ordCode(o)})}>
            <Trash2 style={{width:13}}/>
          </button>
        )}

        {/* New → Accept + Cancel */}
        {o.status==='New'&&(
          <>
            <button className="btn btn-primary btn-xs" disabled={busy} onClick={()=>doStatusUpdate(oid,'Pending Approval','Accepted')}>
              <CheckCircle style={{width:12}}/>{busy?'…':'Accept'}
            </button>
            <button className="btn btn-danger btn-xs" disabled={busy} onClick={()=>doStatusUpdate(oid,'Cancelled','')}>
              <XCircle style={{width:11}}/>Cancel
            </button>
          </>
        )}

        {/* Pack (remaining) — show whenever there's still quantity left to pack,
            even after earlier batches were dispatched/delivered. */}
        {o.status!=='New'&&o.status!=='Cancelled'&&ordRemaining(o)>0&&(
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={()=>openPacking(o)}>
            <Package style={{width:12}}/>{ordDispatched(o)>0?`Pack (${ordRemaining(o)} left)`:'Packing'}
          </button>
        )}

        {/* Dispatched → In Transit (for the current shipment) */}
        {o.status==='Dispatched'&&(
          <button className="btn btn-primary btn-xs" disabled={busy} onClick={()=>{
            if(o.dispatch_id)markInTransit?.(o.dispatch_id?._id||o.dispatch_id)
            else doStatusUpdate(oid,'In Transit','In transit')
          }}><Send style={{width:12}}/>{busy?'…':'In Transit'}</button>
        )}

        {/* In Transit → Delivered (for the current shipment) */}
        {o.status==='In Transit'&&(
          <button className="btn btn-primary btn-xs" style={{background:'var(--success)'}} disabled={busy}
            onClick={()=>{
              if(o.dispatch_id)markDelivered?.(o.dispatch_id?._id||o.dispatch_id)
              else doStatusUpdate(oid,'Delivered','Delivered')
            }}><ShieldCheck style={{width:12}}/>{busy?'…':'Delivered'}</button>
        )}

        {/* Fully done only when nothing remains */}
        {o.status==='Delivered'&&ordRemaining(o)<=0&&<span className="badge badge-green" style={{fontSize:10}}>✓ Done</span>}
        {o.status==='Cancelled'&&<span className="badge badge-red" style={{fontSize:10}}>Cancelled</span>}
      </div>
    )
  }

  const StatusHistory = ({history=[]})=>{
    if(!history.length)return <div style={{color:'var(--text-muted)',fontSize:12,padding:'8px 0'}}>No history yet.</div>
    return (
      <div style={{display:'flex',flexDirection:'column',gap:0}}>
        {[...history].reverse().map((h,i)=>(
          <div key={i} style={{display:'flex',gap:10,paddingBottom:12,position:'relative'}}>
            {i<history.length-1&&<div style={{position:'absolute',left:7,top:18,bottom:0,width:2,background:'var(--border)'}}/>}
            <div style={{width:16,height:16,borderRadius:'50%',flexShrink:0,marginTop:2,
              background:h.status==='Delivered'?'var(--success)':h.status==='Cancelled'?'var(--danger)':'var(--primary)'}}/>
            <div>
              <div style={{fontWeight:700,fontSize:12}}>{h.status}</div>
              <div style={{fontSize:11,color:'var(--text-muted)',marginTop:1}}>
                {h.updated_by_name&&<span>{h.updated_by_name} · </span>}
                {h.timestamp&&<span>{new Date(h.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
              </div>
              {h.remarks&&<div style={{fontSize:11,color:'var(--text-muted)',fontStyle:'italic',marginTop:1}}>{h.remarks}</div>}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="breadcrumb"><span>Marketplace</span><span className="breadcrumb-sep">›</span><span className="breadcrumb-active">Order Management</span></div>

      {successMsg&&<div className="alert alert-success" style={{marginBottom:14,display:'flex',alignItems:'center',gap:10}}><CheckCircle style={{color:'var(--success)',width:18,flexShrink:0}}/><span style={{fontWeight:600}}>{successMsg}</span></div>}
      {errorMsg&&<div className="alert alert-danger" style={{marginBottom:14,display:'flex',alignItems:'center',gap:10}}><AlertCircle style={{color:'var(--danger)',width:18,flexShrink:0}}/><span style={{fontWeight:600}}>{errorMsg}</span></div>}

      {/* ── Status stat cards — DISPLAY statuses only ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))',gap:10,marginBottom:18}}>
        {STAT_CARDS.map(({s,bg,iconBg,ic,tc,bc,Icon})=>{
          const count = orders.filter(o=>toDisplay(o.status)===s).length
          const active = statusFilter===s
          return (
            <div key={s} onClick={()=>setStatusFilter(active?'All':s)}
              style={{background:active?iconBg:bg,border:`1.5px solid ${active?ic:bc}`,borderRadius:10,
                padding:'10px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,
                boxShadow:active?`0 0 0 3px ${bc}`:'var(--shadow)',transition:'all 0.15s'}}>
              <div style={{width:32,height:32,borderRadius:8,flexShrink:0,background:iconBg,border:`1px solid ${bc}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon style={{width:14,height:14,color:ic}}/>
              </div>
              <div>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.3px',color:tc,marginBottom:1,lineHeight:1.2}}>{s}</div>
                <div style={{fontSize:18,fontWeight:800,color:tc,lineHeight:1}}>{count}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Orders Table ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Orders ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar">
              <Search/>
              <input placeholder="Search order, customer, product…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {branchNames.length>0&&(
              <select className="form-control" style={{width:150}} value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}>
                <option value="All">All Branches</option>
                {branchNames.map(b=><option key={b}>{b}</option>)}
              </select>
            )}
            <select className="form-control" style={{width:150}} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              {DISPLAY_STATUSES.map(s=><option key={s}>{s}</option>)}
            </select>
            <button className="btn btn-primary" onClick={()=>{setEditOrder(null);setForm(EMPTY_FORM);setFormErrors({});setShowCreate(true)}}>
              <Plus style={{width:14}}/>Create Order
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order No.</th><th>Enq. Ref</th><th>Customer</th><th>Product</th>
                <th>Ordered</th><th>Dispatched</th><th>Remaining</th><th>Total ₹</th><th>Assigned To</th><th>Invoice No.</th><th>Vehicle / Driver</th><th>Date</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o=>{
                // Get dispatch info for this order from dispatches list
                const dispatch = dispatches?.find(d=>{
                  const dOrdId = d.order_id?._id || d.order_id || ''
                  return String(dOrdId) === String(ordId(o))
                })
                return (
                <tr key={ordId(o)}>
                  <td style={{color:'var(--primary)',fontWeight:700,whiteSpace:'nowrap'}}>{ordCode(o)}</td>
                  <td style={{fontSize:11}}>
                    {ordEnqCode(o)
                      ? (
                        <button
                          className="btn btn-ghost btn-xs"
                          style={{color:'var(--primary)',fontWeight:700,fontSize:11,padding:'2px 6px',fontFamily:'monospace'}}
                          onClick={()=>{
                            const enq = enquiries.find(e=>(e.enq_code===ordEnqCode(o))||(e._id||e.id)===o.enquiry_id)
                            if(enq) setSelectedEnquiry(enq)
                          }}
                          title="Click to view enquiry details">
                          🔗 {ordEnqCode(o)}
                        </button>
                      )
                      : <span style={{color:'var(--text-muted)'}}>—</span>}
                  </td>
                  <td>
                    <div className="user-name">{ordCustomer(o)}</div>
                    <div className="user-role">{o.customer_mobile||o.delivery_address||''}</div>
                  </td>
                  <td style={{fontSize:12,maxWidth:160}}>
                    {ordProduct(o)}
                    {o.product_code&&<><br/><span style={{fontSize:10,color:'var(--text-muted)'}}>{o.product_code}</span></>}
                  </td>
                  <td style={{fontWeight:600,whiteSpace:'nowrap'}}>{ordQtyNum(o)} {o.unit||'Pcs'}</td>
                  <td style={{fontWeight:600,whiteSpace:'nowrap',color:ordDispatched(o)>0?'var(--primary)':'var(--text-muted)'}}>{ordDispatched(o)} {ordDispatched(o)>0?(o.unit||'Pcs'):''}</td>
                  <td style={{fontWeight:700,whiteSpace:'nowrap',color:ordRemaining(o)>0?'var(--warning,#D97706)':'var(--success)'}}>{ordRemaining(o)===0?'✓ 0':ordRemaining(o)} {ordRemaining(o)>0?(o.unit||'Pcs'):''}</td>
                  <td style={{fontWeight:700,color:'var(--success)',whiteSpace:'nowrap'}}>₹{ordTotal(o).toLocaleString()}</td>
                  <td style={{fontSize:12}}>
                    {/* Staff Assignment Dropdown */}
                    <select
                      className="form-control"
                      style={{fontSize:11,padding:'4px 8px',minWidth:160,cursor:busyId===ordId(o)?'wait':'pointer'}}
                      value={o.assigned_to || ''}
                      onChange={(e) => handleAssignStaff(ordId(o), e.target.value)}
                      disabled={busyId===ordId(o)}
                    >
                      <option value="">— Assign Staff —</option>
                      {employees
                        .filter(emp => emp.user_id && emp.is_active !== false)
                        .map(emp => (
                          <option key={emp._id || emp.id} value={emp.user_id}>
                            {emp.name} {emp.designation ? `(${emp.designation})` : ''}
                          </option>
                        ))}
                    </select>
                    {o.assigned_to_name && (
                      <div style={{fontSize:10,color:'var(--text-muted)',marginTop:2}}>
                        ✓ {o.assigned_to_name}
                      </div>
                    )}
                  </td>
                  <td style={{fontSize:11}}>
                    {o.invoice_number
                      ? <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--primary)',fontSize:12}}>{o.invoice_number}</span>
                      : <span style={{color:'var(--text-muted)'}}>—</span>}
                  </td>
                  <td style={{fontSize:11}}>
                    {dispatch ? (
                      <>
                        <div style={{fontFamily:'monospace',fontWeight:700,color:'var(--primary)',fontSize:12}}>
                          🚛 {dispatch.vehicle_number||'—'}
                        </div>
                        <div style={{color:'var(--text-muted)',fontSize:11}}>
                          {dispatch.driver_name||'—'}
                          {dispatch.driver_mobile&&<> · {dispatch.driver_mobile}</>}
                        </div>
                        {dispatch.lr_number&&<div style={{fontFamily:'monospace',fontSize:10,color:'var(--text-muted)'}}>LR: {dispatch.lr_number}</div>}
                      </>
                    ) : (
                      <span style={{color:'var(--text-muted)',fontSize:11}}>—</span>
                    )}
                  </td>
                  <td style={{fontSize:11,whiteSpace:'nowrap'}}>{ordDate(o)}</td>
                  <td>
                    {/* Status badge — read only, no buttons here */}
                    <span className={`badge ${o.status==='Partially Dispatched'?'badge-orange':STATUS_COLOR[toDisplay(o.status)]||'badge-gray'}`} style={{fontSize:11,whiteSpace:'nowrap'}}>
                      {o.status==='Partially Dispatched'?'Partial':toDisplay(o.status)}
                    </span>
                  </td>
                  <td><ActionBtns o={o}/></td>
                </tr>
                )
              })}
              {filtered.length===0&&<tr><td colSpan={14} style={{textAlign:'center',padding:32,color:'var(--text-muted)'}}>No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ CREATE / EDIT ORDER MODAL ══ */}
      {showCreate&&(
        <div className="modal-overlay" onClick={()=>setShowCreate(false)}>
          <div className="modal" style={{maxWidth:620}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editOrder?`Edit Order — ${ordCode(editOrder)}`:'Create New Order'}</span>
              <button className="btn-ghost" onClick={()=>setShowCreate(false)}><X style={{width:16}}/></button>
            </div>
            <div className="modal-body">
              {/* Customer */}
              <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10}}>Customer Details</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  {customers.length>0?(
                    <select className={`form-control${formErrors.customer_name?' error':''}`} value={form.customer_name} onChange={e=>handleCustomerSelect(e.target.value)}>
                      <option value="">— Select Customer —</option>
                      {customers.map(c=><option key={c._id||c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  ):(
                    <input className={`form-control${formErrors.customer_name?' error':''}`} placeholder="Customer name" value={form.customer_name} onChange={e=>setForm(f=>({...f,customer_name:e.target.value}))}/>
                  )}
                  {formErrors.customer_name&&<div className="form-error">{formErrors.customer_name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile *</label>
                  <input className={`form-control${formErrors.customer_mobile?' error':''}`} placeholder="Mobile" value={form.customer_mobile} onChange={e=>setForm(f=>({...f,customer_mobile:e.target.value}))}/>
                  {formErrors.customer_mobile&&<div className="form-error">{formErrors.customer_mobile}</div>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Address</label>
                <input className="form-control" placeholder="City, State" value={form.delivery_address} onChange={e=>setForm(f=>({...f,delivery_address:e.target.value}))}/>
              </div>

              <div className="divider"/>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10}}>Product Details</div>

              <div className="form-group">
                <label className="form-label">Product *</label>
                {products.length>0?(
                  <select className={`form-control${formErrors.product_name?' error':''}`} value={form.product_id} onChange={e=>handleProductSelect(e.target.value)}>
                    <option value="">— Select Product —</option>
                    {products.map(p=><option key={p._id||p.id} value={p._id||p.id}>{p.code?`[${p.code}] `:''}{p.name}</option>)}
                  </select>
                ):(
                  <input className={`form-control${formErrors.product_name?' error':''}`} placeholder="Product name" value={form.product_name} onChange={e=>setForm(f=>({...f,product_name:e.target.value}))}/>
                )}
                {formErrors.product_name&&<div className="form-error">{formErrors.product_name}</div>}
              </div>

              {/* Auto-filled product specs */}
              {(form.product_size||form.product_finish||form.product_color||form.product_category||form.product_brand)&&(
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12,padding:'10px 12px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--border)'}}>
                  {[
                    form.product_code     &&{label:'Code',val:form.product_code},
                    form.product_category &&{label:'Category',val:form.product_category},
                    form.product_brand    &&{label:'Brand',val:form.product_brand},
                    form.product_size     &&{label:'Size',val:form.product_size},
                    form.product_finish   &&{label:'Finish',val:form.product_finish},
                    form.product_color    &&{label:'Color',val:form.product_color},
                  ].filter(Boolean).map(({label,val})=>(
                    <div key={label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,padding:'2px 8px',fontSize:11,display:'flex',gap:4}}>
                      <span style={{color:'var(--text-muted)'}}>{label}:</span>
                      <span style={{fontWeight:600}}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input className={`form-control${formErrors.qty?' error':''}`} type="number" placeholder="0" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))}/>
                  {formErrors.qty&&<div className="form-error">{formErrors.qty}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Rate (₹) *</label>
                  <input className={`form-control${formErrors.rate?' error':''}`} type="number" placeholder="0.00" value={form.rate} onChange={e=>setForm(f=>({...f,rate:e.target.value}))}/>
                  {formErrors.rate&&<div className="form-error">{formErrors.rate}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">GST %</label>
                  <select className="form-control" value={form.gst_percent} onChange={e=>setForm(f=>({...f,gst_percent:e.target.value}))}>
                    {['0','5','12','18','28'].map(g=><option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {/* Live totals */}
              <div style={{background:'var(--bg)',borderRadius:8,padding:'12px 16px',marginBottom:12,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[{l:'Amount',v:`₹${coAmount.toLocaleString()}`},{l:`GST (${form.gst_percent}%)`,v:`₹${coGst.toLocaleString()}`},{l:'Grand Total',v:`₹${coTotal.toLocaleString()}`,bold:true,color:'var(--success)'}].map(({l,v,bold,color})=>(
                  <div key={l}><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:3}}>{l}</div><div style={{fontWeight:bold?800:600,fontSize:bold?16:13,color:color||'var(--text)'}}>{v}</div></div>
                ))}
              </div>

              {branches.length>0&&(
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select className="form-control" value={form.branch_id} onChange={e=>setForm(f=>({...f,branch_id:e.target.value}))}>
                    <option value="">— Select Branch —</option>
                    {branches.map(b=><option key={b._id||b.id} value={b._id||b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} placeholder="Optional notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                <Plus style={{width:14}}/>{saving?'Saving…':(editOrder?'Update Order':'Create Order')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW / DETAIL MODAL ══ */}
      {selected&&(
        <div className="modal-overlay" onClick={()=>setSelected(null)}>
          <div className="modal" style={{maxWidth:640}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <span className="modal-title">{ordCode(selected)}</span>
                {/* Inline status update in modal header */}
                {['Delivered','Cancelled'].includes(selected.status) ? (
                  <span className={`badge ${STATUS_COLOR[toDisplay(selected.status)]||'badge-gray'}`}>
                    {toDisplay(selected.status)}
                  </span>
                ) : (
                  <select
                    className="form-control"
                    style={{fontSize:12,padding:'3px 8px',width:'auto',fontWeight:700,cursor:'pointer',color:'var(--primary)',border:'2px solid var(--primary)'}}
                    value={selected.status}
                    disabled={!!busyId}
                    onChange={async(e)=>{
                      const newSt=e.target.value
                      if(newSt===selected.status)return
                      await doStatusUpdate(ordId(selected),newSt,'')
                    }}
                  >
                    <option value={selected.status}>{STATUS_ACTION_LABEL[selected.status] || toDisplay(selected.status)}</option>
                    {(NEXT_STATUS[selected.status]||[]).map(ns=>(
                      <option key={ns} value={ns}>{STATUS_ACTION_LABEL[ns] || toDisplay(ns)}</option>
                    ))}
                  </select>
                )}
                <span style={{fontSize:10,color:'var(--text-muted)'}}>{selected.status!==toDisplay(selected.status)?`[${toDisplay(selected.status)}]`:''}</span>
                {selected.invoice_number&&<span style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:'var(--primary)',background:'var(--bg)',padding:'2px 8px',borderRadius:6}}>{selected.invoice_number}</span>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className={`btn btn-xs ${showHistory?'btn-primary':'btn-ghost'}`} onClick={()=>setShowHistory(h=>!h)}>
                  <History style={{width:13}}/>History
                </button>
                <button className="btn-ghost" onClick={()=>setSelected(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              {/* Pipeline bar */}
              <div style={{overflowX:'auto',marginBottom:14,paddingBottom:4}}>
                <div style={{display:'flex',alignItems:'center',gap:2,minWidth:'max-content'}}>
                  {DISPLAY_STATUSES.map((s,i,arr)=>{
                    const cur=DISPLAY_STATUSES.indexOf(toDisplay(selected.status))
                    const isDone=i<cur; const isNow=s===toDisplay(selected.status)
                    return <span key={s} style={{display:'flex',alignItems:'center',gap:2}}>
                      <span style={{padding:'3px 8px',borderRadius:20,fontSize:10,fontWeight:600,whiteSpace:'nowrap',
                        background:isNow?'var(--primary)':isDone?'#d1fae5':'var(--bg)',
                        color:isNow?'#fff':isDone?'var(--success)':'var(--text-muted)',
                        border:isNow?'1.5px solid var(--primary)':'1.5px solid transparent'}}>{s}</span>
                      {i<arr.length-1&&<ChevronRight style={{width:10,color:'var(--border)',flexShrink:0}}/>}
                    </span>
                  })}
                </div>
              </div>

              {showHistory?<StatusHistory history={selected.status_history||[]}/>:(
                <>
                  {/* Customer */}
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:8}}>Customer</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                      <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Name</div><div style={{fontWeight:700}}>{selected.customer_name||'—'}</div></div>
                      <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Mobile</div><div style={{fontWeight:600}}>{selected.customer_mobile||'—'}</div></div>
                      <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Delivery</div><div style={{fontSize:12}}>{selected.delivery_address||selected.location||'—'}</div></div>
                    </div>
                    {(selected.created_by_name||selected.created_by_company||selected.created_by_mobile||selected.created_by_email)&&(
                      <div style={{marginTop:10,paddingTop:10,borderTop:'1px dashed var(--border)'}}>
                        <div style={{fontWeight:700,fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Created By{selected.created_by_type?` (${selected.created_by_type})`:''}</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                          <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Name</div><div style={{fontWeight:700}}>{selected.created_by_person||selected.created_by_name||'—'}</div></div>
                          <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Company</div><div style={{fontWeight:600}}>{selected.created_by_company||'—'}</div></div>
                          <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Phone</div><div style={{fontWeight:600}}>{selected.created_by_mobile||'—'}</div></div>
                          {selected.created_by_email&&<div style={{gridColumn:'1 / -1'}}><div style={{fontSize:10,color:'var(--text-muted)'}}>Email</div><div style={{fontWeight:600}}>{selected.created_by_email}</div></div>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product full details */}
                  <div style={{background:'var(--bg)',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
                    <div style={{fontWeight:700,fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:8}}>Product Details</div>
                    <div style={{fontWeight:800,fontSize:14,marginBottom:6}}>{selected.product_name||'—'}</div>
                    {selected.product_code&&<div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'monospace',marginBottom:8}}>{selected.product_code}</div>}
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                      {[
                        selected.category_name &&{l:'Category',v:selected.category_name},
                        selected.brand_name    &&{l:'Brand',v:selected.brand_name},
                        selected.size          &&{l:'Size',v:selected.size},
                        selected.finish        &&{l:'Finish',v:selected.finish},
                        selected.color         &&{l:'Color',v:selected.color},
                        selected.material      &&{l:'Material',v:selected.material},
                        selected.thickness     &&{l:'Thickness',v:selected.thickness},
                        selected.tile_type     &&{l:'Type',v:selected.tile_type},
                        selected.grade         &&{l:'Grade',v:selected.grade},
                        selected.gst_percent   &&{l:'GST',v:`${selected.gst_percent}%`},
                      ].filter(Boolean).map(({l,v})=>(
                        <div key={l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:6,padding:'2px 8px',fontSize:11,display:'flex',gap:4}}>
                          <span style={{color:'var(--text-muted)'}}>{l}:</span><span style={{fontWeight:600}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                      <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Quantity</div><div style={{fontWeight:700}}>{selected.qty} {selected.unit||'Pcs'}</div></div>
                      <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Rate</div><div style={{fontWeight:700}}>₹{(selected.rate||0).toLocaleString()}</div></div>
                      <div><div style={{fontSize:10,color:'var(--text-muted)'}}>GST Amount</div><div style={{fontWeight:600,color:'var(--text-muted)'}}>₹{ordGst(selected).toLocaleString()}</div></div>
                    </div>
                  </div>

                  {/* Financials */}
                  <div style={{background:'linear-gradient(135deg,var(--bg),var(--surface))',borderRadius:8,padding:'12px 14px',marginBottom:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Amount</div><div style={{fontWeight:700}}>₹{ordAmount(selected).toLocaleString()}</div></div>
                    <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Grand Total</div><div style={{fontWeight:800,fontSize:16,color:'var(--success)'}}>₹{ordTotal(selected).toLocaleString()}</div></div>
                    <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Purchase Cost</div><div style={{fontWeight:600,color:'var(--danger)'}}>₹{(selected.purchase_cost||0).toLocaleString()}</div></div>
                    <div><div style={{fontSize:10,color:'var(--text-muted)'}}>Gross Profit</div><div style={{fontWeight:700,color:'var(--primary)'}}>₹{(ordAmount(selected)-(selected.purchase_cost||0)).toLocaleString()}</div></div>
                  </div>

                  {/* Invoice + Dispatch info */}
                  {selected.invoice_number&&(
                    <div style={{marginBottom:10,padding:'8px 12px',background:'#eff6ff',borderRadius:8,border:'1px solid #bfdbfe',display:'flex',justifyContent:'space-between'}}>
                      <div><div style={{fontSize:10,fontWeight:700,color:'#1d4ed8',textTransform:'uppercase'}}>Invoice</div><div style={{fontFamily:'monospace',fontWeight:700,fontSize:14}}>{selected.invoice_number}</div></div>
                      {selected.invoice_date&&<div style={{fontSize:12,color:'var(--text-muted)'}}>{fmtDate(selected.invoice_date)}</div>}
                    </div>
                  )}
                  {/* Fulfillment summary: ordered / dispatched / remaining */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
                    {[
                      {l:'Ordered',   v:ordQtyNum(selected),    c:'var(--text)'},
                      {l:'Dispatched',v:ordDispatched(selected),c:'var(--primary)'},
                      {l:'Remaining', v:ordRemaining(selected), c:ordRemaining(selected)>0?'#D97706':'var(--success)'},
                    ].map(({l,v,c})=>(
                      <div key={l} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                        <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)'}}>{l}</div>
                        <div style={{fontSize:15,fontWeight:800,color:c}}>{v} <span style={{fontSize:10,color:'var(--text-muted)'}}>{selected.unit||'Pcs'}</span></div>
                      </div>
                    ))}
                  </div>

                  {/* Packing / dispatch batches */}
                  {Array.isArray(selected.packages)&&selected.packages.length>0&&(
                    <div style={{marginBottom:12}}>
                      <div style={{fontWeight:700,fontSize:11,color:'var(--text-muted)',textTransform:'uppercase',marginBottom:6}}>Packing Batches ({selected.packages.length})</div>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {selected.packages.map((p,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,padding:'8px 12px',background:'#f5f3ff',borderRadius:8,border:'1px solid #ddd6fe',fontSize:12,flexWrap:'wrap'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontWeight:800,color:'#6d28d9'}}>#{p.pack_no||i+1}</span>
                              <span style={{fontWeight:700}}>{p.qty} {selected.unit||'Pcs'}</span>
                            </div>
                            <div style={{display:'flex',gap:14,flexWrap:'wrap',color:'var(--text-muted)'}}>
                              {p.invoice_number&&<span>Inv: <strong style={{fontFamily:'monospace',color:'var(--text)'}}>{p.invoice_number}</strong></span>}
                              {p.dispatch_code&&<span>Dispatch: <strong style={{fontFamily:'monospace',color:'var(--text)'}}>{p.dispatch_code}</strong></span>}
                              {p.lr_number&&<span>LR: <strong style={{color:'var(--text)'}}>{p.lr_number}</strong></span>}
                              {p.vehicle_number&&<span>🚛 {p.vehicle_number}</span>}
                              <span>₹{(p.total||0).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stock */}
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:12}}>
                    <span style={{color:'var(--text-muted)'}}>Current Stock</span>
                    <span style={{fontWeight:700,color:'var(--primary)'}}>{getStock(selected.product_id)} {selected.unit||'Pcs'}</span>
                  </div>

                  {/* Next status actions */}
                  {(NEXT_STATUS[selected.status]||[]).length>0&&(
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.4px'}}>Move to Next Status</div>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {(NEXT_STATUS[selected.status]||[]).map(ns=>(
                          <button key={ns} className={`btn btn-sm ${ns==='Cancelled'?'btn-danger':'btn-primary'}`}
                            style={ns==='Delivered'?{background:'var(--success)'}:{}}
                            disabled={!!busyId}
                            onClick={()=>doStatusUpdate(ordId(selected),ns,'')}>
                            <ArrowRight style={{width:12}}/>{STATUS_ACTION_LABEL[ns]||toDisplay(ns)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setSelected(null)}>Close</button></div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {deleteConfirm&&(
        <div className="modal-overlay" onClick={()=>setDeleteConfirm(null)}>
          <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Delete Order</span>
              <button className="btn-ghost" onClick={()=>setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger" style={{marginBottom:0}}>
                <Trash2 style={{width:16,flexShrink:0}}/>
                <span>Delete order <strong>{deleteConfirm.code}</strong>? This cannot be undone.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={!!busyId} onClick={()=>handleDelete(deleteConfirm.id)}>
                {busyId?'Deleting…':'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DISPATCH FORM MODAL ══ */}
      {dispatchForm&&(
        <div className="modal-overlay" onClick={()=>setDispatchForm(null)}>
          <div className="modal" style={{maxWidth:580}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Pack Order — {ordCode(dispatchForm)}</span>
              <button className="btn-ghost" onClick={()=>setDispatchForm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{background:'var(--bg)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13}}>
                <strong>{ordCustomer(dispatchForm)}</strong> — {ordProduct(dispatchForm)}
                {dispatchForm.product_code&&<span style={{color:'var(--text-muted)',marginLeft:6,fontSize:11}}>({dispatchForm.product_code})</span>}
              </div>

              {/* Quantity summary strip */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
                {[
                  {l:'Ordered',   v:ordQtyNum(dispatchForm),    c:'var(--text)'},
                  {l:'Dispatched',v:ordDispatched(dispatchForm),c:'var(--primary)'},
                  {l:'Remaining', v:ordRemaining(dispatchForm), c:'#D97706'},
                  {l:'Packing now',v:Number(dForm.packQty)||0,  c:'var(--success)'},
                ].map(({l,v,c})=>(
                  <div key={l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',color:'var(--text-muted)',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
                    <div style={{fontSize:9,color:'var(--text-muted)'}}>{dispatchForm.unit||'Pcs'}</div>
                  </div>
                ))}
              </div>

              {/* Pack quantity input */}
              <div className="form-group">
                <label className="form-label">Quantity to Pack Now * <span style={{color:'var(--text-muted)',fontWeight:400}}>(max {ordRemaining(dispatchForm)} {dispatchForm.unit||'Pcs'})</span></label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input className="form-control" type="number" min="1" max={ordRemaining(dispatchForm)}
                    placeholder={`e.g. ${ordRemaining(dispatchForm)}`} value={dForm.packQty}
                    onChange={e=>setDForm(f=>({...f,packQty:e.target.value}))} style={{maxWidth:180}}/>
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={()=>setDForm(f=>({...f,packQty:String(ordRemaining(dispatchForm))}))}>
                    Pack all remaining
                  </button>
                </div>
                {(() => {
                  const pq=Number(dForm.packQty)||0
                  const amt=pq*(Number(dispatchForm.rate)||0)
                  const gst=Math.round(amt*(Number(dispatchForm.gst_percent)||0)/100)
                  return pq>0?(
                    <div style={{marginTop:8,fontSize:12,color:'var(--text-muted)'}}>
                      Invoice for this pack: <strong style={{color:'var(--text)'}}>₹{(amt+gst).toLocaleString()}</strong>
                      <span style={{marginLeft:8}}>(₹{amt.toLocaleString()} + GST ₹{gst.toLocaleString()})</span>
                    </div>
                  ):null
                })()}
              </div>

              <div className="divider" style={{margin:'14px 0'}}/>
              <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:10}}>Dispatch Details</div>

              {branchNames.length>0&&(
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <select className="form-control" value={dForm.branch} onChange={e=>setDForm(f=>({...f,branch:e.target.value}))}>
                    <option value="">Select Branch</option>
                    {branchNames.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vehicle Number *</label>
                  <input className="form-control" placeholder="e.g. KA01AB1234" value={dForm.vehicle} onChange={e=>setDForm(f=>({...f,vehicle:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Transport Company *</label>
                  <input className="form-control" placeholder="e.g. VRL Logistics" value={dForm.transport} onChange={e=>setDForm(f=>({...f,transport:e.target.value}))}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Driver Name *</label>
                  <input className="form-control" placeholder="Driver name" value={dForm.driver} onChange={e=>setDForm(f=>({...f,driver:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Driver Mobile *</label>
                  <input className="form-control" placeholder="Mobile" value={dForm.driverMobile} onChange={e=>setDForm(f=>({...f,driverMobile:e.target.value}))}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">LR Number</label>
                  <input className="form-control" placeholder="Lorry Receipt No." value={dForm.lr} onChange={e=>setDForm(f=>({...f,lr:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Dispatch Date *</label>
                  <input className="form-control" type="date" value={dForm.dispatchDate} onChange={e=>setDForm(f=>({...f,dispatchDate:e.target.value}))}/>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Delivery in Days</label>
                  <select className="form-control" value={dForm.expectedDays}
                    onChange={e=>{
                      const days=e.target.value
                      let auto=''
                      if(days&&dForm.dispatchDate){const d=new Date(dForm.dispatchDate);d.setDate(d.getDate()+parseInt(days));auto=d.toISOString().split('T')[0]}
                      setDForm(f=>({...f,expectedDays:days,expectedDelivery:auto}))
                    }}>
                    <option value="">Select days</option>
                    {[1,2,3,4,5,6,7,10,14,15,20,21,25,30].map(d=><option key={d} value={d}>{d} {d===1?'day':'days'}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Delivery Date</label>
                  <input className="form-control" type="date" value={dForm.expectedDelivery} onChange={e=>setDForm(f=>({...f,expectedDelivery:e.target.value,expectedDays:''}))}/>
                </div>
              </div>
              <div className="alert alert-info" style={{fontSize:12}}>ℹ️ This creates an invoice for the packed quantity and dispatches it. Any remaining quantity stays open so you can pack it later.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setDispatchForm(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={busyId===(dispatchForm._id||dispatchForm.id)} onClick={handleDispatch}>
                <FileText style={{width:14}}/>{busyId===(dispatchForm._id||dispatchForm.id)?'Processing…':'Create Invoice & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ENQUIRY DETAIL POPUP ══ */}
      {selectedEnquiry&&(
        <div className="modal-overlay" onClick={()=>setSelectedEnquiry(null)}>
          <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Enquiry — {selectedEnquiry.enq_code||selectedEnquiry._id}</span>
              <button className="btn-ghost" onClick={()=>setSelectedEnquiry(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                <div><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Retailer</div><div style={{fontWeight:700}}>{selectedEnquiry.retailer_name||'—'}</div></div>
                <div><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Mobile</div><div style={{fontWeight:600}}>{selectedEnquiry.retailer_mobile||'—'}</div></div>
                <div><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Product</div><div style={{fontWeight:600}}>{selectedEnquiry.product_name||'—'}</div></div>
                <div><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Quantity</div><div style={{fontWeight:700}}>{selectedEnquiry.qty} {selectedEnquiry.unit||'Sq Ft'}</div></div>
                <div><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Offered Price</div><div style={{fontWeight:700,color:'var(--success)'}}>₹{(selectedEnquiry.offered_price||0).toLocaleString()}</div></div>
                <div><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Location</div><div style={{fontWeight:600}}>{selectedEnquiry.location||'—'}</div></div>
                <div><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Status</div>
                  <span className={`badge ${selectedEnquiry.status==='Confirmed'?'badge-green':selectedEnquiry.status==='Cancelled'?'badge-red':'badge-blue'}`}>{selectedEnquiry.status}</span>
                </div>
                <div><div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Date</div>
                  <div style={{fontSize:12}}>{selectedEnquiry.created_at?new Date(selectedEnquiry.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}</div>
                </div>
              </div>
              {selectedEnquiry.remarks&&(
                <div style={{padding:'8px 12px',background:'var(--bg)',borderRadius:8,fontSize:12,color:'var(--text-muted)',borderLeft:'3px solid var(--primary)'}}>
                  <strong>Remarks:</strong> {selectedEnquiry.remarks}
                </div>
              )}
              {selectedEnquiry.distributor_reply&&(
                <div style={{marginTop:8,padding:'8px 12px',background:'#f0fdf4',borderRadius:8,fontSize:12,color:'#065f46',borderLeft:'3px solid #10b981'}}>
                  <strong>Reply:</strong> {selectedEnquiry.distributor_reply}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setSelectedEnquiry(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
