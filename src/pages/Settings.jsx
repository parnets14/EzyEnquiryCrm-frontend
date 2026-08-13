import { useState } from 'react'
import { Settings as SettingsIcon, Save, Building2, Bell, Shield, Database, Globe, Palette, Mail, Phone } from 'lucide-react'

const TABS = ['General', 'Notifications', 'Security', 'Integrations', 'Appearance']

export default function Settings() {
  const [activeTab, setActiveTab] = useState('General')
  const [saved, setSaved] = useState(false)

  // General settings
  const [general, setGeneral] = useState({
    companyName: 'ABC Electronics Distributor',
    phone: '+91 98765 43210',
    email: 'admin@abcelectronics.com',
    address: '123, MG Road, Bangalore - 560001',
    gst: '29ABCDE1234F1Z5',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata',
    financialYear: 'April - March',
    language: 'English',
  })

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    newEnquiry: true, orderConfirmed: true, lowStock: true,
    paymentReceived: true, dispatchUpdate: true, emailDigest: false,
    smsAlerts: true, pushNotifications: true,
  })

  // Security settings
  const [security, setSecurity] = useState({
    twoFactor: false, sessionTimeout: '30',
    passwordPolicy: 'Medium', loginAttempts: '5', auditLog: true,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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
          <div className="page-desc">Configure company, security, notifications and integration preferences</div>
        </div>
        <div className="page-header-actions">
          {saved && <span className="badge badge-green" style={{ padding: '6px 12px' }}>✓ Changes saved</span>}
          <button className="btn btn-primary" onClick={handleSave}><Save size={14} /> Save Changes</button>
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
              <span className="card-title"><Building2 size={15} style={{ marginRight: 6 }} />Company Information</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input className="form-control" value={general.companyName} onChange={e => setGeneral(g => ({ ...g, companyName: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={general.phone} onChange={e => setGeneral(g => ({ ...g, phone: e.target.value }))} />
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
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-control" value={general.gst} onChange={e => setGeneral(g => ({ ...g, gst: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title"><Globe size={15} style={{ marginRight: 6 }} />Regional Settings</span></div>
            <div className="card-body">
              {[
                { label: 'Currency',        key: 'currency',       options: ['INR', 'USD', 'EUR', 'GBP'] },
                { label: 'Date Format',     key: 'dateFormat',     options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
                { label: 'Timezone',        key: 'timezone',       options: ['Asia/Kolkata', 'UTC', 'America/New_York'] },
                { label: 'Financial Year',  key: 'financialYear',  options: ['April - March', 'January - December'] },
                { label: 'Language',        key: 'language',       options: ['English', 'Hindi', 'Tamil', 'Telugu'] },
              ].map(({ label, key, options }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <select className="form-control" value={general[key]} onChange={e => setGeneral(g => ({ ...g, [key]: e.target.value }))}>
                    {options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
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
      {(activeTab === 'Integrations' || activeTab === 'Appearance') && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">{activeTab === 'Integrations' ? '🔌' : '🎨'}</div>
              <h3>{activeTab} Settings</h3>
              <p>{activeTab === 'Integrations' ? 'Connect with accounting, SMS, email, and payment gateways.' : 'Customise theme, logo, and branding.'}</p>
              <button className="btn btn-primary">Configure {activeTab}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
