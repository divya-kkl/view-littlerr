import React, { useState, useEffect } from 'react';
import '../AdminPanel.css';
import './PaymentMethodPanel.css';
import {
  getAllPaymentMethodsForAdmin,
  createPaymentMethodInSupabase,
  updatePaymentMethodInSupabase,
  togglePaymentMethodStatus,
  deletePaymentMethodInSupabase
} from '../../services/paymentMethodService';

const PaymentMethodPanel = () => {
  const [methods, setMethods] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialFormState = {
    name: '',
    code: '',
    description: '',
    badge: '',
    icon: '💳',
    is_active: true,
    sort_order: 1
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const res = await getAllPaymentMethodsForAdmin();
    if (res?.data) {
      setMethods(res.data);
    }
    setIsLoading(false);
  };

  const openForm = (method = null) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name || '',
        code: method.code || '',
        description: method.description || '',
        badge: method.badge || '',
        icon: method.icon || '💳',
        is_active: method.is_active !== undefined ? Boolean(method.is_active) : true,
        sort_order: method.sort_order || 1
      });
    } else {
      setEditingMethod(null);
      setFormData({
        ...initialFormState,
        sort_order: methods.length + 1
      });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingMethod(null);
    setFormData(initialFormState);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a payment method name.');
      return;
    }

    setIsSaving(true);
    if (editingMethod) {
      const res = await updatePaymentMethodInSupabase(editingMethod.id, formData);
      if (res.success) {
        await loadData();
        closeForm();
      } else {
        alert('Error updating payment method: ' + (res.error || 'Failed'));
      }
    } else {
      const res = await createPaymentMethodInSupabase(formData);
      if (res.success) {
        await loadData();
        closeForm();
      } else {
        alert('Error creating payment method: ' + (res.error || 'Failed'));
      }
    }
    setIsSaving(false);
  };

  const handleToggle = async (method) => {
    const res = await togglePaymentMethodStatus(method.id, method.is_active);
    if (res.success) {
      setMethods(prev => prev.map(m => m.id === method.id ? { ...m, is_active: !method.is_active } : m));
    }
  };

  const handleDelete = async (method) => {
    if (window.confirm(`Are you sure you want to delete payment method "${method.name}"?`)) {
      const res = await deletePaymentMethodInSupabase(method.id);
      if (res.success) {
        setMethods(prev => prev.filter(m => m.id !== method.id));
      }
    }
  };

  // Filtered methods
  const filteredMethods = methods.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.code && m.code.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && m.is_active) ||
      (statusFilter === 'INACTIVE' && !m.is_active);

    return matchesSearch && matchesStatus;
  });

  const activeCount = methods.filter(m => m.is_active).length;
  const inactiveCount = methods.filter(m => !m.is_active).length;

  return (
    <div className="pm-panel-container">
      {/* 1. Header Overview Cards */}
      <div className="pm-stats-grid">
        <div className="pm-stat-card">
          <div className="pm-stat-icon">💳</div>
          <div className="pm-stat-info">
            <span className="pm-stat-label">Total Methods</span>
            <strong className="pm-stat-val">{methods.length}</strong>
          </div>
        </div>

        <div className="pm-stat-card active-card">
          <div className="pm-stat-icon">✓</div>
          <div className="pm-stat-info">
            <span className="pm-stat-label">Active on Checkout</span>
            <strong className="pm-stat-val">{activeCount}</strong>
          </div>
        </div>

        <div className="pm-stat-card inactive-card">
          <div className="pm-stat-icon">⏸</div>
          <div className="pm-stat-info">
            <span className="pm-stat-label">Disabled</span>
            <strong className="pm-stat-val">{inactiveCount}</strong>
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar */}
      <div className="pm-toolbar">
        <div className="pm-search-group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search payment methods by name, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="pm-filter-group">
          <button
            type="button"
            className={`pm-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All ({methods.length})
          </button>
          <button
            type="button"
            className={`pm-filter-pill ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            className={`pm-filter-pill ${statusFilter === 'INACTIVE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('INACTIVE')}
          >
            Disabled ({inactiveCount})
          </button>
        </div>

        <button type="button" className="pm-btn-add" onClick={() => openForm(null)}>
          + Add Payment Option
        </button>
      </div>

      {/* 3. Table of Payment Methods */}
      <div className="pm-table-wrapper">
        {isLoading ? (
          <div className="pm-loading-state">
            <div className="admin-spinner"></div>
            <p>Loading payment methods from Supabase...</p>
          </div>
        ) : filteredMethods.length === 0 ? (
          <div className="pm-empty-state">
            <span className="pm-empty-icon">💳</span>
            <h3>No Payment Methods Found</h3>
            <p>Try searching for a different keyword or add a new payment method.</p>
            <button type="button" className="pm-btn-add" onClick={() => openForm(null)} style={{ marginTop: '1rem' }}>
              + Add New Method
            </button>
          </div>
        ) : (
          <table className="pm-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Order</th>
                <th>Method Name & Icon</th>
                <th>Code Key</th>
                <th>Description</th>
                <th>Badge</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMethods.map((m) => (
                <tr key={m.id || m.code}>
                  <td>
                    <span className="pm-order-badge">#{m.sort_order || 0}</span>
                  </td>
                  <td>
                    <div className="pm-name-cell">
                      <span className="pm-icon-tag">{m.icon || '💳'}</span>
                      <strong className="pm-name-text">{m.name}</strong>
                    </div>
                  </td>
                  <td>
                    <code className="pm-code-tag">{m.code}</code>
                  </td>
                  <td>
                    <span className="pm-desc-text">{m.description || '—'}</span>
                  </td>
                  <td>
                    {m.badge ? (
                      <span className={`pm-badge-pill ${m.badge.toLowerCase().includes('instant') ? 'badge-instant' : 'badge-gold'}`}>
                        {m.badge}
                      </span>
                    ) : (
                      <span className="pm-text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`pm-status-switch ${m.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggle(m)}
                      title={`Click to ${m.is_active ? 'Disable' : 'Enable'} on Checkout`}
                    >
                      <span className="pm-switch-handle"></span>
                      <span className="pm-switch-text">{m.is_active ? 'Active' : 'Disabled'}</span>
                    </button>
                  </td>
                  <td>
                    <div className="pm-actions-cell">
                      <button
                        type="button"
                        className="pm-btn-action edit"
                        onClick={() => openForm(m)}
                        title="Edit Details"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="pm-btn-action delete"
                        onClick={() => handleDelete(m)}
                        title="Delete Method"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. Add / Edit Modal */}
      {isFormOpen && (
        <div className="pm-modal-overlay" onClick={closeForm}>
          <div className="pm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3>{editingMethod ? 'Edit Payment Method' : 'Add New Payment Method'}</h3>
              <button type="button" className="pm-modal-close" onClick={closeForm}>×</button>
            </div>

            <form onSubmit={handleSave} className="pm-modal-form">
              <div className="pm-form-row">
                <div className="pm-form-group" style={{ flex: 2 }}>
                  <label>Payment Method Name <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. UPI / Google Pay / PhonePe / QR"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="pm-form-group" style={{ flex: 1 }}>
                  <label>Display Icon</label>
                  <input
                    type="text"
                    placeholder="e.g. 📱, 📦, 💳"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  />
                </div>
              </div>

              <div className="pm-form-row">
                <div className="pm-form-group">
                  <label>Code Identifier <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. upi, cod, card"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    required
                  />
                  <small className="pm-form-hint">Unique identifier used in system records.</small>
                </div>
                <div className="pm-form-group">
                  <label>Badge Highlight <span className="opt">(Optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Instant, Recommended, 0% EMI"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  />
                </div>
              </div>

              <div className="pm-form-group">
                <label>Description / Instructions for Customer</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Scan QR code or use GPay, PhonePe, Paytm upon delivery / confirmation."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <div className="pm-form-row">
                <div className="pm-form-group">
                  <label>Sort Order on Checkout</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div className="pm-form-group" style={{ justifyContent: 'center' }}>
                  <label className="pm-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span>Show & Enable this payment method on Checkout</span>
                  </label>
                </div>
              </div>

              <div className="pm-modal-actions">
                <button type="button" className="pm-btn-cancel" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="pm-btn-save" disabled={isSaving}>
                  {isSaving ? 'Saving...' : (editingMethod ? 'Save Changes' : 'Create Payment Method')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodPanel;

