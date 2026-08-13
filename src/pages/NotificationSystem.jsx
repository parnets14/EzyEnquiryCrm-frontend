import { useState } from 'react'
import { Bell, CheckCircle, Package, ShoppingCart, Truck, CreditCard, MessageSquare } from 'lucide-react'

const TYPE_CONFIG = {
  enquiry:  { Icon: MessageSquare, color: '#4F46E5', bg: '#eef2ff',  badgeCls: 'badge-blue'   },
  order:    { Icon: ShoppingCart,  color: '#06B6D4', bg: '#ecfeff',  badgeCls: 'badge-cyan'   },
  dispatch: { Icon: Truck,         color: '#7C3AED', bg: '#f5f3ff',  badgeCls: 'badge-purple' },
  delivery: { Icon: CheckCircle,   color: '#10B981', bg: '#f0fdf4',  badgeCls: 'badge-green'  },
  payment:  { Icon: CreditCard,    color: '#EF4444', bg: '#fef2f2',  badgeCls: 'badge-red'    },
  purchase: { Icon: Package,       color: '#F59E0B', bg: '#fffbeb',  badgeCls: 'badge-yellow' },
  warehouse:{ Icon: Package,       color: '#F97316', bg: '#fff7ed',  badgeCls: 'badge-orange' },
  info:     { Icon: Bell,          color: '#6B7280', bg: '#f9fafb',  badgeCls: 'badge-gray'   },
}

function NotifIcon({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info
  return <cfg.Icon style={{ width: 16, color: cfg.color }} />
}

const TYPE_FILTERS = [
  { key: 'all',       label: 'All'        },
  { key: 'unread',    label: 'Unread'     },
  { key: 'enquiry',   label: 'Enquiries'  },
  { key: 'order',     label: 'Orders'     },
  { key: 'dispatch',  label: 'Dispatch'   },
  { key: 'delivery',  label: 'Delivery'   },
  { key: 'payment',   label: 'Payments'   },
  { key: 'purchase',  label: 'Purchase'   },
]

const AUTO_TRIGGERS = [
  { icon: '📩', event: 'New Enquiry received',        when: 'Retailer submits enquiry',          type: 'enquiry'   },
  { icon: '🛒', event: 'Order created',               when: 'Enquiry → Confirmed → Order',       type: 'order'     },
  { icon: '📦', event: 'Purchase entry saved',        when: 'New stock purchased',               type: 'purchase'  },
  { icon: '📫', event: 'Warehouse packing started',   when: 'Order → Processing',                type: 'warehouse' },
  { icon: '🚚', event: 'Order dispatched',            when: 'Dispatch created + LR filled',      type: 'dispatch'  },
  { icon: '✅', event: 'Order delivered',             when: 'Mark Delivered clicked',            type: 'delivery'  },
  { icon: '💳', event: 'Payment received',            when: 'Delivery / payment collected',      type: 'payment'   },
  { icon: '⚠️', event: 'Low stock alert',            when: 'Stock falls below alert threshold', type: 'info'      },
]

export default function NotificationSystem({ notifications = [], markNotifRead, markAllNotifsRead, deleteNotif }) {
  const [filter, setFilter] = useState('all')

  // Normalize both old (read/msg/time) and new (is_read/message/created_at) shapes
  const normalize = (n) => ({
    ...n,
    _id:     n._id || n.id,
    is_read: n.is_read ?? n.read ?? false,
    message: n.message || n.msg || n.title || '',
    created_at: n.created_at || n.time || '',
    type:    n.type || 'info',
  })

  const normalizedNotifs = notifications.map(normalize)

  const handleMarkAllRead = async () => {
    await markAllNotifsRead?.()
  }

  const handleMarkRead = async (id) => {
    await markNotifRead?.(id)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    await deleteNotif?.(id)
  }

  const unreadCount = normalizedNotifs.filter(n => !n.is_read).length

  const filtered = normalizedNotifs.filter(n => {
    if (filter === 'all')    return true
    if (filter === 'unread') return !n.is_read
    return n.type === filter
  })

  const statCards = [
    { label: 'Total',   val: normalizedNotifs.length,                                         color: 'blue'   },
    { label: 'Unread',  val: unreadCount,                                                      color: 'red'    },
    { label: 'Orders',  val: normalizedNotifs.filter(n => n.type === 'order').length,          color: 'green'  },
    { label: 'Payment', val: normalizedNotifs.filter(n => n.type === 'payment').length,        color: 'orange' },
  ]

  return (
    <div>
      <div className="breadcrumb">
        <span>Reports &amp; Tools</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-active">Notifications</span>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card" style={{ padding: '14px 16px' }}>
            <div className={`stat-icon ${s.color}`}><Bell /></div>
            <div className="stat-info">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: 20 }}>{s.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Notification list */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Notifications ({filtered.length})</span>
          <div className="header-actions">
            {unreadCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
                <CheckCircle style={{ width: 13 }} />Mark All Read
              </button>
            )}
          </div>
        </div>

        <div className="tabs" style={{ padding: '0 16px' }}>
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              className={`tab-btn${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
              style={{ fontSize: 12 }}
            >
              {f.label}
              {f.key === 'unread' && unreadCount > 0 && (
                <span className="nav-badge" style={{ marginLeft: 4 }}>{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              No notifications in this category
            </div>
          )}
          {filtered.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
            const timeStr = n.created_at
              ? (typeof n.created_at === 'string' && n.created_at.includes('T')
                  ? new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : n.created_at)
              : ''
            return (
              <div
                key={n._id}
                onClick={() => !n.is_read && handleMarkRead(n._id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: n.is_read ? 'var(--bg)' : cfg.bg,
                  border: `1px solid ${n.is_read ? 'var(--border)' : '#c7d2fe'}`,
                  transition: 'all .15s',
                }}
              >
                <div style={{ marginTop: 2, flexShrink: 0 }}>
                  <NotifIcon type={n.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.is_read ? 400 : 700, fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                    {n.title || n.message}
                  </div>
                  {n.title && n.message && n.title !== n.message && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.message}</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{timeStr}</span>
                    <span className={`badge ${cfg.badgeCls}`} style={{ fontSize: 9 }}>{n.type}</span>
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginTop: 4, flexShrink: 0 }} />
                )}
                <button
                  onClick={(e) => handleDelete(e, n._id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 4, fontSize: 14, lineHeight: 1 }}
                  title="Delete"
                >✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Auto trigger info */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Auto Notification Triggers</span>
          <span className="badge badge-blue">System Info</span>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {AUTO_TRIGGERS.map((item, i) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.info
              return (
                <div key={i} style={{ background: cfg.bg, borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3 }}>{item.event}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.when}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
