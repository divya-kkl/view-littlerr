import React, { useState, useEffect } from 'react';
import '../AdminPanel.css';
import { getAllUsersForAdmin, deleteUserAddress } from '../../services/userService';

const UserPanel = () => {
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Detail Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const res = await getAllUsersForAdmin();
    if (res.success) {
      setUsersList(res.data);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the record for "${name || 'Customer'}"?`)) {
      const res = await deleteUserAddress(id);
      if (res.success) {
        setUsersList(prev => prev.filter(u => u.id !== id));
      } else {
        alert('Failed to delete user record: ' + res.error);
      }
    }
  };

  const openDetailModal = (user) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  // Filtered users by search query and type
  const filteredUsers = usersList.filter(u => {
    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      (u.full_name && u.full_name.toLowerCase().includes(query)) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.phone_number && u.phone_number.toLowerCase().includes(query)) ||
      (u.city && u.city.toLowerCase().includes(query)) ||
      (u.state && u.state.toLowerCase().includes(query)) ||
      (u.pincode && u.pincode.toLowerCase().includes(query)) ||
      (u.street_address && u.street_address.toLowerCase().includes(query));

    const matchType =
      selectedTypeFilter === 'ALL' ||
      (u.address_type && u.address_type.toLowerCase().includes(selectedTypeFilter.toLowerCase()));

    return matchQuery && matchType;
  });

  // Unique counts
  const uniqueEmails = new Set(usersList.map(u => u.email).filter(Boolean));
  const uniqueCities = new Set(usersList.map(u => u.city).filter(Boolean));

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="admin-panel-container">
      {/* Top Header & Stats */}
      <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#003B2F', fontSize: '1.4rem', fontWeight: 700 }}>
            👥 Registered Users & Customers
          </h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            View and manage all customer account registrations, contact details, and delivery addresses.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={loadUsers}
          style={{
            background: '#003B2F',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}
        >
          <span>🔄</span> Refresh Users
        </button>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Users</div>
          <div style={{ color: '#003B2F', fontSize: '1.8rem', fontWeight: 700, marginTop: '4px' }}>{uniqueEmails.size}</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase' }}>Delivery Addresses</div>
          <div style={{ color: '#D4AF37', fontSize: '1.8rem', fontWeight: 700, marginTop: '4px' }}>{usersList.length}</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase' }}>Covered Cities</div>
          <div style={{ color: '#0284c7', fontSize: '1.8rem', fontWeight: 700, marginTop: '4px' }}>{uniqueCities.size}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="admin-toolbar" style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by customer name, email, phone, city, pincode..."
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

      {/* Users Table */}
      <div className="admin-table-wrapper" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', width: '50px' }}>#</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Customer</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Phone Number</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Address Details</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>City & State</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Type</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569' }}>Registered Date</th>
              <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  <td colSpan="8" style={{ padding: '16px' }}>
                    <div className="admin-shimmer" style={{ width: '100%', height: '24px', borderRadius: '4px' }}></div>
                  </td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👤</div>
                  <strong>No customer records found</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                    {searchQuery ? `No results matching "${searchQuery}"` : 'When customers register or add addresses, they will appear here.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user, idx) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.88rem' }}>
                    {startIndex + idx + 1}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: '#003B2F',
                          color: '#D4AF37',
                          fontWeight: 700,
                          fontSize: '1.05rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {(user.full_name || user.email || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.94rem' }}>
                          {user.full_name || 'Customer'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                          {user.email || '—'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: '#334155' }}>
                    {user.phone_number ? (
                      <a href={`tel:${user.phone_number}`} style={{ color: '#003B2F', fontWeight: 600, textDecoration: 'none' }}>
                        📞 {user.phone_number}
                      </a>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: '#475569', maxWidth: '220px' }}>
                    {user.street_address ? (
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.street_address}>
                        {user.street_address}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: '#334155' }}>
                    {user.city || user.state ? (
                      <div>
                        <strong>{user.city || '—'}</strong>
                        {user.state && <span style={{ color: '#64748b' }}>, {user.state}</span>}
                        {user.pincode && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>PIN: {user.pincode}</div>}
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: (user.address_type || '').toLowerCase().includes('work') ? '#fef3c7' : '#dbeafe',
                          color: (user.address_type || '').toLowerCase().includes('work') ? '#92400e' : '#1e40af'
                        }}
                      >
                        {user.address_type || 'Home'}
                      </span>
                      {user.is_default && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 6px', borderRadius: '4px', background: '#dcfce7', color: '#15803d' }}>
                          Default
                        </span>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#64748b' }}>
                    {formatDate(user.created_at)}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => openDetailModal(user)}
                        title="View Full Customer Details"
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.82rem'
                        }}
                      >
                        👁 View
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(user.id, user.full_name || user.email)}
                        title="Delete Record"
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
      {!isLoading && filteredUsers.length > itemsPerPage && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 8px' }}>
          <span style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
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
            <span style={{ padding: '6px 12px', fontWeight: 600, color: '#003B2F' }}>
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

      {/* View Customer Details Modal */}
      {isDetailModalOpen && selectedUser && (
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
              border: '1.5px solid #D4AF37'
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
                  {(selectedUser.full_name || selectedUser.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#003B2F', fontSize: '1.2rem' }}>
                    {selectedUser.full_name || 'Customer Details'}
                  </h3>
                  <span style={{ fontSize: '0.84rem', color: '#64748b' }}>{selectedUser.email}</span>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px', fontSize: '0.9rem' }}>
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>Email Address</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.email || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>Phone Number</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.phone_number || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>Street Address</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.street_address || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>City</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.city || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>State</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.state || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>Country</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.country || 'India'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>PIN Code</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.pincode || '—'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>Address Type</span>
                <strong style={{ color: '#0f172a' }}>{selectedUser.address_type || 'Home'}</strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>Default Delivery</span>
                <strong style={{ color: selectedUser.is_default ? '#15803d' : '#64748b' }}>
                  {selectedUser.is_default ? '✓ Yes (Default)' : 'No'}
                </strong>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block' }}>Registered On</span>
                <strong style={{ color: '#0f172a' }}>{formatDate(selectedUser.created_at)}</strong>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  background: '#003B2F',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
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

export default UserPanel;

