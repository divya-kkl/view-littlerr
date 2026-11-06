import React, { useState, useEffect } from 'react';
import '../AdminPanel.css';
import {
  getAllCartItemsForAdmin,
  createCartItemByAdmin,
  updateCartItemByAdmin,
  deleteCartItemByAdmin
} from '../../services/cartService';

const CartPanel = () => {
  const [cartList, setCartList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('ALL'); // ALL, USER, GUEST
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialFormState = {
    product_id: '',
    product_name: '',
    product_image: '',
    price: '',
    quantity: 1,
    size: 'Free Size',
    color: '',
    user_id: '',
    session_id: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadCartItems();
  }, []);

  const loadCartItems = async () => {
    setIsLoading(true);
    const res = await getAllCartItemsForAdmin();
    if (res.success) {
      setCartList(res.data);
    }
    setIsLoading(false);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      product_id: item.product_id || '',
      product_name: item.product_name || '',
      product_image: item.product_image || '',
      price: item.price || '',
      quantity: item.quantity || 1,
      size: item.size || '',
      color: item.color || '',
      user_id: item.user_id || '',
      session_id: item.session_id || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.product_name.trim() || !formData.product_id.trim()) {
      alert('Please enter product ID and product name.');
      return;
    }

    setIsSaving(true);
    if (editingItem) {
      const res = await updateCartItemByAdmin(editingItem.id, formData);
      if (res.success) {
        setIsModalOpen(false);
        loadCartItems();
      } else {
        alert('Failed to update cart item: ' + res.error);
      }
    } else {
      const res = await createCartItemByAdmin(formData);
      if (res.success) {
        setIsModalOpen(false);
        loadCartItems();
      } else {
        alert('Failed to add cart item: ' + res.error);
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (id, productName) => {
    if (window.confirm(`Are you sure you want to delete "${productName || 'this item'}" from cart?`)) {
      const res = await deleteCartItemByAdmin(id);
      if (res.success) {
        setCartList(prev => prev.filter(item => item.id !== id));
      } else {
        alert('Failed to delete item: ' + res.error);
      }
    }
  };

  // Metrics
  const totalQuantity = cartList.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalCartValue = cartList.reduce((acc, curr) => acc + ((Number(curr.price) || 0) * (Number(curr.quantity) || 0)), 0);
  const uniqueUsersCount = new Set(cartList.map(item => item.user_id || item.session_id).filter(Boolean)).size;

  // Filter & Search
  const filteredItems = cartList.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (item.product_name && item.product_name.toLowerCase().includes(q)) ||
      (item.product_id && item.product_id.toLowerCase().includes(q)) ||
      (item.size && item.size.toLowerCase().includes(q)) ||
      (item.user_id && item.user_id.toLowerCase().includes(q)) ||
      (item.session_id && item.session_id.toLowerCase().includes(q));

    const matchOwner =
      ownerFilter === 'ALL' ||
      (ownerFilter === 'USER' && Boolean(item.user_id)) ||
      (ownerFilter === 'GUEST' && !item.user_id && Boolean(item.session_id));

    return matchSearch && matchOwner;
  });

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="cart-admin-panel" style={{ padding: '0 0 40px 0' }}>
      {/* Top Banner Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.5rem', fontWeight: 700 }}>
            Cart Items Management
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            View, add, edit, or remove products in customer & guest shopping carts in real time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={loadCartItems}
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
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '8px',
              background: '#003B2F',
              borderColor: '#003B2F',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            + Add Cart Item
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Cart Rows</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{cartList.length}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Units In Carts</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#003B2F', marginTop: '6px' }}>{totalQuantity}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Pipeline Value</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            ₹{totalCartValue.toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Active Cart Sessions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>{uniqueUsersCount}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search by product name, product code, user ID, session ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.92rem',
              color: '#1e293b'
            }}
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
          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Filter by:</label>
          <select
            value={ownerFilter}
            onChange={(e) => {
              setOwnerFilter(e.target.value);
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
            <option value="ALL">All Carts</option>
            <option value="USER">Registered Users (Auth)</option>
            <option value="GUEST">Guest Sessions</option>
          </select>
        </div>
      </div>

      {/* Cart Items Table */}
      <div className="admin-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', width: '50px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Product Details</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Price</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Size / Color</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Subtotal</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Cart Owner</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Date Added</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  <td colSpan="9" style={{ padding: '16px' }}>
                    <div style={{ width: '100%', height: '28px', background: '#f1f5f9', borderRadius: '4px' }}></div>
                  </td>
                </tr>
              ))
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🛒</div>
                  <strong style={{ fontSize: '1.1rem', color: '#1e293b' }}>No cart items found</strong>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>
                    {searchQuery ? `No items matching "${searchQuery}"` : 'When shoppers click "Add to Cart", products will appear here.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => {
                const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                      {startIndex + idx + 1}
                    </td>

                    {/* Product */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={item.product_image || '/whatappicon.png'}
                          alt={item.product_name}
                          style={{
                            width: '46px',
                            height: '46px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                            background: '#f8fafc'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem' }}>
                            {item.product_name || 'Unnamed Product'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            ID: <span style={{ fontFamily: 'monospace', color: '#003B2F', fontWeight: 600 }}>{item.product_id}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Unit Price */}
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155' }}>
                      ₹{(Number(item.price) || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Quantity */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          padding: '3px 10px',
                          borderRadius: '16px',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        {item.quantity || 1}
                      </span>
                    </td>

                    {/* Size & Color */}
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#475569' }}>
                      <div>Size: <strong>{item.size || '—'}</strong></div>
                      {item.color && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Color: {item.color}</div>}
                    </td>

                    {/* Subtotal */}
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#003B2F', fontSize: '0.96rem' }}>
                      ₹{subtotal.toLocaleString('en-IN')}
                    </td>

                    {/* Cart Owner */}
                    <td style={{ padding: '14px 16px' }}>
                      {item.user_id ? (
                        <div>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}
                          >
                            ✓ User
                          </span>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace', marginTop: '3px' }} title={item.user_id}>
                            {item.user_id.substring(0, 12)}...
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span
                            style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}
                          >
                            Guest Session
                          </span>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '3px' }} title={item.session_id}>
                            {item.session_id ? item.session_id.substring(0, 14) + '...' : '—'}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#64748b' }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Edit Cart Item"
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.product_name)}
                          title="Delete Cart Item"
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 600
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          Delete
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
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} items
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

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="admin-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', width: '90%' }}
          >
            <div className="admin-modal-header">
              <h3>{editingItem ? 'Edit Cart Item' : 'Add New Item to Cart'}</h3>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="admin-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label>Product ID / Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. GJ-RNG-001"
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 45000"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. 22K Hallmarked Gold Lakshmi Ring"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Product Image URL</label>
                  <input
                    type="url"
                    placeholder="https://... image link"
                    value={formData.product_image}
                    onChange={(e) => setFormData({ ...formData, product_image: e.target.value })}
                  />
                  {formData.product_image && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={formData.product_image}
                        alt="Preview"
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Image Preview</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Size</label>
                    <input
                      type="text"
                      placeholder="e.g. Free Size / 2.4"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <input
                      type="text"
                      placeholder="e.g. Yellow Gold"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', margin: '6px 0', paddingTop: '10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Cart Association (Optional)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label>User UUID (Registered User)</label>
                    <input
                      type="text"
                      placeholder="Supabase auth UUID"
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Guest Session ID</label>
                    <input
                      type="text"
                      placeholder="e.g. guest_173000..."
                      value={formData.session_id}
                      onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer" style={{ padding: '16px 25px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                  style={{ background: '#003B2F', borderColor: '#003B2F' }}
                >
                  {isSaving ? 'Saving...' : editingItem ? 'Update Cart Item' : 'Create Cart Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPanel;

