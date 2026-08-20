import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ErpProvider, useErp } from './context/ErpContext'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import UserManagement from './pages/UserManagement'
import CompanyRegistration from './pages/CompanyRegistration'
import BranchManagement from './pages/BranchManagement'
import Categories from './pages/Categories'
import Brands from './pages/Brands'
import ProductManagement from './pages/ProductManagement'
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
import Settings from './pages/Settings'
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
        <Route path="dashboard" element={<Dashboard {...erpCtx} />} />

        {/* ── Company Management ───────────────────────── */}
        <Route path="company-management/company-registration"
          element={<CompanyRegistration companies={companies} {...erpCtx} />} />
        <Route path="company-management/branch-management"
          element={<BranchManagement
            branches={erpCtx.branches || []}
            addBranch={erpCtx.addBranch}
            updateBranch={erpCtx.updateBranch}
            deleteBranch={erpCtx.deleteBranch}
          />} />
        <Route path="company-management/user-management"
          element={<UserManagement users={users} {...erpCtx} />} />
        <Route path="company-management/roles-permissions"
          element={<RolePermissions />} />

        {/* ── Product Management ───────────────────────── */}
        <Route path="product-management/categories"
          element={<Categories categories={categories} subCategories={subCategories} products={products} {...erpCtx} />} />
        <Route path="product-management/brands"
          element={<Brands brands={brands} {...erpCtx} />} />
        <Route path="product-management/products"
          element={<ProductManagement products={products} categories={categories} subCategories={subCategories} brands={brands} {...erpCtx} />} />

        {/* ── Purchase & Inventory ─────────────────────── */}
        <Route path="purchase-inventory/supplier-management"
          element={<SupplierManagement suppliers={erpCtx.suppliers} addSupplier={erpCtx.addSupplier} updateSupplier={erpCtx.updateSupplier} deleteSupplier={erpCtx.deleteSupplier} />} />
        <Route path="purchase-inventory/purchase-management"
          element={<PurchaseManagement branches={erpCtx.branches || []} purchases={purchases} products={products} suppliers={erpCtx.suppliers} {...erpCtx} />} />
        <Route path="purchase-inventory/inventory-management"
          element={<InventoryManagement branches={erpCtx.branches || []} inventory={inventory} products={products} warehouses={warehouses} {...erpCtx} />} />
        <Route path="purchase-inventory/stock-transfer"
          element={<StockTransfer branches={erpCtx.branches || []} transfers={transfers} warehouses={warehouses} products={products} {...erpCtx} />} />
        <Route path="purchase-inventory/warehouse-management"
          element={<WarehouseManagement branches={erpCtx.branches || []} />} />

        {/* ── Marketplace ──────────────────────────────── */}
        <Route path="marketplace/product-search"
          element={<ProductSearch products={products} inventory={inventory} {...erpCtx} />} />
        <Route path="marketplace/enquiry-management"
          element={<EnquiryManagement enquiries={enquiries} inventory={inventory} orders={orders} products={products} branches={erpCtx.branches || []} {...erpCtx} />} />
        <Route path="marketplace/order-management"
          element={<OrderManagement branches={erpCtx.branches || []} orders={orders} enquiries={enquiries} products={products} dispatches={dispatches} {...erpCtx} />} />
        <Route path="marketplace/dispatch-management"
          element={<DispatchManagement branches={erpCtx.branches || []} dispatches={dispatches} orders={orders} {...erpCtx} />} />

        {/* ── CRM ──────────────────────────────────────── */}
        <Route path="crm/customer-management"
          element={<CustomerManagement customers={customers} {...erpCtx} />} />
        <Route path="crm/lead-management"
          element={<LeadManagement leads={leads} customers={customers} {...erpCtx} />} />
        <Route path="crm/followup-management"
          element={<FollowUpManagement followups={followups} leads={leads} customers={customers} {...erpCtx} />} />

        {/* ── Finance ──────────────────────────────────── */}
        <Route path="finance/quotation-manager"
          element={<QuotationManager products={products} enquiries={enquiries} customers={customers} />} />
        <Route path="finance/invoice-management"
          element={<InvoiceManagement products={products} customers={customers} />} />
        <Route path="finance/sales-management"
          element={<SalesManagement branches={erpCtx.branches || []} sales={sales} orders={orders} customers={customers} products={products} addSale={erpCtx.addSale} {...erpCtx} />} />
        <Route path="finance/expense-management"
          element={<ExpenseManagement />} />
        <Route path="finance/payment-management"
          element={<PaymentManagement />} />
        <Route path="finance/accounts-management"
          element={<AccountsModule sales={sales} purchases={purchases} />} />
        <Route path="finance/profit-loss"
          element={<ProfitLoss />} />

        {/* ── HR ───────────────────────────────────────── */}
        <Route path="hr/employee-master"
          element={<EmployeeMasterManagement />} />
        <Route path="hr/employee-management"
          element={<EmployeeManagement branches={erpCtx.branches || []} employees={employees} {...erpCtx} />} />

        {/* ── Reports ──────────────────────────────────── */}
        <Route path="reports/dashboard-analytics"
          element={<DashboardAnalytics />} />
        <Route path="reports/report-center"
          element={<ReportCenter />} />

        {/* ── System ───────────────────────────────────── */}
        <Route path="system/notification-management"
          element={<NotificationSystem notifications={notifications} {...erpCtx} />} />
        <Route path="system/document-management"
          element={<DocumentManagement />} />
        <Route path="system/subscription"   element={<SubscriptionSystem />} />
        <Route path="system/settings"       element={<Settings />} />
        <Route path="system/profile"        element={<Profile />} />
        <Route path="subscription"          element={<SubscriptionSystem />} />
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
