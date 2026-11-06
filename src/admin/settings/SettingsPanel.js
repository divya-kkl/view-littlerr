import React, { useState, useEffect } from 'react';
import '../AdminPanel.css';
import { getSiteSettings, updateSiteSettings, uploadLogoToSupabase } from '../../services/settingService';

const SettingsPanel = () => {
  const [settings, setSettings] = useState({
    logo_url: '',
    shop_name: 'Sri vinayaga Moulding',
    store_address: '',
    store_phone: '',
    store_email: '',
    store_timing: '',
    latitude: '',
    longitude: ''
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    logo_url: '',
    shop_name: '',
    store_address: '',
    store_phone: '',
    store_email: '',
    store_timing: '',
    latitude: '',
    longitude: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const { data } = await getSiteSettings();
    if (data) {
      setSettings(data);
    }
    setIsLoading(false);
  };

  const openForm = () => {
    setFormData({
      logo_url: settings.logo_url || '',
      shop_name: settings.shop_name || 'Sri vinayaga Moulding',
      store_address: settings.store_address || '',
      store_phone: settings.store_phone || '',
      store_email: settings.store_email || '',
      store_timing: settings.store_timing || '',
      latitude: settings.latitude || '',
      longitude: settings.longitude || ''
    });
    setImageFile(null);
    setIsFormOpen(true);
  };

  const handleDeleteLogo = async () => {
    if (window.confirm("Are you sure you want to delete the logo and reset settings to default?")) {
      const { success, error } = await updateSiteSettings({
        logo_url: null,
        shop_name: 'Sri vinayaga Moulding'
      });
      if (success) {
        loadSettings();
        window.dispatchEvent(new Event('siteSettingsUpdated'));
        alert("Logo deleted and settings reset!");
      } else {
        alert("Error: " + error);
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    let finalLogoUrl = formData.logo_url;
    if (imageFile) {
      const { success, url, error } = await uploadLogoToSupabase(imageFile);
      if (success) {
        finalLogoUrl = url;
      } else {
        alert("Logo upload failed: " + error);
        setIsSaving(false);
        return;
      }
    }

    const { success, error } = await updateSiteSettings({
      logo_url: finalLogoUrl,
      shop_name: formData.shop_name,
      store_address: formData.store_address,
      store_phone: formData.store_phone,
      store_email: formData.store_email,
      store_timing: formData.store_timing,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null
    });

    if (success) {
      loadSettings();
      setIsFormOpen(false);
      window.dispatchEvent(new Event('siteSettingsUpdated'));
    } else {
      alert("Error saving settings: " + error);
    }

    setIsSaving(false);
  };

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-header">
          <h3>Site Settings & Logo Configuration</h3>
          <div className="admin-controls">
            <button className="admin-btn-primary" onClick={openForm}>
              ✎ Edit Settings
            </button>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Website Logo</th>
                <th>Shop Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td><div className="admin-shimmer" style={{ width: '50px', height: '50px', borderRadius: '4px' }}></div></td>
                  <td><div className="admin-shimmer" style={{ width: '150px', height: '20px' }}></div></td>
                  <td><div className="admin-shimmer" style={{ width: '60px', height: '24px', borderRadius: '12px' }}></div></td>
                  <td>
                    <div className="admin-shimmer" style={{ display: 'inline-block', width: '30px', height: '30px', marginRight: '5px' }}></div>
                    <div className="admin-shimmer" style={{ display: 'inline-block', width: '30px', height: '30px' }}></div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td>
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" style={{ height: '50px', objectFit: 'contain', background: '#000', padding: '5px', borderRadius: '4px' }} />
                    ) : (
                      <span style={{ color: '#888', fontStyle: 'italic' }}>No Custom Logo (Default SVG)</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{settings.shop_name}</td>
                  <td>
                    <span className="status-pill active">Active</span>
                  </td>
                  <td>
                    <button className="action-btn edit" onClick={openForm} title="Edit Settings">✎</button>
                    {settings.logo_url && (
                      <button className="action-btn delete" onClick={handleDeleteLogo} title="Reset & Delete Logo">🗑</button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content">
            <div className="admin-modal-header">
              <h3>Edit Site Settings</h3>
              <button className="close-modal-btn" onClick={() => setIsFormOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="admin-modal-body pro-form-grid">

                <div className="pro-form-group full-width">
                  <label>Shop Name</label>
                  <input
                    required
                    value={formData.shop_name}
                    onChange={e => setFormData({ ...formData, shop_name: e.target.value })}
                    placeholder="e.g. Sri vinayaga Moulding"
                  />
                </div>

                <div className="pro-form-group full-width">
                  <label>Store Address</label>
                  <textarea
                    value={formData.store_address}
                    onChange={e => setFormData({ ...formData, store_address: e.target.value })}
                    placeholder="e.g. Sri vinayaga Moulding Flagship Store, No. 42, Cathedral Road..."
                    rows={2}
                  />
                </div>

                <div className="pro-form-group">
                  <label>Store Phone</label>
                  <input
                    value={formData.store_phone}
                    onChange={e => setFormData({ ...formData, store_phone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>

                <div className="pro-form-group">
                  <label>Store Email</label>
                  <input
                    type="email"
                    value={formData.store_email}
                    onChange={e => setFormData({ ...formData, store_email: e.target.value })}
                    placeholder="e.g. support@godlittle_rr.com"
                  />
                </div>

                <div className="pro-form-group full-width">
                  <label>Store Timing</label>
                  <input
                    value={formData.store_timing}
                    onChange={e => setFormData({ ...formData, store_timing: e.target.value })}
                    placeholder="e.g. Mon - Sun: 10:00 AM - 9:00 PM"
                  />
                </div>

                <div className="pro-form-group">
                  <label>Latitude (Map)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g. 13.0475"
                  />
                </div>

                <div className="pro-form-group">
                  <label>Longitude (Map)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g. 80.2522"
                  />
                </div>

                <div className="pro-form-group full-width" style={{ marginTop: '10px' }}>
                  <label>Website Logo</label>
                  <div className="file-dropzone" style={{ position: 'relative', border: '2px dashed #d4af37', borderRadius: '8px', padding: '20px', textAlign: 'center', background: '#fff9e6', cursor: 'pointer', transition: 'all 0.3s ease' }}>
                    <div className="file-drop-icon" style={{ fontSize: '2rem', marginBottom: '10px' }}>☁️</div>
                    <div className="file-drop-text" style={{ color: '#666', fontWeight: '500' }}>
                      {imageFile ? imageFile.name : (formData.logo_url ? "Click to change logo" : "Drag and drop or click to upload logo")}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                  </div>
                  {formData.logo_url && !imageFile && (
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '5px' }}>Current Logo:</p>
                      <img src={formData.logo_url} alt="Logo Preview" style={{ maxHeight: '60px', objectFit: 'contain', background: '#000', padding: '10px', borderRadius: '8px' }} />
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, logo_url: '' })}
                          style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                        >
                          ✖ Remove Current Logo
                        </button>
                      </div>
                    </div>
                  )}
                  {imageFile && (
                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setImageFile(null)}
                        style={{ color: '#d32f2f', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
                      >
                        ✖ Remove Selected File
                      </button>
                    </div>
                  )}
                </div>

              </div>
              <div className="admin-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                <button type="button" className="admin-btn-secondary" onClick={() => setIsFormOpen(false)} style={{ padding: '10px 20px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-primary" disabled={isSaving} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #d4af37 0%, #aa8c2c 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPanel;
