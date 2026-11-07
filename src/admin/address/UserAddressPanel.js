import React, { useState, useEffect } from 'react';
import '../AdminPanel.css';
import {
  getAllUsersForAdmin,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress
} from '../../services/userService';

const UserAddressPanel = () => {
  const [addresses, setAddresses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State matching the User Address section
  const initialForm = {
    full_name: '',
    phone_number: '',
    street_address: '',
    city: '',
    state: '',
    country: 'India',
    address_type: 'Home',
    pincode: '',
    email: '',
    order_notes: '',
    is_default: false
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setIsLoading(true);
    const res = await getAllUsersForAdmin();
    if (res.success) {
      setAddresses(res.data);
    }
    setIsLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormData(initialForm);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setFormData({
      full_name: addr.full_name || '',
      phone_number: addr.phone_number || '',
      street_address: addr.street_address || '',
      city: addr.city || '',
      state: addr.state || '',
      country: addr.country || 'India',
      address_type: addr.address_type || 'Home',
      pincode: addr.pincode || '',
      email: addr.email || '',
      order_notes: addr.order_notes || '',
      is_default: Boolean(addr.is_default)
    });
    setIsFormModalOpen(true);
  };

  const handleOpenView = (addr) => {
    setSelectedAddress(addr);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the address for "${name || 'Customer'}"?`)) {
      if (String(id).startsWith('order_addr_')) {
        setAddresses(prev => prev.filter(a => a.id !== id));
      } else {
        const res = await deleteUserAddress(id);
        if (res.success) {
          setAddresses(prev => prev.filter(a => a.id !== id));
        } else {
          setAddresses(prev => prev.filter(a => a.id !== id));
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      alert('Full Name is required.');
      return;
    }
    if (!formData.phone_number.trim()) {
      alert('Phone Number is required.');
      return;
    }
    if (!formData.street_address.trim()) {
      alert('Street Address is required.');
      return;
    }
    if (!formData.city.trim()) {
      alert('City is required.');
      return;
    }
    if (!formData.state.trim()) {
      alert('State is required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
        street_address: formData.street_address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        country: formData.country.trim() || 'India',
        address_type: formData.address_type || 'Home',
        pincode: formData.pincode.trim(),
        email: formData.email.trim(),
        order_notes: formData.order_notes.trim(),
        is_default: formData.is_default
      };

      if (editingAddress && !String(editingAddress.id).startsWith('order_addr_')) {
        const res = await updateUserAddress(editingAddress.id, payload);
        if (res.success) {
          await loadAddresses();
          setIsFormModalOpen(false);
        } else {
          alert('Failed to update address: ' + res.error);
        }
      } else {
        const res = await addUserAddress(payload);
        if (res.success) {
          await loadAddresses();
          setIsFormModalOpen(false);
        } else {
          alert('Failed to save address: ' + res.error);
        }
      }
    } catch (err) {
      console.error('Error saving address:', err);
      alert('Error saving address: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter addresses
  const filteredAddresses = addresses.filter(addr => {
    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      (addr.full_name && addr.full_name.toLowerCase().includes(query)) ||
      (addr.email && addr.email.toLowerCase().includes(query)) ||
      (addr.phone_number && addr.phone_number.toLowerCase().includes(query)) ||
      (addr.city && addr.city.toLowerCase().includes(query)) ||
      (addr.state && addr.state.toLowerCase().includes(query)) ||
      (addr.street_address && addr.street_address.toLowerCase().includes(query));

    const matchType =
      selectedTypeFilter === 'ALL' ||
      (addr.address_type && addr.address_type.toLowerCase() === selectedTypeFilter.toLowerCase());

    return matchQuery && matchType;
  });

  // Stats
  const homeCount = addresses.filter(a => (a.address_type || '').toLowerCase() === 'home').length;
  const workCount = addresses.filter(a => (a.address_type || '').toLowerCase() === 'work').length;
  const otherCount = addresses.filter(a => (a.address_type || '').toLowerCase() === 'other').length;

  // Pagination
  const totalPages = Math.ceil(filteredAddresses.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedAddresses = filteredAddresses.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="admin-panel-container">
      {/* Top Header & Add Button */}
      <div
        className="admin-header-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '15px'
        }}
      >
        <div>
          <h3 style={{ margin: 0, color: '#003B2F', fontSize: '1.4rem', fontWeight: 700 }}>
            📍 User Address Management
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Full CRUD: Create, read, update, and manage customer delivery addresses.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            background: '#003B2F',
            color: '#fff',
            border: 'none',
            padding: '11px 22px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 59, 47, 0.2)'
          }}
        >
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>+</span> Add New Address
        </button>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '22px'
        }}
      >
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Addresses
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#003B2F', marginTop: '4px' }}>
            {addresses.length}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Home Addresses
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {homeCount}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Work Addresses
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
            {workCount}
          </div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Other Addresses
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
            {otherCount}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by name, phone, street address, city, state..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '11px 16px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.92rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                fontSize: '1.1rem'
              }}
            >
              ×
            </button>
          )}
        </div>

        <select
          value={selectedTypeFilter}
          onChange={(e) => {
            setSelectedTypeFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '11px 16px',
            border: '1.5px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '0.92rem',
            background: '#fff',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="ALL">All Address Types</option>
          <option value="Home">Home</option>
          <option value="Work">Work</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Address Table */}
      <div
        className="admin-table-wrapper"
        style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}
      >
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', width: '50px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Full Name</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Phone Number</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Street Address</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>City & State</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Country</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Type</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Added</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  <td colSpan="9" style={{ padding: '16px' }}>
                    <div className="admin-shimmer" style={{ width: '100%', height: '24px', borderRadius: '4px' }}></div>
                  </td>
                </tr>
              ))
            ) : filteredAddresses.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📍</div>
                  <strong>No user addresses found</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                    {searchQuery ? `No results matching "${searchQuery}"` : 'Click "+ Add New Address" above to create your first address.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedAddresses.map((addr, idx) => (
                <tr key={addr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.88rem' }}>
                    {startIndex + idx + 1}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: '#003B2F',
                          color: '#D4AF37',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {(addr.full_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.92rem' }}>
                          {addr.full_name || '—'}
                        </div>
                        {addr.email && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{addr.email}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: '#334155' }}>
                    {addr.phone_number ? (
                      <a href={`tel:${addr.phone_number}`} style={{ color: '#003B2F', fontWeight: 600, textDecoration: 'none' }}>
                        📞 {addr.phone_number}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: '#475569', maxWidth: '220px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={addr.street_address}>
                      {addr.street_address || '—'}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: '#334155' }}>
                    <div>
                      <strong>{addr.city || '—'}</strong>
                      {addr.state && <span style={{ color: '#64748b' }}>, {addr.state}</span>}
                      {addr.pincode && <div style={{ fontSize: '0.78rem', color: '#64748b' }}>PIN: {addr.pincode}</div>}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: '#334155' }}>
                    {addr.country || 'India'}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: (addr.address_type || '').toLowerCase() === 'work'
                            ? '#fef3c7'
                            : (addr.address_type || '').toLowerCase() === 'other'
                              ? '#f3e8ff'
                              : '#dbeafe',
                          color: (addr.address_type || '').toLowerCase() === 'work'
                            ? '#92400e'
                            : (addr.address_type || '').toLowerCase() === 'other'
                              ? '#6b21a8'
                              : '#1e40af'
                        }}
                      >
                        {addr.address_type || 'Home'}
                      </span>
                      {addr.is_default && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                          Default
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#64748b' }}>
                    {formatDate(addr.created_at)}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenView(addr)}
                        title="View Details"
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.82rem'
                        }}
                      >
                        👁
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(addr)}
                        title="Edit Address"
                        style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.82rem'
                        }}
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(addr.id, addr.full_name)}
                        title="Delete Address"
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.82rem'
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && filteredAddresses.length > itemsPerPage && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
          <span style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAddresses.length)} of {filteredAddresses.length} entries
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{
                padding: '6px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: safeCurrentPage === 1 ? '#f1f5f9' : '#fff',
                cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{ padding: '6px 12px', fontSize: '0.88rem', fontWeight: 600, color: '#003B2F' }}>
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{
                padding: '6px 14px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: safeCurrentPage === totalPages ? '#f1f5f9' : '#fff',
                cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT ADDRESS MODAL */}
      {isFormModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
          onClick={() => !isSaving && setIsFormModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              border: '1.5px solid #003B2F'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#003B2F', fontSize: '1.25rem', fontWeight: 700 }}>
                  {editingAddress ? '✏️ Edit User Address' : '📍 Add New User Address'}
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                  Fields matching the userAddress checkout format.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                disabled={isSaving}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Dotted Box matching User Address section */}
              <div
                style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '20px',
                  background: '#f8fafc',
                  marginBottom: '16px'
                }}
              >
                {/* Row 1: Full Name & Phone Number */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', letterSpacing: '0.5px' }}>
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', letterSpacing: '0.5px' }}>
                      PHONE NUMBER *
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter 10 digit phone number"
                      maxLength="10"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Street Address */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', letterSpacing: '0.5px' }}>
                    STREET ADDRESS *
                  </label>
                  <input
                    type="text"
                    placeholder="House no, Building, Street, Area"
                    value={formData.street_address}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      background: '#fff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Row 3: City & State */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', letterSpacing: '0.5px' }}>
                      CITY *
                    </label>
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', letterSpacing: '0.5px' }}>
                      STATE *
                    </label>
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Row 4: Country & Address Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', letterSpacing: '0.5px' }}>
                      COUNTRY *
                    </label>
                    <input
                      type="text"
                      placeholder="India"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', letterSpacing: '0.5px' }}>
                      ADDRESS TYPE
                    </label>
                    <select
                      value={formData.address_type}
                      onChange={(e) => setFormData({ ...formData, address_type: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        background: '#fff',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Optional Fields: Pincode & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    POSTAL PINCODE (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 641001"
                    maxLength="6"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                    CUSTOMER EMAIL (OPTIONAL)
                  </label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Order Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  ORDER NOTES (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call before delivery or deliver at security"
                  value={formData.order_notes}
                  onChange={(e) => setFormData({ ...formData, order_notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Default Address Checkbox */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Set as default delivery address for this user</span>
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isSaving}
                  style={{
                    padding: '10px 18px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    color: '#475569',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '10px 22px',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#003B2F',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0, 59, 47, 0.2)'
                  }}
                >
                  {isSaving ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isDetailModalOpen && selectedAddress && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px'
          }}
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              border: '1.5px solid #003B2F'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#003B2F',
                    color: '#D4AF37',
                    fontWeight: 700,
                    fontSize: '1.3rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {(selectedAddress.full_name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#003B2F', fontSize: '1.2rem', fontWeight: 700 }}>
                    {selectedAddress.full_name}
                  </h3>
                  <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
                    Type: <strong>{selectedAddress.address_type || 'Home'}</strong> {selectedAddress.is_default && '• (Default Address)'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px', fontSize: '0.9rem' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Phone Number</span>
                <strong style={{ color: '#0f172a' }}>{selectedAddress.phone_number || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Email</span>
                <strong style={{ color: '#0f172a' }}>{selectedAddress.email || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Street Address</span>
                <strong style={{ color: '#0f172a' }}>{selectedAddress.street_address || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>City</span>
                <strong style={{ color: '#0f172a' }}>{selectedAddress.city || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>State</span>
                <strong style={{ color: '#0f172a' }}>{selectedAddress.state || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Country</span>
                <strong style={{ color: '#0f172a' }}>{selectedAddress.country || 'India'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Pincode</span>
                <strong style={{ color: '#0f172a' }}>{selectedAddress.pincode || '—'}</strong>
              </div>

              {selectedAddress.order_notes && (
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                  <span style={{ color: '#64748b', fontSize: '0.76rem', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Order Notes</span>
                  <strong style={{ color: '#0f172a' }}>{selectedAddress.order_notes}</strong>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedAddress);
                }}
                style={{
                  padding: '9px 18px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#003B2F',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem'
                }}
              >
                ✏️ Edit Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAddressPanel;

