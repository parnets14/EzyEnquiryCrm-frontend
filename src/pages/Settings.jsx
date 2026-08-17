import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Building2, Bell, Shield, Database, Globe, Palette, RefreshCw } from 'lucide-react'
import { companyApi } from '../api/companyApi'
import { useAuth } from '../context/AuthContext'

const TABS = ['General', 'Notifications', 'Security', 'Appearance']

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('General')
  const [saved,     setSaved]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [loadingCompany, setLoadingCompany] = useState(false)
  const [saveError, setSaveError] = useState('')

  // General settings — loaded from company API
  const [general, setGeneral] = useState({
    name: '', owner_name: '', mobile: '', email: '',
    address: '', gst_number: '', pan_number: '',
    biz_type: 'Wholesaler', city: '', state: '', pincode: '',
    website: '',
  })

  // Load company on mount
  useEffect(() => {
    if (!user?.company_id) return
    setLoadingCompany(true)
    companyApi.get(user.company_id)
      .then(res => {
        const c = res?.data || res
        setGeneral({
          name:        c.name        || '',
          owner_name:  c.owner_name  || '',
          mobile:      c.mobile      || '',
          email:       c.email       || '',
          address:     c.address     || '',
          gst_number:  c.gst_number  || '',
          pan_number:  c.pan_number  || '',
          biz_type:    c.biz_type    || 'Wholesaler',
          city:        c.city        || '',
          state:       c.state       || '',
          pincode:     c.pincode     || '',
          website:     c.website     || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoadingCompany(false))
  }, [user?.company_id])

  // Notification settings — local preference (no backend required per SOW)
  const [notifSettings, setNotifSettings] = useState({
    newEnquiry: true, orderConfirmed: true, lowStock: true,
    paymentReceived: true, dispatchUpdate: true, emailDigest: false,
    smsAlerts: true, pushNotifications: true,
  })

  // Security
  const [security, setSecurity] = useState({
    twoFactor: false, sessionTimeout: '30', passwordPolicy: 'Medium', loginAttempts: '5',
  })

  const handleSave = async () => {
    setSaving(true); setSaveError(''); setSaved(false)
    try {
      if (activeTab === 'General' && user?.company_id) {
        await companyApi.update(user.company_id, {
          name:        general.name,
          owner_name:  general.owner_name,
          mobile:      general.mobile,
          email:       general.email,
          address:     general.address,
          gst_number:  general.gst_number,
          pan_number:  general.pan_number,
          biz_type:    general.biz_type,
          city:        general.city,
          state:       general.state,
          pincode:     general.pincode,
          website:     general.website,
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggle = (key) => setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <>
      <div className="breadcrumb">
        <span>System</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Settings</span>
      </div>

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">System Settings</div>
          <div className="page-desc">Configure company, security and notification preferences</div>
        </div>
        <div className="page-header-actions">
          {saveError && <span className="badge badge-red" style={{ padding:'6px 12px' }}>⚠ {saveError}</span>}
          {saved && <span className="badge badge-green" style={{ padding:'6px 12px' }}>✓ Changes saved</span>}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display:'flex', alignItems:'center', gap:6 }}>
            {saving ? <RefreshCw style={{ width:14, animation:'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── General ── */}
      {activeTab === 'General' && (
        <div className="page-grid-2" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Building2 size={15} style={{ marginRight:6 }} />Company Information</span>
              {loadingCompany && <RefreshCw size={13} style={{ animation:'spin 1s linear infinite', color:'var(--text-muted)' }} />}
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input className="form-control" value={general.name} onChange={e => setGeneral(g => ({ ...g, name: e.target.value }))} placeholder="e.g. Tiles World Pvt Ltd" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-control" value={general.owner_name} onChange={e => setGeneral(g => ({ ...g, owner_name: e.target.value }))} placeholder="Owner / Director name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Type</label>
                  <select className="form-control" value={general.biz_type} onChange={e => setGeneral(g => ({ ...g, biz_type: e.target.value }))}>
                    {['Retailer','Wholesaler','Distributor','Manufacturer'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-control" value={general.mobile} onChange={e => setGeneral(g => ({ ...g, mobile: e.target.value }))} placeholder="+91 98765 43210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={general.email} onChange={e => setGeneral(g => ({ ...g, email: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-control" rows={2} value={general.address} onChange={e => setGeneral(g => ({ ...g, address: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" value={general.city} onChange={e => setGeneral(g => ({ ...g, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-control" value={general.state} onChange={e => setGeneral(g => ({ ...g, state: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-control" value={general.pincode} onChange={e => setGeneral(g => ({ ...g, pincode: e.target.value }))} maxLength={6} />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title"><Globe size={15} style={{ marginRight:6 }} />GST & Legal</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-control" value={general.gst_number} onChange={e => setGeneral(g => ({ ...g, gst_number: e.target.value.toUpperCase() }))} placeholder="e.g. 29ABCDE1234F1Z5" style={{ fontFamily:'monospace', letterSpacing:1 }} maxLength={15} />
              </div>
              <div className="form-group">
                <label className="form-label">PAN Number</label>
                <input className="form-control" value={general.pan_number} onChange={e => setGeneral(g => ({ ...g, pan_number: e.target.value.toUpperCase() }))} placeholder="e.g. ABCDE1234F" style={{ fontFamily:'monospace', letterSpacing:1 }} maxLength={10} />
              </div>
              <div className="form-group">
                <label className="form-label">Website</label>
                <input className="form-control" value={general.website} onChange={e => setGeneral(g => ({ ...g, website: e.target.value }))} placeholder="https://yourbusiness.com" />
              </div>
              {/* Read-only plan info */}
              <div style={{ marginTop:16, padding:'14px 16px', background:'var(--bg)', borderRadius:10, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6, fontWeight:600, textTransform:'uppercase' }}>Subscription Plan</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontWeight:800, fontSize:16 }}>{user?.subscription_plan || 'Free'}</span>
                  <span className={`badge ${user?.subscription_plan === 'Platinum' ? 'badge-purple' : user?.subscription_plan === 'Gold' ? 'badge-yellow' : user?.subscription_plan === 'Silver' ? 'badge-cyan' : 'badge-gray'}`}>
                    {user?.subscription_plan || 'Free'}
                  </span>
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                  Company Status: <strong style={{ color: user?.company_status === 'Approved' ? 'var(--success)' : 'var(--warning)' }}>{user?.company_status || '—'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications ── */}
      {activeTab === 'Notifications' && (
        <div className="card">
          <div className="card-header"><span className="card-title"><Bell size={15} style={{ marginRight: 6 }} />Notification Preferences</span></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {Object.entries({
                newEnquiry: 'New Enquiry Received',
                orderConfirmed: 'Order Confirmed',
                lowStock: 'Low Stock Alert',
                paymentReceived: 'Payment Received',
                dispatchUpdate: 'Dispatch Status Update',
                emailDigest: 'Daily Email Digest',
                smsAlerts: 'SMS Alerts',
                pushNotifications: 'Push Notifications',
              }).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
                  <button
                    onClick={() => toggle(key)}
                    style={{
                      width: 42, height: 22, borderRadius: 11,
                      background: notifSettings[key] ? 'var(--primary)' : 'var(--border)',
                      border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2,
                      left: notifSettings[key] ? 22 : 2,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.2s',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Security ── */}
      {activeTab === 'Security' && (
        <div className="page-grid-2" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-header"><span className="card-title"><Shield size={15} style={{ marginRight: 6 }} />Authentication</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Two-Factor Authentication</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Require OTP on every login</div>
                </div>
                <button
                  onClick={() => setSecurity(s => ({ ...s, twoFactor: !s.twoFactor }))}
                  style={{ width: 42, height: 22, borderRadius: 11, background: security.twoFactor ? 'var(--primary)' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                >
                  <span style={{ position: 'absolute', top: 2, left: security.twoFactor ? 22 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </button>
              </div>
              <div className="form-group">
                <label className="form-label">Session Timeout (minutes)</label>
                <select className="form-control" value={security.sessionTimeout} onChange={e => setSecurity(s => ({ ...s, sessionTimeout: e.target.value }))}>
                  {['15', '30', '60', '120', '240'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Max Login Attempts</label>
                <select className="form-control" value={security.loginAttempts} onChange={e => setSecurity(s => ({ ...s, loginAttempts: e.target.value }))}>
                  {['3', '5', '10'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Password Policy</label>
                <select className="form-control" value={security.passwordPolicy} onChange={e => setSecurity(s => ({ ...s, passwordPolicy: e.target.value }))}>
                  {['Low', 'Medium', 'High', 'Custom'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title"><Database size={15} style={{ marginRight: 6 }} />Audit & Compliance</span></div>
            <div className="card-body">
              <div className="alert alert-info"><Shield size={14} /><div><strong>Audit Logging is Active</strong><br /><span style={{ fontSize: 12 }}>All user actions are logged for compliance and security review.</span></div></div>
              {[
                { label: 'Retain audit logs for', value: '90 Days' },
                { label: 'Last backup', value: '05 Aug 2026 02:00 AM' },
                { label: 'Backup frequency', value: 'Daily' },
                { label: 'Encryption', value: 'AES-256' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Integrations / Appearance placeholder tabs ── */}
      {activeTab === 'Appearance' && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">🎨</div>
              <h3>Appearance Settings</h3>
              <p>Customise theme, logo, and branding.</p>
              <button className="btn btn-primary">Configure Appearance</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
