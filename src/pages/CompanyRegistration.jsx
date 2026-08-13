import { useState, useEffect, useCallback } from 'react'
import {
  Building2, FileText, Upload, CheckCircle, Clock, XCircle,
  Phone, Mail, RefreshCw, Save, X, Eye, Crown, Edit2,
  Trash2, Download, Pencil
} from 'lucide-react'
import { companyApi } from '../api/companyApi'

// ── Subscription plans — same as SubscriptionSystem ──────────
const SUBSCRIPTION_PLANS = [
  { key: 'Free',     name: 'Free',     price: 0,    badge: 'badge-gray',   description: 'Up to 10 Enquiries / month · 1 User' },
  { key: 'Silver',   name: 'Silver',   price: 1499, badge: 'badge-cyan',   description: 'Up to 100 Enquiries / month · 5 Users' },
  { key: 'Gold',     name: 'Gold',     price: 2999, badge: 'badge-yellow', description: 'Up to 500 Enquiries / month · 15 Users' },
  { key: 'Platinum', name: 'Platinum', price: 5999, badge: 'badge-purple', description: 'Unlimited Enquiries · Unlimited Users + AI' },
]

const PLAN_COLORS = {
  Free: 'badge-gray', Silver: 'badge-cyan', Gold: 'badge-yellow', Platinum: 'badge-purple',
}
const statusMeta = {
  Approved: { color: 'badge-green',  icon: <CheckCircle style={{ width: 13 }} /> },
  Pending:  { color: 'badge-yellow', icon: <Clock       style={{ width: 13 }} /> },
  Rejected: { color: 'badge-red',    icon: <XCircle     style={{ width: 13 }} /> },
}

const INIT_COMPANIES = [
  {
    id: 'COM-001', name: 'Tiles World Pvt Ltd', owner: 'Priya Sharma',
    bizType: 'Wholesaler',
    mobile: '9812345678', email: 'priya@tilesworld.com',
    gst: '27AABCT3518Q1ZY', pan: 'AABCT3518Q',
    city: 'Mumbai', state: 'Maharashtra', pin: '400001',
    plan: 'Gold', status: 'Approved', registered: '15 Feb 2026',
    reviewedBy: 'Super Admin',
    docs: { gst: true, pan: true, address: true, biz: false },
  },
  {
    id: 'COM-002', name: 'Global Tiles Co.', owner: 'Suresh Mehta',
    bizType: 'Distributor',
    mobile: '9300066778', email: 'global@wholesale.com',
    gst: '24AAACG3429B1ZN', pan: 'AAACG3429B',
    city: 'Ahmedabad', state: 'Gujarat', pin: '380001',
    plan: 'Silver', status: 'Pending', registered: '01 Aug 2026',
    reviewedBy: '—',
    docs: { gst: true, pan: false, address: true, biz: false },
  },
  {
    id: 'COM-003', name: 'Rajputana Ceramics', owner: 'Vikram Singh',
    bizType: 'Manufacturer',
    mobile: '9955001122', email: 'vikram@rajputana.com',
    gst: '08AAACR5001B1ZY', pan: 'AAACR5001B',
    city: 'Jaipur', state: 'Rajasthan', pin: '302001',
    plan: 'Platinum', status: 'Approved', registered: '20 Mar 2026',
    reviewedBy: 'Super Admin',
    docs: { gst: true, pan: true, address: true, biz: true },
  },
  {
    id: 'COM-004', name: 'Delhi Tile House', owner: 'Amit Kumar',
    bizType: 'Retailer',
    mobile: '9811223344', email: 'amit@delhitile.com',
    gst: '', pan: 'AAACK0012B',
    city: 'Delhi', state: 'Delhi', pin: '110001',
    plan: 'Free', status: 'Rejected', registered: '03 Aug 2026',
    reviewedBy: 'Super Admin',
    docs: { gst: false, pan: true, address: false, biz: false },
  },
]

const BLANK_FORM = {
  name: '', bizType: '', owner: '', mobile: '', email: '',
  city: '', state: '', pin: '', gst: '', pan: '', address: '',
  plan: 'Free', status: 'Pending', submittedDate: '',
}

export default function CompanyRegistration() {
  const [tab, setTab] = useState('profile')
  const [companies, setCompanies] = useState(INIT_COMPANIES)

  // ── Profile edit state ──
  const [editing, setEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({ ...INIT_COMPANIES[0] })
  const [profileSaved, setProfileSaved] = useState(false)

  // ── Register new company state ──
  const [regStep, setRegStep] = useState(1)
  const [form, setForm] = useState({ ...BLANK_FORM })
  const [formErrors, setFormErrors] = useState({})
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpVerified, setOtpVerified] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState({ gst: null, pan: null, address: null, biz: null })

  // ── Admin state ──
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewCompany, setViewCompany] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(null)
  const [editCompany, setEditCompany] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  const filtered = companies.filter(c => statusFilter === 'All' || c.status === statusFilter)

  // ── Profile edit handlers ──
  const saveProfile = () => {
    setCompanies(prev => prev.map(c => c.id === profileForm.id ? { ...profileForm } : c))
    setEditing(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  // ── Register form validation ──
  const validateStep1 = () => {
    const errs = {}
    if (!form.name.trim())   errs.name   = 'Company name required'
    if (!form.owner.trim())  errs.owner  = 'Owner name required'
    if (!/^\d{10}$/.test(form.mobile)) errs.mobile = 'Valid 10-digit mobile required'
    if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required'
    if (!form.pan.trim())    errs.pan    = 'PAN required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }
  const validateStep2 = () => {
    const errs = {}
    if (!uploadedDocs.pan)     errs.pan     = 'PAN card upload required'
    if (!uploadedDocs.address) errs.address = 'Address proof upload required'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }
  const handleDocUpload = (key, file) => {
    if (!file) return
    setUploadedDocs(prev => ({ ...prev, [key]: file }))
    setFormErrors(prev => ({ ...prev, [key]: undefined }))
  }

  // ── OTP handlers ──
  const handleOtpChange = (i, v) => {
    if (!/^\d?$/.test(v)) return
    const next = [...otp]; next[i] = v; setOtp(next)
    if (v && i < 5) document.getElementById(`cotp-${i + 1}`)?.focus()
  }
  const verifyOtp = () => {
    const code = otp.join('')
    if (code.length === 6) { setOtpVerified(true) }
    else { setFormErrors({ otp: 'Enter complete 6-digit OTP' }) }
  }

  // ── Submit registration ──
  const submitRegistration = () => {
    const formatDate = (d) => {
      if (!d) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      const dt = new Date(d)
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }
    const newCom = {
      id: `COM-${String(companies.length + 1).padStart(3, '0')}`,
      name: form.name, owner: form.owner, mobile: form.mobile,
      email: form.email, gst: form.gst, pan: form.pan,
      bizType: form.bizType,
      city: form.city, state: form.state, pin: form.pin,
      plan: form.plan,
      status: form.status,
      registered: formatDate(form.submittedDate),
      reviewedBy: '—',
      docs: {
        gst: !!uploadedDocs.gst, pan: !!uploadedDocs.pan,
        address: !!uploadedDocs.address, biz: !!uploadedDocs.biz,
      },
      // Store actual File objects for image preview in View modal
      docFiles: {
        gst: uploadedDocs.gst || null,
        pan: uploadedDocs.pan || null,
        address: uploadedDocs.address || null,
        biz: uploadedDocs.biz || null,
      },
    }
    setCompanies(prev => [newCom, ...prev])
    setRegStep(4)
  }

  // ── Admin actions ──
  const approveCompany = (id) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: 'Approved', reviewedBy: 'Super Admin' } : c))
  }
  const rejectCompany = (id, reason) => {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: 'Rejected', rejectReason: reason, reviewedBy: 'Super Admin' } : c))
    setShowRejectModal(null)
    setRejectReason('')
  }

  // ── Edit handlers ──
  const openEdit = (c) => { setEditCompany(c); setEditForm({ ...c }) }
  const saveEdit = () => {
    setCompanies(prev => prev.map(c => c.id === editForm.id ? { ...editForm } : c))
    if (viewCompany?.id === editForm.id) setViewCompany({ ...editForm })
    setEditCompany(null)
  }

  // ── Delete handler ──
  const deleteCompany = (id) => {
    setCompanies(prev => prev.filter(c => c.id !== id))
    setShowDeleteConfirm(null)
    if (viewCompany?.id === id) setViewCompany(null)
  }

  // ── Download handler — HTML report with embedded document images ──
  const downloadCompany = async (c) => {
    // Convert a File object to base64 data URL
    const toDataUrl = (file) => new Promise((resolve) => {
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    })

    const docDefs = [
      { key: 'gst',     name: 'GST Certificate' },
      { key: 'pan',     name: 'PAN Card' },
      { key: 'address', name: 'Address Proof' },
      { key: 'biz',     name: 'Business Registration' },
    ]

    // Build base64 data for each uploaded file
    const docData = await Promise.all(
      docDefs.map(async (d) => {
        const fileObj = c.docFiles?.[d.key]
        const dataUrl = fileObj ? await toDataUrl(fileObj) : null
        const isImage = fileObj?.type?.startsWith('image/')
        const isPdf   = fileObj?.type === 'application/pdf'
        return { ...d, uploaded: !!c.docs?.[d.key], fileObj, dataUrl, isImage, isPdf }
      })
    )

    const statusBadge = (uploaded) => uploaded
      ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#DCFCE7;color:#059669;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;">&#10003; Uploaded</span>`
      : `<span style="display:inline-flex;align-items:center;gap:4px;background:#FEE2E2;color:#DC2626;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;">&#10007; Not Uploaded</span>`

    const renderDocCard = (d) => {
      let previewHtml = ''
      if (d.dataUrl && d.isImage) {
        previewHtml = `<img src="${d.dataUrl}" alt="${d.name}" style="width:100%;height:140px;object-fit:cover;display:block;border-radius:6px 6px 0 0;" />`
      } else if (d.dataUrl && d.isPdf) {
        previewHtml = `
          <div style="height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#FEF2F2,#FEE2E2);gap:6px;">
            <svg viewBox="0 0 48 56" width="40" height="40" fill="none"><path d="M8 0h24l16 16v40H8V0z" fill="#FEE2E2"/><path d="M32 0l16 16H32V0z" fill="#FECACA"/><rect x="14" y="24" width="20" height="2" rx="1" fill="#DC2626" opacity="0.8"/><rect x="14" y="30" width="16" height="2" rx="1" fill="#DC2626" opacity="0.6"/><rect x="14" y="36" width="18" height="2" rx="1" fill="#DC2626" opacity="0.4"/></svg>
            <span style="font-size:10px;font-weight:800;color:#DC2626;background:#fff;border:1px solid #FECACA;border-radius:4px;padding:2px 8px;letter-spacing:1px;">PDF</span>
          </div>`
      } else if (d.uploaded) {
        previewHtml = `
          <div style="height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#F0FDF4,#DCFCE7);gap:6px;">
            <svg viewBox="0 0 48 56" width="40" height="40" fill="none"><path d="M8 0h24l16 16v40H8V0z" fill="#DCFCE7"/><path d="M32 0l16 16H32V0z" fill="#86EFAC"/><rect x="14" y="24" width="20" height="2" rx="1" fill="#16A34A" opacity="0.8"/><rect x="14" y="30" width="16" height="2" rx="1" fill="#16A34A" opacity="0.6"/><rect x="14" y="36" width="18" height="2" rx="1" fill="#16A34A" opacity="0.4"/></svg>
            <span style="font-size:10px;font-weight:800;color:#059669;background:#fff;border:1px solid #BBF7D0;border-radius:4px;padding:2px 8px;letter-spacing:1px;">FILE</span>
          </div>`
      } else {
        previewHtml = `
          <div style="height:100px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#FEF2F2,#FEE2E2);opacity:0.5;">
            <svg viewBox="0 0 48 56" width="40" height="40" fill="none"><path d="M8 0h24l16 16v40H8V0z" fill="#FEE2E2"/><path d="M32 0l16 16H32V0z" fill="#FECACA"/><rect x="14" y="24" width="20" height="2" rx="1" fill="#DC2626" opacity="0.5"/><rect x="14" y="30" width="16" height="2" rx="1" fill="#DC2626" opacity="0.4"/><rect x="14" y="36" width="18" height="2" rx="1" fill="#DC2626" opacity="0.3"/></svg>
          </div>`
      }

      return `
        <div style="border:1.5px solid ${d.uploaded ? '#BBF7D0' : '#FECACA'};border-radius:10px;overflow:hidden;">
          ${previewHtml}
          <div style="padding:10px 12px;background:${d.uploaded ? '#F0FDF4' : '#FFF5F5'};">
            <div style="font-size:12px;font-weight:700;color:${d.uploaded ? '#059669' : '#DC2626'};margin-bottom:4px;">${d.name}</div>
            ${statusBadge(d.uploaded)}
            ${d.fileObj?.name ? `<div style="font-size:10px;color:#64748b;margin-top:5px;word-break:break-all;">${d.fileObj.name}</div>` : ''}
          </div>
        </div>`
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Company Report — ${c.id}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fa;padding:32px;color:#1e293b;}
    .wrap{background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.10);max-width:740px;margin:0 auto;overflow:hidden;}
    .hdr{background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:26px 30px;}
    .hdr h1{font-size:21px;font-weight:800;margin-bottom:4px;}
    .hdr p{font-size:13px;opacity:.82;}
    .body{padding:26px 30px;}
    .sec{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.9px;color:#6366f1;margin:22px 0 10px;border-bottom:2px solid #e2e8f0;padding-bottom:6px;}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px 28px;}
    .grid4{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    .f label{font-size:11px;color:#64748b;font-weight:600;display:block;margin-bottom:3px;}
    .f span{font-size:13px;color:#1e293b;}
    .mono{font-family:'Courier New',monospace;font-weight:700;}
    .badge{display:inline-block;padding:3px 11px;border-radius:20px;font-size:11px;font-weight:700;}
    .bg{background:#DCFCE7;color:#059669;}.by{background:#FEF9C3;color:#D97706;}.br{background:#FEE2E2;color:#DC2626;}.bb{background:#DBEAFE;color:#2563EB;}
    .ftr{background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 30px;font-size:11px;color:#94a3b8;text-align:center;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h1>Company Registration Report</h1>
    <p>${c.id}&nbsp;&nbsp;|&nbsp;&nbsp;Generated: ${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</p>
  </div>
  <div class="body">
    <div class="sec">Company Information</div>
    <div class="grid2">
      <div class="f"><label>Company Name</label><span>${c.name}</span></div>
      <div class="f"><label>Business Type</label><span>${c.bizType || '—'}</span></div>
      <div class="f"><label>Owner / Contact</label><span>${c.owner}</span></div>
      <div class="f"><label>Mobile</label><span>${c.mobile}</span></div>
      <div class="f"><label>Email</label><span>${c.email}</span></div>
      <div class="f"><label>City &amp; State</label><span>${c.city}, ${c.state} &mdash; ${c.pin}</span></div>
      <div class="f"><label>GST Number</label><span class="mono">${c.gst || 'Not Registered'}</span></div>
      <div class="f"><label>PAN Number</label><span class="mono">${c.pan}</span></div>
    </div>
    <div class="sec">Account &amp; Status</div>
    <div class="grid2">
      <div class="f"><label>Subscription Plan</label><span class="badge bb">${c.plan} Plan</span></div>
      <div class="f"><label>Status</label><span class="badge ${c.status==='Approved'?'bg':c.status==='Rejected'?'br':'by'}">${c.status}</span></div>
      <div class="f"><label>Submitted On</label><span>${c.registered}</span></div>
      <div class="f"><label>Reviewed By</label><span>${c.reviewedBy || '—'}</span></div>
      ${c.rejectReason ? `<div class="f" style="grid-column:1/-1"><label>Rejection Reason</label><span style="color:#DC2626">${c.rejectReason}</span></div>` : ''}
    </div>
    <div class="sec">Uploaded Documents</div>
    <div class="grid4">
      ${docData.map(d => renderDocCard(d)).join('')}
    </div>
  </div>
  <div class="ftr">EzyEnquiry &nbsp;&middot;&nbsp; Company Management &nbsp;&middot;&nbsp; Confidential</div>
</div>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${c.id}_${c.name.replace(/\s+/g,'_')}_Report.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Download individual document file ──
  const downloadDocFile = (fileObj, fallbackName) => {
    if (!fileObj) return
    const url = URL.createObjectURL(fileObj)
    const a   = document.createElement('a')
    a.href    = url
    a.download = fileObj.name || fallbackName
    a.click()
    URL.revokeObjectURL(url)
  }

  // Current company profile (first approved or first in list)
  const currentCompany = profileForm

  // ── Stable document preview component (avoids revoking before render) ──
  const DocCard = ({ doc, uploaded, fileObj, onDownload }) => {
    const [previewUrl, setPreviewUrl] = useState(null)
    const isImage = fileObj?.type?.startsWith('image/')
    const isPdf   = fileObj?.type === 'application/pdf'
    const ext     = fileObj ? fileObj.name.split('.').pop().toUpperCase() : 'FILE'

    useEffect(() => {
      if (!fileObj || !isImage) { setPreviewUrl(null); return }
      const url = URL.createObjectURL(fileObj)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }, [fileObj, isImage])

    const DocSvg = () => (
      <svg viewBox="0 0 48 56" width="44" height="44" fill="none">
        <path d="M8 0h24l16 16v40H8V0z" fill={uploaded ? '#DCFCE7' : '#FEE2E2'} />
        <path d="M32 0l16 16H32V0z"     fill={uploaded ? '#86EFAC' : '#FECACA'} />
        <rect x="14" y="24" width="20" height="2" rx="1" fill={uploaded ? '#16A34A' : '#DC2626'} opacity="0.8" />
        <rect x="14" y="30" width="16" height="2" rx="1" fill={uploaded ? '#16A34A' : '#DC2626'} opacity="0.6" />
        <rect x="14" y="36" width="18" height="2" rx="1" fill={uploaded ? '#16A34A' : '#DC2626'} opacity="0.4" />
      </svg>
    )

    return (
      <div style={{
        borderRadius: 10,
        border: `1.5px solid ${uploaded ? '#BBF7D0' : '#FECACA'}`,
        overflow: 'hidden',
      }}>
        {/* Preview area */}
        <div style={{
          height: 115, position: 'relative',
          background: uploaded
            ? 'linear-gradient(135deg,#F0FDF4,#DCFCE7)'
            : 'linear-gradient(135deg,#FEF2F2,#FEE2E2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {previewUrl ? (
            <img src={previewUrl} alt={doc.label}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : uploaded ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <DocSvg />
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.6px',
                color: isPdf ? '#DC2626' : '#059669',
                background: '#fff', borderRadius: 4, padding: '2px 8px',
                border: `1px solid ${isPdf ? '#FECACA' : '#BBF7D0'}`,
              }}>{isPdf ? 'PDF' : ext}</span>
            </div>
          ) : (
            <div style={{ opacity: 0.35 }}><DocSvg /></div>
          )}
          {/* Status corner badge */}
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 22, height: 22, borderRadius: '50%',
            background: uploaded ? '#059669' : '#DC2626',
            color: '#fff', fontSize: 13, fontWeight: 900,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 5px rgba(0,0,0,0.20)',
          }}>{uploaded ? '✓' : '✗'}</span>
        </div>

        {/* Info + download */}
        <div style={{ padding: '8px 10px', background: uploaded ? '#F0FDF4' : '#FFF5F5' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: uploaded ? '#059669' : '#DC2626' }}>{doc.label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            {uploaded
              ? <><CheckCircle style={{ width: 9, color: '#059669' }} />{fileObj ? fileObj.name : 'Uploaded'}</>
              : <><XCircle    style={{ width: 9, color: '#DC2626' }} />Not uploaded</>
            }
          </div>
          {uploaded && fileObj && (
            <button
              onClick={() => onDownload(fileObj, `${doc.key}_document`)}
              style={{
                marginTop: 7, width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '5px 0', borderRadius: 6,
                background: '#059669', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
              }}
            >
              <Download style={{ width: 10 }} /> Download File
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Company Management</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Company Registration</span>
      </div>

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 18 }}>
        <div className="page-header-left">
          <div className="page-title">Company Registration</div>
          <div className="page-desc">Register, review and manage companies on the platform</div>
        </div>
      </div>

      {/* Summary stats — clickable, filter the admin table */}
      {(() => {
        const STAT_STYLES = {
          All:      { bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB', textColor: '#1D4ED8', borderColor: '#BFDBFE' },
          Approved: { bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#059669', textColor: '#047857', borderColor: '#A7F3D0' },
          Pending:  { bg: '#FFFBEB', iconBg: '#FEF3C7', iconColor: '#D97706', textColor: '#B45309', borderColor: '#FDE68A' },
          Rejected: { bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626', textColor: '#B91C1C', borderColor: '#FECACA' },
        }
        const stats = [
          { label: 'Total Companies',  val: companies.length,                                      key: 'All' },
          { label: 'Approved',         val: companies.filter(c => c.status === 'Approved').length,  key: 'Approved' },
          { label: 'Pending Approval', val: companies.filter(c => c.status === 'Pending').length,   key: 'Pending' },
          { label: 'Rejected',         val: companies.filter(c => c.status === 'Rejected').length,  key: 'Rejected' },
        ]
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
            {stats.map(s => {
              const st     = STAT_STYLES[s.key]
              const active = statusFilter === s.key
              return (
                <div
                  key={s.label}
                  onClick={() => { setStatusFilter(s.key); setTab('admin') }}
                  style={{
                    background:   active ? st.iconBg  : st.bg,
                    border:       `1.5px solid ${active ? st.iconColor : st.borderColor}`,
                    borderRadius: 10,
                    padding:      '14px 16px',
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          12,
                    boxShadow:    active ? `0 0 0 3px ${st.borderColor}` : 'var(--shadow)',
                    transition:   'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: st.iconBg,
                    border:     `1px solid ${st.borderColor}`,
                    display:    'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 style={{ width: 18, height: 18, color: st.iconColor }} />
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

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn${tab === 'profile'  ? ' active' : ''}`} onClick={() => setTab('profile')}>Company Profile</button>
        <button className={`tab-btn${tab === 'register' ? ' active' : ''}`} onClick={() => setTab('register')}>Register New Company</button>
        <button className={`tab-btn${tab === 'admin'    ? ' active' : ''}`} onClick={() => setTab('admin')}>Admin Approval Queue</button>
      </div>

      {/* ═══════════════════════════════════════
          TAB: Company Profile
      ═══════════════════════════════════════ */}
      {tab === 'profile' && (
        <div className="page-grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Company Details</span>
              {profileSaved && <span className="badge badge-green"><CheckCircle style={{ width: 11 }} /> Saved</span>}
              {!editing
                ? <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Edit2 style={{ width: 13 }} />Edit</button>
                : <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveProfile}><Save style={{ width: 13 }} />Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setProfileForm({ ...INIT_COMPANIES[0] }) }}><X style={{ width: 13 }} />Cancel</button>
                  </div>
              }
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {editing ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Company Name *</label>
                      <input className="form-control" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Owner Name *</label>
                      <input className="form-control" value={profileForm.owner} onChange={e => setProfileForm(p => ({ ...p, owner: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Mobile</label>
                      <input className="form-control" value={profileForm.mobile} onChange={e => setProfileForm(p => ({ ...p, mobile: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-control" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-control" value={profileForm.city} onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input className="form-control" value={profileForm.state} onChange={e => setProfileForm(p => ({ ...p, state: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">GST Number</label>
                      <input className="form-control" value={profileForm.gst} style={{ fontFamily: 'monospace' }} onChange={e => setProfileForm(p => ({ ...p, gst: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PAN Number</label>
                      <input className="form-control" value={profileForm.pan} style={{ fontFamily: 'monospace' }} onChange={e => setProfileForm(p => ({ ...p, pan: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subscription Plan</label>
                    <select className="form-control" value={profileForm.plan} onChange={e => setProfileForm(p => ({ ...p, plan: e.target.value }))}>
                      {['Free', 'Silver', 'Gold', 'Platinum'].map(pl => <option key={pl}>{pl}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                [
                  { label: 'Company Name',      value: currentCompany.name },
                  { label: 'Owner',             value: currentCompany.owner },
                  { label: 'Mobile',            value: currentCompany.mobile,  icon: 'phone' },
                  { label: 'Email',             value: currentCompany.email,   icon: 'mail' },
                  { label: 'Address',           value: `${currentCompany.city}, ${currentCompany.state}`, icon: 'loc' },
                  { label: 'GST Number',        value: currentCompany.gst || '—', mono: true },
                  { label: 'PAN Number',        value: currentCompany.pan, mono: true },
                  { label: 'Subscription Plan', value: currentCompany.plan + ' Plan', badge: PLAN_COLORS[currentCompany.plan] },
                  { label: 'Status',            value: currentCompany.status, badge: statusMeta[currentCompany.status]?.color },
                  { label: 'Registered On',     value: currentCompany.registered },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ minWidth: 140, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{r.label}</div>
                    {r.badge
                      ? <span className={`badge ${r.badge}`}>{r.value}</span>
                      : r.icon
                        ? <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {r.icon === 'phone' && <Phone style={{ width: 12, color: 'var(--primary)', flexShrink: 0 }} />}
                            {r.icon === 'mail'  && <Mail  style={{ width: 12, color: 'var(--primary)', flexShrink: 0 }} />}
                            {r.icon === 'loc'   && <Building2 style={{ width: 12, color: 'var(--primary)', flexShrink: 0 }} />}
                            <span>{r.value}</span>
                          </div>
                        : <div style={{ fontSize: 13, fontFamily: r.mono ? 'monospace' : undefined, fontWeight: r.mono ? 600 : 400 }}>{r.value}</div>
                    }
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Uploaded Documents */}
            <div className="card">
              <div className="card-header"><span className="card-title">Uploaded Documents</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { key: 'gst',     name: 'GST Certificate',      file: 'GST_TilesWorld.pdf' },
                  { key: 'pan',     name: 'PAN Card',              file: 'PAN_TilesWorld.pdf' },
                  { key: 'address', name: 'Address Proof',         file: 'Address_TilesWorld.pdf' },
                  { key: 'biz',     name: 'Business Registration', file: null },
                ].map(doc => {
                  const uploaded = currentCompany.docs?.[doc.key]
                  return (
                    <div key={doc.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText style={{ width: 16, color: uploaded ? 'var(--primary)' : 'var(--text-light)' }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.name}</div>
                          {doc.file && uploaded && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doc.file}</div>}
                        </div>
                      </div>
                      {uploaded
                        ? <span className="badge badge-green"><CheckCircle style={{ width: 11 }} /> Uploaded</span>
                        : (
                          <label style={{ cursor: 'pointer' }}>
                            <span className="btn btn-secondary btn-xs"><Upload style={{ width: 11 }} />Upload</span>
                            <input type="file" style={{ display: 'none' }} onChange={e => {
                              if (e.target.files[0]) {
                                setProfileForm(p => ({ ...p, docs: { ...p.docs, [doc.key]: true } }))
                              }
                            }} />
                          </label>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            </div>

            {/* OTP Verification */}
            <div className="card">
              <div className="card-header"><span className="card-title">OTP Verification</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { channel: 'Mobile OTP', number: currentCompany.mobile, verified: true },
                  { channel: 'Email OTP',  number: currentCompany.email,  verified: true },
                ].map(v => (
                  <div key={v.channel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{v.channel}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.number}</div>
                    </div>
                    <span className="badge badge-green"><CheckCircle style={{ width: 11 }} /> Verified</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TAB: Register New Company
      ═══════════════════════════════════════ */}
      {tab === 'register' && (
        <div className="card" style={{ maxWidth: 720 }}>
          {/* Step indicator */}
          <div style={{ padding: '20px 24px 0', display: 'flex', gap: 0 }}>
            {['Basic Info', 'Documents', 'OTP Verify', 'Done'].map((s, i) => (
              <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: regStep > i + 1 ? 'var(--success)' : regStep === i + 1 ? 'var(--primary)' : 'var(--border)',
                  color: regStep >= i + 1 ? '#fff' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {regStep > i + 1 ? <CheckCircle style={{ width: 14 }} /> : i + 1}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: regStep === i + 1 ? 'var(--primary)' : 'var(--text-muted)', marginLeft: 8, whiteSpace: 'nowrap' }}>{s}</div>
                {i < 3 && <div style={{ flex: 1, height: 2, background: regStep > i + 1 ? 'var(--success)' : 'var(--border)', margin: '0 10px' }} />}
              </div>
            ))}
          </div>

          {/* Step 1 — Basic Info */}
          {regStep === 1 && (
            <>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input className="form-control" placeholder="e.g. Tiles World Pvt Ltd" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Type <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                    <input
                      className="form-control"
                      placeholder="e.g. Wholesaler, Retailer, Manufacturer…"
                      value={form.bizType}
                      onChange={e => setForm(p => ({ ...p, bizType: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Subscription Plan selection — dropdown */}
                <div className="form-group">
                  <label className="form-label">Subscription Plan *</label>
                  <select
                    className="form-control"
                    value={form.plan}
                    onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                  >
                    {SUBSCRIPTION_PLANS.map(pl => (
                      <option key={pl.key} value={pl.key}>
                        {pl.name} — {pl.price === 0 ? 'Free' : `₹${pl.price.toLocaleString()}/mo`} · {pl.description}
                      </option>
                    ))}
                  </select>
                  {form.plan && (
                    <div style={{
                      marginTop: 8, padding: '10px 14px', borderRadius: 8,
                      background: 'var(--primary-light)',
                      border: '1px solid var(--primary)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <Crown style={{ width: 14, color: 'var(--primary)', flexShrink: 0 }} />
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                          {SUBSCRIPTION_PLANS.find(p => p.key === form.plan)?.name} Plan
                        </span>
                        <span className={`badge ${SUBSCRIPTION_PLANS.find(p => p.key === form.plan)?.badge}`} style={{ marginLeft: 8, fontSize: 10 }}>
                          {SUBSCRIPTION_PLANS.find(p => p.key === form.plan)?.price === 0
                            ? 'Free'
                            : `₹${SUBSCRIPTION_PLANS.find(p => p.key === form.plan)?.price.toLocaleString()}/mo`}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {SUBSCRIPTION_PLANS.find(p => p.key === form.plan)?.description}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="form-hint">You can upgrade anytime from Subscription Management.</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Owner / Contact Name *</label>
                    <input className="form-control" placeholder="Full name" value={form.owner} onChange={e => setForm(p => ({ ...p, owner: e.target.value }))} />
                    {formErrors.owner && <div className="form-error">{formErrors.owner}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input className="form-control" placeholder="10-digit mobile" type="tel" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} />
                    {formErrors.mobile && <div className="form-error">{formErrors.mobile}</div>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className="form-control" placeholder="email@company.com" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    {formErrors.email && <div className="form-error">{formErrors.email}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-control" placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input className="form-control" placeholder="State" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PIN Code</label>
                    <input className="form-control" placeholder="6-digit PIN" value={form.pin} onChange={e => setForm(p => ({ ...p, pin: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">GST Number</label>
                    <input className="form-control" placeholder="15-character GST" style={{ fontFamily: 'monospace' }} value={form.gst} onChange={e => setForm(p => ({ ...p, gst: e.target.value }))} />
                    <div className="form-hint">Leave blank if not registered.</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN Number *</label>
                    <input className="form-control" placeholder="10-character PAN" style={{ fontFamily: 'monospace' }} value={form.pan} onChange={e => setForm(p => ({ ...p, pan: e.target.value }))} />
                    {formErrors.pan && <div className="form-error">{formErrors.pan}</div>}
                  </div>
                </div>

                {/* Submitted On — date picker only */}
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label">Submitted On</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.submittedDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(p => ({ ...p, submittedDate: e.target.value }))}
                    style={{ cursor: 'pointer' }}
                  />
                  {form.submittedDate && (
                    <div style={{ marginTop: 5, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                      {new Date(form.submittedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={() => { if (validateStep1()) setRegStep(2) }}>Next: Upload Documents →</button>
              </div>
            </>
          )}

          {/* Step 2 — Documents */}
          {regStep === 2 && (
            <>
              <div className="modal-body">
                {[
                  { key: 'gst',     name: 'GST Certificate',      required: false, hint: 'PDF or image, max 5 MB' },
                  { key: 'pan',     name: 'PAN Card',              required: true,  hint: 'Clear scan, PDF or JPG' },
                  { key: 'address', name: 'Address Proof',         required: true,  hint: 'Electricity bill / Rent agreement / Aadhaar' },
                  { key: 'biz',     name: 'Business Registration', required: false, hint: 'Certificate of Incorporation / Trade Licence' },
                ].map(doc => (
                  <div key={doc.key} style={{ marginBottom: 14 }}>
                    <label className="form-label">
                      {doc.name} {doc.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    <label style={{ cursor: 'pointer' }}>
                      <div style={{
                        border: `2px dashed ${uploadedDocs[doc.key] ? 'var(--success)' : formErrors[doc.key] ? 'var(--danger)' : 'var(--border)'}`,
                        borderRadius: 8, padding: '14px 18px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: uploadedDocs[doc.key] ? '#ECFDF5' : 'var(--bg)',
                      }}>
                        {uploadedDocs[doc.key]
                          ? <><CheckCircle style={{ width: 20, color: 'var(--success)', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Uploaded: {uploadedDocs[doc.key]?.name || uploadedDocs[doc.key]}</div>
                                <div className="form-hint">Click to replace</div>
                              </div>
                            </>
                          : <><Upload style={{ width: 20, color: 'var(--text-muted)', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Click to upload or drag file here</div>
                                <div className="form-hint">{doc.hint}</div>
                              </div>
                            </>
                        }
                      </div>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => handleDocUpload(doc.key, e.target.files[0])} />
                    </label>
                    {formErrors[doc.key] && <div className="form-error">{formErrors[doc.key]}</div>}
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRegStep(1)}>← Back</button>
                <button className="btn btn-primary" onClick={() => { if (validateStep2()) setRegStep(3) }}>Next: Verify OTP →</button>
              </div>
            </>
          )}

          {/* Step 3 — OTP */}
          {regStep === 3 && (
            <>
              <div className="modal-body">
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  <Mail /><span>A 6-digit OTP will be sent to your registered mobile and email to verify your identity before submitting.</span>
                </div>
                {!otpSent ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Phone style={{ width: 15, color: 'var(--primary)' }} /><span style={{ fontSize: 13 }}>+91 {form.mobile}</span></div>
                      <button className="btn btn-primary btn-sm" onClick={() => { setOtpSent(true); setOtp(['', '', '', '', '', '']) }}>Send OTP</button>
                    </div>
                    <div style={{ padding: '14px 16px', background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Mail style={{ width: 15, color: 'var(--primary)' }} /><span style={{ fontSize: 13 }}>{form.email}</span></div>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setOtpSent(true); setOtp(['', '', '', '', '', '']) }}>Send OTP</button>
                    </div>
                  </div>
                ) : otpVerified ? (
                  <div className="alert alert-success">
                    <CheckCircle /><span>OTP Verified Successfully! You can now submit your registration.</span>
                  </div>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>Enter the 6-digit OTP sent to +91 {form.mobile}</div>
                    <div className="otp-row">
                      {otp.map((d, i) => (
                        <input key={i} id={`cotp-${i}`} className="otp-input" maxLength={1} value={d}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Backspace' && !d && i > 0) document.getElementById(`cotp-${i - 1}`)?.focus() }}
                        />
                      ))}
                    </div>
                    {formErrors.otp && <div className="form-error" style={{ textAlign: 'center' }}>{formErrors.otp}</div>}
                    <div style={{ textAlign: 'center', marginTop: 10, display: 'flex', justifyContent: 'center', gap: 12 }}>
                      <button onClick={verifyOtp} className="btn btn-primary btn-sm">Verify OTP</button>
                      <button onClick={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']); setFormErrors({}) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <RefreshCw style={{ width: 12 }} /> Resend
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setRegStep(2)}>← Back</button>
                <button className="btn btn-primary" disabled={!otpVerified} style={{ opacity: otpVerified ? 1 : 0.5 }} onClick={submitRegistration}>Submit for Approval →</button>
              </div>
            </>
          )}

          {/* Step 4 — Done */}
          {regStep === 4 && (
            <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle style={{ width: 32, color: 'var(--success)' }} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Registration Submitted!</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 24px' }}>
                Company registration is under review. Admin will approve within 24–48 hours. You'll be notified once approved.
              </div>
              <div className="alert alert-warning" style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
                <Clock /><span>Meanwhile, you can explore with limited Free plan access.</span>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => {
                setRegStep(1); setForm({ ...BLANK_FORM }); setUploadedDocs({ gst: null, pan: null, address: null, biz: null })
                setOtpSent(false); setOtpVerified(false); setOtp(['', '', '', '', '', '']); setFormErrors({})
              }}>Register Another Company</button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════
          TAB: Admin Approval Queue
      ═══════════════════════════════════════ */}
      {tab === 'admin' && (
        <>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Company Approval Queue ({filtered.length})</span>
              <div className="header-actions">
                {[
                  { key: 'All',      label: 'All',      bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
                  { key: 'Pending',  label: 'Pending',  bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
                  { key: 'Approved', label: 'Approved', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
                  { key: 'Rejected', label: 'Rejected', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
                ].map(s => {
                  const active = statusFilter === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => setStatusFilter(s.key)}
                      style={{
                        padding: '5px 14px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1.5px solid ${active ? s.color : s.border}`,
                        background: active ? s.color : s.bg,
                        color: active ? '#fff' : s.color,
                        cursor: 'pointer',
                        transition: 'all 0.13s',
                      }}
                    >{s.label} ({s.key === 'All' ? companies.length : companies.filter(c => c.status === s.key).length})</button>
                  )
                })}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Company</th>
                    <th>Owner</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Business Type</th>
                    <th>GST</th>
                    <th>PAN</th>
                    <th>Documents</th>
                    <th>Submitted On</th>
                    <th>Reviewed By</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      {/* ID */}
                      <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{c.id}</td>

                      {/* Company */}
                      <td>
                        <div className="user-info">
                          <div className="avatar avatar-blue">{c.name.charAt(0)}</div>
                          <div>
                            <div className="user-name">{c.name}</div>
                            <div className="user-role">{c.city}, {c.state}</div>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{c.owner}</td>

                      {/* Contact — mobile only */}
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone style={{ width: 11, color: 'var(--primary)', flexShrink: 0 }} />
                          {c.mobile}
                        </div>
                      </td>

                      {/* Email — separate column */}
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail style={{ width: 11, color: 'var(--primary)', flexShrink: 0 }} />
                          {c.email}
                        </div>
                      </td>

                      {/* Business Type */}
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          color: 'var(--text-muted)', whiteSpace: 'nowrap',
                        }}>{c.bizType || '—'}</span>
                      </td>

                      {/* GST */}
                      <td style={{ fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        {c.gst
                          ? <span style={{ color: 'var(--text)' }}>{c.gst}</span>
                          : <span style={{ color: 'var(--text-light)', fontFamily: 'sans-serif', fontSize: 11 }}>Not Registered</span>
                        }
                      </td>

                      {/* PAN */}
                      <td style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.pan}</td>

                      {/* Documents — count only */}
                      <td>
                        {(() => {
                          const keys = ['gst','pan','address','biz']
                          const cnt = keys.filter(k => c.docs?.[k]).length
                          const total = keys.length
                          return (
                            <span style={{
                              fontSize: 12, fontWeight: 600,
                              color: cnt === total ? '#059669' : cnt === 0 ? '#DC2626' : '#D97706',
                            }}>
                              {cnt}/{total} Uploaded
                            </span>
                          )
                        })()}
                      </td>

                      {/* Submitted On */}
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{c.registered}</td>

                      {/* Reviewed By */}
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                        {c.reviewedBy || '—'}
                      </td>

                      {/* Status */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {statusMeta[c.status]?.icon}
                            <span className={`badge ${statusMeta[c.status]?.color}`}>{c.status}</span>
                          </div>
                          {c.rejectReason && (
                            <div style={{ fontSize: 10, color: 'var(--danger)' }}>↳ {c.rejectReason}</div>
                          )}
                        </div>
                      </td>

                      {/* Actions — single row, icons only */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
                          {/* View */}
                          <button
                            title="View Details"
                            className="btn btn-secondary btn-xs"
                            style={{ padding: '4px 7px', minWidth: 0 }}
                            onClick={() => setViewCompany(c)}
                          ><Eye style={{ width: 13 }} /></button>

                          {/* Download */}
                          <button
                            title="Download Report"
                            className="btn btn-secondary btn-xs"
                            style={{ padding: '4px 7px', minWidth: 0, color: '#059669', borderColor: '#BBF7D0' }}
                            onClick={() => downloadCompany(c)}
                          ><Download style={{ width: 13 }} /></button>

                          {/* Delete */}
                          <button
                            title="Delete"
                            className="btn btn-danger btn-xs"
                            style={{ padding: '4px 7px', minWidth: 0 }}
                            onClick={() => setShowDeleteConfirm(c.id)}
                          ><Trash2 style={{ width: 13 }} /></button>

                          {/* Approve */}
                          {c.status === 'Pending' && (
                            <button
                              title="Approve"
                              className="btn btn-success btn-xs"
                              style={{ padding: '4px 7px', minWidth: 0 }}
                              onClick={() => approveCompany(c.id)}
                            ><CheckCircle style={{ width: 13 }} /></button>
                          )}

                          {/* Reject */}
                          {c.status === 'Pending' && (
                            <button
                              title="Reject"
                              className="btn btn-danger btn-xs"
                              style={{ padding: '4px 7px', minWidth: 0 }}
                              onClick={() => setShowRejectModal(c.id)}
                            ><XCircle style={{ width: 13 }} /></button>
                          )}

                          {/* Re-Approve */}
                          {c.status === 'Rejected' && (
                            <button
                              title="Re-Approve"
                              className="btn btn-secondary btn-xs"
                              style={{ padding: '4px 7px', minWidth: 0, color: '#059669', borderColor: '#BBF7D0' }}
                              onClick={() => approveCompany(c.id)}
                            ><RefreshCw style={{ width: 13 }} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* View Company Modal */}
          {viewCompany && (
            <div className="modal-overlay" onClick={() => setViewCompany(null)}>
              <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title">Company Details — {viewCompany.id}</span>
                  <button className="btn-ghost" onClick={() => setViewCompany(null)}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Company Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                    {[
                      { label: 'Company Name',  value: viewCompany.name },
                      { label: 'Owner',         value: viewCompany.owner },
                      { label: 'Business Type', value: viewCompany.bizType || '—' },
                      { label: 'Mobile',        value: viewCompany.mobile },
                      { label: 'Email',         value: viewCompany.email },
                      { label: 'City',          value: `${viewCompany.city}, ${viewCompany.state}` },
                      { label: 'PIN Code',      value: viewCompany.pin || '—' },
                      { label: 'GST Number',    value: viewCompany.gst || '— (Not registered)', mono: true },
                      { label: 'PAN Number',    value: viewCompany.pan, mono: true },
                      { label: 'Registered',    value: viewCompany.registered },
                      { label: 'Status',        value: viewCompany.status, badge: statusMeta[viewCompany.status]?.color },
                    ].map(r => (
                      <div key={r.label}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                        {r.badge
                          ? <span className={`badge ${r.badge}`}>{r.value}</span>
                          : r.label === 'Email'
                            ? <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Mail style={{ width: 12, color: 'var(--primary)', flexShrink: 0 }} />
                                <span>{r.value}</span>
                              </div>
                            : r.label === 'Mobile'
                              ? <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Phone style={{ width: 12, color: 'var(--primary)', flexShrink: 0 }} />
                                  <span>{r.value}</span>
                                </div>
                              : r.label === 'Business Type'
                                ? <span style={{
                                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                                    background: 'var(--bg)', border: '1px solid var(--border)',
                                    color: 'var(--text)', display: 'inline-block',
                                  }}>{r.value}</span>
                                : <div style={{ fontSize: 13, fontFamily: r.mono ? 'monospace' : undefined, fontWeight: r.mono ? 600 : 400 }}>{r.value}</div>
                        }
                      </div>
                    ))}
                  </div>

                  <div className="divider" />

                  {/* Plan — inline editable */}
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>Subscription Plan</div>
                    <div style={{
                      padding: '12px 14px', borderRadius: 10,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <Crown style={{ width: 15, color: 'var(--primary)', flexShrink: 0 }} />
                        <span className={`badge ${PLAN_COLORS[viewCompany.plan]}`} style={{ fontSize: 12 }}>
                          {viewCompany.plan} Plan
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {SUBSCRIPTION_PLANS.find(p => p.key === viewCompany.plan)?.price === 0
                            ? 'Free'
                            : `₹${SUBSCRIPTION_PLANS.find(p => p.key === viewCompany.plan)?.price.toLocaleString()}/mo`}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                        {SUBSCRIPTION_PLANS.find(p => p.key === viewCompany.plan)?.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Change Plan:</label>
                        <select
                          className="form-control"
                          style={{ flex: 1, fontSize: 12 }}
                          value={viewCompany.plan}
                          onChange={e => {
                            const newPlan = e.target.value
                            setCompanies(prev => prev.map(co => co.id === viewCompany.id ? { ...co, plan: newPlan } : co))
                            setViewCompany(prev => ({ ...prev, plan: newPlan }))
                          }}
                        >
                          {SUBSCRIPTION_PLANS.map(pl => (
                            <option key={pl.key} value={pl.key}>
                              {pl.name} — {pl.price > 0 ? `₹${pl.price.toLocaleString()}/mo` : 'Free'} · {pl.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Documents status with image preview */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Uploaded Documents</div>
                      {(() => {
                        const keys = ['gst','pan','address','biz']
                        const cnt = keys.filter(k => viewCompany.docs?.[k]).length
                        return (
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: cnt === 4 ? '#059669' : cnt === 0 ? '#DC2626' : '#D97706',
                          }}>{cnt}/4 Uploaded</span>
                        )
                      })()}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { key: 'gst',     label: 'GST Certificate' },
                        { key: 'pan',     label: 'PAN Card' },
                        { key: 'address', label: 'Address Proof' },
                        { key: 'biz',     label: 'Business Registration' },
                      ].map(doc => (
                        <DocCard
                          key={doc.key}
                          doc={doc}
                          uploaded={!!viewCompany.docs?.[doc.key]}
                          fileObj={viewCompany.docFiles?.[doc.key] || null}
                          onDownload={downloadDocFile}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  {viewCompany.status === 'Pending' && (
                    <>
                      <button className="btn btn-success btn-sm" onClick={() => { approveCompany(viewCompany.id); setViewCompany(null) }}>
                        <CheckCircle style={{ width: 13 }} />Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setShowRejectModal(viewCompany.id); setViewCompany(null) }}>
                        <XCircle style={{ width: 13 }} />Reject
                      </button>
                    </>
                  )}
                  {viewCompany.status === 'Rejected' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { approveCompany(viewCompany.id); setViewCompany(null) }}>
                      <RefreshCw style={{ width: 13 }} />Re-Approve
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#059669', borderColor: '#BBF7D0' }}
                    onClick={() => downloadCompany(viewCompany)}
                  >
                    <Download style={{ width: 13 }} />Download Report
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setViewCompany(null)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Reject Reason Modal */}
          {showRejectModal && (
            <div className="modal-overlay" onClick={() => setShowRejectModal(null)}>
              <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title">Reject Company</span>
                  <button className="modal-close" onClick={() => setShowRejectModal(null)}><X /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Rejection Reason *</label>
                    <textarea className="form-control" rows={3} placeholder="Enter reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowRejectModal(null)}>Cancel</button>
                  <button className="btn btn-danger btn-sm" disabled={!rejectReason.trim()} style={{ opacity: rejectReason.trim() ? 1 : 0.5 }}
                    onClick={() => rejectCompany(showRejectModal, rejectReason)}>
                    <XCircle style={{ width: 13 }} />Confirm Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit Company Modal ── */}
          {editCompany && (
            <div className="modal-overlay" onClick={() => setEditCompany(null)}>
              <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title"><Pencil style={{ width: 15 }} /> Edit Company — {editCompany.id}</span>
                  <button className="btn-ghost" onClick={() => setEditCompany(null)}>✕</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Company Name *</label>
                      <input className="form-control" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Business Type <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                      <input
                        className="form-control"
                        placeholder="e.g. Wholesaler, Retailer, Manufacturer…"
                        value={editForm.bizType || ''}
                        onChange={e => setEditForm(p => ({ ...p, bizType: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Owner Name *</label>
                      <input className="form-control" value={editForm.owner} onChange={e => setEditForm(p => ({ ...p, owner: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile</label>
                      <input className="form-control" value={editForm.mobile} onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input className="form-control" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input className="form-control" value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input className="form-control" value={editForm.state} onChange={e => setEditForm(p => ({ ...p, state: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PIN Code</label>
                      <input className="form-control" value={editForm.pin} onChange={e => setEditForm(p => ({ ...p, pin: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">GST Number</label>
                      <input className="form-control" style={{ fontFamily: 'monospace' }} value={editForm.gst} onChange={e => setEditForm(p => ({ ...p, gst: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PAN Number</label>
                      <input className="form-control" style={{ fontFamily: 'monospace' }} value={editForm.pan} onChange={e => setEditForm(p => ({ ...p, pan: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Subscription Plan</label>
                      <select className="form-control" value={editForm.plan} onChange={e => setEditForm(p => ({ ...p, plan: e.target.value }))}>
                        {SUBSCRIPTION_PLANS.map(pl => (
                          <option key={pl.key} value={pl.key}>{pl.name} — {pl.price > 0 ? `₹${pl.price.toLocaleString()}/mo` : 'Free'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-control" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="Pending">⏳ Pending</option>
                        <option value="Approved">✅ Approved</option>
                        <option value="Rejected">❌ Rejected</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reviewed By</label>
                    <input className="form-control" value={editForm.reviewedBy || ''} onChange={e => setEditForm(p => ({ ...p, reviewedBy: e.target.value }))} placeholder="Admin name" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditCompany(null)}><X style={{ width: 13 }} /> Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}><Save style={{ width: 13 }} /> Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Delete Confirm Modal ── */}
          {showDeleteConfirm && (
            <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
              <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <span className="modal-title" style={{ color: 'var(--danger)' }}><Trash2 style={{ width: 15 }} /> Delete Company</span>
                  <button className="btn-ghost" onClick={() => setShowDeleteConfirm(null)}>✕</button>
                </div>
                <div className="modal-body">
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}>
                    <Trash2 style={{ width: 20, color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#DC2626', marginBottom: 4 }}>Are you sure?</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        This will permanently delete <strong>{companies.find(c => c.id === showDeleteConfirm)?.name}</strong> ({showDeleteConfirm}) from the system. This action cannot be undone.
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteCompany(showDeleteConfirm)}>
                    <Trash2 style={{ width: 13 }} /> Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
