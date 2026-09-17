/**
 * Frontend action-level RBAC.
 * Live permissions are loaded from GET /role-permissions/me in this shape:
 *   { products: { view: true, create: false, edit: false, delete: false } }
 *
 * `canAccess` remains the route/sidebar view check.
 * `canPerform` is used for buttons and handlers.
 */

export const MODULES = {
  DASHBOARD: 'dashboard', PROFILE: 'profile', NOTIFICATIONS: 'notifications',
  COMPANY_REGISTRATION: 'company', BRANCH_MANAGEMENT: 'branch', USER_MANAGEMENT: 'users', ROLE_PERMISSIONS: 'users',
  CATEGORIES: 'categories', BRANDS: 'brands', PRODUCTS: 'products',
  SUPPLIERS: 'suppliers', PURCHASES: 'purchases', WAREHOUSES: 'warehouses', INVENTORY: 'inventory', STOCK_TRANSFER: 'stock_transfer',
  PRODUCT_SEARCH: 'product_search', ENQUIRIES: 'enquiries', ORDERS: 'orders', DISPATCHES: 'dispatches',
  CUSTOMERS: 'customers', LEADS: 'leads', FOLLOWUPS: 'followups',
  QUOTATIONS: 'quotations', INVOICES: 'invoices', SALES: 'sales', EXPENSES: 'expenses', PAYMENTS: 'payments', ACCOUNTS: 'accounts', PROFIT_LOSS: 'profit_loss',
  EMPLOYEE_MASTER: 'employee_master', EMPLOYEE_MANAGEMENT: 'employees', ATTENDANCE: 'attendance', SALARY: 'salary',
  DASHBOARD_ANALYTICS: 'reports', REPORT_CENTER: 'reports',
  DOCUMENTS: 'documents', SUBSCRIPTION: 'subscriptions', AUDIT: 'audit',
  GRADIENT_CALC: 'gradient_calc',
  // App-connection management sections (Super Admin / Company Owner only)
  WHOLESALER_MGMT: 'wholesaler_mgmt',
  RETAILER_MGMT: 'retailer_mgmt',
  STAFF_MGMT: 'staff_mgmt',
}

export const ACTIONS = {
  VIEW: 'view', CREATE: 'create', EDIT: 'edit', DELETE: 'delete', EXPORT: 'export',
  APPROVE: 'approve', REJECT: 'reject', CANCEL: 'cancel', COMPLETE: 'complete',
  STOCK_IN: 'stock_in', STOCK_OUT: 'stock_out', TRANSFER: 'transfer',
  REPLY: 'reply', OFFER: 'offer', CONVERT: 'convert', DELIVER: 'deliver', DISPATCH: 'dispatch',
  UPLOAD: 'upload', DOWNLOAD: 'download', PAYMENT: 'payment', PAY: 'pay', COLLECT: 'collect',
  MANAGE_PERMISSIONS: 'manage_permissions',
}

const M = MODULES
const COMMON = [M.DASHBOARD, M.PROFILE, M.NOTIFICATIONS]

// Safe view-only fallback used only while the live v2 matrix is loading.
export const ROLE_VIEW_MODULES = {
  'Super Admin': '*',
  'Company Owner': '*',
  'Manager': [...COMMON, M.CATEGORIES, M.BRANDS, M.PRODUCTS, M.SUPPLIERS, M.WAREHOUSES, M.INVENTORY, M.STOCK_TRANSFER, M.PRODUCT_SEARCH, M.ENQUIRIES, M.ORDERS, M.DISPATCHES, M.CUSTOMERS, M.LEADS, M.FOLLOWUPS, M.EMPLOYEE_MANAGEMENT, M.ATTENDANCE, M.REPORT_CENTER, M.GRADIENT_CALC, M.STAFF_MGMT],
  'Accountant': [...COMMON, M.SUPPLIERS, M.PURCHASES, M.CUSTOMERS, M.QUOTATIONS, M.INVOICES, M.SALES, M.EXPENSES, M.PAYMENTS, M.ACCOUNTS, M.PROFIT_LOSS, M.REPORT_CENTER, M.DOCUMENTS, M.GRADIENT_CALC],
  'Sales Executive': [...COMMON, M.PRODUCT_SEARCH, M.ENQUIRIES, M.ORDERS, M.CUSTOMERS, M.LEADS, M.FOLLOWUPS, M.QUOTATIONS, M.GRADIENT_CALC],
  'Warehouse Staff': [...COMMON, M.PRODUCT_SEARCH, M.WAREHOUSES, M.INVENTORY, M.STOCK_TRANSFER, M.ORDERS, M.DISPATCHES, M.GRADIENT_CALC],
  'Retailer': [...COMMON, M.PRODUCT_SEARCH, M.ENQUIRIES, M.ORDERS, M.GRADIENT_CALC],
  'Wholesaler': [...COMMON, M.PRODUCT_SEARCH, M.PRODUCTS, M.INVENTORY, M.ENQUIRIES, M.ORDERS, M.GRADIENT_CALC],
}

let _override = null
const _listeners = new Set()

export function setLivePermissions(map) {
  _override = map && typeof map === 'object' ? structuredClone(map) : null
  _listeners.forEach(listener => { try { listener() } catch { /* no-op */ } })
}

export function clearLivePermissions() {
  setLivePermissions(null)
}

export function onPermissionsChange(listener) {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

export function canPerform(role, moduleKey, actionKey = 'view') {
  if (!role) return false
  if (role === 'Super Admin') return true
  if (!moduleKey) return true

  if (_override) {
    const modulePermission = _override[moduleKey]
    // Compatibility with legacy { module: boolean } responses.
    if (typeof modulePermission === 'boolean') return modulePermission
    if (modulePermission && typeof modulePermission === 'object') return modulePermission[actionKey] === true
    return false
  }

  // Before live permissions load, expose only SOP-default page visibility.
  if (actionKey !== 'view') return false
  const allowed = ROLE_VIEW_MODULES[role]
  return allowed === '*' || Array.isArray(allowed) && allowed.includes(moduleKey)
}

export function canAccess(role, moduleKey) {
  return canPerform(role, moduleKey, 'view')
}

export function allowedModules(role) {
  const allowed = ROLE_VIEW_MODULES[role]
  if (allowed === '*') return [...new Set(Object.values(MODULES))]
  return Array.isArray(allowed) ? allowed : []
}


// Full SOP catalog used by the permission editor and as a compatibility fallback
// when an older running backend still returns modules without action definitions.
const a = (key, label) => ({ key, label })
const crudActions = () => [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete')]

export const PERMISSION_CATALOG = [
  { key: 'dashboard', label: 'Dashboard', category: 'General', actions: [a('view', 'View')] },
  { key: 'profile', label: 'Profile', category: 'General', actions: [a('view', 'View'), a('edit', 'Edit Profile'), a('change_password', 'Change Password')] },
  { key: 'notifications', label: 'Notification System', category: 'General', actions: [a('view', 'View'), a('mark_read', 'Mark Read'), a('delete', 'Delete')] },
  { key: 'company', label: 'Company Registration', category: 'Company Management', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('reject', 'Reject'), a('view_document', 'View Documents')] },
  { key: 'branch', label: 'Branch Management', category: 'Company Management', actions: crudActions() },
  { key: 'users', label: 'User & Role Management', category: 'Company Management', actions: [a('view', 'View'), a('create', 'Add User'), a('edit', 'Edit User'), a('delete', 'Delete User'), a('reset_password', 'Reset Password'), a('assign_role', 'Assign Role'), a('manage_permissions', 'Manage Permissions')] },
  { key: 'categories', label: 'Category Management', category: 'Product Management', actions: crudActions() },
  { key: 'brands', label: 'Brand Management', category: 'Product Management', actions: crudActions() },
  { key: 'products', label: 'Product Management', category: 'Product Management', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('view_deleted', 'View Recycle Bin'), a('restore', 'Restore'), a('export', 'Download / Export')] },
  { key: 'suppliers', label: 'Supplier Management', category: 'Purchase & Inventory', actions: crudActions() },
  { key: 'purchases', label: 'Purchase Management', category: 'Purchase & Inventory', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('stock_in', 'Receive Stock'), a('complete', 'Complete'), a('cancel', 'Cancel'), a('export', 'Export')] },
  { key: 'warehouses', label: 'Warehouse Management', category: 'Purchase & Inventory', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('view_stock', 'View Stock')] },
  { key: 'inventory', label: 'Inventory Management', category: 'Purchase & Inventory', actions: [a('view', 'View'), a('stock_in', 'Stock In'), a('stock_out', 'Stock Out')] },
  { key: 'stock_transfer', label: 'Stock Transfer', category: 'Purchase & Inventory', actions: [a('view', 'View'), a('transfer', 'Create Transfer'), a('approve', 'Approve'), a('complete', 'Complete'), a('cancel', 'Cancel'), a('delete', 'Delete')] },
  { key: 'product_search', label: 'Product Search', category: 'Marketplace', actions: [a('view', 'View / Search')] },
  { key: 'orders', label: 'Order Management', category: 'Marketplace', actions: [a('view', 'View'), a('create', 'Create'), a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('pick', 'Pick'), a('sort', 'Sort'), a('pack', 'Pack'), a('invoice', 'Generate Invoice'), a('dispatch', 'Dispatch'), a('deliver', 'Deliver'), a('cancel', 'Cancel')] },
  { key: 'dispatches', label: 'Dispatch Management', category: 'Marketplace', actions: [a('view', 'View'), a('dispatch', 'Create / In Transit'), a('edit', 'Edit'), a('deliver', 'Mark Delivered')] },
  { key: 'customers', label: 'Customer Management', category: 'CRM', actions: crudActions() },
  { key: 'leads', label: 'Lead Management', category: 'CRM', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('convert', 'Convert to Customer')] },
  { key: 'followups', label: 'Follow-up Management', category: 'CRM', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('complete', 'Mark Done')] },
  { key: 'quotations', label: 'Quotation Management', category: 'Finance', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('send', 'Send'), a('approve', 'Accept'), a('convert', 'Convert'), a('cancel', 'Cancel'), a('export', 'Print / Export')] },
  { key: 'invoices', label: 'Invoice Management', category: 'Finance', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('send', 'Send'), a('payment', 'Record Payment'), a('cancel', 'Cancel'), a('export', 'Print / Export')] },
  { key: 'sales', label: 'Sales Management', category: 'Finance', actions: [a('view', 'View'), a('create', 'Sales Entry'), a('export', 'Export')] },
  { key: 'expenses', label: 'Expense Management', category: 'Finance', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('export', 'Export')] },
  { key: 'payments', label: 'Payment Management', category: 'Finance', actions: [a('view', 'View'), a('collect', 'Collect Receivable'), a('pay', 'Pay Supplier'), a('export', 'Export')] },
  { key: 'accounts', label: 'Accounts Module', category: 'Finance', actions: [a('view', 'View Ledgers'), a('export', 'Export')] },
  { key: 'profit_loss', label: 'Profit & Loss', category: 'Finance', actions: [a('view', 'View'), a('export', 'Export')] },
  { key: 'employee_master', label: 'Employee Master', category: 'HR', actions: crudActions() },
  { key: 'employees', label: 'Employee Management', category: 'HR', actions: crudActions() },
  { key: 'attendance', label: 'Attendance', category: 'HR', actions: [a('view', 'View'), a('mark', 'Mark Attendance'), a('edit', 'Edit Attendance')] },
  { key: 'salary', label: 'Salary', category: 'HR', actions: [a('view', 'View'), a('process', 'Process Salary'), a('pay', 'Mark Paid'), a('export', 'Download Payslip')] },
  { key: 'reports', label: 'Report Center', category: 'Reports', actions: [a('view', 'View'), a('export', 'PDF / Excel Export')] },
  { key: 'documents', label: 'Document Management', category: 'System', actions: [a('view', 'View'), a('upload', 'Upload'), a('download', 'Download'), a('delete', 'Delete')] },
  { key: 'subscriptions', label: 'Subscription System', category: 'System', actions: [a('view', 'View'), a('change_plan', 'Upgrade / Change Plan'), a('cancel', 'Cancel')] },
  // App-connection management
  { key: 'wholesaler_mgmt', label: 'Wholesaler Management', category: 'App Management', actions: [a('view', 'View'), a('create', 'Add Wholesaler'), a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('reject', 'Reject')] },
  { key: 'retailer_mgmt',   label: 'Retailer Management',   category: 'App Management', actions: [a('view', 'View'), a('create', 'Add Retailer'),  a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('reject', 'Reject')] },
  { key: 'staff_mgmt',      label: 'Staff Management',      category: 'App Management', actions: [a('view', 'View'), a('create', 'Add Staff'),     a('edit', 'Edit'), a('delete', 'Delete'), a('reset_password', 'Reset Password')] },
]
