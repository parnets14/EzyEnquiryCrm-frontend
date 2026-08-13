import { useState } from 'react'
import { Plus, Search, ArrowLeftRight, CheckCircle, Clock, XCircle, Eye, Pencil, Trash2 } from 'lucide-react'

const WAREHOUSES = ['Main Warehouse – Surat', 'Branch Warehouse – Mumbai', 'Depot – Ahmedabad']
const PRODUCTS = [
  'Kajaria Vitrified Floor Tile 800×800mm',
  'Somany Ceramic Floor Tile 600×600mm',
  'Johnson Wall Tile 300×600mm',
  'Kajaria Outdoor Parking Tile 400×400mm',
  'Somany Mosaic Collection 300×300mm',
]

const INIT_TRANSFERS = [
  { id: 'TRF-001', date: '02 Aug 2026', from: 'Main Warehouse – Surat', to: 'Branch Warehouse – Mumbai', product: 'Kajaria Vitrified Floor Tile 800×800mm', qty: 500, reason: 'Restock', status: 'Completed', approvedBy: 'Admin' },
  { id: 'TRF-002', date: '01 Aug 2026', from: 'Branch Warehouse – Mumbai', to: 'Main Warehouse – Surat', product: 'Somany Mosaic Collection 300×300mm', qty: 50, reason: 'Return', status: 'Completed', approvedBy: 'Admin' },
  { id: 'TRF-003', date: '31 Jul 2026', from: 'Main Warehouse – Surat', to: 'Depot – Ahmedabad', product: 'Johnson Wall Tile 300×600mm', qty: 200, reason: 'Customer Order', status: 'In Transit', approvedBy: 'Admin' },
  { id: 'TRF-004', date: '30 Jul 2026', from: 'Branch Warehouse – Mumbai', to: 'Main Warehouse – Surat', product: 'Kajaria Outdoor Parking Tile 400×400mm', qty: 300, reason: 'Restock', status: 'Pending', approvedBy: '' },
]

const statusBadge = { Completed: 'badge-green', 'In Transit': 'badge-cyan', Pending: 'badge-yellow', Cancelled: 'badge-red' }
const statusIcon  = { Completed: CheckCircle, 'In Transit': ArrowLeftRight, Pending: Clock, Cancelled: XCircle }

export default function StockTransfer() {
  const [transfers, setTransfers] = useState(INIT_TRANSFERS)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showModal, setShowModal]  = useState(false)
  const [form, setForm] = useState({ from: WAREHOUSES[0], to: WAREHOUSES[1], product: PRODUCTS[0], qty: '', reason: '', notes: '' })

  // View / Edit / Delete state
  const [viewItem, setViewItem]   = useState(null)
  const [editItem, setEditItem]   = useState(null)
  const [editForm, setEditForm]   = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)

  const filtered = transfers.filter(t =>
    (statusFilter === 'All' || t.status === statusFilter) &&
    (t.id.toLowerCase().includes(search.toLowerCase()) ||
     t.product.toLowerCase().includes(search.toLowerCase()) ||
     t.from.toLowerCase().includes(search.toLowerCase()) ||
     t.to.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = () => {
    if (!form.qty || form.from === form.to) return alert('Fill all fields. From and To must be different warehouses.')
    const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    setTransfers(prev => [{
      id: `TRF-${String(prev.length + 1).padStart(3, '0')}`,
      date: now, ...form, status: 'Pending', approvedBy: '',
    }, ...prev])
    setShowModal(false)
    setForm({ from: WAREHOUSES[0], to: WAREHOUSES[1], product: PRODUCTS[0], qty: '', reason: '', notes: '' })
  }

  const approveTransfer = (id) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'In Transit', approvedBy: 'Admin' } : t))
  }
  const completeTransfer = (id) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, status: 'Completed' } : t))
  }

  // Edit handlers
  const openEdit = (t) => {
    setEditItem(t)
    setEditForm({ from: t.from, to: t.to, product: t.product, qty: t.qty, reason: t.reason, notes: t.notes || '' })
  }
  const saveEdit = () => {
    if (!editForm.qty || editForm.from === editForm.to) return alert('Fill all fields. From and To must be different.')
    setTransfers(prev => prev.map(t => t.id === editItem.id ? { ...t, ...editForm } : t))
    setEditItem(null)
    setEditForm(null)
  }

  // Delete handler
  const confirmDelete = () => {
    setTransfers(prev => prev.filter(t => t.id !== deleteItem.id))
    setDeleteItem(null)
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Inventory</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Stock Transfer</span>
      </div>

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Stock Transfer</div>
          <div className="page-desc">Move inventory between warehouses with full approval workflow</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={14} /> New Transfer</button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Transfers', val: transfers.length,          color: 'blue',   icon: ArrowLeftRight },
          { label: 'Completed',       val: transfers.filter(t => t.status === 'Completed').length,  color: 'green',  icon: CheckCircle },
          { label: 'In Transit',      val: transfers.filter(t => t.status === 'In Transit').length, color: 'cyan',   icon: ArrowLeftRight },
          { label: 'Pending',         val: transfers.filter(t => t.status === 'Pending').length,    color: 'orange', icon: Clock },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.color}`}><s.icon size={18} /></div>
            <div className="stat-info"><div className="stat-label">{s.label}</div><div className="stat-value">{s.val}</div></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Transfer Log ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar"><Search size={14} /><input placeholder="Search transfers…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <select className="form-control" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              {['Pending', 'In Transit', 'Completed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Transfer ID</th><th>Date</th><th>From Warehouse</th><th>To Warehouse</th><th>Product</th><th>Qty</th><th>Reason</th><th>Approved By</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{t.id}</td>
                  <td style={{ fontSize: 12 }}>{t.date}</td>
                  <td style={{ fontSize: 12, maxWidth: 140 }}>{t.from}</td>
                  <td style={{ fontSize: 12, maxWidth: 140 }}>{t.to}</td>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{t.product}</td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{t.qty}</td>
                  <td style={{ fontSize: 12 }}>{t.reason}</td>
                  <td style={{ fontSize: 12 }}>{t.approvedBy || <span className="badge badge-gray">Pending</span>}</td>
                  <td><span className={`badge ${statusBadge[t.status]}`}>{t.status}</span></td>
                  <td>
                    <div className="table-actions" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.status === 'Pending' && (
                        <button className="btn btn-success btn-xs" onClick={() => approveTransfer(t.id)}>Approve</button>
                      )}
                      {t.status === 'In Transit' && (
                        <button className="btn btn-primary btn-xs" onClick={() => completeTransfer(t.id)}>Complete</button>
                      )}
                      <button title="View" onClick={() => setViewItem(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#3B82F6', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      ><Eye size={15} /></button>
                      <button title="Edit" onClick={() => openEdit(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#F59E0B', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FFFBEB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      ><Pencil size={15} /></button>
                      <button title="Delete" onClick={() => setDeleteItem(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#EF4444', display: 'flex', alignItems: 'center' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      ><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">🔄</div><h3>No transfers found</h3><p>Create a new stock transfer to get started.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Stock Transfer</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Warehouse *</label>
                  <select className="form-control" value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))}>
                    {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Warehouse *</label>
                  <select className="form-control" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}>
                    {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-control" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}>
                  {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input className="form-control" type="number" min={1} placeholder="0" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <select className="form-control" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
                    {['Restock', 'Return', 'Customer Order', 'Overflow', 'Quality Check', 'Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} placeholder="Additional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Create Transfer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {viewItem && (
        <div className="modal-overlay" onClick={() => setViewItem(null)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Transfer Details — {viewItem.id}</span>
              <button className="modal-close" onClick={() => setViewItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                ['Transfer ID', viewItem.id],
                ['Date', viewItem.date],
                ['From Warehouse', viewItem.from],
                ['To Warehouse', viewItem.to],
                ['Product', viewItem.product],
                ['Quantity', viewItem.qty],
                ['Reason', viewItem.reason],
                ['Notes', viewItem.notes || '—'],
                ['Approved By', viewItem.approvedBy || 'Not yet approved'],
                ['Status', viewItem.status],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #F1F5F9', gap: 12 }}>
                  <span style={{ width: 150, fontSize: 12, color: '#64748B', fontWeight: 600, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#1E293B', fontWeight: label === 'Transfer ID' ? 700 : 400 }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editItem && editForm && (
        <div className="modal-overlay" onClick={() => setEditItem(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Edit Transfer — {editItem.id}</span>
              <button className="modal-close" onClick={() => setEditItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Warehouse *</label>
                  <select className="form-control" value={editForm.from} onChange={e => setEditForm(f => ({ ...f, from: e.target.value }))}>
                    {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Warehouse *</label>
                  <select className="form-control" value={editForm.to} onChange={e => setEditForm(f => ({ ...f, to: e.target.value }))}>
                    {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-control" value={editForm.product} onChange={e => setEditForm(f => ({ ...f, product: e.target.value }))}>
                  {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input className="form-control" type="number" min={1} value={editForm.qty} onChange={e => setEditForm(f => ({ ...f, qty: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <select className="form-control" value={editForm.reason} onChange={e => setEditForm(f => ({ ...f, reason: e.target.value }))}>
                    {['Restock', 'Return', 'Customer Order', 'Overflow', 'Quality Check', 'Other'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deleteItem && (
        <div className="modal-overlay" onClick={() => setDeleteItem(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title" style={{ color: '#EF4444' }}>Delete Transfer</span>
              <button className="modal-close" onClick={() => setDeleteItem(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
              <p style={{ fontSize: 14, color: '#1E293B', fontWeight: 600 }}>
                Are you sure you want to delete <span style={{ color: '#EF4444' }}>{deleteItem.id}</span>?
              </p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                {deleteItem.product} — {deleteItem.from} → {deleteItem.to}
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteItem(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete} style={{ background: '#EF4444', color: '#fff', border: 'none' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
