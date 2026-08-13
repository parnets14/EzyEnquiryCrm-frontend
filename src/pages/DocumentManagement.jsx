import { useState, useRef } from 'react'
import { Upload, Search, Download, Trash2, Eye, FolderOpen, FileText, File } from 'lucide-react'
import { documentApi } from '../api/systemApi'

const DOC_CATEGORIES = ['GST Certificates', 'Purchase Bills', 'Sales Bills', 'Product Catalogues', 'Price Lists', 'Company Documents', 'Other']

const fileIcon = (mime) => {
  if (!mime) return <File style={{ width: 20, color: '#6366F1' }} />
  if (mime.includes('pdf')) return <FileText style={{ width: 20, color: '#EF4444' }} />
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return <FileText style={{ width: 20, color: '#10B981' }} />
  return <File style={{ width: 20, color: '#6366F1' }} />
}

const catColors = {
  'GST Certificates': 'badge-purple', 'Purchase Bills': 'badge-orange',
  'Sales Bills': 'badge-blue', 'Product Catalogues': 'badge-cyan',
  'Price Lists': 'badge-green', 'Company Documents': 'badge-yellow', 'Other': 'badge-gray',
}

export default function DocumentManagement({ documents = [], setDocuments, loadingData }) {
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [showUpload, setShowUpload] = useState(false)
  const [viewMode, setViewMode]   = useState('table')
  const [uploadForm, setUploadForm] = useState({ category: 'GST Certificates', entity_type: '', tags: '', description: '' })
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const fileRef = useRef(null)

  const toast = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3500) }

  const filtered = documents.filter(d => {
    const name = d.file_name || d.name || ''
    const tags = Array.isArray(d.tags) ? d.tags.join(' ') : ''
    const cat  = d.doc_type || d.category || ''
    return (catFilter === 'All' || cat === catFilter) &&
      (name.toLowerCase().includes(search.toLowerCase()) || tags.toLowerCase().includes(search.toLowerCase()))
  })

  const handleUpload = async () => {
    if (!selectedFile) { alert('Please select a file first'); return }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('entity_type', uploadForm.category || 'General')
      formData.append('doc_type', uploadForm.category)
      const res = await documentApi.upload(formData)
      const newDocs = res?.data?.documents || (res?.data ? [res.data] : [])
      if (setDocuments) setDocuments(prev => [...newDocs, ...prev])
      setSelectedFile(null)
      setUploadForm({ category: 'GST Certificates', entity_type: '', tags: '', description: '' })
      setShowUpload(false)
      toast(`Document uploaded successfully`)
    } catch (err) {
      toast(`Upload failed: ${err.response?.data?.message || err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await documentApi.delete(id)
      if (setDocuments) setDocuments(prev => prev.filter(d => (d._id || d.id) !== id))
      toast('Document deleted')
    } catch (err) {
      toast(`Delete failed: ${err.response?.data?.message || err.message}`)
    }
  }

  const formatSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <>
      <div className="breadcrumb">
        <span>Reports & Tools</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Document Management</span>
      </div>

      {successMsg && <div className="alert alert-info" style={{ marginBottom: 14 }}>✓ {successMsg}</div>}

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Total Documents', val: documents.length, color: 'blue' },
          { label: 'Total Size', val: formatSize(documents.reduce((s, d) => s + (d.file_size || 0), 0)), color: 'purple' },
          { label: 'PDFs', val: documents.filter(d => (d.mime_type || '').includes('pdf')).length, color: 'red' },
          { label: 'This Month', val: documents.filter(d => { const dt = d.created_at; return dt && new Date(dt).getMonth() === new Date().getMonth() }).length, color: 'green' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}><FolderOpen /></div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <FolderOpen style={{ width: 14, color: 'var(--text-muted)' }} />
        <button className="chip" style={{ background: catFilter === 'All' ? 'var(--primary)' : undefined, color: catFilter === 'All' ? '#fff' : undefined, cursor: 'pointer' }} onClick={() => setCatFilter('All')}>
          All ({documents.length})
        </button>
        {DOC_CATEGORIES.map(cat => {
          const count = documents.filter(d => (d.doc_type || d.category || '') === cat).length
          if (count === 0) return null
          return (
            <button key={cat} className="chip"
              style={{ background: catFilter === cat ? 'var(--primary-light)' : undefined, color: catFilter === cat ? 'var(--primary)' : undefined, cursor: 'pointer', borderColor: catFilter === cat ? 'var(--primary)' : undefined }}
              onClick={() => setCatFilter(cat)}>
              {cat} ({count})
            </button>
          )
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Documents ({filtered.length})</span>
          <div className="header-actions">
            <div className="search-bar">
              <Search /><input placeholder="Search by name or tag…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 8, padding: 3 }}>
              {['table', 'grid'].map(v => (
                <button key={v} onClick={() => setViewMode(v)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === v ? '#fff' : 'transparent', fontWeight: viewMode === v ? 600 : 400, fontSize: 12, color: viewMode === v ? 'var(--text)' : 'var(--text-muted)', boxShadow: viewMode === v ? 'var(--shadow)' : 'none' }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => setShowUpload(true)}><Upload style={{ width: 14 }} />Upload Document</button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Category</th><th>Size</th><th>Uploaded By</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {loadingData && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Loading…</td></tr>}
                {!loadingData && filtered.map(d => {
                  const id = d._id || d.id
                  const dateStr = d.created_at
                    ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : (d.date || '—')
                  const uploaderName = d.uploaded_by?.name || d.uploadedBy || '—'
                  const cat = d.doc_type || d.category || '—'
                  return (
                    <tr key={id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {fileIcon(d.mime_type)}
                          <span style={{ fontWeight: 500, fontSize: 12 }}>{d.file_name || d.name}</span>
                        </div>
                      </td>
                      <td><span className={`badge ${catColors[cat] || 'badge-gray'}`}>{cat}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatSize(d.file_size)}</td>
                      <td style={{ fontSize: 12 }}>{uploaderName}</td>
                      <td style={{ fontSize: 12 }}>{dateStr}</td>
                      <td>
                        <div className="table-actions">
                          {d.file_url && (
                            <a href={`http://localhost:5000${d.file_url}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" title="View"><Eye style={{ width: 13 }} /></a>
                          )}
                          <button className="btn btn-ghost btn-xs" title="Delete" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(id)}><Trash2 style={{ width: 13 }} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loadingData && filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No documents found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {filtered.map(d => {
              const id = d._id || d.id
              const cat = d.doc_type || d.category || '—'
              return (
                <div key={id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg)' }}>
                  <div style={{ height: 80, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ transform: 'scale(2)' }}>{fileIcon(d.mime_type)}</div>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }} title={d.file_name || d.name}>{d.file_name || d.name}</div>
                    <span className={`badge ${catColors[cat] || 'badge-gray'}`} style={{ fontSize: 10 }}>{cat}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{formatSize(d.file_size)}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {d.file_url && <a href={`http://localhost:5000${d.file_url}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-xs" style={{ flex: 1 }}><Eye style={{ width: 11 }} />View</a>}
                      <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(id)}><Trash2 style={{ width: 11 }} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Upload Document</span><button className="btn-ghost" onClick={() => setShowUpload(false)}>✕</button></div>
            <div className="modal-body">
              <div style={{ border: '2px dashed var(--primary)', borderRadius: 10, padding: '24px', textAlign: 'center', background: 'var(--primary-light)', marginBottom: 16 }}>
                <Upload style={{ width: 32, color: 'var(--primary)', margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  {selectedFile ? `Selected: ${selectedFile.name}` : 'Click to select file'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>PDF, JPG, PNG, XLSX — max 10 MB</div>
                <label style={{ cursor: 'pointer' }}>
                  <span className="btn btn-secondary btn-sm">Browse File</span>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.png,.jpeg,.xlsx,.xls" style={{ display: 'none' }}
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Category *</label>
                  <select className="form-control" value={uploadForm.category} onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}>
                    {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={uploading || !selectedFile} onClick={handleUpload}>
                <Upload style={{ width: 14 }} />{uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
      {successMsg && <div className="alert alert-info" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>✓ {successMsg}</div>}
    </>
  )
}
