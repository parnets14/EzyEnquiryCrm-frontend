import { useState, useEffect, useCallback } from 'react'
import { ScrollText, RefreshCw, Search, AlertCircle, Filter } from 'lucide-react'
import { auditLogApi } from '../api/systemApi'

const ACTION_BADGE = {
  CREATE: 'badge-green',
  UPDATE: 'badge-blue',
  DELETE: 'badge-red',
}

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AuditLog() {
  const [logs, setLogs]       = useState([])
  const [pagination, setPag]  = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // Filters
  const [search, setSearch]   = useState('')
  const [action, setAction]   = useState('')
  const [moduleF, setModuleF] = useState('')
  const [fromDate, setFrom]   = useState('')
  const [toDate, setTo]       = useState('')
  const [page, setPage]       = useState(1)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, limit: 30 }
      if (action)   params.action = action
      if (moduleF)  params.module = moduleF
      if (fromDate) params.from_date = fromDate
      if (toDate)   params.to_date = toDate
      const res = await auditLogApi.list(params)
      const data = res?.data || res || {}
      setLogs(data.logs || [])
      setPag(data.pagination || { page: 1, pages: 1, total: (data.logs || []).length })
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }, [page, action, moduleF, fromDate, toDate])

  useEffect(() => { load() }, [load])

  const q = search.trim().toLowerCase()
  const match = (...vals) => !q || vals.some(v => (v || '').toLowerCase().includes(q))
  const filtered = logs.filter(l => match(l.user_name, l.user_role, l.module, l.path, l.entity_id))

  return (
    <div>
      <div className="breadcrumb">
        <span>Reports &amp; Tools</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Audit Log</span>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <ScrollText style={{ width: 16, marginRight: 6, verticalAlign: 'text-bottom' }} />
            Activity Audit Log {pagination.total ? `(${pagination.total})` : ''}
          </span>
          <div className="header-actions">
            <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              <RefreshCw style={{ width: 13 }} />Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', paddingBottom: 8 }}>
          <div style={{ flex: '1 1 200px', position: 'relative' }}>
            <Search style={{ width: 14, position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input className="form-input" style={{ paddingLeft: 30 }} placeholder="Search user / module / path…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ width: 130 }}>
            <select className="form-input" value={action} onChange={e => { setPage(1); setAction(e.target.value) }}>
              <option value="">All actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
          <div style={{ width: 140 }}>
            <input className="form-input" placeholder="Module (e.g. products)" value={moduleF}
              onChange={e => { setPage(1); setModuleF(e.target.value.trim()) }} />
          </div>
          <div style={{ width: 140 }}>
            <label className="form-label" style={{ fontSize: 10 }}>From</label>
            <input type="date" className="form-input" value={fromDate} onChange={e => { setPage(1); setFrom(e.target.value) }} />
          </div>
          <div style={{ width: 140 }}>
            <label className="form-label" style={{ fontSize: 10 }}>To</label>
            <input type="date" className="form-input" value={toDate} onChange={e => { setPage(1); setTo(e.target.value) }} />
          </div>
          {(action || moduleF || fromDate || toDate) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setPage(1); setAction(''); setModuleF(''); setFrom(''); setTo('') }}>
              <Filter style={{ width: 12 }} />Clear
            </button>
          )}
        </div>

        <div className="card-body" style={{ paddingTop: 0 }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b91c1c', padding: 12 }}>
              <AlertCircle style={{ width: 16 }} />{error}
            </div>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Path</th>
                  <th>Entity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No audit entries found.</td></tr>
                )}
                {!loading && filtered.map(l => (
                  <tr key={l._id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDateTime(l.created_at)}</td>
                    <td>{l.user_name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.user_role || '—'}</td>
                    <td><span className={`badge ${ACTION_BADGE[l.action] || 'badge-gray'}`}>{l.action || '—'}</span></td>
                    <td style={{ fontWeight: 600 }}>{l.module || '—'}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.path}>{l.path || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.entity_id || '—'}</td>
                    <td style={{ fontSize: 12 }}>{l.status_code || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.pages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
