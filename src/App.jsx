import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ErpProvider, useErp } from './context/ErpContext'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import RequireAccess from './components/RequireAccess'
import { MODULES } from './config/permissions'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UserManagement from './pages/UserManagement'
import CompanyRegistration from './pages/CompanyRegistration'
import BranchManagement from './pages/BranchManagement'
import Categories from './pages/Categories'
import Brands from './pages/Brands'
import ProductManagement from './pages/ProductManagement'
import WholesalerProducts from './pages/WholesalerProducts'
import WholesalerPurchaseOrders from './pages/WholesalerPurchaseOrders'
import WholesalerProductRequests from './pages/WholesalerProductRequests'
import InventoryManagement from './pages/InventoryManagement'
import StockTransfer from './pages/StockTransfer'
import ProductSearch from './pages/ProductSearch'
import EnquiryManagement from './pages/EnquiryManagement'
import OrderManagement from './pages/OrderManagement'
import DispatchManagement from './pages/DispatchManagement'
import CustomerManagement from './pages/CustomerManagement'
import LeadManagement from './pages/LeadManagement'
import FollowUpManagement from './pages/FollowUpManagement'
import SalesManagement from './pages/SalesManagement'
import PurchaseManagement from './pages/PurchaseManagement'
import SupplierManagement from './pages/SupplierManagement'
import ExpenseManagement from './pages/ExpenseManagement'
import ProfitLoss from './pages/ProfitLoss'
import PaymentManagement from './pages/PaymentManagement'
import AccountsModule from './pages/AccountsModule'
import EmployeeManagement from './pages/EmployeeManagement'
import EmployeeMasterManagement from './pages/EmployeeMasterManagement'
import RolePermissions from './pages/RolePermissions'
import NotificationSystem from './pages/NotificationSystem'
import ReportCenter from './pages/ReportCenter'
import DashboardAnalytics from './pages/DashboardAnalytics'
import WarehouseManagement from './pages/WarehouseManagement'
import DocumentManagement from './pages/DocumentManagement'
import Profile from './pages/Profile'
import SubscriptionSystem from './pages/SubscriptionSystem'
import QuotationManager from './pages/QuotationManager'
import InvoiceManagement from './pages/InvoiceManagement'

import './index.css'

function AppRoutes() {
  const { isLoggedIn, logout } = useAuth()
  const erpCtx = useErp()

  const {
    notifications, enquiries, orders, dispatches, payments,
    products, categories, subCategories, brands, customers, leads, followups,
    employees, users, companies, warehouses, transfers,
    inventory, purchases, sales, expenses, documents, dashboardStats,
    loadingData,
  } = erpCtx

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/"
        element={
          <Layout
            onLogout={logout}
            notifications={notifications}
            enquiries={enquiries}
            orders={orders}
            dispatches={dispatches}
            payments={payments}
          />
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* ── Dashboard ─────────────────────────────────── */}
        <Route path="dashboard" element={<RequireAccess module={MODULES.DASHBOARD}><Dashboard {...erpCtx} /></RequireAccess>} />

        {/* ── Company Management ───────────────────────── */}
        <Route path="company-management/company-registration"
          element={<RequireAccess module={MODULES.COMPANY_REGISTRATION}><CompanyRegistration companies={companies} {...erpCtx} /></RequireAccess>} />
        <Route path="company-management/branch-management"
          element={<RequireAccess module={MODULES.BRANCH_MANAGEMENT}><BranchManagement
            branches={erpCtx.branches || []}
            addBranch={erpCtx.addBranch}
            updateBranch={erpCtx.updateBranch}
            deleteBranch={erpCtx.deleteBranch}
          /></RequireAccess>} />
        <Route path="company-management/user-management"
          element={<RequireAccess module={MODULES.USER_MANAGEMENT}><UserManagement users={users} {...erpCtx} /></RequireAccess>} />
        <Route path="company-management/roles-permissions"
          element={<RequireAccess module={MODULES.ROLE_PERMISSIONS}><RolePermissions /></RequireAccess>} />

        {/* ── Product Management ───────────────────────── */}
        <Route path="product-management/categories"
          element={<RequireAccess module={MODULES.CATEGORIES}><Categories categories={categories} subCategories={subCategories} products={products} {...erpCtx} /></RequireAccess>} />
        <Route path="product-management/brands"
          element={<RequireAccess module={MODULES.BRANDS}><Brands brands={brands} {...erpCtx} /></RequireAccess>} />
        <Route path="product-management/products"
          element={<RequireAccess module={MODULES.PRODUCTS}><ProductManagement products={products} categories={categories} subCategories={subCategories} brands={brands} {...erpCtx} /></RequireAccess>} />

        {/* ── Wholesaler ───────────────────────────────── */}
        <Route path="wholesaler/products"        element={<WholesalerProducts />} />
        <Route path="wholesaler/purchase-orders" element={<WholesalerPurchaseOrders />} />
        <Route path="wholesaler/product-requests" element={<WholesalerProductRequests />} />
        {/* Back-compat: old single page → redirect to products */}
        <Route path="wholesaler-items" element={<Navigate to="/wholesaler/products" replace />} />

        {/* ── Purchase & Inventory ─────────────────────── */}
        <Route path="purchase-inventory/supplier-management"
          element={<RequireAccess module={MODULES.SUPPLIERS}><SupplierManagement suppliers={erpCtx.suppliers} addSupplier={erpCtx.addSupplier} updateSupplier={erpCtx.updateSupplier} deleteSupplier={erpCtx.deleteSupplier} /></RequireAccess>} />
        <Route path="purchase-inventory/purchase-management"
          element={<RequireAccess module={MODULES.PURCHASES}><PurchaseManagement branches={erpCtx.branches || []} purchases={purchases} products={products} suppliers={erpCtx.suppliers} {...erpCtx} /></RequireAccess>} />
        <Route path="purchase-inventory/inventory-management"
          element={<RequireAccess module={MODULES.INVENTORY}><InventoryManagement branches={erpCtx.branches || []} inventory={inventory} products={products} warehouses={warehouses} {...erpCtx} /></RequireAccess>} />
        <Route path="purchase-inventory/stock-transfer"
          element={<RequireAccess module={MODULES.STOCK_TRANSFER}><StockTransfer branches={erpCtx.branches || []} transfers={transfers} warehouses={warehouses} products={products} {...erpCtx} /></RequireAccess>} />
        <Route path="purchase-inventory/warehouse-management"
          element={<RequireAccess module={MODULES.WAREHOUSES}><WarehouseManagement branches={erpCtx.branches || []} /></RequireAccess>} />

        {/* ── Marketplace ──────────────────────────────── */}
        <Route path="marketplace/product-search"
          element={<RequireAccess module={MODULES.PRODUCT_SEARCH}><ProductSearch products={products} inventory={inventory} {...erpCtx} /></RequireAccess>} />
        <Route path="marketplace/enquiry-management"
          element={<RequireAccess module={MODULES.ENQUIRIES}><EnquiryManagement enquiries={enquiries} inventory={inventory} orders={orders} products={products} branches={erpCtx.branches || []} {...erpCtx} /></RequireAccess>} />
        <Route path="marketplace/order-management"
          element={<RequireAccess module={MODULES.ORDERS}><OrderManagement branches={erpCtx.branches || []} orders={orders} enquiries={enquiries} products={products} dispatches={dispatches} employees={erpCtx.employees || []} {...erpCtx} /></RequireAccess>} />
        <Route path="marketplace/dispatch-management"
          element={<RequireAccess module={MODULES.DISPATCHES}><DispatchManagement branches={erpCtx.branches || []} dispatches={dispatches} orders={orders} {...erpCtx} /></RequireAccess>} />

        {/* ── CRM ──────────────────────────────────────── */}
        <Route path="crm/customer-management"
          element={<RequireAccess module={MODULES.CUSTOMERS}><CustomerManagement customers={customers} {...erpCtx} /></RequireAccess>} />
        <Route path="crm/lead-management"
          element={<RequireAccess module={MODULES.LEADS}><LeadManagement leads={leads} customers={customers} {...erpCtx} /></RequireAccess>} />
        <Route path="crm/followup-management"
          element={<RequireAccess module={MODULES.FOLLOWUPS}><FollowUpManagement followups={followups} leads={leads} customers={customers} {...erpCtx} /></RequireAccess>} />

        {/* ── Finance ──────────────────────────────────── */}
        <Route path="finance/quotation-manager"
          element={<RequireAccess module={MODULES.QUOTATIONS}><QuotationManager products={products} enquiries={enquiries} customers={customers} /></RequireAccess>} />
        <Route path="finance/invoice-management"
          element={<RequireAccess module={MODULES.INVOICES}><InvoiceManagement products={products} customers={customers} /></RequireAccess>} />
        <Route path="finance/sales-management"
          element={<RequireAccess module={MODULES.SALES}><SalesManagement branches={erpCtx.branches || []} sales={sales} orders={orders} customers={customers} products={products} addSale={erpCtx.addSale} {...erpCtx} /></RequireAccess>} />
        <Route path="finance/expense-management"
          element={<RequireAccess module={MODULES.EXPENSES}><ExpenseManagement /></RequireAccess>} />
        <Route path="finance/payment-management"
          element={<RequireAccess module={MODULES.PAYMENTS}><PaymentManagement /></RequireAccess>} />
        <Route path="finance/accounts-management"
          element={<RequireAccess module={MODULES.ACCOUNTS}><AccountsModule sales={sales} purchases={purchases} /></RequireAccess>} />
        <Route path="finance/profit-loss"
          element={<RequireAccess module={MODULES.PROFIT_LOSS}><ProfitLoss /></RequireAccess>} />

        {/* ── HR ───────────────────────────────────────── */}
        <Route path="hr/employee-master"
          element={<RequireAccess module={MODULES.EMPLOYEE_MASTER}><EmployeeMasterManagement /></RequireAccess>} />
        <Route path="hr/employee-management"
          element={<RequireAccess module={MODULES.EMPLOYEE_MANAGEMENT}><EmployeeManagement branches={erpCtx.branches || []} employees={employees} {...erpCtx} /></RequireAccess>} />

        {/* ── Reports ──────────────────────────────────── */}
        <Route path="reports/dashboard-analytics"
          element={<RequireAccess module={MODULES.DASHBOARD_ANALYTICS}><DashboardAnalytics /></RequireAccess>} />
        <Route path="reports/report-center"
          element={<RequireAccess module={MODULES.REPORT_CENTER}><ReportCenter /></RequireAccess>} />

        {/* ── System ───────────────────────────────────── */}
        <Route path="system/notification-management"
          element={<RequireAccess module={MODULES.NOTIFICATIONS}><NotificationSystem notifications={notifications} {...erpCtx} /></RequireAccess>} />
        <Route path="system/document-management"
          element={<RequireAccess module={MODULES.DOCUMENTS}><DocumentManagement /></RequireAccess>} />
        <Route path="system/subscription"   element={<RequireAccess module={MODULES.SUBSCRIPTION}><SubscriptionSystem /></RequireAccess>} />
        <Route path="system/profile"        element={<RequireAccess module={MODULES.PROFILE}><Profile /></RequireAccess>} />
        <Route path="subscription"          element={<RequireAccess module={MODULES.SUBSCRIPTION}><SubscriptionSystem /></RequireAccess>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ErpProvider>
          <AppRoutes />
        </ErpProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
