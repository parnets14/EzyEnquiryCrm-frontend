import { useState } from 'react'
import { Crown, Check, X, AlertTriangle, CreditCard, TrendingUp, Users, Zap } from 'lucide-react'

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    period: 'Forever',
    color: '#64748B',
    bgColor: '#F8FAFC',
    badge: 'badge-gray',
    description: 'For individuals getting started',
    features: [
      { text: 'Up to 10 Enquiries / month', included: true },
      { text: '1 User', included: true },
      { text: 'Product Search (limited)', included: true },
      { text: 'Basic Dashboard', included: true },
      { text: 'Order Management', included: false },
      { text: 'Inventory Management', included: false },
      { text: 'Sales & Purchase Reports', included: false },
      { text: 'CRM & Lead Management', included: false },
      { text: 'Accounts & P&L Module', included: false },
      { text: 'Multi-Warehouse', included: false },
      { text: 'Priority Listing', included: false },
      { text: 'AI Features', included: false },
    ],
  },
  {
    key: 'silver',
    name: 'Silver',
    price: 1499,
    period: '/month',
    color: '#06B6D4',
    bgColor: '#ECFEFF',
    badge: 'badge-cyan',
    description: 'For small tile retailers',
    popular: false,
    features: [
      { text: 'Up to 100 Enquiries / month', included: true },
      { text: 'Up to 5 Users', included: true },
      { text: 'Full Product Search', included: true },
      { text: 'Advanced Dashboard', included: true },
      { text: 'Order Management', included: true },
      { text: 'Inventory Management', included: true },
      { text: 'Sales & Purchase Reports', included: true },
      { text: 'CRM & Lead Management', included: false },
      { text: 'Accounts & P&L Module', included: false },
      { text: 'Multi-Warehouse', included: false },
      { text: 'Priority Listing', included: false },
      { text: 'AI Features', included: false },
    ],
  },
  {
    key: 'gold',
    name: 'Gold',
    price: 2999,
    period: '/month',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    badge: 'badge-yellow',
    description: 'For growing wholesalers',
    popular: true,
    current: true,
    features: [
      { text: 'Up to 500 Enquiries / month', included: true },
      { text: 'Up to 15 Users', included: true },
      { text: 'Full Product Search', included: true },
      { text: 'Advanced Dashboard + Analytics', included: true },
      { text: 'Order Management', included: true },
      { text: 'Inventory Management', included: true },
      { text: 'Sales & Purchase Reports', included: true },
      { text: 'CRM & Lead Management', included: true },
      { text: 'Accounts & P&L Module', included: true },
      { text: 'Multi-Warehouse (up to 3)', included: true },
      { text: 'Priority Listing', included: false },
      { text: 'AI Features', included: false },
    ],
  },
  {
    key: 'platinum',
    name: 'Platinum',
    price: 5999,
    period: '/month',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    badge: 'badge-purple',
    description: 'For enterprise distributors',
    features: [
      { text: 'Unlimited Enquiries', included: true },
      { text: 'Unlimited Users', included: true },
      { text: 'Full Product Search', included: true },
      { text: 'Advanced Dashboard + Analytics', included: true },
      { text: 'Order Management', included: true },
      { text: 'Inventory Management', included: true },
      { text: 'Sales & Purchase Reports', included: true },
      { text: 'CRM & Lead Management', included: true },
      { text: 'Accounts & P&L Module', included: true },
      { text: 'Multi-Warehouse (unlimited)', included: true },
      { text: 'Top Priority Listing', included: true },
      { text: 'AI Features (Beta)', included: true },
    ],
  },
]

const HISTORY = [
  { id: 'SUB-003', plan: 'Gold', amount: '₹2,999', date: '01 Aug 2026', status: 'Active', expiry: '31 Aug 2026', mode: 'UPI' },
  { id: 'SUB-002', plan: 'Gold', amount: '₹2,999', date: '01 Jul 2026', status: 'Expired', expiry: '31 Jul 2026', mode: 'Bank Transfer' },
  { id: 'SUB-001', plan: 'Silver', amount: '₹1,499', date: '15 Feb 2026', status: 'Expired', expiry: '14 Mar 2026', mode: 'UPI' },
]

export default function SubscriptionSystem() {
  const [tab, setTab] = useState('plans')
  const [showUpgrade, setShowUpgrade] = useState(null)

  return (
    <>
      <div className="breadcrumb">
        <span>System Management</span><span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Subscription</span>
      </div>

      {/* Current plan banner */}
      <div style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', borderRadius: 12, padding: '20px 24px', marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Crown style={{ width: 24 }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>Gold Plan — Active</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Tiles World Pvt Ltd · Expires on 31 Aug 2026</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ textAlign: 'right', marginRight: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Enquiries Used</div>
            <div style={{ fontWeight: 700 }}>47 / 500 this month</div>
          </div>
          <div style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.3)' }}>
            <div style={{ width: `${(47 / 500) * 100}%`, height: '100%', borderRadius: 3, background: '#fff' }} />
          </div>
          <button
            className="btn"
            style={{ background: '#fff', color: '#D97706', fontWeight: 700, marginLeft: 8 }}
            onClick={() => setShowUpgrade('platinum')}
          >
            <Zap style={{ width: 14, color: '#D97706' }} />Upgrade to Platinum
          </button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {[
          { label: 'Current Plan', val: 'Gold', color: 'orange', icon: <Crown /> },
          { label: 'Active Users', val: '4 / 15', color: 'blue', icon: <Users /> },
          { label: 'Enquiries (Aug)', val: '47 / 500', color: 'green', icon: <TrendingUp /> },
          { label: 'Renewal On', val: '01 Sep 2026', color: 'purple', icon: <CreditCard /> },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 16 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[['plans', 'Plans & Pricing'], ['history', 'Billing History']].map(([key, label]) => (
          <button key={key} className={`tab-btn${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {/* ── Plans ── */}
      {tab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => (
            <div key={plan.key} className="card" style={{ position: 'relative', border: plan.current ? `2px solid ${plan.color}` : undefined }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  ⭐ Most Popular
                </div>
              )}
              {plan.current && (
                <div style={{ position: 'absolute', top: -12, right: 16, background: 'var(--success)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>
                  ✓ Current
                </div>
              )}
              <div className="card-body" style={{ padding: 20 }}>
                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Crown style={{ width: 20, color: plan.color }} />
                    <span style={{ fontWeight: 800, fontSize: 16, color: plan.color }}>{plan.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{plan.description}</div>
                </div>
                {/* Price */}
                <div style={{ marginBottom: 16, padding: '12px', borderRadius: 8, background: plan.bgColor }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: plan.color }}>
                      {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{plan.period}</span>}
                  </div>
                  {plan.price > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Billed monthly · GST extra</div>}
                </div>
                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                      {f.included
                        ? <Check style={{ width: 14, color: 'var(--success)', flexShrink: 0, marginTop: 1 }} />
                        : <X style={{ width: 14, color: 'var(--text-light)', flexShrink: 0, marginTop: 1 }} />
                      }
                      <span style={{ color: f.included ? 'var(--text)' : 'var(--text-light)' }}>{f.text}</span>
                    </div>
                  ))}
                </div>
                {/* CTA */}
                {plan.current ? (
                  <button className="btn" style={{ width: '100%', justifyContent: 'center', background: plan.bgColor, color: plan.color, border: `1px solid ${plan.color}`, cursor: 'default' }} disabled>
                    Current Plan
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', background: plan.color }}
                    onClick={() => setShowUpgrade(plan.key)}
                  >
                    {plan.price === 0 ? 'Downgrade' : 'Upgrade Now'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Billing History ── */}
      {tab === 'history' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Billing History</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice ID</th><th>Plan</th><th>Amount</th><th>Date</th><th>Expiry</th><th>Payment Mode</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {HISTORY.map(h => (
                  <tr key={h.id}>
                    <td style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>{h.id}</td>
                    <td><span className="badge badge-yellow">{h.plan}</span></td>
                    <td style={{ fontWeight: 700 }}>{h.amount}</td>
                    <td style={{ fontSize: 12 }}>{h.date}</td>
                    <td style={{ fontSize: 12 }}>{h.expiry}</td>
                    <td><span className="chip">{h.mode}</span></td>
                    <td><span className={`badge ${h.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{h.status}</span></td>
                    <td><button className="btn btn-secondary btn-xs">Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="modal-overlay" onClick={() => setShowUpgrade(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Upgrade to {PLANS.find(p => p.key === showUpgrade)?.name} Plan</span>
              <button className="btn-ghost" onClick={() => setShowUpgrade(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <Crown />
                <span>You are upgrading to <strong>{PLANS.find(p => p.key === showUpgrade)?.name}</strong> at <strong>₹{PLANS.find(p => p.key === showUpgrade)?.price?.toLocaleString()}/month</strong>. Your current plan benefits will be carried over.</span>
              </div>
              <div className="form-group"><label className="form-label">Billing Cycle</label>
                <select className="form-control"><option>Monthly</option><option>Quarterly (5% off)</option><option>Yearly (15% off)</option></select>
              </div>
              <div className="form-group"><label className="form-label">Payment Mode</label>
                <select className="form-control"><option>UPI</option><option>Bank Transfer (NEFT/RTGS)</option><option>Credit/Debit Card</option><option>Cheque</option></select>
              </div>
              <div className="form-group"><label className="form-label">GST Number (for invoice)</label>
                <input className="form-control" defaultValue="27AABCT3518Q1ZY" style={{ fontFamily: 'monospace' }} />
              </div>
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Plan Amount</span><span>₹{PLANS.find(p => p.key === showUpgrade)?.price?.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>GST (18%)</span><span>₹{Math.round((PLANS.find(p => p.key === showUpgrade)?.price || 0) * 0.18).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                  <span>Total</span>
                  <span style={{ color: 'var(--primary)' }}>₹{Math.round((PLANS.find(p => p.key === showUpgrade)?.price || 0) * 1.18).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUpgrade(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setShowUpgrade(null)}><CreditCard style={{ width: 14 }} />Confirm & Pay</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
