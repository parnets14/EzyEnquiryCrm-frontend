import { useState } from 'react'
import {
  GitBranch, Plus, Edit2, Trash2, MapPin, Phone, Mail, User,
  X, Check, Building2, Search, Warehouse, LayoutGrid, List,
  CheckCircle, XCircle
} from 'lucide-react'

const INITIAL_BRANCHES = [
  { id: 1, code: 'BR-001', name: 'Head Office – Bangalore', city: 'Bangalore', state: 'Karnataka', address: '12, Tiles Market, Rajajinagar, Bangalore – 560010', manager: 'Arjun Mehta',  phone: '9880012345', email: 'bangalore@ezyenquiry.com', type: 'Head Office', status: 'Active',   warehouses: 2 },
  { id: 2, code: 'BR-002', name: 'Mysore Branch',            city: 'Mysore',    state: 'Karnataka', address: '45, Industrial Area, Hebbal, Mysore – 570016',       manager: 'Sunita Rao',   phone: '9845098765', email: 'mysore@ezyenquiry.com',     type: 'Branch',      status: 'Active',   warehouses: 1 },
  { id: 3, code: 'BR-003', name: 'Hubli Branch',             city: 'Hubli',     state: 'Karnataka', address: '8, Commerce Road, Gokul, Hubli – 580030',            manager: 'Ravi Kumar',   phone: '9741123456', email: 'hubli@ezyenquiry.com',      type: 'Branch',      status: 'Active',   warehouses: 1 },
  { id: 4, code: 'BR-004', name: 'Mangalore Branch',         city: 'Mangalore', state: 'Karnataka', address: '22, Port Road, Bunder, Mangalore – 575001',          manager: 'Pooja Kamath', phone: '9900123456', email: 'mangalore@ezyenquiry.com',  type: 'Branch',      status: 'Inactive', warehouses: 0 },
]

const EMPTY = { name: '', city: '', state: '', address: '', manager: '', phone: '', email: '', type: '', status: 'Active' }

// Per-stat card styling
const STAT_STYLES = {
  All:        { bg: '#EFF6FF', iconBg: '#DBEAFE', iconColor: '#2563EB', textColor: '#1D4ED8', borderColor: '#BFDBFE' },
  Active:     { bg: '#ECFDF5', iconBg: '#D1FAE5', iconColor: '#059669', textColor: '#047857', borderColor: '#A7F3D0' },
  Inactive:   { bg: '#FEF2F2', iconBg: '#FEE2E2', iconColor: '#DC2626', textColor: '#B91C1C', borderColor: '#FECACA' },
  Warehouses: { bg: '#F5F3FF', iconBg: '#EDE9FE', iconColor: '#7C3AED', textColor: '#6D28D9', borderColor: '#DDD6FE' },
}

export default function BranchManagement() {
  const [branches, setBranches] = useState(INITIAL_BRANCHES)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('All')   // 'All' | 'Active' | 'Inactive'
  const [viewMode, setViewMode] = useState('cards')  // 'cards' | 'table'
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [editId,   setEditId]   = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [errors,   setErrors]   = useState({})

  const filtered = branches.filter(b => {
    const matchStatus = filter === 'All' || b.status === filter
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.city.toLowerCase().includes(search.toLowerCase()) ||
      b.manager.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const openAdd    = () => { setForm(EMPTY); setErrors({}); setModal('add') }
  const openEdit   = (b) => { setForm({ name: b.name, city: b.city, state: b.state, address: b.address, manager: b.manager, phone: b.phone, email: b.email, type: b.type, status: b.status }); setEditId(b.id); setErrors({}); setModal('edit') }
  const openDelete = (b) => { setDeleteId(b.id); setModal('delete') }
  const closeModal = () => { setModal(null); setEditId(null); setDeleteId(null) }

  const validate = () => {
    const e = {}
    if (!form.name.trim())    e.name    = 'Branch name is required'
    if (!form.city.trim())    e.city    = 'City is required'
    if (!form.state.trim())   e.state   = 'State is required'
    if (!form.address.trim()) e.address = 'Address is required'
    if (!form.manager.trim()) e.manager = 'Manager name is required'
    if (!form.phone.trim())   e.phone   = 'Phone is required'
    if (!form.email.trim())   e.email   = 'Email is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    if (modal === 'add') {
      const next = { ...form, id: Date.now(), code: `BR-${String(branches.length + 1).padStart(3, '0')}`, warehouses: 0 }
      setBranches(p => [...p, next])
    } else {
      setBranches(p => p.map(b => b.id === editId ? { ...b, ...form } : b))
    }
    closeModal()
  }

  const handleDelete = () => {
    setBranches(p => p.filter(b => b.id !== deleteId))
    closeModal()
  }

  const totalWarehouses = branches.reduce((s, b) => s + (b.warehouses || 0), 0)

  const stats = [
    { key: 'All',        label: 'Total Branches', value: branches.length,                                      icon: GitBranch  },
    { key: 'Active',     label: 'Active',          value: branches.filter(b => b.status === 'Active').length,   icon: CheckCircle },
    { key: 'Inactive',   label: 'Inactive',        value: branches.filter(b => b.status === 'Inactive').length, icon: XCircle    },
    { key: 'Warehouses', label: 'Warehouses',      value: totalWarehouses,                                      icon: Warehouse,  noFilter: true },
  ]

  const F = (k, label, placeholder, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={form[k]}
        onChange={e => { setForm(p => ({ ...p, [k]: e.target.value })); setErrors(p => ({ ...p, [k]: '' })) }}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '9px 11px',
          border: `1.5px solid ${errors[k] ? '#EF4444' : '#E2E8F0'}`,
          borderRadius: 8, fontSize: 13, color: '#01152D', background: '#FAFBFC', outline: 'none',
        }}
        onFocus={e => { e.target.style.borderColor = '#FD5C02'; e.target.style.boxShadow = '0 0 0 3px rgba(253,92,2,0.1)' }}
        onBlur={e => { e.target.style.borderColor = errors[k] ? '#EF4444' : '#E2E8F0'; e.target.style.boxShadow = 'none' }}
      />
      {errors[k] && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors[k]}</div>}
    </div>
  )

  return (
    <div>
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <span>Company Management</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Branch Management</span>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="page-title">Branch Management</div>
          <div className="page-desc">Manage company branches across all locations</div>
        </div>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'linear-gradient(135deg,#FD5C02,#FE7722)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(253,92,2,0.3)', whiteSpace: 'nowrap' }}>
          <Plus size={15} /> Add Branch
        </button>
      </div>

      {/* Stat cards — clickable to filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {stats.map(s => {
          const st     = STAT_STYLES[s.key]
          const Icon   = s.icon
          const active = filter === s.key && !s.noFilter
          return (
            <div
              key={s.key}
              onClick={() => { if (!s.noFilter) setFilter(active ? 'All' : s.key) }}
              style={{
                background:   active ? st.iconBg : st.bg,
                border:       `1.5px solid ${active ? st.iconColor : st.borderColor}`,
                borderRadius: 10,
                padding:      '13px 15px',
                cursor:       s.noFilter ? 'default' : 'pointer',
                display:      'flex',
                alignItems:   'center',
                gap:          11,
                boxShadow:    active ? `0 0 0 3px ${st.borderColor}` : 'var(--shadow)',
                transition:   'all 0.15s',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 9, flexShrink: 0,
                background: st.iconBg,
                border:     `1px solid ${st.borderColor}`,
                display:    'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 17, height: 17, color: st.iconColor }} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: st.textColor, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: st.textColor, lineHeight: 1 }}>{s.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Search + view toggle */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow)' }}>
        <Search size={14} color="#94A3B8" style={{ flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by branch name, city, code or manager…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#01152D', background: 'transparent' }}
        />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>}

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 8, flexShrink: 0 }}>
          {[
            { key: 'All',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { key: 'Active',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
            { key: 'Inactive', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
          ].map(s => {
            const active = filter === s.key
            return (
              <button
                key={s.key}
                onClick={() => setFilter(s.key)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: `1.5px solid ${active ? s.color : s.border}`,
                  background: active ? s.color : s.bg,
                  color: active ? '#fff' : s.color,
                  cursor: 'pointer', transition: 'all 0.13s',
                }}
              >{s.key}</button>
            )
          })}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8, background: '#F4F6F9', borderRadius: 8, padding: 3, flexShrink: 0 }}>
          <button
            title="Card View"
            onClick={() => setViewMode('cards')}
            style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'cards' ? '#fff' : 'transparent', color: viewMode === 'cards' ? '#FD5C02' : '#94A3B8', boxShadow: viewMode === 'cards' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center' }}
          ><LayoutGrid size={14} /></button>
          <button
            title="Table View"
            onClick={() => setViewMode('table')}
            style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'table' ? '#fff' : 'transparent', color: viewMode === 'table' ? '#FD5C02' : '#94A3B8', boxShadow: viewMode === 'table' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', display: 'flex', alignItems: 'center' }}
          ><List size={14} /></button>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Branches ({filtered.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Branch Name</th>
                  <th>City / State</th>
                  <th>Manager</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Type</th>
                  <th>Warehouses</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>No branches found</td></tr>
                ) : filtered.map(b => (
                  <tr key={b.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{b.code}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FFF3EC', border: '1px solid #FED7B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={15} color="#FD5C02" />
                        </div>
                        <div>
                          <div className="user-name">{b.name}</div>
                          <div className="user-role">{b.address.substring(0, 40)}{b.address.length > 40 ? '…' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} color="#FD5C02" />
                        {b.city}, {b.state}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <User size={11} color="var(--text-muted)" />
                        {b.manager}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={11} color="var(--primary)" />
                        {b.phone}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={11} color="var(--primary)" />
                        {b.email}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                        background: b.type === 'Head Office' ? '#EFF6FF' : '#F4F6F9',
                        color:      b.type === 'Head Office' ? '#2563EB'  : '#64748B',
                        border:     `1px solid ${b.type === 'Head Office' ? '#BFDBFE' : '#E2E8F0'}`,
                        whiteSpace: 'nowrap',
                      }}>{b.type || '—'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#7C3AED' }}>{b.warehouses}</span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
                        background: b.status === 'Active' ? '#ECFDF5' : '#FEF2F2',
                        color:      b.status === 'Active' ? '#059669'  : '#DC2626',
                        border:     `1px solid ${b.status === 'Active' ? '#A7F3D0' : '#FECACA'}`,
                      }}>
                        {b.status === 'Active'
                          ? <CheckCircle size={9} />
                          : <XCircle size={9} />
                        }
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => openEdit(b)} style={{ color: '#3B82F6' }}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-ghost btn-xs" title="Delete" onClick={() => openDelete(b)} style={{ color: '#EF4444' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CARDS VIEW ── */}
      {viewMode === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
              <GitBranch size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#64748B', marginBottom: 4 }}>No branches found</div>
              <div style={{ fontSize: 13, color: '#94A3B8' }}>Try adjusting your search or filter</div>
            </div>
          ) : filtered.map(b => (
            <div
              key={b.id}
              style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF3', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.09)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'}
            >
              {/* Status accent bar */}
              <div style={{ height: 4, background: b.status === 'Active' ? 'linear-gradient(90deg,#FD5C02,#FE8A3A)' : '#E2E8F0' }} />
              <div style={{ padding: '18px 20px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#FFF3EC', border: '1px solid #FED7B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={18} color="#FD5C02" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#01152D', lineHeight: 1.2 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{b.code}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                      background: b.status === 'Active' ? '#ECFDF5' : '#FEF2F2',
                      color:      b.status === 'Active' ? '#059669'  : '#DC2626',
                      border:     `1px solid ${b.status === 'Active' ? '#A7F3D0' : '#FECACA'}`,
                    }}>{b.status}</span>
                    {b.type && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                        background: b.type === 'Head Office' ? '#EFF6FF' : '#F8FAFC',
                        color:      b.type === 'Head Office' ? '#2563EB'  : '#64748B',
                        border:     `1px solid ${b.type === 'Head Office' ? '#BFDBFE' : '#E2E8F0'}`,
                      }}>{b.type}</span>
                    )}
                  </div>
                </div>

                {/* Info rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                  <InfoRow icon={<MapPin size={12} />}  text={b.address} />
                  <InfoRow icon={<User size={12} />}    text={`Manager: ${b.manager}`} />
                  <InfoRow icon={<Phone size={12} />}   text={b.phone} />
                  <InfoRow icon={<Mail size={12} />}    text={b.email} />
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Warehouse size={13} color="#7C3AED" />
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      <span style={{ fontWeight: 700, color: '#7C3AED' }}>{b.warehouses}</span> Warehouse{b.warehouses !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ActionBtn icon={<Edit2 size={13} />}  color="#3B82F6" bg="#EFF6FF" onClick={() => openEdit(b)}   title="Edit" />
                    <ActionBtn icon={<Trash2 size={13} />} color="#EF4444" bg="#FEF2F2" onClick={() => openDelete(b)} title="Delete" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid #E8EDF3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#01152D' }}>{modal === 'add' ? 'Add New Branch' : 'Edit Branch'}</div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', borderRadius: 6, padding: 4, display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '22px 26px' }}>
              {F('name', 'Branch Name *', 'e.g. Mysore Branch')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {F('city',  'City *',  'e.g. Mysore')}
                {F('state', 'State *', 'e.g. Karnataka')}
              </div>
              {F('address', 'Full Address *', 'Street, Area, City – PIN')}
              {F('manager', 'Branch Manager *', 'Manager name')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {F('phone', 'Phone *', '9XXXXXXXXX', 'tel')}
                {F('email', 'Email *', 'branch@company.com', 'email')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                    Branch Type <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    placeholder="e.g. Head Office, Branch, Showroom…"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#01152D', background: '#FAFBFC', outline: 'none' }}
                    onFocus={e => { e.target.style.borderColor = '#FD5C02'; e.target.style.boxShadow = '0 0 0 3px rgba(253,92,2,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    style={{ width: '100%', padding: '9px 11px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#01152D', background: '#FAFBFC', outline: 'none' }}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 26px 22px', borderTop: '1px solid #E8EDF3', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeModal} style={{ padding: '10px 20px', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FD5C02,#FE7722)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 14px rgba(253,92,2,0.3)' }}>
                <Check size={14} /> {modal === 'add' ? 'Add Branch' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {modal === 'delete' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={22} color="#EF4444" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#01152D', textAlign: 'center', marginBottom: 8 }}>Delete Branch?</div>
            <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24 }}>
              This action cannot be undone. All branch data will be permanently removed.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: '#EF4444', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
      <span style={{ color: '#94A3B8', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.4 }}>{text}</span>
    </div>
  )
}

function ActionBtn({ icon, color, bg, onClick, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{ width: 30, height: 30, borderRadius: 7, background: bg, border: 'none', color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.92)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
    >{icon}</button>
  )
}
