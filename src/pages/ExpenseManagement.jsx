import { useState } from 'react'
import { Plus, Receipt } from 'lucide-react'
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CATEGORIES = ['Rent', 'Salary', 'Marketing', 'Electricity', 'Transportation', 'Office Supplies', 'Maintenance', 'Other']
const COLORS = { Rent: '#4F46E5', Salary: '#7C3AED', Marketing: '#06B6D4', Electricity: '#F59E0B', Transportation: '#10B981', 'Office Supplies': '#8B5CF6', Maintenance: '#EF4444', Other: '#64748B' }

const EMPTY_FORM = { category: 'Rent', expense_date: '', description: '', amount: '', payment_mode: 'Bank Transfer' }

export default function ExpenseManagement({ expenses = [], addExpense, deleteExpense, loadingData }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  const catTotals = CATEGORIES.map(cat => ({
    name: cat,
    value: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
    color: COLORS[cat],
  })).filter(c => c.value > 0)

  const validate = () => {
    const e = {}
    if (!form.expense_date) e.expense_date = 'Date required'
    if (!form.description.trim()) e.description = 'Description required'
    if (!form.amount || isNaN(form.amount) || parseFloat(form.amount) <= 0) e.amount = 'Valid amount required'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    const result = await addExpense?.({
      category: form.category,
      amount: parseFloat(form.amount),
      description: form.description,
      expense_date: form.expense_date,
      payment_mode: form.payment_mode,
    })
    setSaving(false)
    if (result?.success === false) { toast(`Error: ${result.message}`); return }
    setForm(EMPTY_FORM); setErrors({})
    setShowModal(false)
    toast(`Expense added – ₹${parseFloat(form.amount).toLocaleString()}`)
  }

  const handleDelete = async (id) => {
    const result = await deleteExpense?.(id)
    if (result?.success === false) toast(`Error: ${result.message}`)
    else toast('Expense deleted')
  }

  return (
    <>
      <div className="breadcrumb"><span>Finance</span><span className="breadcrumb-sep">›</span><span className="breadcrumb-active">Expense Management</span></div>

      {successMsg && (
        <div className="alert alert-info" style={{ marginBottom: 14 }}>✓ {successMsg}</div>
      )}

      <div className="page-grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Expense Breakdown (Aug 2026)</span></div>
          <div className="card-body">
            {catTotals.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RePieChart>
                  <Pie data={catTotals} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85}>
                    {catTotals.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No expenses yet</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Monthly Summary</span></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {catTotals.map(c => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span>{c.name}</span>
                  <span style={{ fontWeight: 700 }}>₹{c.value.toLocaleString()}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${total > 0 ? (c.value / total) * 100 : 0}%`, background: c.color }} />
                </div>
              </div>
            ))}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>Total Expenses</span>
              <span style={{ color: 'var(--danger)' }}>₹{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Expense Entries ({expenses.length})</span>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setErrors({}); setShowModal(true) }}><Plus />Add Expense</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Payment Mode</th><th>Actions</th></tr></thead>
            <tbody>
              {loadingData && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading…</td></tr>}
              {!loadingData && expenses.map(e => {
                const id = e._id || e.id
                const dateStr = e.expense_date
                  ? new Date(e.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : (e.date || '—')
                return (
                  <tr key={id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>{id?.toString().slice(-6) || '—'}</td>
                    <td style={{ fontSize: 12 }}>{dateStr}</td>
                    <td><span className="badge badge-purple">{e.category}</span></td>
                    <td>{e.description}</td>
                    <td style={{ fontWeight: 700, color: 'var(--danger)' }}>₹{(e.amount || 0).toLocaleString()}</td>
                    <td><span className="chip">{e.payment_mode || e.paidBy || '—'}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(id)}>
                        <Receipt style={{ width: 12 }} />Del
                      </button>
                    </td>
                  </tr>
                )
              })}
              {!loadingData && expenses.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No expense entries yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Add Expense</span><button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-control" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className={`form-control${errors.expense_date ? ' error' : ''}`} type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} />
                  {errors.expense_date && <div className="form-error">{errors.expense_date}</div>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <input className={`form-control${errors.description ? ' error' : ''}`} placeholder="Expense details" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                {errors.description && <div className="form-error">{errors.description}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input className={`form-control${errors.amount ? ' error' : ''}`} type="number" placeholder="0.00" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                  {errors.amount && <div className="form-error">{errors.amount}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select className="form-control" value={form.payment_mode} onChange={e => setForm(p => ({ ...p, payment_mode: e.target.value }))}>
                    {['Cash', 'UPI', 'Bank Transfer', 'Cheque'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}><Receipt style={{ width: 14 }} />{saving ? 'Saving…' : 'Save Expense'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
