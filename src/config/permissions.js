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
  PURCHASE_DASHBOARD: 'purchase_dashboard', PURCHASE_REQUISITION: 'purchase_requisition', PURCHASE_ORDERS: 'purchase_orders',
  GRN: 'grn', QUALITY_INSPECTION: 'quality_inspection', PURCHASE_INVOICE: 'purchase_invoice',
  PURCHASE_RETURN: 'purchase_return', PURCHASE_REPORTS: 'purchase_reports',
  INVENTORY_DASHBOARD: 'inventory_dashboard', UNIT_CONVERSION: 'unit_conversion', RACK_BIN: 'rack_bin',
  OPENING_STOCK: 'opening_stock', STOCK_LEDGER: 'stock_ledger', STOCK_ADJUSTMENT: 'stock_adjustment',
  DAMAGE_BREAKAGE: 'damage_breakage', BATCH_LOT: 'batch_lot', SHADE_CALIBER: 'shade_caliber',
  INVENTORY_REPORTS: 'inventory_reports',
  PRODUCT_SEARCH: 'product_search', ENQUIRIES: 'enquiries', ORDERS: 'orders', DISPATCHES: 'dispatches',
  CUSTOMERS: 'customers', LEADS: 'leads', FOLLOWUPS: 'followups',
  QUOTATIONS: 'quotations', INVOICES: 'invoices', SALES: 'sales', EXPENSES: 'expenses', PAYMENTS: 'payments', ACCOUNTS: 'accounts', PROFIT_LOSS: 'profit_loss',
  EMPLOYEE_MASTER: 'employee_master', EMPLOYEE_MANAGEMENT: 'employees', ATTENDANCE: 'attendance', SALARY: 'salary',
  DASHBOARD_ANALYTICS: 'reports', REPORT_CENTER: 'reports',
  DOCUMENTS: 'documents', SUBSCRIPTION: 'subscriptions', AUDIT: 'audit',
  STONE_CALC: 'stone_calc',
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

const PURCHASE_ALL = [M.PURCHASE_DASHBOARD, M.SUPPLIERS, M.PURCHASE_REQUISITION, M.PURCHASE_ORDERS, M.PURCHASES, M.GRN, M.QUALITY_INSPECTION, M.PURCHASE_INVOICE, M.PURCHASE_RETURN, M.PURCHASE_REPORTS]
const INVENTORY_ALL = [M.INVENTORY_DASHBOARD, M.PRODUCTS, M.UNIT_CONVERSION, M.WAREHOUSES, M.RACK_BIN, M.OPENING_STOCK, M.INVENTORY, M.STOCK_LEDGER, M.STOCK_TRANSFER, M.STOCK_ADJUSTMENT, M.DAMAGE_BREAKAGE, M.BATCH_LOT, M.SHADE_CALIBER, M.INVENTORY_REPORTS]

export const ROLE_VIEW_MODULES = {
  'Super Admin': '*',
  'Company Owner': '*',
  'Manager': [...COMMON, M.CATEGORIES, M.BRANDS, ...PURCHASE_ALL, ...INVENTORY_ALL, M.PRODUCT_SEARCH, M.ENQUIRIES, M.ORDERS, M.DISPATCHES, M.CUSTOMERS, M.LEADS, M.FOLLOWUPS, M.EMPLOYEE_MANAGEMENT, M.ATTENDANCE, M.REPORT_CENTER, M.STONE_CALC, M.STAFF_MGMT],
  'Accountant': [...COMMON, M.PURCHASE_DASHBOARD, M.SUPPLIERS, M.PURCHASE_ORDERS, M.PURCHASES, M.GRN, M.PURCHASE_INVOICE, M.PURCHASE_RETURN, M.PURCHASE_REPORTS, M.INVENTORY_DASHBOARD, M.INVENTORY, M.STOCK_LEDGER, M.INVENTORY_REPORTS, M.CUSTOMERS, M.QUOTATIONS, M.INVOICES, M.SALES, M.EXPENSES, M.PAYMENTS, M.ACCOUNTS, M.PROFIT_LOSS, M.REPORT_CENTER, M.DOCUMENTS, M.STONE_CALC],
  'Sales Executive': [...COMMON, M.PRODUCT_SEARCH, M.ENQUIRIES, M.ORDERS, M.CUSTOMERS, M.LEADS, M.FOLLOWUPS, M.QUOTATIONS, M.INVENTORY_DASHBOARD, M.INVENTORY, M.STONE_CALC],
  'Warehouse Staff': [...COMMON, M.PRODUCT_SEARCH, M.INVENTORY_DASHBOARD, M.WAREHOUSES, M.RACK_BIN, M.OPENING_STOCK, M.INVENTORY, M.STOCK_LEDGER, M.STOCK_TRANSFER, M.STOCK_ADJUSTMENT, M.DAMAGE_BREAKAGE, M.BATCH_LOT, M.SHADE_CALIBER, M.GRN, M.QUALITY_INSPECTION, M.ORDERS, M.DISPATCHES, M.STONE_CALC],
  'Retailer': [...COMMON, M.PRODUCT_SEARCH, M.ENQUIRIES, M.ORDERS, M.STONE_CALC],
  'Wholesaler': [...COMMON, M.PRODUCT_SEARCH, M.PRODUCTS, M.INVENTORY_DASHBOARD, M.INVENTORY, M.ENQUIRIES, M.ORDERS, M.STONE_CALC],
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
  { key: 'purchase_dashboard', label: 'Purchase Dashboard', category: 'Purchase', actions: [a('view', 'View')] },
  { key: 'suppliers', label: 'Suppliers', category: 'Purchase', actions: crudActions() },
  { key: 'purchase_requisition', label: 'Purchase Requisition', category: 'Purchase', actions: [a('view', 'View'), a('create', 'Create'), a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('reject', 'Reject'), a('convert', 'Convert to PO'), a('cancel', 'Cancel')] },
  { key: 'purchase_orders', label: 'Purchase Orders', category: 'Purchase', actions: [a('view', 'View'), a('create', 'Create'), a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('send', 'Send'), a('complete', 'Mark Received'), a('cancel', 'Cancel'), a('export', 'Export')] },
  { key: 'purchases', label: 'Purchase Bills', category: 'Purchase', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('stock_in', 'Receive Stock'), a('complete', 'Complete'), a('cancel', 'Cancel'), a('export', 'Export')] },
  { key: 'grn', label: 'GRN / Goods Receipt', category: 'Purchase', actions: [a('view', 'View'), a('create', 'Create GRN'), a('edit', 'Edit'), a('approve', 'Approve'), a('cancel', 'Cancel'), a('export', 'Export')] },
  { key: 'quality_inspection', label: 'Quality Inspection', category: 'Purchase', actions: [a('view', 'View'), a('create', 'Record QC'), a('approve', 'Approve QC'), a('reject', 'Reject QC')] },
  { key: 'purchase_invoice', label: 'Purchase Invoice', category: 'Purchase', actions: [a('view', 'View'), a('create', 'Create'), a('edit', 'Edit'), a('export', 'Print / Export')] },
  { key: 'purchase_return', label: 'Purchase Return', category: 'Purchase', actions: [a('view', 'View'), a('create', 'Create Return'), a('approve', 'Approve'), a('complete', 'Complete'), a('cancel', 'Cancel')] },
  { key: 'purchase_reports', label: 'Purchase Reports', category: 'Purchase', actions: [a('view', 'View Reports'), a('export', 'Export')] },
  { key: 'inventory_dashboard', label: 'Inventory Dashboard', category: 'Inventory', actions: [a('view', 'View')] },
  { key: 'unit_conversion', label: 'Units & Conversion', category: 'Inventory', actions: crudActions() },
  { key: 'warehouses', label: 'Warehouses', category: 'Inventory', actions: [a('view', 'View'), a('create', 'Add'), a('edit', 'Edit'), a('delete', 'Delete'), a('view_stock', 'View Stock')] },
  { key: 'rack_bin', label: 'Rack / Bin Locations', category: 'Inventory', actions: crudActions() },
  { key: 'opening_stock', label: 'Opening Stock', category: 'Inventory', actions: [a('view', 'View'), a('create', 'Add Opening Stock'), a('edit', 'Edit'), a('delete', 'Delete')] },
  { key: 'inventory', label: 'Current Stock', category: 'Inventory', actions: [a('view', 'View'), a('stock_in', 'Stock In'), a('stock_out', 'Stock Out')] },
  { key: 'stock_ledger', label: 'Stock Ledger', category: 'Inventory', actions: [a('view', 'View Ledger'), a('export', 'Export')] },
  { key: 'stock_transfer', label: 'Stock Transfer', category: 'Inventory', actions: [a('view', 'View'), a('transfer', 'Create Transfer'), a('approve', 'Approve'), a('dispatch', 'Dispatch'), a('receive', 'Receive'), a('cancel', 'Cancel'), a('delete', 'Delete')] },
  { key: 'stock_adjustment', label: 'Stock Adjustment', category: 'Inventory', actions: [a('view', 'View'), a('create', 'Create Adjustment'), a('approve', 'Approve'), a('export', 'Export')] },
  { key: 'damage_breakage', label: 'Damage / Breakage', category: 'Inventory', actions: [a('view', 'View'), a('create', 'Record Damage'), a('approve', 'Approve'), a('export', 'Export')] },
  { key: 'batch_lot', label: 'Batch / Lot Management', category: 'Inventory', actions: [a('view', 'View'), a('create', 'Create'), a('edit', 'Edit'), a('delete', 'Delete')] },
  { key: 'shade_caliber', label: 'Shade / Caliber', category: 'Inventory', actions: [a('view', 'View'), a('create', 'Create'), a('edit', 'Edit'), a('delete', 'Delete')] },
  { key: 'inventory_reports', label: 'Inventory Reports', category: 'Inventory', actions: [a('view', 'View Reports'), a('export', 'Export')] },
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
  { key: 'stone_calc', label: 'Stone Calculation', category: 'Tools', actions: [a('view', 'View'), a('create', 'Create Sheet'), a('edit', 'Edit'), a('delete', 'Delete'), a('export', 'Download / Print')] },
  // App-connection management
  { key: 'wholesaler_mgmt', label: 'Wholesaler Management', category: 'App Management', actions: [a('view', 'View'), a('create', 'Add Wholesaler'), a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('reject', 'Reject')] },
  { key: 'retailer_mgmt',   label: 'Retailer Management',   category: 'App Management', actions: [a('view', 'View'), a('create', 'Add Retailer'),  a('edit', 'Edit'), a('delete', 'Delete'), a('approve', 'Approve'), a('reject', 'Reject')] },
  { key: 'staff_mgmt',      label: 'Staff Management',      category: 'App Management', actions: [a('view', 'View'), a('create', 'Add Staff'),     a('edit', 'Edit'), a('delete', 'Delete'), a('reset_password', 'Reset Password')] },
]
