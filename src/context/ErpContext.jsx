/**
 * ErpContext — Complete live data from real API
 * All modules get real backend data through this context.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

// ── API imports ───────────────────────────────────────────────
import { enquiryApi }      from '../api/enquiryApi'
import { orderApi }        from '../api/orderApi'
import { dispatchApi }     from '../api/dispatchApi'
import { inventoryApi }    from '../api/inventoryApi'
import { purchaseApi, salesApi, paymentApi, expenseApi } from '../api/financeApi'
import { notificationApi, documentApi, reportApi } from '../api/systemApi'
import { productApi, categoryApi, brandApi, subCategoryApi } from '../api/productApi'
import { customerApi, leadApi, followupApi } from '../api/crmApi'
import { hrApi }           from '../api/hrApi'
import { userApi }         from '../api/userApi'
import { branchApi }       from '../api/branchApi'
import { companyApi }      from '../api/companyApi'

const ErpContext = createContext(null)

export function ErpProvider({ children }) {
  const { isLoggedIn, user: authUser } = useAuth()

  // ── Core state ────────────────────────────────────────────
  const [enquiries,      setEnquiries]      = useState([])
  const [orders,         setOrders]         = useState([])
  const [dispatches,     setDispatches]     = useState([])
  const [inventory,      setInventory]      = useState([])
  const [purchases,      setPurchases]      = useState([])
  const [sales,          setSales]          = useState([])
  const [expenses,       setExpenses]       = useState([])
  const [payments,       setPayments]       = useState({ receivables: [], payables: [], history: [] })
  const [notifications,  setNotifications]  = useState([])
  const [products,       setProducts]       = useState([])
  const [categories,     setCategories]     = useState([])
  const [subCategories,  setSubCategories]  = useState([])
  const [brands,         setBrands]         = useState([])
  const [customers,      setCustomers]      = useState([])
  const [leads,          setLeads]          = useState([])
  const [followups,      setFollowups]      = useState([])
  const [employees,      setEmployees]      = useState([])
  const [users,          setUsers]          = useState([])
  const [companies,      setCompanies]      = useState([])
  const [warehouses,     setWarehouses]     = useState([])
  const [transfers,      setTransfers]      = useState([])
  const [documents,      setDocuments]      = useState([])
  const [dashboardStats, setDashboardStats] = useState(null)
  const [loadingData,    setLoadingData]    = useState(false)
  const [branches,       setBranches]       = useState([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [suppliers,      setSuppliers]      = useState([])

  // ── Helper: extract array from API response ───────────────
  const arr = (res, key) => {
    const d = res?.data || res
    return Array.isArray(d) ? d : (Array.isArray(d?.[key]) ? d[key] : [])
  }

  // ── Fetch all data ────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!isLoggedIn) return
    setLoadingData(true)
    try {
      const isSuperAdmin = authUser?.role === 'Super Admin'
      const canManageUsers = isSuperAdmin || authUser?.role === 'Admin' || authUser?.role === 'Manager'

      const results = await Promise.allSettled([
        enquiryApi.list({ limit: 100 }),               // 0
        orderApi.list({ limit: 100 }),                 // 1
        dispatchApi.list({ limit: 100 }),              // 2
        inventoryApi.list({ limit: 200 }),             // 3
        purchaseApi.list({ limit: 100 }),              // 4
        salesApi.list({ limit: 100 }),                 // 5
        paymentApi.listReceivables({ limit: 100 }),    // 6
        paymentApi.listPayables({ limit: 100 }),       // 7
        paymentApi.listTransactions({ limit: 100 }),   // 8
        notificationApi.list({ limit: 50 }),           // 9
        productApi.list({ limit: 200 }),               // 10
        categoryApi.list(),                            // 11
        brandApi.list(),                               // 12
        subCategoryApi.list(),                         // 13
        customerApi.list({ limit: 100 }),              // 14
        leadApi.list({ limit: 100 }),                  // 15
        followupApi.list({ limit: 100 }),              // 16
        hrApi.listEmployees({ limit: 100 }),           // 17
        expenseApi.list({ limit: 100 }),               // 18
        inventoryApi.listWarehouses(),                 // 19
        inventoryApi.listTransfers({ limit: 100 }),    // 20
        documentApi.list({ limit: 50 }),               // 21
        canManageUsers ? userApi.list({ limit: 100 }) : Promise.resolve(null),  // 22
        isSuperAdmin ? companyApi.list({ limit: 50 }) : Promise.resolve(null), // 23
        purchaseApi.listSuppliers(),                                            // 24
      ])

      const ok = (i) => results[i]?.status === 'fulfilled' ? (results[i].value) : null

      if (ok(0))  setEnquiries(arr(ok(0), 'enquiries'))
      if (ok(1))  setOrders(arr(ok(1), 'orders'))
      if (ok(2))  setDispatches(arr(ok(2), 'dispatches'))
      if (ok(3))  setInventory(arr(ok(3), 'inventory'))
      if (ok(4))  setPurchases(arr(ok(4), 'purchases'))
      if (ok(5))  setSales(arr(ok(5), 'sales'))
      if (ok(9))  setNotifications(arr(ok(9), 'notifications'))
      if (ok(10)) setProducts(arr(ok(10), 'products'))
      if (ok(11)) setCategories(Array.isArray(ok(11)?.data) ? ok(11).data : (ok(11) || []))
      if (ok(12)) setBrands(Array.isArray(ok(12)?.data) ? ok(12).data : (ok(12) || []))
      if (ok(13)) setSubCategories(Array.isArray(ok(13)?.data) ? ok(13).data : (ok(13) || []))
      if (ok(14)) setCustomers(arr(ok(14), 'customers'))
      if (ok(15)) setLeads(arr(ok(15), 'leads'))
      if (ok(16)) setFollowups(arr(ok(16), 'followups'))
      if (ok(17)) setEmployees(arr(ok(17), 'employees'))
      if (ok(18)) setExpenses(arr(ok(18), 'expenses'))
      if (ok(19)) setWarehouses(Array.isArray(ok(19)?.data) ? ok(19).data : (ok(19) || []))
      if (ok(20)) setTransfers(arr(ok(20), 'transfers'))
      if (ok(21)) setDocuments(arr(ok(21), 'documents'))
      if (ok(22)) setUsers(arr(ok(22), 'users'))
      if (ok(23)) setCompanies(arr(ok(23), 'companies'))
      if (ok(24)) {
        const sRes = ok(24)
        const sData = sRes?.data || sRes
        setSuppliers(Array.isArray(sData) ? sData : (Array.isArray(sData?.suppliers) ? sData.suppliers : []))
      }

      const rcv = ok(6) ? arr(ok(6), 'receivables') : []
      const pay = ok(7) ? arr(ok(7), 'payables')    : []
      const txn = ok(8) ? arr(ok(8), 'transactions') : []
      setPayments({ receivables: rcv, payables: pay, history: txn })

      try {
        const statsRes = await reportApi.getDashboardStats()
        setDashboardStats(statsRes?.data || statsRes)
      } catch { /* non-fatal */ }

    } catch (err) {
      console.error('[ERP] fetchAll error:', err)
    } finally {
      setLoadingData(false)
    }
  }, [isLoggedIn, authUser?.role])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Notification helper ───────────────────────────────────
  const addNotification = useCallback((msg, type = 'info') => {
    setNotifications(prev => [{
      _id: Date.now(), type, message: msg, title: msg,
      is_read: false, created_at: new Date().toISOString(),
    }, ...prev])
  }, [])

  // ─────────────────────────────────────────────────────────
  // ENQUIRY ACTIONS
  // ─────────────────────────────────────────────────────────
  const addEnquiry = useCallback(async (data) => {
    try {
      const res = await enquiryApi.create(data)
      const newEnq = res?.data || res
      setEnquiries(prev => [newEnq, ...prev])
      addNotification(`New Enquiry ${newEnq.enq_code || ''} from ${data.retailer_name || data.retailer || ''}`, 'enquiry')
      return { success: true, data: newEnq }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create enquiry' }
    }
  }, [addNotification])

  const updateEnquiry = useCallback(async (id, changes) => {
    try {
      const res = await enquiryApi.update(id, changes)
      const updated = res?.data || res
      setEnquiries(prev => prev.map(e => (e._id === id || e.id === id) ? { ...e, ...updated } : e))
      return { success: true, data: updated }
    } catch (err) {
      setEnquiries(prev => prev.map(e => (e._id === id || e.id === id) ? { ...e, ...changes } : e))
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteEnquiry = useCallback(async (id) => {
    try {
      await enquiryApi.delete(id)
      setEnquiries(prev => prev.filter(e => e._id !== id && e.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  const convertEnquiryToOrder = useCallback(async (enquiry, agreedRate) => {
    try {
      const rate = agreedRate || enquiry.offered_price || 0
      const qty  = enquiry.qty || 0
      const amount = rate * qty
      const gst    = Math.round(amount * 0.18)
      const total  = amount + gst
      const orderData = {
        enquiry_id: enquiry._id || enquiry.id,
        customer_name: enquiry.retailer_name || enquiry.retailer,
        customer_mobile: enquiry.retailer_mobile || enquiry.mobile,
        product_id: enquiry.product_id,
        product_code: enquiry.product_code,
        product_name: enquiry.product_name || enquiry.product,
        qty, rate, amount, gst_percent: 18, gst_amount: gst, total_amount: total,
      }
      const res = await orderApi.create(orderData)
      const newOrder = res?.data || res
      setOrders(prev => [newOrder, ...prev])
      setEnquiries(prev => prev.map(e => {
        const eid = e._id || e.id
        const qid = enquiry._id || enquiry.id
        return eid === qid ? { ...e, status: 'Won', order_id: newOrder._id || newOrder.id } : e
      }))
      addNotification(`Order ${newOrder.order_code} created — ₹${total.toLocaleString()}`, 'order')
      return { success: true, data: newOrder }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create order' }
    }
  }, [addNotification])

  // ─────────────────────────────────────────────────────────
  // ORDER ACTIONS
  // ─────────────────────────────────────────────────────────
  const updateOrderStatus = useCallback(async (orderId, statusData) => {
    try {
      const res = await orderApi.updateStatus(orderId, statusData)
      const updated = res?.data || res
      setOrders(prev => prev.map(o => (o._id === orderId || o.id === orderId) ? { ...o, ...updated } : o))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Status update failed' }
    }
  }, [])

  const startPacking       = useCallback(async (id) => updateOrderStatus(id, { status: 'Processing', warehouse_status: 'Packing' }), [updateOrderStatus])
  const markReadyForDispatch = useCallback(async (id) => updateOrderStatus(id, { status: 'Ready', warehouse_status: 'Ready for Dispatch' }), [updateOrderStatus])

  // ─────────────────────────────────────────────────────────
  // DISPATCH ACTIONS
  // ─────────────────────────────────────────────────────────
  const createDispatch = useCallback(async (data) => {
    try {
      const res = await dispatchApi.create(data)
      const newDispatch = res?.data || res
      setDispatches(prev => [newDispatch, ...prev])
      setOrders(prev => prev.map(o => {
        const oid = o._id || o.id
        if (oid === (data.order_id || data.orderId))
          return { ...o, status: 'Dispatched', dispatch_id: newDispatch._id || newDispatch.id }
        return o
      }))
      addNotification(`Order ${data.order_id} dispatched via ${data.transport_name}`, 'dispatch')
      return { success: true, data: newDispatch }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Dispatch failed' }
    }
  }, [addNotification])

  const markDelivered = useCallback(async (dispatchId, delivered_date) => {
    try {
      const res = await dispatchApi.markDelivered(dispatchId, delivered_date)
      const updated = res?.data || res
      setDispatches(prev => prev.map(d =>
        (d._id === dispatchId || d.id === dispatchId) ? { ...d, ...updated, status: 'Delivered' } : d
      ))
      await fetchAll()
      addNotification('Delivery confirmed. Sale & receivable auto-created.', 'delivery')
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Mark delivered failed' }
    }
  }, [fetchAll, addNotification])

  // ─────────────────────────────────────────────────────────
  // PURCHASE ACTIONS
  // ─────────────────────────────────────────────────────────
  const addPurchase = useCallback(async (data) => {
    try {
      const res = await purchaseApi.create(data)
      const newPurchase = res?.data || res
      setPurchases(prev => [newPurchase, ...prev])
      const invRes = await inventoryApi.list({ limit: 200 })
      setInventory(arr(invRes, 'inventory'))
      addNotification(`Purchase added. Inventory updated for ${data.product_name || ''}`, 'purchase')
      return { success: true, data: newPurchase }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Purchase failed' }
    }
  }, [addNotification])

  const updatePurchase = useCallback(async (id, data) => {
    try {
      const res = await purchaseApi.update(id, data)
      const updated = res?.data || res
      setPurchases(prev => prev.map(p => (p._id || p.id) === id ? { ...p, ...updated } : p))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deletePurchase = useCallback(async (id) => {
    try {
      await purchaseApi.delete(id)
      setPurchases(prev => prev.filter(p => (p._id || p.id) !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // PAYMENT ACTIONS
  // ─────────────────────────────────────────────────────────
  const recordPayment = useCallback(async (receivableId, amount, mode, reference, notes) => {
    try {
      const res = await paymentApi.collectReceivable(receivableId, { amount, mode, reference, notes })
      const updated = res?.data || res
      setPayments(prev => ({
        ...prev,
        receivables: prev.receivables.map(r =>
          (r._id === receivableId || r.id === receivableId) ? { ...r, ...updated } : r
        ),
      }))
      addNotification(`Payment ₹${parseFloat(amount).toLocaleString()} received`, 'payment')
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Payment failed' }
    }
  }, [addNotification])

  // ─────────────────────────────────────────────────────────
  // CUSTOMER ACTIONS
  // ─────────────────────────────────────────────────────────
  const addCustomer = useCallback(async (data) => {
    try {
      const res = await customerApi.create(data)
      const newCust = res?.data || res
      setCustomers(prev => [newCust, ...prev])
      return { success: true, data: newCust }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create customer' }
    }
  }, [])

  const updateCustomer = useCallback(async (id, data) => {
    try {
      const res = await customerApi.update(id, data)
      const updated = res?.data || res
      setCustomers(prev => prev.map(c => (c._id === id || c.id === id) ? { ...c, ...updated } : c))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteCustomer = useCallback(async (id) => {
    try {
      await customerApi.delete(id)
      setCustomers(prev => prev.filter(c => c._id !== id && c.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // LEAD ACTIONS
  // ─────────────────────────────────────────────────────────
  const addLead = useCallback(async (data) => {
    try {
      const res = await leadApi.create(data)
      const newLead = res?.data || res
      setLeads(prev => [newLead, ...prev])
      return { success: true, data: newLead }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create lead' }
    }
  }, [])

  const updateLead = useCallback(async (id, data) => {
    try {
      const res = await leadApi.update(id, data)
      const updated = res?.data || res
      setLeads(prev => prev.map(l => (l._id === id || l.id === id) ? { ...l, ...updated } : l))
      return { success: true, data: updated }
    } catch (err) {
      setLeads(prev => prev.map(l => (l._id === id || l.id === id) ? { ...l, ...data } : l))
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteLead = useCallback(async (id) => {
    try {
      await leadApi.delete(id)
      setLeads(prev => prev.filter(l => l._id !== id && l.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  const convertLead = useCallback(async (id) => {
    try {
      const res = await leadApi.convert(id)
      const result = res?.data || res
      const lead = result?.lead || result
      setLeads(prev => prev.map(l => (l._id === id || l.id === id) ? { ...l, status: 'Converted' } : l))
      if (result?.customer) setCustomers(prev => [result.customer, ...prev])
      return { success: true, data: result }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Convert failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // FOLLOW-UP ACTIONS
  // ─────────────────────────────────────────────────────────
  const addFollowup = useCallback(async (data) => {
    try {
      const res = await followupApi.create(data)
      const newF = res?.data || res
      setFollowups(prev => [newF, ...prev])
      return { success: true, data: newF }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create follow-up' }
    }
  }, [])

  const updateFollowup = useCallback(async (id, data) => {
    try {
      const res = await followupApi.update(id, data)
      const updated = res?.data || res
      setFollowups(prev => prev.map(f => (f._id === id || f.id === id) ? { ...f, ...updated } : f))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteFollowup = useCallback(async (id) => {
    try {
      await followupApi.delete(id)
      setFollowups(prev => prev.filter(f => f._id !== id && f.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // EMPLOYEE ACTIONS
  // ─────────────────────────────────────────────────────────
  const addEmployee = useCallback(async (data) => {
    try {
      const res = await hrApi.createEmployee(data)
      const newEmp = res?.data || res
      setEmployees(prev => [newEmp, ...prev])
      return { success: true, data: newEmp }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create employee' }
    }
  }, [])

  const updateEmployee = useCallback(async (id, data) => {
    try {
      const res = await hrApi.updateEmployee(id, data)
      const updated = res?.data || res
      setEmployees(prev => prev.map(e => (e._id === id || e.id === id) ? { ...e, ...updated } : e))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteEmployee = useCallback(async (id) => {
    try {
      await hrApi.deleteEmployee(id)
      setEmployees(prev => prev.filter(e => e._id !== id && e.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // CATEGORY & BRAND ACTIONS
  // ─────────────────────────────────────────────────────────
  const addCategory = useCallback(async (data) => {
    try {
      const res = await categoryApi.create(data)
      const newCat = res?.data || res
      setCategories(prev => [...prev, newCat])
      return { success: true, data: newCat }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const updateCategory = useCallback(async (id, data) => {
    try {
      const res = await categoryApi.update(id, data)
      const updated = res?.data || res
      setCategories(prev => prev.map(c => (c._id === id || c.id === id) ? { ...c, ...updated } : c))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const deleteCategory = useCallback(async (id) => {
    try {
      await categoryApi.delete(id)
      setCategories(prev => prev.filter(c => c._id !== id && c.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const addBrand = useCallback(async (data) => {    try {
      const res = await brandApi.create(data)
      const newBrand = res?.data || res
      setBrands(prev => [...prev, newBrand])
      return { success: true, data: newBrand }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const updateBrand = useCallback(async (id, data) => {
    try {
      const res = await brandApi.update(id, data)
      const updated = res?.data || res
      setBrands(prev => prev.map(b => (b._id === id || b.id === id) ? { ...b, ...updated } : b))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const deleteBrand = useCallback(async (id) => {
    try {
      await brandApi.delete(id)
      setBrands(prev => prev.filter(b => b._id !== id && b.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // SUB-CATEGORY ACTIONS
  // ─────────────────────────────────────────────────────────
  const addSubCategory = useCallback(async (data) => {
    try {
      const res = await subCategoryApi.create(data)
      const newSub = res?.data || res
      setSubCategories(prev => [...prev, newSub])
      return { success: true, data: newSub }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const updateSubCategory = useCallback(async (id, data) => {
    try {
      const res = await subCategoryApi.update(id, data)
      const updated = res?.data || res
      setSubCategories(prev => prev.map(s => (s._id === id || s.id === id) ? { ...s, ...updated } : s))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const deleteSubCategory = useCallback(async (id) => {
    try {
      await subCategoryApi.delete(id)
      setSubCategories(prev => prev.filter(s => s._id !== id && s.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // PRODUCT ACTIONS
  // ─────────────────────────────────────────────────────────
  const addProduct = useCallback(async (data) => {
    try {
      const res = await productApi.create(data)
      const newProd = res?.data || res
      // Re-fetch the product so it has populated category_name / brand_name
      try {
        const id = newProd._id || newProd.id
        if (id) {
          const fetched = await productApi.get(id)
          const populated = fetched?.data || fetched
          setProducts(prev => [populated, ...prev])
          return { success: true, data: populated }
        }
      } catch { /* fall through to unpopulated */ }
      setProducts(prev => [newProd, ...prev])
      return { success: true, data: newProd }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create product' }
    }
  }, [])

  const updateProduct = useCallback(async (id, data) => {
    try {
      const res = await productApi.update(id, data)
      const updated = res?.data || res
      // Re-fetch so category_name / brand_name are populated
      try {
        const fetched = await productApi.get(id)
        const populated = fetched?.data || fetched
        setProducts(prev => prev.map(p =>
          (p._id === id || p.id === id) ? populated : p
        ))
        return { success: true, data: populated }
      } catch { /* fall through */ }
      setProducts(prev => prev.map(p =>
        (p._id === id || p.id === id) ? { ...p, ...updated } : p
      ))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteProduct = useCallback(async (id) => {
    try {
      await productApi.delete(id)
      setProducts(prev => prev.filter(p => p._id !== id && p.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  const checkProductTransactions = useCallback(async (id) => {
    try {
      const res = await productApi.checkTransactions(id)
      const data = res?.data || res
      return { success: true, hasTransactions: data?.hasTransactions ?? false }
    } catch (err) {
      // On error, assume transactions exist (safe default — show second popup)
      return { success: true, hasTransactions: true }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // EXPENSE ACTIONS
  // ─────────────────────────────────────────────────────────
  const addExpense = useCallback(async (data) => {
    try {
      const res = await expenseApi.create(data)
      const newExp = res?.data || res
      setExpenses(prev => [newExp, ...prev])
      return { success: true, data: newExp }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create expense' }
    }
  }, [])

  const updateExpense = useCallback(async (id, data) => {
    try {
      const res = await expenseApi.update(id, data)
      const updated = res?.data || res
      setExpenses(prev => prev.map(e => (e._id === id || e.id === id) ? { ...e, ...updated } : e))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteExpense = useCallback(async (id) => {
    try {
      await expenseApi.delete(id)
      setExpenses(prev => prev.filter(e => e._id !== id && e.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // NOTIFICATION ACTIONS
  // ─────────────────────────────────────────────────────────
  const markNotifRead = useCallback(async (id) => {
    try {
      await notificationApi.markRead(id)
      setNotifications(prev => prev.map(n =>
        (n._id === id || n.id === id) ? { ...n, is_read: true } : n
      ))
      return { success: true }
    } catch (err) {
      setNotifications(prev => prev.map(n =>
        (n._id === id || n.id === id) ? { ...n, is_read: true } : n
      ))
      return { success: false }
    }
  }, [])

  const markAllNotifsRead = useCallback(async () => {
    try {
      await notificationApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      return { success: true }
    } catch (err) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      return { success: false }
    }
  }, [])

  const deleteNotif = useCallback(async (id) => {
    try {
      await notificationApi.delete(id)
      setNotifications(prev => prev.filter(n => n._id !== id && n.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // WAREHOUSE & TRANSFER ACTIONS
  // ─────────────────────────────────────────────────────────
  const addWarehouse = useCallback(async (data) => {
    try {
      const res = await inventoryApi.createWarehouse(data)
      const newWH = res?.data || res
      setWarehouses(prev => [...prev, newWH])
      return { success: true, data: newWH }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const updateWarehouse = useCallback(async (id, data) => {
    try {
      const res = await inventoryApi.updateWarehouse(id, data)
      const updated = res?.data || res
      setWarehouses(prev => prev.map(w => (w._id === id || w.id === id) ? { ...w, ...updated } : w))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const deleteWarehouse = useCallback(async (id) => {
    try {
      await inventoryApi.deleteWarehouse(id)
      setWarehouses(prev => prev.filter(w => w._id !== id && w.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const createTransfer = useCallback(async (data) => {
    try {
      const res = await inventoryApi.createTransfer(data)
      const newT = res?.data || res
      setTransfers(prev => [newT, ...prev])
      // Refresh inventory since stock moved
      const invRes = await inventoryApi.list({ limit: 200 })
      setInventory(arr(invRes, 'inventory'))
      return { success: true, data: newT }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Transfer failed' }
    }
  }, [])

  const updateTransferStatus = useCallback(async (id, status) => {
    try {
      const res = await inventoryApi.updateTransferStatus(id, status)
      const updated = res?.data || res
      setTransfers(prev => prev.map(t => (t._id === id || t.id === id) ? { ...t, ...updated } : t))
      if (status === 'Completed' || status === 'Cancelled') {
        const invRes = await inventoryApi.list({ limit: 200 })
        setInventory(arr(invRes, 'inventory'))
      }
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  const deleteTransfer = useCallback(async (id) => {
    try {
      await inventoryApi.deleteTransfer(id)
      setTransfers(prev => prev.filter(t => t._id !== id && t.id !== id))
      const invRes = await inventoryApi.list({ limit: 200 })
      setInventory(arr(invRes, 'inventory'))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // SUPPLIER ACTIONS
  // ─────────────────────────────────────────────────────────
  const addSupplier = useCallback(async (data) => {
    try {
      const res = await purchaseApi.createSupplier(data)
      const newSup = res?.data || res
      setSuppliers(prev => [newSup, ...prev])
      return { success: true, data: newSup }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create supplier' }
    }
  }, [])

  const updateSupplier = useCallback(async (id, data) => {
    try {
      const res = await purchaseApi.updateSupplier(id, data)
      const updated = res?.data || res
      setSuppliers(prev => prev.map(s => (s._id === id || s.id === id) ? { ...s, ...updated } : s))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteSupplier = useCallback(async (id) => {
    try {
      await purchaseApi.deleteSupplier(id)
      setSuppliers(prev => prev.filter(s => s._id !== id && s.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // USER ACTIONS (Super Admin only)
  // ─────────────────────────────────────────────────────────
  const addUser = useCallback(async (data) => {
    try {
      const res = await userApi.create(data)
      const newUser = res?.data || res
      setUsers(prev => [newUser, ...prev])
      return { success: true, data: newUser }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create user' }
    }
  }, [])

  const updateUser = useCallback(async (id, data) => {
    try {
      const res = await userApi.update(id, data)
      const updated = res?.data || res
      setUsers(prev => prev.map(u => (u._id === id || u.id === id) ? { ...u, ...updated } : u))
      return { success: true, data: updated }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Update failed' }
    }
  }, [])

  const deleteUser = useCallback(async (id) => {
    try {
      await userApi.delete(id)
      setUsers(prev => prev.filter(u => u._id !== id && u.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Delete failed' }
    }
  }, [])

  const resetUserPassword = useCallback(async (id, new_password) => {
    try {
      await userApi.resetPassword(id, new_password)
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Reset failed' }
    }
  }, [])

  // ─────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────
  const ctx = {
    // ── Data ─────────────────────────────────────────────
    enquiries, orders, dispatches, inventory, purchases, sales, expenses,
    payments, notifications, products, categories, subCategories, brands,
    customers, leads, followups, employees, users, companies,
    warehouses, transfers, documents, dashboardStats, loadingData,
    suppliers,

    // ── Setters (for optimistic local updates) ────────────
    setEnquiries, setOrders, setDispatches, setInventory, setPurchases,
    setSales, setExpenses, setPayments, setNotifications, setProducts,
    setCategories, setSubCategories, setBrands, setCustomers, setLeads, setFollowups,
    setEmployees, setUsers, setCompanies, setWarehouses, setTransfers, setDocuments,
    setSuppliers,

    // ── Enquiry actions ───────────────────────────────────
    addEnquiry, updateEnquiry, deleteEnquiry, convertEnquiryToOrder,

    // ── Order actions ─────────────────────────────────────
    updateOrderStatus, startPacking, markReadyForDispatch,

    // ── Dispatch actions ──────────────────────────────────
    createDispatch, markDelivered,

    // ── Purchase actions ──────────────────────────────────
    addPurchase, updatePurchase, deletePurchase,

    // ── Supplier actions ──────────────────────────────────
    addSupplier, updateSupplier, deleteSupplier,

    // ── Payment actions ───────────────────────────────────
    recordPayment,

    // ── Customer actions ──────────────────────────────────
    addCustomer, updateCustomer, deleteCustomer,

    // ── Lead actions ──────────────────────────────────────
    addLead, updateLead, deleteLead, convertLead,

    // ── Follow-up actions ─────────────────────────────────
    addFollowup, updateFollowup, deleteFollowup,

    // ── Employee actions ──────────────────────────────────
    addEmployee, updateEmployee, deleteEmployee,

    // ── Category & Brand actions ──────────────────────────
    addCategory, updateCategory, deleteCategory,
    addSubCategory, updateSubCategory, deleteSubCategory,
    addBrand, updateBrand, deleteBrand,

    // ── Product actions ───────────────────────────────────
    addProduct, updateProduct, deleteProduct, checkProductTransactions,

    // ── Expense actions ───────────────────────────────────
    addExpense, updateExpense, deleteExpense,

    // ── Notification actions ──────────────────────────────
    markNotifRead, markAllNotifsRead, deleteNotif, addNotification,

    // ── Warehouse & Transfer actions ──────────────────────
    addWarehouse, updateWarehouse, deleteWarehouse,
    createTransfer, updateTransferStatus, deleteTransfer,

    // ── User actions ──────────────────────────────────────
    addUser, updateUser, deleteUser, resetUserPassword,

    // ── Refresh ───────────────────────────────────────────
    fetchAll,
  }

  return <ErpContext.Provider value={ctx}>{children}</ErpContext.Provider>
}

export function useErp() {
  const ctx = useContext(ErpContext)
  if (!ctx) throw new Error('useErp must be used within <ErpProvider>')
  return ctx
}

export default ErpContext
