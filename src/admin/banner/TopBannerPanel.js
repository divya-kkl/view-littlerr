import React, { useState, useEffect } from 'react';
import '../AdminPanel.css';
import {
  getTopBannersFromSupabase,
  createTopBannerInSupabase,
  updateTopBannerInSupabase,
  deleteTopBannerInSupabase
} from '../../services/topBannerService';

const TopBannerPanel = () => {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialFormState = {
    badgeText: '',
    content: '',
    link: '',
    orderIndex: 1,
    status: 'ACTIVE'
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const res = await getTopBannersFromSupabase(false);
    if (res.data) {
      setBanners(res.data);
    }
    setIsLoading(false);
  };

  const openForm = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        badgeText: banner.badgeText || '',
        content: banner.content || '',
        link: banner.link || '',
        orderIndex: banner.orderIndex || 1,
        status: banner.status || 'ACTIVE'
      });
    } else {
      setEditingBanner(null);
      setFormData({
        ...initialFormState,
        orderIndex: banners.length + 1
      });
    }
    setIsFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.content) {
      alert('Please enter banner content text!');
      return;
    }

    setIsSaving(true);
    if (editingBanner) {
      const { success, error } = await updateTopBannerInSupabase(editingBanner.dbId, formData);
      if (success) {
        loadData();
        setIsFormOpen(false);
      } else {
        alert('Error updating banner: ' + error);
      }
    } else {
      const { success, error } = await createTopBannerInSupabase(formData);
      if (success) {
        loadData();
        setIsFormOpen(false);
      } else {
        alert('Error creating banner: ' + error);
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (id, text) => {
    if (window.confirm(`Delete top banner "${text || 'item'}"?`)) {
      const { success } = await deleteTopBannerInSupabase(id);
      if (success) loadData();
    }
  };

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 style={{ margin: 0 }}>Top Announcement Banners</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
              These announcements appear in the very top ticker bar above the navbar.
            </p>
          </div>
          <button className="admin-btn-primary" onClick={() => openForm()}>
            + Add Top Banner
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Badge</th>
                <th>Content Text</th>
                <th>Target Link</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={`shimmer-${idx}`}>
                    <td><div className="admin-shimmer" style={{ width: '30px', height: '16px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '80px', height: '22px', borderRadius: '4px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '220px', height: '16px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '100px', height: '16px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '60px', height: '24px', borderRadius: '12px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '50px', height: '28px' }}></div></td>
                  </tr>
                ))
              ) : banners.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '35px', color: '#6b7280' }}>
                    No top banners created yet. Click "+ Add Top Banner" to create your first announcement.
                  </td>
                </tr>
              ) : (
                banners.map((item) => (
                  <tr key={item.dbId}>
                    <td>
                      <span style={{ fontWeight: 600, color: '#374151' }}>#{item.orderIndex}</span>
                    </td>
                    <td>
                      {item.badgeText ? (
                        <span style={{
                          background: '#d4af37',
                          color: '#002820',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          letterSpacing: '0.5px'
                        }}>
                          {item.badgeText}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{item.content}</div>
                    </td>
                    <td>
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.85rem' }}>
                          {item.link}
                        </a>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn edit" onClick={() => openForm(item)} title="Edit">✎</button>
                      <button className="action-btn delete" onClick={() => handleDelete(item.dbId, item.content)} title="Delete">🗑</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="admin-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                {editingBanner ? 'Edit Top Banner' : 'Add Top Banner'}
              </h3>
              <button className="close-modal-btn" onClick={() => setIsFormOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="admin-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                    Badge Text (Optional)
                  </label>
                  <input
                    value={formData.badgeText}
                    onChange={e => setFormData({ ...formData, badgeText: e.target.value })}
                    placeholder="e.g. OFFER / ANNOUNCEMENT / FESTIVE DEAL"
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '2px' }}>
                    Appears inside the small golden badge with pulsing dot.
                  </small>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                    Content Text *
                  </label>
                  <textarea
                    required
                    rows="3"
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    placeholder="e.g. Flat 20% discount on silk collections! Free shipping across India."
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontFamily: 'inherit' }}
                  ></textarea>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                    Redirect Link (Optional)
                  </label>
                  <input
                    value={formData.link}
                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                    placeholder="e.g. /products or /contact"
                    style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                      Display Order (order_index)
                    </label>
                    <input
                      type="number"
                      value={formData.orderIndex}
                      onChange={e => setFormData({ ...formData, orderIndex: e.target.value })}
                      placeholder="1"
                      style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                  style={{ background: '#2563eb', borderColor: '#2563eb' }}
                >
                  {isSaving ? 'Saving...' : (editingBanner ? 'Save Changes' : 'Create Banner')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBannerPanel;

