import { useState } from 'react'
import {
  Edit2, Save, Key, Camera, X,
  Eye, EyeOff, Shield, CheckCircle, AlertCircle,
  Mail, Phone, MapPin, Briefcase, Calendar, Users,
  Lock, Smartphone, Clock, LogIn, ShoppingCart,
  MessageSquare, CreditCard, Truck, User, ChevronRight,
  Activity, UserCheck, Database, Globe, Settings,
} from 'lucide-react'

/* ─── Activity data ─────────────────────────── */
const ACTIVITY_LOG = [
  { id: 1, action: 'Login',            detail: 'Logged in from Chrome on Windows',          time: '06 Aug 2026 09:12 AM', type: 'auth'     },
  { id: 2, action: 'Order Created',    detail: 'Order ORD-0001 — Ganesh Electronics',       time: '06 Aug 2026 09:30 AM', type: 'order'    },
  { id: 3, action: 'Enquiry Updated',  detail: 'ENQ-0001 status changed to Confirmed',      time: '06 Aug 2026 10:05 AM', type: 'enquiry'  },
  { id: 4, action: 'Payment Recorded', detail: '₹92,040 received from Ramesh Tiles Store',  time: '06 Aug 2026 11:20 AM', type: 'payment'  },
  { id: 5, action: 'Dispatch Created', detail: 'DIS-0001 dispatched via Shreeji Transport', time: '06 Aug 2026 12:00 PM', type: 'dispatch' },
  { id: 6, action: 'Profile Updated',  detail: 'Phone number and location updated',         time: '05 Aug 2026 03:15 PM', type: 'profile'  },
  { id: 7, action: 'Login',            detail: 'Logged in from Firefox on Android',         time: '05 Aug 2026 08:44 AM', type: 'auth'     },
  { id: 8, action: 'Logout',           detail: 'Session ended normally',                    time: '04 Aug 2026 06:55 PM', type: 'auth'     },
]

const TYPE_META = {
  auth:     { icon: LogIn,         color: '#8B5CF6', bg: '#F5F3FF', label: 'Auth'     },
  order:    { icon: ShoppingCart,  color: '#3B82F6', bg: '#EFF6FF', label: 'Order'    },
  enquiry:  { icon: MessageSquare, color: '#F59E0B', bg: '#FFFBEB', label: 'Enquiry'  },
  payment:  { icon: CreditCard,    color: '#10B981', bg: '#ECFDF5', label: 'Payment'  },
  dispatch: { icon: Truck,         color: '#06B6D4', bg: '#ECFEFF', label: 'Dispatch' },
  profile:  { icon: User,          color: '#FD5C02', bg: '#FFF3EC', label: 'Profile'  },
}

/* ─── Toggle helper ─────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, flexShrink: 0, background: value ? '#10B981' : '#CBD5E1', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
    </button>
  )
}

/* ═══════════════ EDIT PROFILE MODAL ═══════════════ */
function EditProfileModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({ ...profile })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit2 size={16} color="#FD5C02" />
            </div>
            <div>
              <div className="modal-title">Edit Profile</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Update your personal information</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#FD5C02,#FE8A3A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', border: '3px solid #fff', boxShadow: '0 4px 12px rgba(253,92,2,0.3)' }}>SA</div>
              <button style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: '#FD5C02', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <Camera size={10} color="#fff" />
              </button>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Profile Photo</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>JPG, PNG or GIF — max 2MB</div>
              <button className="btn btn-secondary btn-sm"><Camera size={12} /> Upload Photo</button>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className="form-control" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-control" value={form.department} onChange={e => set('department', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reporting To</label>
              <input className="form-control" value={form.reportingTo} onChange={e => set('reportingTo', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-control" value={form.location} onChange={e => set('location', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea className="form-control" rows={3} value={form.bio} onChange={e => set('bio', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}><Save size={14} /> Save Changes</button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ CHANGE PASSWORD MODAL ═══════════════ */
function ChangePasswordModal({ onClose }) {
  const [form, setForm]       = useState({ current: '', newPwd: '', confirm: '' })
  const [show, setShow]       = useState({ current: false, newPwd: false, confirm: false })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const set    = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const toggle = (k)    => setShow(p => ({ ...p, [k]: !p[k] }))

  const calcStr = (pwd) => {
    let s = 0
    if (pwd.length >= 8) s++
    if (/[A-Z]/.test(pwd)) s++
    if (/[0-9]/.test(pwd)) s++
    if (/[^A-Za-z0-9]/.test(pwd)) s++
    return s
  }
  const STR_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const STR_COLOR = ['', '#EF4444', '#F59E0B', '#3B82F6', '#10B981']
  const str = calcStr(form.newPwd)

  const handleSubmit = () => {
    if (!form.current)                return setError('Please enter your current password.')
    if (form.newPwd.length < 8)       return setError('New password must be at least 8 characters.')
    if (form.newPwd !== form.confirm)  return setError('Passwords do not match.')
    setError('')
    setSuccess(true)
    setTimeout(onClose, 1800)
  }

  const FIELDS = [
    { key: 'current', label: 'Current Password',      ph: 'Enter current password'  },
    { key: 'newPwd',  label: 'New Password',           ph: 'Min 8 characters'        },
    { key: 'confirm', label: 'Confirm New Password',   ph: 'Repeat new password'     },
  ]
  const REQS = [
    ['At least 8 characters',    form.newPwd.length >= 8],
    ['One uppercase letter',     /[A-Z]/.test(form.newPwd)],
    ['One number',               /[0-9]/.test(form.newPwd)],
    ['One special character',    /[^A-Za-z0-9]/.test(form.newPwd)],
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={16} color="#FD5C02" />
            </div>
            <div>
              <div className="modal-title">Change Password</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Update your account password</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {success ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle size={32} color="#10B981" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Password Updated!</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your password has been changed successfully.</div>
            </div>
          ) : (
            <div>
              {error && (
                <div className="alert alert-danger" style={{ marginBottom: 14 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              {FIELDS.map(({ key, label, ph }) => (
                <div key={key} className="form-group">
                  <label className="form-label">{label}</label>
                  <div style={{ position: 'relative' }}>
                    <input className="form-control" type={show[key] ? 'text' : 'password'} placeholder={ph} value={form[key]} onChange={e => set(key, e.target.value)} style={{ paddingRight: 40 }} />
                    <button type="button" onClick={() => toggle(key)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {key === 'newPwd' && form.newPwd && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= str ? STR_COLOR[str] : 'var(--border)', transition: 'background 0.2s' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: STR_COLOR[str], fontWeight: 600 }}>{STR_LABEL[str]}</div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Password requirements</div>
                {REQS.map(([txt, met]) => (
                  <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <CheckCircle size={13} color={met ? '#10B981' : '#CBD5E1'} />
                    <span style={{ color: met ? '#10B981' : 'var(--text-muted)' }}>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {!success && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit}><Key size={14} /> Update Password</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════ MAIN EXPORT ═══════════════ */
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/authApi'

export default function Profile() {
  const { user: authUser } = useAuth()
  const [activeTab,     setActiveTab]     = useState('Profile')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPwdModal,  setShowPwdModal]  = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [twoFA,         setTwoFA]         = useState(false)
  const [emailNotif,    setEmailNotif]    = useState(true)
  const [smsNotif,      setSmsNotif]      = useState(false)

  const [profile, setProfile] = useState({
    name: 'Super Admin', role: 'System Administrator',
    email: 'admin@ezyenquiry.com', phone: '+91 98765 43210',
    department: 'Management', reportingTo: 'Owner',
    joinDate: '01 Jan 2024', location: 'India',
    bio: 'System administrator responsible for managing ERP operations, user access, and overall business workflows across all modules.',
  })

  const handleSave = (updated) => {
    setProfile(updated)
    setShowEditModal(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const TABS = [
    { key: 'Profile',  icon: User,      label: 'Profile'  },
    { key: 'Security', icon: Lock,      label: 'Security' },
    { key: 'Activity', icon: Activity,  label: 'Activity' },
  ]

  return (
    <div>
      {showEditModal && <EditProfileModal profile={profile} onSave={handleSave} onClose={() => setShowEditModal(false)} />}
      {showPwdModal  && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="#FD5C02" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>My Profile</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 1 }}>View and manage your personal account information</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saved && (
            <span className="badge badge-green" style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={13} /> Saved
            </span>
          )}
          <button className="btn btn-secondary" onClick={() => setShowEditModal(true)} style={{ gap: 7 }}>
            <Edit2 size={14} /> Edit Profile
          </button>
        </div>
      </div>

      {/* ── Hero Banner ── */}
      <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 6, background: '#fff', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(1,21,45,0.08)' }}>
        {/* Gradient banner */}
        <div style={{ background: 'linear-gradient(120deg, #01152D 0%, #1a2d4a 35%, #7a2800 70%, #FD5C02 100%)', padding: '28px 32px 28px 32px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(253,92,2,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -30, right: 100, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg,#FD5C02,#FE8A3A)', border: '4px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', boxShadow: '0 6px 24px rgba(0,0,0,0.3)', cursor: 'pointer' }}
                onClick={() => setShowEditModal(true)}
              >SA</div>
              <div onClick={() => setShowEditModal(true)} style={{ position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: '50%', background: '#FD5C02', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                <Camera size={12} color="#fff" />
              </div>
            </div>

            {/* Name / role / contact */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 4 }}>{profile.name}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 12 }}>{profile.role} · {profile.department}</div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} color="rgba(255,255,255,0.7)" /> {profile.email}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} color="rgba(255,255,255,0.7)" /> {profile.phone}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} color="rgba(255,255,255,0.7)" /> {profile.location}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,0.18)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6EE7B7', display: 'inline-block' }} /> Active
              </span>
              <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: 'rgba(253,92,2,0.22)', color: '#FFA05C', border: '1px solid rgba(253,92,2,0.4)' }}>
                Admin
              </span>
            </div>
          </div>
        </div>

        {/* ── Tabs inside card ── */}
        <div style={{ borderTop: '1px solid var(--border)', background: '#fff', padding: '0 20px', display: 'flex', gap: 0 }}>
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '14px 18px',
                fontSize: 13, fontWeight: activeTab === key ? 700 : 500,
                color: activeTab === key ? '#FD5C02' : 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === key ? '2px solid #FD5C02' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════ PROFILE TAB ════════ */}
      {activeTab === 'Profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20, alignItems: 'start' }}>

          {/* Left — Personal Information */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(1,21,45,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <User size={16} color="#FD5C02" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Personal Information</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(true)} style={{ gap: 5 }}>
                <Edit2 size={11} /> Edit
              </button>
            </div>

            {[
              { label: 'Full Name',     value: profile.name,        Icon: User      },
              { label: 'Email Address', value: profile.email,       Icon: Mail      },
              { label: 'Phone Number',  value: profile.phone,       Icon: Phone     },
              { label: 'Department',    value: profile.department,  Icon: Briefcase },
              { label: 'Member Since',  value: profile.joinDate,    Icon: Calendar  },
              { label: 'Last Login',    value: '05 Aug 2026 09:12 AM', Icon: Clock  },
            ].map(({ label, value, Icon }, i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 14 }}>
                  <Icon size={14} color="#FD5C02" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Right — Role & Permissions Summary */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(1,21,45,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
              <Shield size={16} color="#FD5C02" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Role &amp; Permissions Summary</span>
            </div>

            {/* Bio */}
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Bio</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>{profile.bio}</div>
            </div>

            {[
              { label: 'Role',           value: 'Super Administrator',       Icon: UserCheck,  extra: null },
              { label: 'Access Level',   value: 'Full Access — All Modules', Icon: Lock,       extra: null },
              { label: 'Modules Access', value: '10 / 10 · 100%',           Icon: Database,   extra: null },
              { label: 'Permissions',    value: '254 Permissions',           Icon: Shield,     extra: null },
              { label: 'Data Access',    value: 'All Organizations',         Icon: Globe,      extra: null },
            ].map(({ label, value, Icon }, i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', padding: '13px 22px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{value}</span>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={13} color="#FD5C02" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ SECURITY TAB ════════ */}
      {activeTab === 'Security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20, alignItems: 'start' }}>

          {/* Password */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(1,21,45,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
              <Lock size={16} color="#FD5C02" />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Password &amp; Authentication</span>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg)', borderRadius: 10, marginBottom: 18, border: '1px solid var(--border)' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} color="#10B981" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Password is set</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last changed: 01 Jan 2024</div>
                </div>
                <span className="badge badge-green">Secure</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.65 }}>
                Use a strong password with at least 8 characters combining uppercase, lowercase, numbers, and special characters.
              </p>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowPwdModal(true)}>
                <Key size={14} /> Change Password
              </button>
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 2FA */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(1,21,45,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
                <Smartphone size={16} color="#FD5C02" />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Two-Factor Authentication</span>
              </div>
              <div style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: twoFA ? '#ECFDF5' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {twoFA ? <CheckCircle size={20} color="#10B981" /> : <AlertCircle size={20} color="#EF4444" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>2FA is {twoFA ? 'Enabled' : 'Disabled'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{twoFA ? 'Your account is protected.' : 'Enable for extra security.'}</div>
                  </div>
                  <Toggle value={twoFA} onChange={() => setTwoFA(v => !v)} />
                </div>
                {twoFA
                  ? <div className="alert alert-success"><CheckCircle size={14} /><span>2FA active. Account secured with OTP verification.</span></div>
                  : <div className="alert alert-warning"><AlertCircle size={14} /><span>Enable 2FA to add an extra layer of security.</span></div>
                }
              </div>
            </div>

            {/* Notifications */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(1,21,45,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
                <Settings size={16} color="#FD5C02" />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Notification Preferences</span>
              </div>
              {[
                { label: 'Email Notifications', desc: 'Receive alerts via email', value: emailNotif, onChange: () => setEmailNotif(v => !v), Icon: Mail },
                { label: 'SMS Notifications',   desc: 'Receive alerts via SMS',   value: smsNotif,   onChange: () => setSmsNotif(v => !v),   Icon: Smartphone },
              ].map(({ label, desc, value, onChange, Icon }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FFF3EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={14} color="#FD5C02" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                  <Toggle value={value} onChange={onChange} />
                </div>
              ))}
            </div>

            {/* Sessions */}
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(1,21,45,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
                <Globe size={16} color="#FD5C02" />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Active Sessions</span>
              </div>
              {[
                { device: 'Chrome on Windows',  location: 'Bangalore, IN', time: 'Current session', active: true  },
                { device: 'Firefox on Android', location: 'Mumbai, IN',    time: '05 Aug 2026',     active: false },
              ].map((sess, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: sess.active ? '#FFF3EC' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone size={14} color={sess.active ? '#FD5C02' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{sess.device}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sess.location} · {sess.time}</div>
                  </div>
                  {sess.active
                    ? <span className="badge badge-green">Current</span>
                    : <button className="btn btn-danger btn-xs">Revoke</button>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════ ACTIVITY TAB ════════ */}
      {activeTab === 'Activity' && (
        <div style={{ marginTop: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(1,21,45,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Activity size={16} color="#FD5C02" />
                <span style={{ fontSize: 14, fontWeight: 700 }}>Recent Activity Log</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>Last 7 days</span>
            </div>

            {ACTIVITY_LOG.map((log, idx) => {
              const meta = TYPE_META[log.type] || TYPE_META.profile
              const Icon = meta.icon
              return (
                <div
                  key={log.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 22px', borderBottom: idx < ACTIVITY_LOG.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.12s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{log.action}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> {log.time}
                        </span>
                        <span style={{ display: 'inline-flex', padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: meta.bg, color: meta.color, textTransform: 'capitalize', letterSpacing: '0.3px' }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{log.detail}</div>
                  </div>
                </div>
              )
            })}

            <div style={{ padding: '13px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Showing {ACTIVITY_LOG.length} recent activities</span>
              <button className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
                View All <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
