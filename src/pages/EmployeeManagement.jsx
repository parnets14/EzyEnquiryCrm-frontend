import { useState } from 'react'
import { Plus, Search, Clock, UserCog, CheckCircle, XCircle, Trash2, LogIn, LogOut, Download, FileText, DollarSign } from 'lucide-react'
import { hrApi } from '../api/hrApi'

const DEPARTMENTS  = ['Sales', 'Accounts', 'Warehouse', 'Management', 'HR', 'IT']
const DESIGNATIONS = ['Sales Executive', 'Accountant', 'Warehouse Staff', 'Manager', 'HR Manager', 'IT Executive']

const EMPTY_FORM = { name: '', mobile: '', email: '', join_date: '', department: 'Sales', designation: 'Sales Executive', salary: '', emp_code: '' }

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const nowTime = () => {
  const d = new Date()
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`
}

const parseTime = (t) => {
  if (!t) return 0
  const [hm, ampm] = t.split(' ')
  let [h, m] = hm.split(':').map(Number)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + m
}

const calcHours = (checkin, checkout) => {
  if (!checkin || !checkout) return null
  const diff = parseTime(checkout) - parseTime(checkin)
  if (diff <= 0) return null
  return `${Math.floor(diff/60)}h ${diff%60}m`
}

export default function EmployeeManagement({ employees = [], addEmployee, updateEmployee, deleteEmployee, loadingData }) {
  const [tab,        setTab]        = useState('list')
  const [search,     setSearch]     = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [attDate,    setAttDate]    = useState(new Date().toISOString().split('T')[0])
  const [salMonth,   setSalMonth]   = useState(new Date().toISOString().slice(0, 7))
  const [showModal,  setShowModal]  = useState(false)
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [errors,     setErrors]     = useState({})
  const [successMsg, setSuccessMsg] = useState('')
  const [saving,       setSaving]       = useState(false)
  const [salProcessed, setSalProcessed] = useState(false)
  // Local attendance state (not persisted to backend in this view)
  const [attendance, setAttendance] = useState({})

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const filtered = employees.filter(e =>
    (!deptFilter || e.department === deptFilter) &&
    ((e.name || '').toLowerCase().includes(search.toLowerCase()) ||
     (e.department || '').toLowerCase().includes(search.toLowerCase()))
  )

  const activeEmps         = employees.filter(e => e.is_active !== false)
  const totalMonthlySalary = activeEmps.reduce((s, e) => s + (e.salary || 0), 0)

  // ── Attendance helpers ────────────────────────────────────
  const getAtt = (empId) => attendance[attDate]?.[empId] || { checkin: null, checkout: null }

  const presentCount  = activeEmps.filter(e => getAtt(e._id || e.id).checkin).length
  const checkedOutCnt = activeEmps.filter(e => getAtt(e._id || e.id).checkout).length
  const absentCount   = activeEmps.length - presentCount

  const handleCheckIn = async (emp) => {
    const id = emp._id || emp.id
    const time = nowTime()
    setAttendance(prev => ({
      ...prev,
      [attDate]: { ...(prev[attDate]||{}), [id]: { checkin: time, checkout: null } },
    }))
    // Save to backend
    try {
      await hrApi.markAttendance({ employee_id: id, date: attDate, check_in: time, status: 'Present' })
    } catch(e) { /* non-fatal */ }
    toast(`✓ ${emp.name} checked in at ${time}`)
  }

  const handleCheckOut = async (emp) => {
    const id = emp._id || emp.id
    const time = nowTime()
    setAttendance(prev => ({
      ...prev,
      [attDate]: { ...(prev[attDate]||{}), [id]: { ...(prev[attDate]?.[id]||{}), checkout: time } },
    }))
    try {
      const att = getAtt(id)
      await hrApi.markAttendance({ employee_id: id, date: attDate, check_in: att.checkin, check_out: time, status: 'Present' })
    } catch(e) { /* non-fatal */ }
    toast(`✓ ${emp.name} checked out at ${time}`)
  }

  const handleMarkAbsent = (emp) => {
    const id = emp._id || emp.id
    setAttendance(prev => {
      const day = { ...(prev[attDate]||{}) }
      delete day[id]
      return { ...prev, [attDate]: day }
    })
    toast(`${emp.name} marked absent`)
  }

  // ── Salary helpers ────────────────────────────────────────
  const calcSalary = (emp) => {
    const gross  = emp.salary || 0
    const basic  = Math.round(gross * 0.60)
    const hra    = Math.round(gross * 0.24)
    const travel = Math.round(gross * 0.07)
    const special= Math.round(gross * 0.09)
    const pf     = Math.round(gross * 0.0643)
    const pt     = 200
    const net    = gross - pf - pt
    return { gross, basic, hra, travel, special, pf, pt, net }
  }

  const generatePayslip = (emp) => {
    const s = calcSalary(emp)
    const monthName = new Date(salMonth+'-01').toLocaleString('en-IN', { month:'long', year:'numeric' })
    const lines = [
      '═══════════════════════════════════════════',
      '           SALARY SLIP — ' + monthName.toUpperCase(),
      '═══════════════════════════════════════════',
      'Employee: ' + emp.name + ' | Dept: ' + emp.department,
      '───────────────────────────────────────────',
      'Basic: ₹' + s.basic + ' | HRA: ₹' + s.hra + ' | Travel: ₹' + s.travel,
      'Gross: ₹' + s.gross + ' | PF: -₹' + s.pf + ' | PT: -₹' + s.pt,
      'NET TAKE-HOME: ₹' + s.net,
      '═══════════════════════════════════════════',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `Payslip_${emp.name.replace(' ','_')}_${salMonth}.txt`; a.click()
    URL.revokeObjectURL(url)
    toast(`Payslip downloaded for ${emp.name}`)
  }

  const handleProcessSalaries = async () => {
    for (const emp of activeEmps) {
      const s = calcSalary(emp)
      const [year, month] = salMonth.split('-')
      try {
        await hrApi.createSalary({ employee_id: emp._id || emp.id, month: parseInt(month), year: parseInt(year), basic_salary: s.gross })
      } catch(e) { /* non-fatal */ }
    }
    setSalProcessed(true)
    toast(`✓ Salaries processed. Total: ₹${totalMonthlySalary.toLocaleString()}`)
  }

  const handleGenerateAll = () => {
    activeEmps.forEach(emp => generatePayslip(emp))
    toast(`✓ Payslips downloaded for all ${activeEmps.length} employees`)
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required'
    if (!form.join_date) e.join_date = 'Join date required'
    if (!form.salary || isNaN(form.salary) || parseFloat(form.salary) <= 0) e.salary = 'Valid salary required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const result = await addEmployee?.({
      name: form.name, mobile: form.mobile, email: form.email,
      join_date: form.join_date, department: form.department,
      designation: form.designation, salary: parseFloat(form.salary),
      emp_code: form.emp_code,
    })
    setSaving(false)
    if (result?.success === false) { toast(`Error: ${result.message}`); return }
    setForm(EMPTY_FORM); setErrors({})
    setShowModal(false)
    toast(`Employee ${form.name} added`)
  }

  const handleDelete = async (id) => {
    const result = await deleteEmployee?.(id)
    if (result?.success === false) toast(`Error: ${result.message}`)
    else toast('Employee removed')
  }


  return (
    <>
      <div className="breadcrumb">
        <span>HR & Admin</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Employee Management</span>
      </div>

      {successMsg && <div className="alert alert-info" style={{ marginBottom: 14 }}>✓ {successMsg}</div>}

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Employees', val: employees.length,                                   color: 'blue'   },
          { label: 'Present Today',   val: `${presentCount} / ${activeEmps.length}`,            color: 'green'  },
          { label: 'Absent Today',    val: absentCount,                                          color: 'orange' },
          { label: 'Monthly Salary',  val: `₹${totalMonthlySalary.toLocaleString()}`,            color: 'purple' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}><UserCog /></div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['list','Employee List'],['attendance','Attendance'],['salary','Salary & Payslips']].map(([key,label]) => (
          <button key={key} className={`tab-btn${tab===key?' active':''}`} onClick={()=>setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ══════════════════ TAB: Employee List ══════════════════ */}
      {tab === 'list' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Employees ({filtered.length})</span>
            <div className="header-actions">
              <div className="search-bar"><Search /><input placeholder="Search name or dept…" value={search} onChange={e=>setSearch(e.target.value)} /></div>
              <select className="form-control" style={{width:140}} value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
              </select>
              <button className="btn btn-primary" onClick={()=>{setForm(EMPTY_FORM);setErrors({});setShowModal(true)}}><Plus />Add Employee</button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Employee</th><th>Mobile</th><th>Department</th><th>Designation</th><th>Join Date</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{color:'var(--primary)',fontWeight:700,fontSize:12}}>{e.id}</td>
                    <td>
                      <div className="user-info">
                        <div className="avatar avatar-green">{e.name.charAt(0)}</div>
                        <div><div className="user-name">{e.name}</div><div className="user-role">{e.email}</div></div>
                      </div>
                    </td>
                    <td style={{fontSize:12}}>{e.mobile}</td>
                    <td><span className="badge badge-blue">{e.dept}</span></td>
                    <td style={{fontSize:12}}>{e.designation}</td>
                    <td style={{fontSize:12}}>{e.join}</td>
                    <td style={{fontWeight:700}}>₹{e.salary.toLocaleString()}</td>
                    <td>
                      <span
                        className={`badge ${e.status==='Active'?'badge-green':'badge-red'}`}
                        style={{cursor:'pointer'}}
                        title="Click to toggle Active/Inactive"
                        onClick={()=>updateEmployee?.(e._id||e.id, { is_active: e.is_active===false })}
                      >{e.status}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-xs" title="View Payslip" onClick={()=>{setSalMonth('2026-08');generatePayslip(e)}}><FileText style={{width:12}} /></button>
                        <button className="btn btn-ghost btn-xs" style={{color:'var(--danger)'}} onClick={()=>handleDelete(e.id)}><Trash2 style={{width:13}} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={9} style={{textAlign:'center',padding:24,color:'var(--text-muted)'}}>No employees found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ══════════════════ TAB: Attendance ══════════════════ */}
      {tab === 'attendance' && (
        <div className="card">
          <div className="card-header">
            <div>
              <span className="card-title">Attendance — {formatDate(attDate)}</span>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:3}}>
                Present: <strong style={{color:'var(--success)'}}>{presentCount}</strong> &nbsp;|&nbsp;
                Checked Out: <strong style={{color:'var(--primary)'}}>{checkedOutCnt}</strong> &nbsp;|&nbsp;
                Absent: <strong style={{color:'var(--danger)'}}>{absentCount}</strong>
              </div>
            </div>
            <input className="form-control" type="date" value={attDate} onChange={e=>setAttDate(e.target.value)} style={{width:160}} />
          </div>

          <div style={{padding:'10px 20px',background:'var(--primary-light)',borderBottom:'1px solid var(--border)',fontSize:12,color:'var(--primary)'}}>
            💡 <strong>How it works:</strong> Select any date → Click <strong>Check In</strong> when employee arrives → Click <strong>Check Out</strong> when leaving. Hours are auto-calculated. Click ✕ to mark absent.
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Employee</th><th>Department</th><th>Check-In</th><th>Check-Out</th><th>Hours Worked</th><th>Status</th><th style={{minWidth:180}}>Actions</th></tr>
              </thead>
              <tbody>
                {activeEmps.map(e => {
                  const att    = getAtt(e.id)
                  const hours  = calcHours(att.checkin, att.checkout)
                  const status = att.checkin ? (att.checkout ? 'Completed' : 'Present') : 'Absent'
                  return (
                    <tr key={e.id} style={{background:status==='Absent'?'#FFF5F5':status==='Completed'?'#F0FFF4':'transparent'}}>
                      <td>
                        <div className="user-info">
                          <div className="avatar avatar-green">{e.name.charAt(0)}</div>
                          <div><div className="user-name">{e.name}</div><div className="user-role">{e.designation}</div></div>
                        </div>
                      </td>
                      <td><span className="badge badge-blue">{e.dept}</span></td>
                      <td style={{color:att.checkin?'var(--success)':'var(--text-muted)',fontWeight:att.checkin?700:400,fontSize:14}}>
                        {att.checkin||'—'}
                      </td>
                      <td style={{color:att.checkout?'var(--primary)':'var(--text-muted)',fontWeight:att.checkout?700:400,fontSize:14}}>
                        {att.checkout||'—'}
                      </td>
                      <td style={{fontWeight:600,color:hours?'var(--text)':'var(--text-muted)'}}>
                        {hours || (att.checkin ? <span style={{color:'var(--warning)',fontSize:12}}>In progress…</span> : '—')}
                      </td>
                      <td>
                        <span className={`badge ${status==='Completed'?'badge-green':status==='Present'?'badge-blue':'badge-red'}`}>
                          {status==='Completed'?<><CheckCircle style={{width:11}}/> Completed</>
                            :status==='Present'?<><Clock style={{width:11}}/> Present</>
                            :<><XCircle style={{width:11}}/> Absent</>}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          {!att.checkin && (
                            <button className="btn btn-success btn-xs" onClick={()=>handleCheckIn(e)}>
                              <LogIn style={{width:12}}/>Check In
                            </button>
                          )}
                          {att.checkin && !att.checkout && (
                            <button className="btn btn-primary btn-xs" onClick={()=>handleCheckOut(e)}>
                              <LogOut style={{width:12}}/>Check Out
                            </button>
                          )}
                          {att.checkout && (
                            <span className="badge badge-green" style={{fontSize:10}}>✓ Done</span>
                          )}
                          {att.checkin && (
                            <button className="btn btn-ghost btn-xs" style={{color:'var(--danger)'}} title="Mark Absent" onClick={()=>handleMarkAbsent(e.id)}>✕</button>
                          )}
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


      {/* ══════════════════ TAB: Salary & Payslips ══════════════════ */}
      {tab === 'salary' && (
        <>
          {salProcessed && (
            <div className="alert alert-info" style={{marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
              <CheckCircle style={{color:'var(--success)',width:18}}/>
              <span style={{fontWeight:600}}>✓ Salaries processed for {new Date(salMonth+'-01').toLocaleString('en-IN',{month:'long',year:'numeric'})}. Total disbursed: ₹{totalMonthlySalary.toLocaleString()}</span>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <span className="card-title">Salary Structure & Payslips</span>
              <div className="header-actions">
                <input className="form-control" type="month" value={salMonth} onChange={e=>setSalMonth(e.target.value)} style={{width:150}} />
                <button className="btn btn-secondary" onClick={handleGenerateAll}>
                  <Download style={{width:14}}/>Export All Payslips
                </button>
                <button className="btn btn-primary" onClick={handleProcessSalaries}>
                  <DollarSign style={{width:14}}/>Process Salaries
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{textAlign:'right'}}>Basic</th>
                    <th style={{textAlign:'right'}}>HRA</th>
                    <th style={{textAlign:'right'}}>Travel</th>
                    <th style={{textAlign:'right'}}>Special</th>
                    <th style={{textAlign:'right'}}>Gross</th>
                    <th style={{textAlign:'right'}}>PF (−)</th>
                    <th style={{textAlign:'right'}}>PT (−)</th>
                    <th style={{textAlign:'right'}}>Net Take-Home</th>
                    <th style={{textAlign:'center'}}>Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmps.map(e => {
                    const s = calcSalary(e)
                    return (
                      <tr key={e.id}>
                        <td>
                          <div className="user-info">
                            <div className="avatar avatar-green">{e.name.charAt(0)}</div>
                            <div><div className="user-name">{e.name}</div><div className="user-role">{e.dept} · {e.designation}</div></div>
                          </div>
                        </td>
                        <td style={{textAlign:'right'}}>₹{s.basic.toLocaleString()}</td>
                        <td style={{textAlign:'right'}}>₹{s.hra.toLocaleString()}</td>
                        <td style={{textAlign:'right'}}>₹{s.travel.toLocaleString()}</td>
                        <td style={{textAlign:'right'}}>₹{s.special.toLocaleString()}</td>
                        <td style={{textAlign:'right',fontWeight:700}}>₹{s.gross.toLocaleString()}</td>
                        <td style={{textAlign:'right',color:'var(--danger)'}}>− ₹{s.pf.toLocaleString()}</td>
                        <td style={{textAlign:'right',color:'var(--danger)'}}>− ₹{s.pt.toLocaleString()}</td>
                        <td style={{textAlign:'right',fontWeight:700,color:'var(--success)',fontSize:14}}>₹{s.net.toLocaleString()}</td>
                        <td style={{textAlign:'center'}}>
                          <button className="btn btn-secondary btn-xs" onClick={()=>generatePayslip(e)} title="Download Payslip">
                            <Download style={{width:12}}/>Payslip
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Total row */}
                <tfoot>
                  <tr style={{background:'var(--primary-light)',fontWeight:700}}>
                    <td style={{color:'var(--primary)'}}>TOTAL ({activeEmps.length} employees)</td>
                    <td style={{textAlign:'right'}}>₹{activeEmps.reduce((a,e)=>a+calcSalary(e).basic,0).toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>₹{activeEmps.reduce((a,e)=>a+calcSalary(e).hra,0).toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>₹{activeEmps.reduce((a,e)=>a+calcSalary(e).travel,0).toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>₹{activeEmps.reduce((a,e)=>a+calcSalary(e).special,0).toLocaleString()}</td>
                    <td style={{textAlign:'right',color:'var(--primary)'}}>₹{totalMonthlySalary.toLocaleString()}</td>
                    <td style={{textAlign:'right',color:'var(--danger)'}}>− ₹{activeEmps.reduce((a,e)=>a+calcSalary(e).pf,0).toLocaleString()}</td>
                    <td style={{textAlign:'right',color:'var(--danger)'}}>− ₹{activeEmps.reduce((a,e)=>a+calcSalary(e).pt,0).toLocaleString()}</td>
                    <td style={{textAlign:'right',color:'var(--success)',fontSize:14}}>₹{activeEmps.reduce((a,e)=>a+calcSalary(e).net,0).toLocaleString()}</td>
                    <td/>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}


      {/* ── Add Employee Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" style={{maxWidth:620}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add New Employee</span>
              <button className="btn-ghost" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className={`form-control${errors.name?' error':''}`} placeholder="Employee name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                  {errors.name&&<div className="form-error">{errors.name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile *</label>
                  <input className={`form-control${errors.mobile?' error':''}`} placeholder="10-digit" value={form.mobile} onChange={e=>setForm(p=>({...p,mobile:e.target.value}))}/>
                  {errors.mobile&&<div className="form-error">{errors.mobile}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" placeholder="email@company.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Join Date *</label>
                  <input className={`form-control${errors.join_date?' error':''}`} type="date" value={form.join_date} onChange={e=>setForm(p=>({...p,join_date:e.target.value}))}/>
                  {errors.join_date&&<div className="form-error">{errors.join_date}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-control" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}>
                    {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <select className="form-control" value={form.designation} onChange={e=>setForm(p=>({...p,designation:e.target.value}))}>
                    {DESIGNATIONS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gross Salary (₹/month) *</label>
                  <input className={`form-control${errors.salary?' error':''}`} type="number" placeholder="e.g. 28000" value={form.salary} onChange={e=>setForm(p=>({...p,salary:e.target.value}))}/>
                  {errors.salary&&<div className="form-error">{errors.salary}</div>}
                  {form.salary>0&&<div className="form-hint">Net take-home ≈ ₹{Math.round(parseFloat(form.salary||0)-Math.round(parseFloat(form.salary||0)*0.0643)-200).toLocaleString()}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input className="form-control" placeholder="PAN for TDS" style={{fontFamily:'monospace'}} value={form.pan} onChange={e=>setForm(p=>({...p,pan:e.target.value.toUpperCase()}))}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <textarea className="form-control" rows={2} placeholder="Address" value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save Employee</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
