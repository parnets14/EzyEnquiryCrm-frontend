import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Clock, UserCog, CheckCircle, XCircle, Trash2,
  LogIn, LogOut, Download, FileText, DollarSign, Edit2, Eye,
  ChevronDown, AlertCircle, Printer, RefreshCw, Calendar,
} from 'lucide-react'
import { hrApi } from '../api/hrApi'
import { employeeMasterApi } from '../api/employeeMasterApi'

// ─── Constants (fallbacks if master data not yet created) ─────
const FALLBACK_DEPARTMENTS  = ['Sales', 'Accounts', 'Warehouse', 'Management', 'HR', 'IT']
const FALLBACK_DESIGNATIONS = ['Sales Executive', 'Accountant', 'Warehouse Staff', 'Manager', 'HR Manager', 'IT Executive']
const STATUSES_ATT  = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Holiday', 'Week Off']
const PAYMENT_MODES = ['Bank Transfer', 'Cash', 'Cheque', 'UPI']
const MONTH_NAMES   = ['January','February','March','April','May','June','July','August','September','October','November','December']

const EMPTY_FORM = {
  name: '', mobile: '', email: '', join_date: '',
  department: '', designation: '',
  salary: '', emp_code: '', branch: '', pan: '', address: '',
}

// ─── Helpers ──────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
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

const calcHours = (ci, co) => {
  if (!ci || !co) return null
  const diff = parseTime(co) - parseTime(ci)
  if (diff <= 0) return null
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

// Salary breakdown calculator (from gross)
const calcSalaryBreakdown = (gross, presentDays = 26, workingDays = 26, absentDays = 0) => {
  const g        = parseFloat(gross) || 0
  const basic    = Math.round(g * 0.40)
  const hra      = Math.round(g * 0.20)
  const travel   = Math.round(g * 0.10)
  const special  = g - basic - hra - travel   // remainder
  const pf       = Math.round(g * 0.0643)
  const pt       = 200
  const perDay   = workingDays > 0 ? g / workingDays : 0
  const absDed   = Math.round(perDay * absentDays)
  const totalDed = pf + pt + absDed
  const net      = g - totalDed
  return {
    gross: g, basic, hra, travel, special,
    pf_deduction: pf, pt_deduction: pt, absent_deduction: absDed,
    other_deductions: 0, total_deductions: totalDed, net_salary: Math.max(0, net),
  }
}

// ─── Badge helpers ─────────────────────────────────────────────
const attBadgeClass = (st) => {
  if (st === 'Present')  return 'badge-green'
  if (st === 'Late')     return 'badge-blue'
  if (st === 'Half Day') return 'badge-orange'
  if (st === 'On Leave') return 'badge-purple'
  if (st === 'Holiday' || st === 'Week Off') return 'badge-gray'
  return 'badge-red'
}

// ─────────────────────────────────────────────────────────────
export default function EmployeeManagement({
  branches = [], employees = [],
  addEmployee, updateEmployee, deleteEmployee, loadingData,
}) {
  const branchNames = branches.map(b => b.name || b).filter(Boolean)

  // ── Master data (Departments & Designations from master API) ─
  const [masterDepts,  setMasterDepts]  = useState([])
  const [masterDesigs, setMasterDesigs] = useState([])

  useEffect(() => {
    // Load departments and designations from Employee Master
    Promise.allSettled([
      employeeMasterApi.listDepartments(),
      employeeMasterApi.listDesignations(),
    ]).then(([dRes, dgRes]) => {
      if (dRes.status === 'fulfilled') {
        const d = dRes.value?.data || dRes.value
        setMasterDepts(Array.isArray(d?.departments) ? d.departments : [])
      }
      if (dgRes.status === 'fulfilled') {
        const d = dgRes.value?.data || dgRes.value
        setMasterDesigs(Array.isArray(d?.designations) ? d.designations : [])
      }
    })
  }, [])

  // Derive list of active department names (fall back to static if none configured)
  const deptNames = masterDepts.filter(d => d.is_active !== false).map(d => d.name)
  const allDeptNames = deptNames.length > 0 ? deptNames : FALLBACK_DEPARTMENTS

  // Designations filtered by selected department name
  const getDesigForDept = (deptName) => {
    if (!deptName) return FALLBACK_DESIGNATIONS
    const deptObj = masterDepts.find(d => d.name === deptName)
    if (!deptObj) return FALLBACK_DESIGNATIONS
    const filtered = masterDesigs
      .filter(dg => dg.is_active !== false &&
        String(dg.department_id?._id || dg.department_id) === String(deptObj._id || deptObj.id))
      .map(dg => dg.name)
    return filtered.length > 0 ? filtered : FALLBACK_DESIGNATIONS
  }

  // ── Tab & global ──────────────────────────────────────────
  const [tab,        setTab]        = useState('list')
  const [successMsg, setSuccessMsg] = useState('')
  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  // ── Employee List state ───────────────────────────────────
  const [search,       setSearch]       = useState('')
  const [deptFilter,   setDeptFilter]   = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editEmp,      setEditEmp]      = useState(null)   // null = add, object = edit
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [errors,       setErrors]       = useState({})
  const [saving,       setSaving]       = useState(false)

  // ── Attendance state ──────────────────────────────────────
  const [attDate,       setAttDate]       = useState(new Date().toISOString().split('T')[0])
  const [attRecords,    setAttRecords]    = useState([])
  const [attSummary,    setAttSummary]    = useState({ total:0,present:0,absent:0,late:0,halfDay:0,onLeave:0 })
  const [attLoading,    setAttLoading]    = useState(false)
  const [attSearch,     setAttSearch]     = useState('')
  const [attDept,       setAttDept]       = useState('')
  const [attBranch,     setAttBranch]     = useState('')
  const [attStatusFilt, setAttStatusFilt] = useState('')
  const [showAttModal,  setShowAttModal]  = useState(false)
  const [attEditRec,    setAttEditRec]    = useState(null)
  const [attForm,       setAttForm]       = useState({ status:'Present', check_in:'', check_out:'', notes:'' })

  // ── Salary state ──────────────────────────────────────────
  const [salMonth,      setSalMonth]      = useState(new Date().toISOString().slice(0, 7))
  const [salRecords,    setSalRecords]    = useState([])
  const [salLoading,    setSalLoading]    = useState(false)
  const [salProcessing, setSalProcessing] = useState(false)
  const [showPayModal,  setShowPayModal]  = useState(false)
  const [showSalDetail, setShowSalDetail] = useState(null)  // salary record for detail view
  const [payForm,       setPayForm]       = useState({ payment_mode:'Bank Transfer', payment_date:'', payment_reference:'' })
  const [payingId,      setPayingId]      = useState(null)

  // ── Refs to avoid re-fetch loops ──────────────────────────
  const attDateRef  = useRef(attDate)
  const salMonthRef = useRef(salMonth)
  attDateRef.current  = attDate
  salMonthRef.current = salMonth

  const activeEmps = employees.filter(e => e.is_active !== false)

  // ═══════════════════════════════════════════════════════════
  // ATTENDANCE LOAD
  // ═══════════════════════════════════════════════════════════
  const loadAttendance = useCallback(async (date) => {
    setAttLoading(true)
    try {
      const [listRes, sumRes] = await Promise.allSettled([
        hrApi.listAttendance({ date, limit: 500 }),
        hrApi.getAttendanceSummary({ date }),
      ])
      if (listRes.status === 'fulfilled') {
        const data = listRes.value?.data || listRes.value
        setAttRecords(Array.isArray(data?.attendance) ? data.attendance : [])
      }
      if (sumRes.status === 'fulfilled') {
        const s = sumRes.value?.data || sumRes.value
        setAttSummary({
          total:   s?.total    || activeEmps.length,
          present: s?.present  || 0,
          absent:  s?.absent   || 0,
          late:    s?.late     || 0,
          halfDay: s?.halfDay  || 0,
          onLeave: s?.onLeave  || 0,
        })
      }
    } catch { /* non-fatal */ }
    setAttLoading(false)
  }, [activeEmps.length])

  useEffect(() => {
    if (tab === 'attendance') loadAttendance(attDate)
  }, [tab, attDate]) // eslint-disable-line

  // ═══════════════════════════════════════════════════════════
  // SALARY LOAD
  // ═══════════════════════════════════════════════════════════
  const loadSalary = useCallback(async (monthStr) => {
    setSalLoading(true)
    const [year, month] = monthStr.split('-')
    try {
      const res = await hrApi.listSalary({ month, year, limit: 200 })
      const data = res?.data || res
      setSalRecords(Array.isArray(data?.salaries) ? data.salaries : [])
    } catch { /* non-fatal */ }
    setSalLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'salary') loadSalary(salMonth)
  }, [tab, salMonth]) // eslint-disable-line

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEE LIST helpers
  // ═══════════════════════════════════════════════════════════
  const filtered = employees.filter(e =>
    (!deptFilter || e.department === deptFilter) &&
    (!branchFilter || (e.branch || '') === branchFilter) &&
    ((e.name || '').toLowerCase().includes(search.toLowerCase()) ||
     (e.department || '').toLowerCase().includes(search.toLowerCase()) ||
     (e.emp_code || '').toLowerCase().includes(search.toLowerCase()))
  )

  const totalMonthlySalary = activeEmps.reduce((s, e) => s + (e.salary || 0), 0)

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name required'
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required'
    if (!form.join_date) e.join_date = 'Join date required'
    if (!form.salary || isNaN(form.salary) || parseFloat(form.salary) <= 0) e.salary = 'Valid salary required'
    return e
  }

  const openAddModal = () => {
    setEditEmp(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowModal(true)
  }

  const openEditModal = (emp) => {
    setEditEmp(emp)
    setForm({
      name:        emp.name        || '',
      mobile:      emp.mobile      || '',
      email:       emp.email       || '',
      join_date:   emp.join_date ? new Date(emp.join_date).toISOString().split('T')[0] : '',
      department:  emp.department  || 'Sales',
      designation: emp.designation || 'Sales Executive',
      salary:      String(emp.salary || ''),
      emp_code:    emp.emp_code    || '',
      branch:      emp.branch      || '',
      pan:         emp.pan         || '',
      address:     emp.address     || '',
    })
    setErrors({})
    setShowModal(true)
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const payload = {
      name: form.name, mobile: form.mobile, email: form.email,
      join_date: form.join_date, department: form.department,
      designation: form.designation, salary: parseFloat(form.salary),
      emp_code: form.emp_code, branch: form.branch,
      pan: form.pan, address: form.address,
    }
    let result
    if (editEmp) {
      result = await updateEmployee?.(editEmp._id || editEmp.id, payload)
    } else {
      result = await addEmployee?.(payload)
    }
    setSaving(false)
    if (result?.success === false) { toast(`Error: ${result.message}`); return }
    setForm(EMPTY_FORM); setErrors({})
    setShowModal(false)
    toast(editEmp ? `Employee ${form.name} updated` : `Employee ${form.name} added`)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee? Related attendance and salary records will remain for history.')) return
    const result = await deleteEmployee?.(id)
    if (result?.success === false) toast(`Error: ${result.message}`)
    else toast('Employee removed')
  }

  // ═══════════════════════════════════════════════════════════
  // ATTENDANCE helpers
  // ═══════════════════════════════════════════════════════════

  // Build a map: employeeId → attendance record for current date
  const attByEmp = {}
  attRecords.forEach(r => {
    const eid = r.employee_id?._id || r.employee_id
    if (eid) attByEmp[String(eid)] = r
  })

  const filteredAttn = activeEmps.filter(e => {
    const id = e._id || e.id
    const rec = attByEmp[String(id)]
    const empDept   = e.department || ''
    const empBranch = e.branch || ''
    const empStatus = rec?.status || 'Absent'
    if (attSearch && !(e.name || '').toLowerCase().includes(attSearch.toLowerCase()) &&
        !(e.emp_code || '').toLowerCase().includes(attSearch.toLowerCase())) return false
    if (attDept && empDept !== attDept) return false
    if (attBranch && empBranch !== attBranch) return false
    if (attStatusFilt && empStatus !== attStatusFilt) return false
    return true
  })

  const handleCheckIn = async (emp) => {
    const id = String(emp._id || emp.id)
    const time = nowTime()
    try {
      await hrApi.markAttendance({ employee_id: id, date: attDate, check_in: time, status: 'Present' })
      await loadAttendance(attDate)
      toast(`✓ ${emp.name} checked in at ${time}`)
    } catch { toast(`Error checking in ${emp.name}`) }
  }

  const handleCheckOut = async (emp) => {
    const id = String(emp._id || emp.id)
    const time = nowTime()
    const rec  = attByEmp[id]
    try {
      await hrApi.markAttendance({
        employee_id: id, date: attDate,
        check_in: rec?.check_in || time, check_out: time, status: 'Present',
      })
      await loadAttendance(attDate)
      toast(`✓ ${emp.name} checked out at ${time}`)
    } catch { toast(`Error checking out ${emp.name}`) }
  }

  const handleMarkStatus = async (emp, status) => {
    const id = String(emp._id || emp.id)
    try {
      await hrApi.markAttendance({ employee_id: id, date: attDate, status })
      await loadAttendance(attDate)
      toast(`${emp.name} marked ${status}`)
    } catch { toast(`Error updating ${emp.name}`) }
  }

  const openAttEdit = (emp) => {
    const id  = String(emp._id || emp.id)
    const rec = attByEmp[id]
    setAttEditRec({ emp, rec })
    setAttForm({
      status:    rec?.status    || 'Present',
      check_in:  rec?.check_in  || '',
      check_out: rec?.check_out || '',
      notes:     rec?.notes     || '',
    })
    setShowAttModal(true)
  }

  const handleSaveAtt = async () => {
    if (!attEditRec) return
    const id = String(attEditRec.emp._id || attEditRec.emp.id)
    try {
      await hrApi.markAttendance({
        employee_id: id, date: attDate,
        status: attForm.status,
        check_in:  attForm.check_in  || null,
        check_out: attForm.check_out || null,
        notes:     attForm.notes,
      })
      await loadAttendance(attDate)
      setShowAttModal(false)
      toast(`Attendance updated for ${attEditRec.emp.name}`)
    } catch { toast('Error saving attendance') }
  }

  // ═══════════════════════════════════════════════════════════
  // SALARY helpers
  // ═══════════════════════════════════════════════════════════
  const salRecordByEmp = {}
  salRecords.forEach(r => {
    const eid = String(r.employee_id?._id || r.employee_id)
    salRecordByEmp[eid] = r
  })

  // Get attendance summary for month to calculate absent days
  const getEmpAttForMonth = async (empId) => {
    const [year, month] = salMonth.split('-')
    try {
      const res = await hrApi.listAttendance({ employee_id: empId, month, year, limit: 100 })
      const data  = res?.data || res
      const recs  = Array.isArray(data?.attendance) ? data.attendance : []
      const presentStatuses = ['Present', 'Late', 'On Leave']
      const present   = recs.filter(r => presentStatuses.includes(r.status)).length
      const absent    = recs.filter(r => r.status === 'Absent').length
      const halfDay   = recs.filter(r => r.status === 'Half Day').length
      const onLeave   = recs.filter(r => r.status === 'On Leave').length
      return { present, absent, halfDay, onLeave, total: recs.length }
    } catch { return { present: 0, absent: 0, halfDay: 0, onLeave: 0, total: 0 } }
  }

  const handleProcessSalaries = async () => {
    setSalProcessing(true)
    const [year, month] = salMonth.split('-')
    let count = 0
    for (const emp of activeEmps) {
      const empId   = String(emp._id || emp.id)
      const gross   = emp.salary || 0
      if (!gross) continue
      const attData = await getEmpAttForMonth(empId)
      const workingDays = 26
      const bd = calcSalaryBreakdown(gross, attData.present, workingDays, attData.absent)
      try {
        await hrApi.createSalary({
          employee_id:      empId,
          month:            parseInt(month),
          year:             parseInt(year),
          basic_salary:     bd.basic,
          hra:              bd.hra,
          travel_allow:     bd.travel,
          special_allow:    bd.special,
          bonus:            0,
          gross_salary:     bd.gross,
          pf_deduction:     bd.pf_deduction,
          pt_deduction:     bd.pt_deduction,
          absent_deduction: bd.absent_deduction,
          other_deductions: 0,
          total_deductions: bd.total_deductions,
          net_salary:       bd.net_salary,
          working_days:     workingDays,
          present_days:     attData.present,
          absent_days:      attData.absent,
          leave_days:       attData.onLeave,
          half_days:        attData.halfDay,
        })
        count++
      } catch { /* non-fatal */ }
    }
    await loadSalary(salMonth)
    setSalProcessing(false)
    toast(`✓ Salaries processed for ${count} employee(s) — ${MONTH_NAMES[parseInt(month)-1]} ${year}`)
  }

  const openPayModal = (salRec) => {
    setPayingId(salRec._id || salRec.id)
    setPayForm({
      payment_mode: 'Bank Transfer',
      payment_date: new Date().toISOString().split('T')[0],
      payment_reference: '',
    })
    setShowPayModal(true)
  }

  const handleMarkPaid = async () => {
    if (!payingId) return
    try {
      await hrApi.paySalary(payingId, payForm)
      await loadSalary(salMonth)
      setShowPayModal(false)
      toast('✓ Salary marked as Paid')
    } catch { toast('Error marking salary paid') }
  }

  const generatePayslipPDF = (emp, salRec) => {
    const [year, month] = salMonth.split('-')
    const monthName = `${MONTH_NAMES[parseInt(month)-1]} ${year}`
    const bd = salRec
      ? {
          gross: salRec.gross_salary, basic: salRec.basic_salary,
          hra: salRec.hra, travel: salRec.travel_allow, special: salRec.special_allow,
          pf_deduction: salRec.pf_deduction, pt_deduction: salRec.pt_deduction,
          absent_deduction: salRec.absent_deduction, total_deductions: salRec.total_deductions,
          net_salary: salRec.net_salary,
        }
      : calcSalaryBreakdown(emp.salary || 0)

    const lines = [
      '═══════════════════════════════════════════════════════',
      '                      PAYSLIP',
      `                   ${monthName.toUpperCase()}`,
      '═══════════════════════════════════════════════════════',
      `Employee Name  : ${emp.name}`,
      `Employee ID    : ${emp.emp_code || emp._id || emp.id}`,
      `Department     : ${emp.department || ''}`,
      `Designation    : ${emp.designation || ''}`,
      `Branch         : ${emp.branch || '—'}`,
      '─────────────────────────────────────────────────────────',
      'ATTENDANCE SUMMARY',
      `Working Days   : ${salRec?.working_days ?? 26}`,
      `Present        : ${salRec?.present_days ?? '—'}`,
      `Absent         : ${salRec?.absent_days  ?? '—'}`,
      `Leave          : ${salRec?.leave_days   ?? '—'}`,
      `Half Day       : ${salRec?.half_days    ?? '—'}`,
      '─────────────────────────────────────────────────────────',
      'EARNINGS',
      `Basic          : ₹${(bd.basic    || 0).toLocaleString('en-IN')}`,
      `HRA            : ₹${(bd.hra      || 0).toLocaleString('en-IN')}`,
      `Travel Allow.  : ₹${(bd.travel   || 0).toLocaleString('en-IN')}`,
      `Special Allow. : ₹${(bd.special  || 0).toLocaleString('en-IN')}`,
      `Gross Salary   : ₹${(bd.gross    || 0).toLocaleString('en-IN')}`,
      '─────────────────────────────────────────────────────────',
      'DEDUCTIONS',
      `PF             : -₹${(bd.pf_deduction     || 0).toLocaleString('en-IN')}`,
      `Prof. Tax      : -₹${(bd.pt_deduction     || 0).toLocaleString('en-IN')}`,
      `Absent Dedn.   : -₹${(bd.absent_deduction || 0).toLocaleString('en-IN')}`,
      `Total Deductions: -₹${(bd.total_deductions|| 0).toLocaleString('en-IN')}`,
      '─────────────────────────────────────────────────────────',
      `NET TAKE-HOME  : ₹${(bd.net_salary || 0).toLocaleString('en-IN')}`,
      '─────────────────────────────────────────────────────────',
      `Payment Status : ${salRec?.status || 'Pending'}`,
      salRec?.payment_date ? `Payment Date   : ${fmtDate(salRec.payment_date)}` : '',
      salRec?.payment_mode ? `Payment Mode   : ${salRec.payment_mode}` : '',
      '═══════════════════════════════════════════════════════',
    ].filter(l => l !== '')

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `Payslip_${(emp.name || 'Employee').replace(/\s+/g,'_')}_${salMonth}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Payslip downloaded for ${emp.name}`)
  }

  // Totals for salary tab footer
  const salTotals = activeEmps.reduce((acc, emp) => {
    const id  = String(emp._id || emp.id)
    const rec = salRecordByEmp[id]
    acc.gross += rec ? rec.gross_salary    : (emp.salary || 0)
    acc.ded   += rec ? rec.total_deductions : 0
    acc.net   += rec ? rec.net_salary       : (emp.salary || 0)
    acc.paid  += rec?.status === 'Paid' ? (rec.net_salary || 0) : 0
    return acc
  }, { gross: 0, ded: 0, net: 0, paid: 0 })
  const salPending = salTotals.net - salTotals.paid

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      <div className="breadcrumb">
        <span>HR &amp; Admin</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Employee Management</span>
      </div>

      {successMsg && (
        <div className="alert alert-info" style={{ marginBottom: 14 }}>✓ {successMsg}</div>
      )}

      {/* Stats row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Employees', val: employees.length,                              color: 'blue'   },
          { label: 'Active Employees', val: activeEmps.length,                             color: 'green'  },
          { label: 'Present Today',   val: `${attSummary.present} / ${activeEmps.length}`, color: 'purple' },
          { label: 'Monthly Salary',  val: `₹${totalMonthlySalary.toLocaleString('en-IN')}`, color: 'orange' },
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
          <button key={key} className={`tab-btn${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ══════════════════ TAB: Employee List ══════════════════ */}
      {tab === 'list' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Employees ({filtered.length})</span>
            <div className="header-actions">
              <div className="search-bar">
                <Search />
                <input
                  placeholder="Search name, dept, ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select className="form-control" style={{ width: 160 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {allDeptNames.map(d => <option key={d}>{d}</option>)}
              </select>
              {branchNames.length > 0 && (
                <select className="form-control" style={{ width: 150 }} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                  <option value="">All Branches</option>
                  {branchNames.map(b => <option key={b}>{b}</option>)}
                </select>
              )}
              <button className="btn btn-primary" onClick={openAddModal}><Plus />Add Employee</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Employee</th><th>Mobile</th><th>Branch</th>
                  <th>Department</th><th>Designation</th><th>Join Date</th>
                  <th>Salary</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e._id || e.id}>
                    <td style={{ color:'var(--primary)', fontWeight:700, fontSize:12 }}>
                      {e.emp_code || (e._id || e.id)?.toString().slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <div className="user-info">
                        <div className="avatar avatar-green">{(e.name || '?').charAt(0)}</div>
                        <div>
                          <div className="user-name">{e.name}</div>
                          <div className="user-role">{e.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize:12 }}>{e.mobile}</td>
                    <td style={{ fontSize:12 }}>
                      {e.branch
                        ? <span className="badge badge-blue">{e.branch}</span>
                        : <span style={{ color:'var(--text-muted)' }}>—</span>}
                    </td>
                    <td><span className="badge badge-blue">{e.department}</span></td>
                    <td style={{ fontSize:12 }}>{e.designation}</td>
                    <td style={{ fontSize:12 }}>{fmtDate(e.join_date)}</td>
                    <td style={{ fontWeight:700 }}>₹{(e.salary || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span
                        className={`badge ${e.is_active === false ? 'badge-red' : 'badge-green'}`}
                        style={{ cursor:'pointer' }}
                        title="Click to toggle Active/Inactive"
                        onClick={() => updateEmployee?.(e._id || e.id, { is_active: e.is_active === false })}
                      >
                        {e.is_active === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-xs" title="Edit Employee" onClick={() => openEditModal(e)}>
                          <Edit2 style={{ width:12 }} />
                        </button>
                        <button className="btn btn-secondary btn-xs" title="Download Payslip"
                          onClick={() => { setSalMonth(salMonth); generatePayslipPDF(e, salRecordByEmp[String(e._id||e.id)]) }}>
                          <FileText style={{ width:12 }} />
                        </button>
                        <button className="btn btn-ghost btn-xs" style={{ color:'var(--danger)' }}
                          onClick={() => handleDelete(e._id || e.id)}>
                          <Trash2 style={{ width:13 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign:'center', padding:24, color:'var(--text-muted)' }}>
                    {loadingData ? 'Loading employees…' : 'No employees found'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ══════════════════ TAB: Attendance ══════════════════ */}
      {tab === 'attendance' && (
        <>
          {/* Summary cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', marginBottom: 16 }}>
            {[
              { label:'Total', val: attSummary.total || activeEmps.length, color:'blue' },
              { label:'Present',  val: attSummary.present,  color:'green'  },
              { label:'Absent',   val: attSummary.absent,   color:'orange' },
              { label:'Late',     val: attSummary.late,     color:'purple' },
              { label:'Half Day', val: attSummary.halfDay,  color:'yellow' },
              { label:'On Leave', val: attSummary.onLeave,  color:'gray'   },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding:'10px 12px' }}>
                <div className="stat-info">
                  <div className="stat-label" style={{ fontSize:11 }}>{s.label}</div>
                  <div className="stat-value" style={{ fontSize:22, fontWeight:700 }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <span className="card-title">Attendance — {fmtDate(attDate)}</span>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
                  Showing {filteredAttn.length} of {activeEmps.length} employees
                </div>
              </div>
              <div className="header-actions">
                <input className="form-control" type="date" value={attDate}
                  onChange={e => setAttDate(e.target.value)} style={{ width:160 }} />
                <button className="btn btn-secondary btn-sm" onClick={() => loadAttendance(attDate)}>
                  <RefreshCw style={{ width:13 }} />Refresh
                </button>
              </div>
            </div>

            {/* Attendance filters */}
            <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <div className="search-bar" style={{ minWidth:180 }}>
                <Search style={{ width:14 }} />
                <input placeholder="Search employee…" value={attSearch} onChange={e => setAttSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width:150 }} value={attDept} onChange={e => setAttDept(e.target.value)}>
                <option value="">All Departments</option>
                {allDeptNames.map(d => <option key={d}>{d}</option>)}
              </select>
              {branchNames.length > 0 && (
                <select className="form-control" style={{ width:140 }} value={attBranch} onChange={e => setAttBranch(e.target.value)}>
                  <option value="">All Branches</option>
                  {branchNames.map(b => <option key={b}>{b}</option>)}
                </select>
              )}
              <select className="form-control" style={{ width:130 }} value={attStatusFilt} onChange={e => setAttStatusFilt(e.target.value)}>
                <option value="">All Status</option>
                {STATUSES_ATT.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ padding:'8px 20px', background:'var(--primary-light)', borderBottom:'1px solid var(--border)', fontSize:12, color:'var(--primary)' }}>
              💡 Click <strong>Check In</strong> when employee arrives → <strong>Check Out</strong> when leaving → hours auto-calculated. Use <strong>Edit</strong> to set status manually.
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Dept / Branch</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th style={{ minWidth:200 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attLoading && (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding:20, color:'var(--text-muted)' }}>Loading attendance…</td></tr>
                  )}
                  {!attLoading && filteredAttn.map(emp => {
                    const id  = String(emp._id || emp.id)
                    const rec = attByEmp[id]
                    const ci    = rec?.check_in  || null
                    const co    = rec?.check_out || null
                    const hrs   = calcHours(ci, co)
                    const status = rec?.status || 'Absent'

                    const rowBg = status === 'Absent'   ? '#FFF5F5'
                                : status === 'Present' || status === 'Late' ? '#F0FFF4'
                                : status === 'On Leave' ? '#F3F0FF'
                                : 'transparent'

                    return (
                      <tr key={id} style={{ background: rowBg }}>
                        <td>
                          <div className="user-info">
                            <div className="avatar avatar-green">{(emp.name||'?').charAt(0)}</div>
                            <div>
                              <div className="user-name">{emp.name}</div>
                              <div className="user-role" style={{ fontSize:10 }}>
                                {emp.emp_code || id.slice(-6).toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize:12 }}>
                            <span className="badge badge-blue" style={{ fontSize:10 }}>{emp.department || '—'}</span>
                            {emp.branch && <span className="badge badge-gray" style={{ fontSize:10, marginLeft:4 }}>{emp.branch}</span>}
                          </div>
                        </td>
                        <td style={{ color: ci ? 'var(--success)' : 'var(--text-muted)', fontWeight: ci ? 700 : 400, fontSize:13 }}>
                          {ci || '—'}
                        </td>
                        <td style={{ color: co ? 'var(--primary)' : 'var(--text-muted)', fontWeight: co ? 700 : 400, fontSize:13 }}>
                          {co || '—'}
                        </td>
                        <td style={{ fontWeight:600, fontSize:13 }}>
                          {hrs || (ci && !co ? <span style={{ color:'var(--warning)', fontSize:11 }}>In progress…</span> : '—')}
                        </td>
                        <td>
                          <span className={`badge ${attBadgeClass(status)}`} style={{ fontSize:11 }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ fontSize:11, color:'var(--text-muted)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {rec?.notes || '—'}
                        </td>
                        <td>
                          <div className="table-actions">
                            {!ci && (
                              <button className="btn btn-success btn-xs" onClick={() => handleCheckIn(emp)}>
                                <LogIn style={{ width:11 }} />Check In
                              </button>
                            )}
                            {ci && !co && (
                              <button className="btn btn-primary btn-xs" onClick={() => handleCheckOut(emp)}>
                                <LogOut style={{ width:11 }} />Check Out
                              </button>
                            )}
                            {!ci && (
                              <button className="btn btn-ghost btn-xs"
                                style={{ color:'var(--warning)', fontSize:11 }}
                                onClick={() => handleMarkStatus(emp, 'On Leave')}>
                                Leave
                              </button>
                            )}
                            <button className="btn btn-secondary btn-xs" title="Edit / Correct" onClick={() => openAttEdit(emp)}>
                              <Edit2 style={{ width:11 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!attLoading && filteredAttn.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign:'center', padding:24, color:'var(--text-muted)' }}>
                      No employees match your filters
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}


      {/* ══════════════════ TAB: Salary & Payslips ══════════════════ */}
      {tab === 'salary' && (
        <>
          {/* Salary summary cards */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 16 }}>
            {[
              { label:'Total Employees',    val: activeEmps.length,                                   color:'blue'   },
              { label:'Gross Salary',       val: `₹${salTotals.gross.toLocaleString('en-IN')}`,       color:'purple' },
              { label:'Total Deductions',   val: `₹${salTotals.ded.toLocaleString('en-IN')}`,         color:'orange' },
              { label:'Net Salary',         val: `₹${salTotals.net.toLocaleString('en-IN')}`,         color:'green'  },
              { label:'Pending',            val: `₹${salPending.toLocaleString('en-IN')}`,            color:'red'    },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding:'10px 12px' }}>
                <div className="stat-info">
                  <div className="stat-label" style={{ fontSize:11 }}>{s.label}</div>
                  <div className="stat-value" style={{ fontSize:16, fontWeight:700 }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Salary &amp; Payslips</span>
              <div className="header-actions">
                <input className="form-control" type="month" value={salMonth}
                  onChange={e => setSalMonth(e.target.value)} style={{ width:150 }} />
                <button className="btn btn-secondary" onClick={() => loadSalary(salMonth)}>
                  <RefreshCw style={{ width:13 }} />Refresh
                </button>
                <button className="btn btn-secondary" onClick={() => activeEmps.forEach(emp =>
                    generatePayslipPDF(emp, salRecordByEmp[String(emp._id||emp.id)])
                  )}>
                  <Download style={{ width:13 }} />Export All
                </button>
                <button className="btn btn-primary" disabled={salProcessing} onClick={handleProcessSalaries}>
                  <DollarSign style={{ width:13 }} />
                  {salProcessing ? 'Processing…' : 'Process Salaries'}
                </button>
              </div>
            </div>

            {salLoading && (
              <div style={{ padding:20, textAlign:'center', color:'var(--text-muted)' }}>Loading salary records…</div>
            )}

            {!salLoading && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Month</th>
                      <th style={{ textAlign:'right' }}>Gross</th>
                      <th style={{ textAlign:'right' }}>PF (−)</th>
                      <th style={{ textAlign:'right' }}>PT (−)</th>
                      <th style={{ textAlign:'right' }}>Absent (−)</th>
                      <th style={{ textAlign:'right' }}>Net</th>
                      <th style={{ textAlign:'center' }}>Status</th>
                      <th style={{ textAlign:'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEmps.map(emp => {
                      const id  = String(emp._id || emp.id)
                      const rec = salRecordByEmp[id]
                      const bd  = rec
                        ? { gross: rec.gross_salary, pf: rec.pf_deduction, pt: rec.pt_deduction, absDed: rec.absent_deduction, net: rec.net_salary }
                        : (() => { const b = calcSalaryBreakdown(emp.salary||0); return { gross: b.gross, pf: b.pf_deduction, pt: b.pt_deduction, absDed: 0, net: b.net_salary } })()

                      const [y, m] = salMonth.split('-')
                      const monthLabel = `${MONTH_NAMES[parseInt(m)-1].slice(0,3)} ${y}`

                      return (
                        <tr key={id}>
                          <td>
                            <div className="user-info">
                              <div className="avatar avatar-green">{(emp.name||'?').charAt(0)}</div>
                              <div>
                                <div className="user-name">{emp.name}</div>
                                <div className="user-role" style={{ fontSize:11 }}>{emp.department} · {emp.designation}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize:12 }}>{monthLabel}</td>
                          <td style={{ textAlign:'right', fontWeight:600 }}>₹{(bd.gross||0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign:'right', color:'var(--danger)' }}>−₹{(bd.pf||0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign:'right', color:'var(--danger)' }}>−₹{(bd.pt||0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign:'right', color:'var(--danger)' }}>−₹{(bd.absDed||0).toLocaleString('en-IN')}</td>
                          <td style={{ textAlign:'right', fontWeight:700, color:'var(--success)', fontSize:14 }}>
                            ₹{(bd.net||0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign:'center' }}>
                            {rec
                              ? <span className={`badge ${rec.status === 'Paid' ? 'badge-green' : 'badge-orange'}`}>{rec.status}</span>
                              : <span className="badge badge-gray">Not Processed</span>}
                          </td>
                          <td style={{ textAlign:'center' }}>
                            <div className="table-actions" style={{ justifyContent:'center' }}>
                              {rec && (
                                <button className="btn btn-ghost btn-xs" title="View Details"
                                  onClick={() => setShowSalDetail(rec)}>
                                  <Eye style={{ width:12 }} />
                                </button>
                              )}
                              {rec && rec.status !== 'Paid' && (
                                <button className="btn btn-success btn-xs" onClick={() => openPayModal(rec)}>
                                  <DollarSign style={{ width:11 }} />Pay
                                </button>
                              )}
                              <button className="btn btn-secondary btn-xs" title="Download Payslip"
                                onClick={() => generatePayslipPDF(emp, rec)}>
                                <Download style={{ width:12 }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {activeEmps.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign:'center', padding:24, color:'var(--text-muted)' }}>
                        No active employees. Add employees first.
                      </td></tr>
                    )}
                  </tbody>
                  {activeEmps.length > 0 && (
                    <tfoot>
                      <tr style={{ background:'var(--primary-light)', fontWeight:700 }}>
                        <td colSpan={2} style={{ color:'var(--primary)' }}>TOTAL ({activeEmps.length} employees)</td>
                        <td style={{ textAlign:'right', color:'var(--primary)' }}>₹{salTotals.gross.toLocaleString('en-IN')}</td>
                        <td colSpan={2} style={{ textAlign:'right', color:'var(--danger)' }}>−₹{salTotals.ded.toLocaleString('en-IN')}</td>
                        <td/>
                        <td style={{ textAlign:'right', color:'var(--success)', fontSize:14 }}>₹{salTotals.net.toLocaleString('en-IN')}</td>
                        <td colSpan={2}/>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}


      {/* ═══════════════ MODALS ═══════════════ */}

      {/* ── Add / Edit Employee Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth:640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editEmp ? 'Edit Employee' : 'Add New Employee'}</span>
              <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className={`form-control${errors.name ? ' error' : ''}`} placeholder="Employee name"
                    value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  {errors.name && <div className="form-error">{errors.name}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile *</label>
                  <input className={`form-control${errors.mobile ? ' error' : ''}`} placeholder="10-digit mobile"
                    value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} />
                  {errors.mobile && <div className="form-error">{errors.mobile}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" placeholder="email@company.com"
                    value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Join Date *</label>
                  <input className={`form-control${errors.join_date ? ' error' : ''}`} type="date"
                    value={form.join_date} onChange={e => setForm(p => ({ ...p, join_date: e.target.value }))} />
                  {errors.join_date && <div className="form-error">{errors.join_date}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Employee Code</label>
                  <input className="form-control" placeholder="e.g. EMP-001"
                    value={form.emp_code} onChange={e => setForm(p => ({ ...p, emp_code: e.target.value }))} />
                </div>
                {branchNames.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Branch</label>
                    <select className="form-control" value={form.branch} onChange={e => setForm(p => ({ ...p, branch: e.target.value }))}>
                      <option value="">Select Branch</option>
                      {branchNames.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-control" value={form.department}
                    onChange={e => setForm(p => ({ ...p, department: e.target.value, designation: '' }))}>
                    <option value="">Select Department</option>
                    {allDeptNames.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <select className="form-control" value={form.designation}
                    onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}>
                    <option value="">Select Designation</option>
                    {getDesigForDept(form.department).map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gross Monthly Salary (₹) *</label>
                  <input className={`form-control${errors.salary ? ' error' : ''}`} type="number" placeholder="e.g. 28000"
                    value={form.salary} onChange={e => setForm(p => ({ ...p, salary: e.target.value }))} />
                  {errors.salary && <div className="form-error">{errors.salary}</div>}
                  {form.salary > 0 && (
                    <div className="form-hint">
                      Net ≈ ₹{Math.max(0, Math.round(parseFloat(form.salary||0) - Math.round(parseFloat(form.salary||0)*0.0643) - 200)).toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input className="form-control" placeholder="PAN for TDS" style={{ fontFamily:'monospace' }}
                    value={form.pan} onChange={e => setForm(p => ({ ...p, pan: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Residential Address</label>
                <textarea className="form-control" rows={2} placeholder="Address"
                  value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : (editEmp ? 'Update Employee' : 'Save Employee')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Edit / Correction Modal ── */}
      {showAttModal && attEditRec && (
        <div className="modal-overlay" onClick={() => setShowAttModal(false)}>
          <div className="modal" style={{ maxWidth:460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Edit Attendance — {attEditRec.emp.name}</span>
              <button className="btn-ghost" onClick={() => setShowAttModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>
                Date: <strong>{fmtDate(attDate)}</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={attForm.status} onChange={e => setAttForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUSES_ATT.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Check In Time</label>
                  <input className="form-control" placeholder="e.g. 09:30 AM"
                    value={attForm.check_in}
                    onChange={e => setAttForm(p => ({ ...p, check_in: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Check Out Time</label>
                  <input className="form-control" placeholder="e.g. 06:00 PM"
                    value={attForm.check_out}
                    onChange={e => setAttForm(p => ({ ...p, check_out: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks / Notes</label>
                <textarea className="form-control" rows={2} placeholder="Reason for correction, leave note, etc."
                  value={attForm.notes}
                  onChange={e => setAttForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              {attForm.check_in && attForm.check_out && (
                <div style={{ fontSize:12, color:'var(--success)', fontWeight:600 }}>
                  Working Hours: {calcHours(attForm.check_in, attForm.check_out) || '—'}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAttModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAtt}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Salary Detail Modal ── */}
      {showSalDetail && (
        <div className="modal-overlay" onClick={() => setShowSalDetail(null)}>
          <div className="modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Salary Details</span>
              <button className="btn-ghost" onClick={() => setShowSalDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              {(() => {
                const r   = showSalDetail
                const emp = r.employee_id
                const monthLabel = `${MONTH_NAMES[(r.month||1)-1]} ${r.year}`
                return (
                  <>
                    <div style={{ marginBottom:12 }}>
                      <strong style={{ fontSize:15 }}>{emp?.name || '—'}</strong>
                      <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:8 }}>
                        {emp?.emp_code || ''} · {emp?.department || ''} · {emp?.designation || ''}
                      </span>
                    </div>
                    <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
                      <tbody>
                        <tr style={{ background:'var(--bg-light)' }}>
                          <td colSpan={2} style={{ padding:'6px 8px', fontWeight:700, color:'var(--primary)' }}>
                            Attendance — {monthLabel}
                          </td>
                        </tr>
                        {[
                          ['Working Days', r.working_days],
                          ['Present', r.present_days],
                          ['Absent',  r.absent_days],
                          ['Leave',   r.leave_days],
                          ['Half Day',r.half_days],
                        ].map(([l,v]) => (
                          <tr key={l}>
                            <td style={{ padding:'4px 8px', color:'var(--text-muted)' }}>{l}</td>
                            <td style={{ padding:'4px 8px', textAlign:'right' }}>{v ?? '—'}</td>
                          </tr>
                        ))}
                        <tr style={{ background:'var(--bg-light)' }}>
                          <td colSpan={2} style={{ padding:'6px 8px', fontWeight:700, color:'var(--primary)' }}>Earnings</td>
                        </tr>
                        {[
                          ['Basic',         r.basic_salary],
                          ['HRA',           r.hra],
                          ['Travel Allow.', r.travel_allow],
                          ['Special Allow.',r.special_allow],
                          ['Bonus',         r.bonus],
                        ].map(([l,v]) => (
                          <tr key={l}>
                            <td style={{ padding:'4px 8px', color:'var(--text-muted)' }}>{l}</td>
                            <td style={{ padding:'4px 8px', textAlign:'right' }}>₹{(v||0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr style={{ fontWeight:700 }}>
                          <td style={{ padding:'4px 8px' }}>Gross Salary</td>
                          <td style={{ padding:'4px 8px', textAlign:'right' }}>₹{(r.gross_salary||0).toLocaleString('en-IN')}</td>
                        </tr>
                        <tr style={{ background:'var(--bg-light)' }}>
                          <td colSpan={2} style={{ padding:'6px 8px', fontWeight:700, color:'var(--danger)' }}>Deductions</td>
                        </tr>
                        {[
                          ['PF',              r.pf_deduction],
                          ['Prof. Tax',       r.pt_deduction],
                          ['Absent Deduction',r.absent_deduction],
                          ['Other',           r.other_deductions],
                        ].map(([l,v]) => (
                          <tr key={l}>
                            <td style={{ padding:'4px 8px', color:'var(--text-muted)' }}>{l}</td>
                            <td style={{ padding:'4px 8px', textAlign:'right', color:'var(--danger)' }}>−₹{(v||0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr style={{ fontWeight:700, fontSize:15, borderTop:'2px solid var(--border)' }}>
                          <td style={{ padding:'8px 8px' }}>Net Take-Home</td>
                          <td style={{ padding:'8px 8px', textAlign:'right', color:'var(--success)' }}>
                            ₹{(r.net_salary||0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                        <tr style={{ background:'var(--bg-light)' }}>
                          <td colSpan={2} style={{ padding:'6px 8px', fontWeight:700, color:'var(--primary)' }}>Payment</td>
                        </tr>
                        {[
                          ['Status',     r.status],
                          ['Date',       r.payment_date ? fmtDate(r.payment_date) : '—'],
                          ['Mode',       r.payment_mode || '—'],
                          ['Reference',  r.payment_reference || '—'],
                        ].map(([l,v]) => (
                          <tr key={l}>
                            <td style={{ padding:'4px 8px', color:'var(--text-muted)' }}>{l}</td>
                            <td style={{ padding:'4px 8px', textAlign:'right' }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                const r   = showSalDetail
                const emp = r.employee_id || activeEmps.find(e => String(e._id||e.id) === String(r.employee_id?._id || r.employee_id))
                if (emp) generatePayslipPDF(emp, r)
                setShowSalDetail(null)
              }}>
                <Download style={{ width:13 }} />Download Payslip
              </button>
              <button className="btn btn-primary" onClick={() => setShowSalDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark Salary Paid Modal ── */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" style={{ maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Mark Salary as Paid</span>
              <button className="btn-ghost" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Payment Mode</label>
                <select className="form-control" value={payForm.payment_mode}
                  onChange={e => setPayForm(p => ({ ...p, payment_mode: e.target.value }))}>
                  {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input className="form-control" type="date" value={payForm.payment_date}
                  onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Reference / Transaction ID</label>
                <input className="form-control" placeholder="Optional"
                  value={payForm.payment_reference}
                  onChange={e => setPayForm(p => ({ ...p, payment_reference: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleMarkPaid}>
                <CheckCircle style={{ width:13 }} />Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
