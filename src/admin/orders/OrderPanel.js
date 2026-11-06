import React, { useState, useEffect } from 'react';
import '../AdminPanel.css';
import {
  getAllOrdersForAdmin,
  updateOrderStatusByAdmin,
  deleteOrderByAdmin
} from '../../services/orderService';

const STATUS_COLORS = {
  PLACED: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  PROCESSING: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  SHIPPED: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  DELIVERED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  CANCELLED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' }
};

const OrderPanel = () => {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    const res = await getAllOrdersForAdmin();
    if (res.success) {
      setOrders(res.data);
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    const res = await updateOrderStatusByAdmin(orderId, newStatus);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, order_status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, order_status: newStatus }));
      }
    } else {
      alert('Failed to update status: ' + res.error);
    }
    setUpdatingId(null);
  };

  const handlePaymentStatusChange = async (orderId, newPaymentStatus) => {
    setUpdatingId(orderId);
    const target = orders.find(o => o.id === orderId);
    const res = await updateOrderStatusByAdmin(orderId, target?.order_status || 'PLACED', newPaymentStatus);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: newPaymentStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, payment_status: newPaymentStatus }));
      }
    } else {
      alert('Failed to update payment status: ' + res.error);
    }
    setUpdatingId(null);
  };

  const handleDeleteOrder = async (orderId, orderNum) => {
    if (window.confirm(`Are you sure you want to delete order "${orderNum}"? This cannot be undone.`)) {
      const res = await deleteOrderByAdmin(orderId);
      if (res.success) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        if (selectedOrder && selectedOrder.id === orderId) {
          setIsDetailModalOpen(false);
        }
      } else {
        alert('Failed to delete order: ' + res.error);
      }
    }
  };

  // Metrics
  const totalRevenue = orders
    .filter(o => o.order_status !== 'CANCELLED')
    .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  const placedCount = orders.filter(o => o.order_status === 'PLACED').length;
  const processingCount = orders.filter(o => o.order_status === 'PROCESSING').length;
  const deliveredCount = orders.filter(o => o.order_status === 'DELIVERED').length;

  // Search & Filter
  const filteredOrders = orders.filter(o => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (o.order_number && o.order_number.toLowerCase().includes(q)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
      (o.customer_email && o.customer_email.toLowerCase().includes(q)) ||
      (o.city && o.city.toLowerCase().includes(q)) ||
      (o.pincode && o.pincode.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'ALL' || o.order_status === statusFilter;

    return matchSearch && matchStatus;
  });

  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="orders-admin-panel" style={{ padding: '0 0 40px 0' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: 700 }}>
            Customer Orders Management
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Track placed little_rr orders, update fulfillment statuses, and view complete customer delivery details.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh Orders
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Orders</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{orders.length}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>New / Placed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1d4ed8', marginTop: '6px' }}>{placedCount}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>In Processing</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7e22ce', marginTop: '6px' }}>{processingCount}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Delivered</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>{deliveredCount}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Order Revenue</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#003B2F', marginTop: '6px' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Phone, Email, City..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '0.92rem', color: '#1e293b' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}
            >
              ×
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 12px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#334155',
              background: '#f8fafc',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="ALL">All Statuses ({orders.length})</option>
            <option value="PLACED">Placed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="admin-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', width: '50px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Order # & Date</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Customer</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Items Ordered</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Total Amount</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Payment</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Order Status (Click to Change)</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  <td colSpan="8" style={{ padding: '18px 16px' }}>
                    <div style={{ width: '100%', height: '28px', background: '#f1f5f9', borderRadius: '4px' }}></div>
                  </td>
                </tr>
              ))
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
                  <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>No orders found</strong>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>
                    {searchQuery ? `No orders matching "${searchQuery}"` : 'When shoppers click "Place Order" or "Buy Now", orders will appear here.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order, idx) => {
                const statusStyle = STATUS_COLORS[order.order_status] || STATUS_COLORS.PLACED;
                const itemsCount = Array.isArray(order.items) ? order.items.reduce((a, b) => a + (Number(b.quantity) || 1), 0) : 0;

                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {startIndex + idx + 1}
                    </td>

                    {/* Order # and Date */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 800, color: '#003B2F', fontFamily: 'monospace', fontSize: '0.94rem' }}>
                        {order.order_number}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px' }}>
                        {order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                      </div>
                    </td>

                    {/* Customer Info */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                        {order.customer_name}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '2px' }}>
                        📞 {order.customer_phone || '—'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '1px' }}>
                        📍 {order.city || ''}{order.pincode ? ` - ${order.pincode}` : ''}
                      </div>
                    </td>

                    {/* Items List Mini Preview */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {Array.isArray(order.items) && order.items.slice(0, 3).map((it, i) => (
                          <img
                            key={i}
                            src={it.image || '/whatappicon.png'}
                            alt={it.name}
                            title={`${it.name} (${it.quantity || 1}x)`}
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ))}
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                          {itemsCount} item(s)
                        </span>
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#003B2F', fontSize: '1.05rem' }}>
                      ₹{(Number(order.total_amount) || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Payment */}
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{order.payment_method}</div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '3px',
                          padding: '1px 8px',
                          borderRadius: '10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: order.payment_status === 'PAID' ? '#ecfdf5' : '#fef3c7',
                          color: order.payment_status === 'PAID' ? '#065f46' : '#92400e',
                          border: `1px solid ${order.payment_status === 'PAID' ? '#a7f3d0' : '#fde68a'}`
                        }}
                      >
                        {order.payment_status || 'PENDING'}
                      </span>
                    </td>

                    {/* Order Status Select Dropdown (Active Status Change) */}
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={order.order_status}
                        disabled={updatingId === order.id}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1.5px solid ${statusStyle.border}`,
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          outline: 'none',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <option value="PLACED">Placed</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="SHIPPED">Shipped</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailModalOpen(true);
                          }}
                          title="View Order Details"
                          style={{
                            background: '#003B2F',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          👁️ View
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id, order.order_number)}
                          title="Delete Order"
                          style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} orders
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: currentPage <= 1 ? '#f1f5f9' : '#fff',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    background: currentPage === i + 1 ? '#003B2F' : '#fff',
                    color: currentPage === i + 1 ? '#fff' : '#334155',
                    fontWeight: currentPage === i + 1 ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: currentPage >= totalPages ? '#f1f5f9' : '#fff',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FULL ORDER DETAILS MODAL */}
      {isDetailModalOpen && selectedOrder && (
        <div className="admin-modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div
            className="admin-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '92%' }}
          >
            <div className="admin-modal-header" style={{ background: '#003B2F', color: '#ffffff' }}>
              <div>
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.15rem' }}>Order #{selectedOrder.order_number}</h3>
                <span style={{ fontSize: '0.78rem', color: '#D4AF37' }}>
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setIsDetailModalOpen(false)}
                style={{ color: '#ffffff' }}
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '20px' }}>
              {/* Order Status & Payment Status Change row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Order Status
                  </label>
                  <select
                    value={selectedOrder.order_status}
                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1.5px solid #003B2F',
                      fontWeight: 700,
                      color: '#003B2F',
                      outline: 'none'
                    }}
                  >
                    <option value="PLACED">Placed</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Payment Status
                  </label>
                  <select
                    value={selectedOrder.payment_status || 'PENDING'}
                    onChange={(e) => handlePaymentStatusChange(selectedOrder.id, e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1.5px solid #cbd5e1',
                      fontWeight: 700,
                      color: '#334155',
                      outline: 'none'
                    }}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PAID">PAID</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
              </div>

              {/* Customer and Shipping Details */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  Shipping & Customer Information
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.88rem' }}>
                  <div><strong>Customer Name:</strong> {selectedOrder.customer_name}</div>
                  <div><strong>Phone:</strong> {selectedOrder.customer_phone || '—'}</div>
                  <div><strong>Email:</strong> {selectedOrder.customer_email || '—'}</div>
                  <div><strong>Payment Method:</strong> {selectedOrder.payment_method}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Delivery Address:</strong> {selectedOrder.street_address}, {selectedOrder.city}, {selectedOrder.state} - {selectedOrder.pincode}
                  </div>
                  {selectedOrder.order_notes && (
                    <div style={{ gridColumn: 'span 2', color: '#b45309' }}>
                      <strong>Notes:</strong> {selectedOrder.order_notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                  Items in this Order ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <img
                        src={item.image || '/whatappicon.png'}
                        alt={item.name}
                        style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>{item.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                          Code: {item.product_id || item.id} {item.size ? `• Size: ${item.size}` : ''} {item.weight ? `• Wt: ${item.weight}g` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#003B2F', fontSize: '0.95rem' }}>
                          ₹{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          ₹{(Number(item.price) || 0).toLocaleString('en-IN')} × {item.quantity || 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '16px', padding: '12px', background: '#003B2F', color: '#ffffff', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600 }}>Total Order Value:</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#D4AF37' }}>
                    ₹{(Number(selectedOrder.total_amount) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer" style={{ padding: '14px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsDetailModalOpen(false)}
                style={{ background: '#003B2F', borderColor: '#003B2F' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderPanel;

