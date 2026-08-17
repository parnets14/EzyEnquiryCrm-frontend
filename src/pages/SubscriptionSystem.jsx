import { useState, useEffect } from 'react'
import { Crown, Check, X, CreditCard, TrendingUp, Users, Zap, RefreshCw } from 'lucide-react'
import { subscriptionApi } from '../api/systemApi'
import { useAuth } from '../context/AuthContext'

const PLANS = [
  {
    key: 'Free', name: 'Free', price: 0, period: 'Forever',
    color: '#64748B', bgColor: '#F8FAFC', badge: 'badge-gray',
    description: 'For individuals getting started',
    enquiryLimit: 10, userLimit: 1,
    features: [
      { text: 'Up to 10 Enquiries / month',      included: true  },
      { text: '1 User',                           included: true  },
      { text: 'Product Search (limited)',          included: true  },
      { text: 'Basic Dashboard',                  included: true  },
      { text: 'Order Management',                 included: false },
      { text: 'Inventory Management',             included: false },
      { text: 'Sales & Purchase Reports',         included: false },
      { text: 'CRM & Lead Management',            included: false },
      { text: 'Accounts & P&L Module',            included: false },
      { text: 'Multi-Warehouse',                  included: false },
      { text: 'Priority Listing',                 included: false },
      { text: 'AI Features',                      included: false },
    ],
  },
  {
    key: 'Silver', name: 'Silver', price: 1499, period: '/month',
    color: '#06B6D4', bgColor: '#ECFEFF', badge: 'badge-cyan',
    description: 'For small tile retailers',
    enquiryLimit: 100, userLimit: 5,
    features: [
      { text: 'Up to 100 Enquiries / month',      included: true  },
      { text: 'Up to 5 Users',                    included: true  },
      { text: 'Full Product Search',              included: true  },
      { text: 'Advanced Dashboard',               included: true  },
      { text: 'Order Management',                 included: true  },
      { text: 'Inventory Management',             included: true  },
      { text: 'Sales & Purchase Reports',         included: true  },
      { text: 'CRM & Lead Management',            included: false },
      { text: 'Accounts & P&L Module',            included: false },
      { text: 'Multi-Warehouse',                  included: false },
      { text: 'Priority Listing',                 included: false },
      { text: 'AI Features',                      included: false },
    ],
  },
  {
    key: 'Gold', name: 'Gold', price: 2999, period: '/month',
    color: '#F59E0B', bgColor: '#FFFBEB', badge: 'badge-yellow',
    description: 'For growing wholesalers', popular: true,
    enquiryLimit: 500, userLimit: 15,
    features: [
      { text: 'Up to 500 Enquiries / month',      included: true  },
      { text: 'Up to 15 Users',                   included: true  },
      { text: 'Full Product Search',              included: true  },
      { text: 'Advanced Dashboard + Analytics',   included: true  },
      { text: 'Order Management',                 included: true  },
      { text: 'Inventory Management',             included: true  },
      { text: 'Sales & Purchase Reports',         included: true  },
      { text: 'CRM & Lead Management',            included: true  },
      { text: 'Accounts & P&L Module',            included: true  },
      { text: 'Multi-Warehouse (up to 3)',         included: true  },
      { text: 'Priority Listing',                 included: false },
      { text: 'AI Features',                      included: false },
    ],
  },
  {
    key: 'Platinum', name: 'Platinum', price: 5999, period: '/month',
    color: '#8B5CF6', bgColor: '#F5F3FF', badge: 'badge-purple',
    description: 'For enterprise distributors',
    enquiryLimit: 999999, userLimit: 999999,
    features: [
      { text: 'Unlimited Enquiries',              included: true  },
      { text: 'Unlimited Users',                  included: true  },
      { text: 'Full Product Search',              included: true  },
      { text: 'Advanced Dashboard + Analytics',   included: true  },
      { text: 'Order Management',                 included: true  },
      { text: 'Inventory Management',             included: true  },
      { text: 'Sales & Purchase Reports',         included: true  },
      { text: 'CRM & Lead Management',            included: true  },
      { text: 'Accounts & P&L Module',            included: true  },
      { text: 'Multi-Warehouse (unlimited)',       included: true  },
      { text: 'Top Priority Listing',             included: true  },
      { text: 'AI Features (Beta)',               included: true  },
    ],
  },
]

export default function SubscriptionSystem({ enquiries = [] }) {
  const { user } = useAuth()
  const [tab,           setTab]           = useState('plans')
  const [history,       setHistory]       = useState([])
  const [loadingHistory,setLoadingHistory] = useState(false)
  const [showUpgrade,   setShowUpgrade]   = useState(null)
  const [upgrading,     setUpgrading]     = useState(false)
  const [upgradeMsg,    setUpgradeMsg]    = useState('')

  // Current plan from logged-in user's company subscription_plan
  const currentPlanKey = user?.subscription_plan || 'Free'
  const currentPlan    = PLANS.find(p => p.key === currentPlanKey) || PLANS[0]

  // Enquiry usage this month
  const thisMonth = new Date().getMonth()
  const thisYear  = new Date().getFullYear()
  const monthEnquiries = enquiries.filter(e => {
    const d = new Date(e.created_at || 0)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).length
  const enquiryLimit   = currentPlan.enquiryLimit
  const usagePct       = enquiryLimit >= 999999 ? 0 : Math.min(100, (monthEnquiries / enquiryLimit) * 100)

  // Fetch billing history from API
  useEffect(() => {
    if (tab !== 'history') return
    setLoadingHistory(true)
    subscriptionApi.list()
      .then(res => {
        const d = res?.data || res
        setHistory(Array.isArray(d) ? d : [])
      })
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false))
  }, [tab])

  const handleUpgrade = async () => {
    if (!showUpgrade) return
    setUpgrading(true)
    try {
      const plan = PLANS.find(p => p.key === showUpgrade)
      const today = new Date().toISOString().split('T')[0]
      const expiry = new Date(); expiry.setMonth(expiry.getMonth() + 1)
      await subscriptionApi.create({
        plan: showUpgrade,
        starts_at: today,
        expires_at: expiry.toISOString().split('T')[0],
        amount_paid: plan?.price || 0,
      })
      setUpgradeMsg(`✓ Upgraded to ${showUpgrade} plan! Please re-login to see updated access.`)
      setShowUpgrade(null)
      // Reload history
      const res = await subscriptionApi.list()
      const d = res?.data || res
      setHistory(Array.isArray(d) ? d : [])
    } catch (err) {
      setUpgradeMsg(`Error: ${err.response?.data?.message || 'Upgrade failed. Please try again.'}`)
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <>
      <div className="breadcrumb">
        <span>System Management</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Subscription</span>
      </div>

      {upgradeMsg && (
        <div className={`alert ${upgradeMsg.startsWith('Error') ? 'alert-danger' : 'alert-success'}`} style={{ marginBottom:16 }}>
          {upgradeMsg}
          <button style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:16 }} onClick={() => setUpgradeMsg('')}>✕</button>
        </div>
      )}

      {/* Current plan banner */}
      <div style={{
        background: `linear-gradient(135deg, ${currentPlan.color} 0%, ${currentPlan.color}CC 100%)`,
        borderRadius:12, padding:'20px 24px', marginBottom:20, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Crown style={{ width:24 }} />
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:800 }}>{currentPlan.name} Plan — {user?.company_status || 'Active'}</div>
            <div style={{ fontSize:13, opacity:.85 }}>
              {user?.company_name || 'Your Company'} · {enquiryLimit >= 999999 ? 'Unlimited enquiries' : `${monthEnquiries} / ${enquiryLimit} enquiries this month`}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {enquiryLimit < 999999 && (
            <>
              <div style={{ textAlign:'right', marginRight:8 }}>
                <div style={{ fontSize:12, opacity:.8 }}>Enquiries Used</div>
                <div style={{ fontWeight:700 }}>{monthEnquiries} / {enquiryLimit} this month</div>
              </div>
              <div style={{ width:80, height:6, borderRadius:3, background:'rgba(255,255,255,.3)' }}>
                <div style={{ width:`${usagePct}%`, height:'100%', borderRadius:3, background:'#fff', transition:'width .3s' }} />
              </div>
            </>
          )}
          {currentPlanKey !== 'Platinum' && (
            <button className="btn" style={{ background:'#fff', color:currentPlan.color, fontWeight:700, marginLeft:8 }}
              onClick={() => setShowUpgrade('Platinum')}>
              <Zap style={{ width:14, color:currentPlan.color }} />Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:20 }}>
        {[
          { label:'Current Plan',     val: currentPlan.name,                                                            color:'orange', icon:<Crown /> },
          { label:'Enquiries (Month)',val: enquiryLimit >= 999999 ? `${monthEnquiries} (Unlimited)` : `${monthEnquiries} / ${enquiryLimit}`, color:'green',  icon:<TrendingUp /> },
          { label:'Plan Price',       val: currentPlan.price === 0 ? 'Free' : `₹${currentPlan.price.toLocaleString()}/mo`,color:'blue',   icon:<CreditCard /> },
          { label:'User Limit',       val: currentPlan.userLimit >= 999999 ? 'Unlimited' : `Up to ${currentPlan.userLimit}`, color:'purple', icon:<Users /> },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding:'14px 16px' }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize:16 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['plans','Plans & Pricing'],['history','Billing History']].map(([key,label]) => (
          <button key={key} className={`tab-btn${tab===key?' active':''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* Plans */}
      {tab === 'plans' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
          {PLANS.map(plan => {
            const isCurrent = plan.key === currentPlanKey
            return (
              <div key={plan.key} className="card" style={{ position:'relative', border: isCurrent ? `2px solid ${plan.color}` : undefined }}>
                {plan.popular && !isCurrent && (
                  <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'#fff', fontSize:11, fontWeight:700, padding:'3px 14px', borderRadius:20, whiteSpace:'nowrap' }}>⭐ Most Popular</div>
                )}
                {isCurrent && (
                  <div style={{ position:'absolute', top:-12, right:16, background:'var(--success)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:20 }}>✓ Current</div>
                )}
                <div className="card-body" style={{ padding:20 }}>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <Crown style={{ width:20, color:plan.color }} />
                      <span style={{ fontWeight:800, fontSize:16, color:plan.color }}>{plan.name}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-muted)' }}>{plan.description}</div>
                  </div>
                  <div style={{ marginBottom:16, padding:'12px', borderRadius:8, background:plan.bgColor }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                      <span style={{ fontSize:28, fontWeight:800, color:plan.color }}>
                        {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}`}
                      </span>
                      {plan.price > 0 && <span style={{ fontSize:13, color:'var(--text-muted)' }}>{plan.period}</span>}
                    </div>
                    {plan.price > 0 && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Billed monthly · GST extra</div>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:20 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12 }}>
                        {f.included ? <Check style={{ width:14, color:'var(--success)', flexShrink:0, marginTop:1 }} /> : <X style={{ width:14, color:'var(--text-light)', flexShrink:0, marginTop:1 }} />}
                        <span style={{ color: f.included ? 'var(--text)' : 'var(--text-light)' }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                  {isCurrent ? (
                    <button className="btn" style={{ width:'100%', justifyContent:'center', background:plan.bgColor, color:plan.color, border:`1px solid ${plan.color}`, cursor:'default' }} disabled>Current Plan</button>
                  ) : (
                    <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', background:plan.color }}
                      onClick={() => setShowUpgrade(plan.key)}>
                      {plan.price === 0 ? 'Downgrade' : 'Upgrade Now'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Billing History */}
      {tab === 'history' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Billing History</span>
            {loadingHistory && <RefreshCw style={{ width:14, animation:'spin 1s linear infinite' }} />}
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Plan</th><th>Amount</th><th>Start Date</th><th>Expiry</th><th>Status</th></tr></thead>
              <tbody>
                {history.length > 0 ? history.map((h, i) => {
                  const isActive = h.status === 'Active'
                  const amt = h.amount_paid ? `₹${h.amount_paid.toLocaleString()}` : '—'
                  const startDate = h.starts_at ? new Date(h.starts_at).toLocaleDateString('en-IN') : '—'
                  const expiryDate = h.expires_at ? new Date(h.expires_at).toLocaleDateString('en-IN') : '—'
                  return (
                    <tr key={i}>
                      <td><span className={`badge ${PLANS.find(p=>p.key===h.plan)?.badge || 'badge-gray'}`}>{h.plan}</span></td>
                      <td style={{ fontWeight:700 }}>{amt}</td>
                      <td style={{ fontSize:12 }}>{startDate}</td>
                      <td style={{ fontSize:12 }}>{expiryDate}</td>
                      <td><span className={`badge ${isActive?'badge-green':'badge-gray'}`}>{h.status}</span></td>
                    </tr>
                  )
                }) : (
                  <tr><td colSpan={5} style={{ textAlign:'center', padding:24, color:'var(--text-muted)' }}>
                    {loadingHistory ? 'Loading…' : 'No billing history yet.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="modal-overlay" onClick={() => setShowUpgrade(null)}>
          <div className="modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Upgrade to {showUpgrade} Plan</span>
              <button className="btn-ghost" onClick={() => setShowUpgrade(null)}>✕</button>
            </div>
            <div className="modal-body">
              {(() => {
                const plan = PLANS.find(p => p.key === showUpgrade)
                return (
                  <>
                    <div className="alert alert-info" style={{ marginBottom:16 }}>
                      <Crown />
                      <span>Upgrading to <strong>{plan?.name}</strong> at <strong>₹{plan?.price?.toLocaleString()}/month</strong>.</span>
                    </div>
                    <div style={{ background:'var(--bg)', borderRadius:8, padding:'12px 14px', fontSize:13 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span>Plan Amount</span><span>₹{plan?.price?.toLocaleString()}</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span>GST (18%)</span><span>₹{Math.round((plan?.price||0)*0.18).toLocaleString()}</span></div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, borderTop:'1px solid var(--border)', paddingTop:6 }}>
                        <span>Total</span>
                        <span style={{ color:'var(--primary)' }}>₹{Math.round((plan?.price||0)*1.18).toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUpgrade(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={upgrading} onClick={handleUpgrade}>
                {upgrading ? <><RefreshCw style={{ width:13, animation:'spin 1s linear infinite' }} /> Processing…</> : <><CreditCard style={{ width:14 }} />Confirm & Upgrade</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
