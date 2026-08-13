import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2, GitBranch, Warehouse, Users, Shield,
  Tag, Package,
  ShoppingBag, PackagePlus, BarChart3, ArrowLeftRight,
  Search, MessageSquare, ShoppingCart, Truck,
  UserCheck, Target, CalendarClock,
  TrendingUp, Receipt, CreditCard, BookOpen, LineChart, FileEdit,
  UserCog,
  FileBarChart, PieChart,
  Bell, FolderOpen, Settings, UserCircle, LogOut,
  ChevronDown, Menu, X, Sun, Moon,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import logoImg from '/logo.png'

const BRAND = { orange: '#FD5C02', navy: '#01152D' }

const NAV_CONFIG = [
  { type: 'item', to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    type: 'section', key: 'company', label: 'Company Management', icon: Building2,
    items: [
      { to: '/company-management/company-registration', icon: Building2, label: 'Company Registration' },
      { to: '/company-management/branch-management',    icon: GitBranch, label: 'Branch Management' },
      { to: '/company-management/user-management',      icon: Users,     label: 'User & Role Management' },
    ],
  },
  {
    type: 'section', key: 'product-setup', label: 'Product Management', icon: Package,
    items: [
      { to: '/product-management/categories',  icon: Tag,     label: 'Categories' },
      { to: '/product-management/brands',      icon: Tag,     label: 'Brands' },
      { to: '/product-management/products',    icon: Package, label: 'Products Management' },
    ],
  },
  {
    type: 'section', key: 'purchase-inventory', label: 'Purchase & Inventory Management', icon: ShoppingBag,
    items: [
      { to: '/purchase-inventory/supplier-management',    icon: Building2,      label: 'Supplier Management' },
      { to: '/purchase-inventory/purchase-management',    icon: PackagePlus,    label: 'Purchase Management' },
      { to: '/purchase-inventory/warehouse-management',   icon: Warehouse,      label: 'Warehouse Management' },
      { to: '/purchase-inventory/inventory-management',   icon: BarChart3,      label: 'Inventory Management' },
      { to: '/purchase-inventory/stock-transfer',         icon: ArrowLeftRight, label: 'Stock Transfer Management' },
    ],
  },
  {
    type: 'section', key: 'b2b', label: 'Marketplace Management', icon: ShoppingCart,
    items: [
      { to: '/marketplace/product-search',    icon: Search,        label: 'Product Search' },
      { to: '/marketplace/enquiry-management',icon: MessageSquare, label: 'Enquiry Management',  badgeKey: 'enquiries' },
      { to: '/marketplace/order-management',  icon: ShoppingCart,  label: 'Order Management',    badgeKey: 'orders' },
      { to: '/marketplace/dispatch-management',icon: Truck,        label: 'Dispatch Management', badgeKey: 'dispatch' },
    ],
  },
  {
    type: 'section', key: 'crm', label: 'CRM Management', icon: UserCheck,
    items: [
      { to: '/crm/customer-management', icon: UserCheck,     label: 'Customer Management' },
      { to: '/crm/lead-management',     icon: Target,        label: 'Lead Management' },
      { to: '/crm/followup-management', icon: CalendarClock, label: 'Follow-up Management' },
    ],
  },
  {
    type: 'section', key: 'finance', label: 'Finance Management', icon: TrendingUp,
    items: [
      { to: '/finance/quotation-manager',  icon: FileEdit,   label: 'Quotation Manager' },
      { to: '/finance/sales-management',   icon: TrendingUp, label: 'Sales Management' },
      { to: '/finance/expense-management', icon: Receipt,    label: 'Expense Management' },
      { to: '/finance/payment-management', icon: CreditCard, label: 'Payment Management', badgeKey: 'payments' },
      { to: '/finance/accounts-management',icon: BookOpen,   label: 'Accounts Management' },
      { to: '/finance/profit-loss',        icon: LineChart,  label: 'Profit & Loss Management' },
    ],
  },
  {
    type: 'section', key: 'hr', label: 'HR Management', icon: UserCog,
    items: [
      { to: '/hr/employee-management', icon: UserCog, label: 'Employee Management' },
    ],
  },
  {
    type: 'section', key: 'reports', label: 'Reports Management', icon: FileBarChart,
    items: [
      { to: '/reports/dashboard-analytics', icon: PieChart,     label: 'Dashboard Analytics' },
      { to: '/reports/report-center',       icon: FileBarChart, label: 'Report Center' },
    ],
  },
  {
    type: 'section', key: 'system', label: 'System Management', icon: Settings,
    items: [
      { to: '/system/notification-management', icon: Bell,       label: 'Notification Management', badgeKey: 'notifs' },
      { to: '/system/document-management',     icon: FolderOpen, label: 'Document Management' },
      { to: '/system/subscription',            icon: CreditCard, label: 'Subscription' },
      { to: '/system/settings',                icon: Settings,   label: 'Settings' },
      { to: '/system/profile',                 icon: UserCircle, label: 'Profile' },
    ],
  },
]

const LIGHT = {
  sidebarBg: '#01152D', sidebarBorder: 'rgba(255,255,255,0.07)',
  sidebarText: '#8BA3BE', sidebarHover: '#F0F6FF',
  sidebarActiveBg: 'rgba(253,92,2,0.16)', sidebarActiveText: '#FFA05C',
  sidebarAccent: '#FD5C02', sidebarSectionText: '#5B7A9A',
  mainBg: '#F4F6F9', topbarBg: '#FFFFFF', topbarBorder: '#E2E8F0',
  topbarText: '#01152D', topbarMuted: '#64748B',
  topbarCtrlBg: '#F4F6F9', topbarCtrlBorder: '#E2E8F0',
}
const DARK = {
  sidebarBg: '#0A0F1A', sidebarBorder: 'rgba(255,255,255,0.06)',
  sidebarText: '#6B8BA8', sidebarHover: '#C7D5E8',
  sidebarActiveBg: 'rgba(253,92,2,0.18)', sidebarActiveText: '#FD8A42',
  sidebarAccent: '#FD5C02', sidebarSectionText: '#445A70',
  mainBg: '#111827', topbarBg: '#1F2937', topbarBorder: '#374151',
  topbarText: '#F9FAFB', topbarMuted: '#9CA3AF',
  topbarCtrlBg: '#374151', topbarCtrlBorder: '#4B5563',
}

/* ═══════════════════════════════════════════════════════
   LAYOUT — default export
═══════════════════════════════════════════════════════ */
export default function Layout({
  onLogout,
  notifications = [],
  enquiries = [],
  orders = [],
  dispatches = [],
  payments = {},
}) {
  const location = useLocation()
  const navigate = useNavigate()

  const [dark, setDark] = useState(() => localStorage.getItem('erp-theme') === 'dark')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [open, setOpen] = useState(() => {
    const s = {}
    NAV_CONFIG.forEach(n => { if (n.type === 'section') s[n.key] = true })
    return s
  })

  const T = dark ? DARK : LIGHT

  /* close mobile panel on navigation */
  useEffect(() => setMobileOpen(false), [location.pathname])

  /* persist & apply theme */
  useEffect(() => {
    localStorage.setItem('erp-theme', dark ? 'dark' : 'light')
  }, [dark])

  /* auto-open section that contains the active route */
  useEffect(() => {
    NAV_CONFIG.forEach(n => {
      if (n.type === 'section') {
        const hit = n.items.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'))
        if (hit) setOpen(p => ({ ...p, [n.key]: true }))
      }
    })
  }, [location.pathname])

  /* badge counts from live ERP state */
  const unreadNotifs   = notifications.filter(n => !n.read).length
  const newEnquiries   = enquiries.filter(e => e.status === 'New').length
  const pendingOrders  = orders.filter(o => ['Accepted', 'Processing'].includes(o.status)).length
  const pendingDisp    = orders.filter(o => o.status === 'Ready').length
  const pendingPay     = Array.isArray(payments?.receivables)
    ? payments.receivables.filter(r => r.status === 'Pending').length : 0

  const BADGES = {
    notifs: unreadNotifs || null,
    enquiries: newEnquiries || null,
    orders: pendingOrders || null,
    dispatch: pendingDisp || null,
    payments: pendingPay || null,
    purchaseOrders: null,
  }

  const hasActive = (items) =>
    items.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'))

  const toggleSection = (key) => setOpen(p => ({ ...p, [key]: !p[key] }))

  /* shared sidebar JSX */
  const sidebar = (
    <SidebarContent
      T={T}
      location={location}
      navigate={navigate}
      open={open}
      toggleSection={toggleSection}
      hasActive={hasActive}
      BADGES={BADGES}
      onLogout={onLogout}
      onClose={() => setMobileOpen(false)}
    />
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: T.mainBg }}>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 48,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Desktop sidebar ── */}
      <aside
        className="erp-sidebar-desktop"
        style={{
          width: 264, background: T.sidebarBg, flexShrink: 0,
          display: 'flex', flexDirection: 'column', zIndex: 50,
          boxShadow: '4px 0 28px rgba(0,0,0,0.3)',
        }}
      >
        {sidebar}
      </aside>

      {/* ── Mobile sidebar (slide-in) ── */}
      <aside
        className="erp-sidebar-mobile"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 264,
          background: T.sidebarBg, zIndex: 49,
          display: 'flex', flexDirection: 'column',
          boxShadow: '6px 0 32px rgba(0,0,0,0.45)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {sidebar}
      </aside>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 56, background: T.topbarBg,
          borderBottom: `1px solid ${T.topbarBorder}`,
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)', zIndex: 10,
        }}>

          {/* Hamburger — visible on mobile */}
          <button
            onClick={() => setMobileOpen(true)}
            className="erp-hamburger"
            style={{
              display: 'none', padding: 7,
              background: 'transparent', border: 'none',
              color: T.topbarMuted, borderRadius: 8, cursor: 'pointer',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb */}
          <Breadcrumb pathname={location.pathname} T={T} />

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>

            {/* Theme toggle */}
            <TopBtn
              title={dark ? 'Light Mode' : 'Dark Mode'}
              onClick={() => setDark(d => !d)}
              T={T}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </TopBtn>

            {/* Notification bell */}
            <TopBtn title="Notifications" onClick={() => navigate('/system/notification-management')} T={T}>
              <Bell size={17} />
              {unreadNotifs > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: BRAND.orange, color: '#fff',
                  fontSize: 9, fontWeight: 800, padding: '1px 4px',
                  borderRadius: 8, minWidth: 16, textAlign: 'center',
                  border: `2px solid ${T.topbarBg}`,
                }}>
                  {unreadNotifs > 99 ? '99+' : unreadNotifs}
                </span>
              )}
            </TopBtn>

            {/* User pill */}
            <div
              onClick={() => navigate('/system/profile')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 12px 5px 6px', cursor: 'pointer',
                background: T.topbarCtrlBg, border: `1px solid ${T.topbarCtrlBorder}`,
                borderRadius: 8, transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.topbarCtrlBorder}
              onMouseLeave={e => e.currentTarget.style.background = T.topbarCtrlBg}
            >
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${BRAND.orange}, #FE8A3A)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: '#fff',
              }}>SA</div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.topbarText }}>Super Admin</div>
                <div style={{ fontSize: 10, color: T.topbarMuted }}>Owner</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 32px', minWidth: 0, boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>

      {/* Responsive CSS injected once */}
      <style>{`
        @media (max-width: 1024px) {
          .erp-sidebar-desktop { display: none !important; }
          .erp-hamburger { display: flex !important; }
        }
        @media (min-width: 1025px) {
          .erp-sidebar-mobile { display: none !important; }
          .erp-mobile-close   { display: none !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   SIDEBAR CONTENT
═══════════════════════════════════════════════════════ */
function SidebarContent({ T, location, navigate, open, toggleSection, hasActive, BADGES, onLogout, onClose }) {
  return (
    <>
      {/* Logo strip */}
      <div style={{
        height: 70, display: 'flex', alignItems: 'center',
        padding: '0 14px 0 16px', gap: 12,
        borderBottom: `1px solid ${T.sidebarBorder}`, flexShrink: 0,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img src={logoImg} alt="EzyEnquiry" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            EzyEnquiry
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="erp-mobile-close"
          style={{
            padding: 6, background: 'transparent', border: 'none',
            color: T.sidebarText, borderRadius: 6, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sidebarText }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Orange accent bar */}
      <div style={{
        height: 2, flexShrink: 0,
        background: `linear-gradient(90deg, ${BRAND.orange} 0%, ${BRAND.orange}55 55%, transparent 100%)`,
      }} />

      {/* Scrollable nav */}
      <nav style={{
        flex: 1, overflowY: 'auto', padding: '6px 0 8px',
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent',
      }}>
        {NAV_CONFIG.map(item => {
          if (item.type === 'item') {
            const isActive = location.pathname === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', margin: '1px 0',
                  color: isActive ? T.sidebarActiveText : T.sidebarText,
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  textDecoration: 'none', transition: 'all 0.14s',
                  background: isActive ? T.sidebarActiveBg : 'transparent',
                  borderLeft: `3px solid ${isActive ? T.sidebarAccent : 'transparent'}`,
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = T.sidebarHover } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sidebarText } }}
              >
                <item.icon size={16} style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.sidebarAccent, flexShrink: 0 }} />}
              </NavLink>
            )
          }

          /* ── Collapsible section (folder style) ── */
          const sectionActive = hasActive(item.items)
          const isOpen = open[item.key]

          return (
            <div key={item.key} style={{ margin: '3px 8px' }}>
              {/* Folder header */}
              <button
                onClick={() => toggleSection(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '8px 10px',
                  background: 'rgba(253,92,2,0.18)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer', transition: 'all 0.18s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: '#FFB380',
                    textAlign: 'left', lineHeight: 1.3,
                  }}>
                    {item.label}
                  </span>
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    color: '#FFB380',
                    flexShrink: 0,
                    transition: 'transform 0.22s',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                  }}
                />
              </button>

              {/* Children list — folder contents */}
              {isOpen && (
                <div style={{
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: '0 0 8px 8px',
                  overflow: 'hidden',
                  marginBottom: 2,
                }}>
                  {item.items.map((child) => {
                    const childActive = location.pathname === child.to || location.pathname.startsWith(child.to + '/')
                    const badge = child.badgeKey ? BADGES[child.badgeKey] : null
                    return (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px',
                          color: childActive ? '#fff' : '#fff',
                          fontSize: 12, fontWeight: childActive ? 600 : 400,
                          textDecoration: 'none', transition: 'all 0.13s',
                          background: childActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                        }}
                        onMouseEnter={e => {
                          if (!childActive) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                            e.currentTarget.style.color = '#fff'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!childActive) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = '#fff'
                          }
                        }}
                      >
                        <child.icon size={14} style={{ opacity: childActive ? 1 : 0.65, flexShrink: 0 }} />
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {child.label}
                        </span>
                        {badge ? (
                          <span style={{
                            background: BRAND.orange, color: '#fff',
                            fontSize: 9, fontWeight: 800, padding: '1px 5px',
                            borderRadius: 10, minWidth: 18, textAlign: 'center',
                            flexShrink: 0, lineHeight: '14px',
                          }}>
                            {badge > 99 ? '99+' : badge}
                          </span>
                        ) : null}
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Divider */}
        <div style={{ height: 1, background: T.sidebarBorder, margin: '8px 16px 4px' }} />

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '9px 16px', width: '100%',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#F87171', fontSize: 13, fontWeight: 500,
            transition: 'all 0.14s', textAlign: 'left',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#FCA5A5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#F87171' }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          <span>Logout</span>
        </button>
      </nav>

      {/* User strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px', flexShrink: 0,
        borderTop: `1px solid ${T.sidebarBorder}`,
        background: 'rgba(0,0,0,0.25)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${BRAND.orange}, #FE8A3A)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#fff',
        }}>SA</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Super Admin
          </div>
          <div style={{ fontSize: 10, color: T.sidebarText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            admin@ezyenquiry.com
          </div>
        </div>
        <button
          onClick={() => navigate('/system/settings')}
          title="Settings"
          style={{
            padding: 5, background: 'transparent', border: 'none',
            color: T.sidebarText, cursor: 'pointer', borderRadius: 5,
            display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sidebarText }}
        >
          <Settings size={13} />
        </button>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════
   TOPBAR BUTTON helper
═══════════════════════════════════════════════════════ */
function TopBtn({ title, onClick, T, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        position: 'relative', width: 36, height: 36, borderRadius: 8,
        background: T.topbarCtrlBg, border: `1px solid ${T.topbarCtrlBorder}`,
        color: T.topbarMuted, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.topbarCtrlBorder; e.currentTarget.style.color = T.topbarText }}
      onMouseLeave={e => { e.currentTarget.style.background = T.topbarCtrlBg; e.currentTarget.style.color = T.topbarMuted }}
    >
      {children}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════
   BREADCRUMB
═══════════════════════════════════════════════════════ */
function Breadcrumb({ pathname, T }) {
  const crumbs = [{ label: 'EzyEnquiry' }]
  for (const item of NAV_CONFIG) {
    if (item.type === 'item' && (pathname === item.to || pathname.startsWith(item.to + '/'))) {
      crumbs.push({ label: item.label })
      break
    }
    if (item.type === 'section') {
      const child = item.items.find(c => pathname === c.to || pathname.startsWith(c.to + '/'))
      if (child) {
        crumbs.push({ label: item.label })
        crumbs.push({ label: child.label })
        break
      }
    }
  }
  return (
    <nav style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, minWidth: 0 }}>
      {crumbs.map((c, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {i > 0 && (
            <span style={{ color: T.topbarMuted, fontSize: 10, opacity: 0.5, flexShrink: 0 }}>›</span>
          )}
          <span style={{
            color: i === crumbs.length - 1 ? T.topbarText : T.topbarMuted,
            fontWeight: i === crumbs.length - 1 ? 700 : 500,
            fontSize: i === crumbs.length - 1 ? 13.5 : 12,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {c.label}
          </span>
        </span>
      ))}
    </nav>
  )
}
