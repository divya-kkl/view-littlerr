import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setActiveMenu } from '../../redux/slices/adminSlice';
import { getProductsFromSupabase } from '../../services/productService';
import { getCategoriesFromSupabase } from '../../services/categoryService';
import { getSubcategoriesFromSupabase } from '../../services/subcategoryService';
import { getRatesFromSupabase } from '../../services/rateService';
import { getBannersFromSupabase } from '../../services/bannerService';
import { getTestimonialsFromSupabase } from '../../services/testimonialService';
import { getAllUsersForAdmin } from '../../services/userService';
import '../AdminPanel.css';

const DashboardPanel = () => {
  const dispatch = useDispatch();
  const [stats, setStats] = useState({
    productsCount: 0,
    categoriesCount: 0,
    subcategoriesCount: 0,
    bannersCount: 0,
    testimonialsCount: 0,
    usersCount: 0,
  });
  const [liveRates, setLiveRates] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, subcatRes, rateRes, bannerRes, testRes, userRes] = await Promise.all([
        getProductsFromSupabase(),
        getCategoriesFromSupabase(false),
        getSubcategoriesFromSupabase(null, false),
        getRatesFromSupabase(),
        getBannersFromSupabase(),
        getTestimonialsFromSupabase(),
        getAllUsersForAdmin()
      ]);

      const prods = prodRes.data || [];
      const cats = catRes.data || [];
      const subcats = subcatRes.data || [];
      const rates = rateRes.data || [];
      const banners = bannerRes.data || [];
      const testimonials = testRes.data || [];

      setStats({
        productsCount: prods.length,
        categoriesCount: cats.length,
        subcategoriesCount: subcats.length,
        bannersCount: banners.length,
        testimonialsCount: testimonials.length,
        usersCount: userRes?.data?.length || 0,
      });

      setLiveRates(rates.filter((r) => r.isCurrent));
      setRecentProducts(prods.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Products',
      count: stats.productsCount,
      icon: '💎',
      color: '#007bff',
      bg: '#e7f1ff',
      target: 'Products',
      description: 'Manage catalogue & prices'
    },
    {
      title: 'Categories',
      count: stats.categoriesCount,
      icon: '🏷️',
      color: '#28a745',
      bg: '#e8f8ec',
      target: 'Categories',
      description: 'Main product categories'
    },
    {
      title: 'Subcategories',
      count: stats.subcategoriesCount,
      icon: '📂',
      color: '#6f42c1',
      bg: '#f3eefe',
      target: 'Subcategories',
      description: 'Sub-levels & child items'
    },
    {
      title: 'Live Rates',
      count: liveRates.length,
      unit: 'Active',
      icon: '📈',
      color: '#fd7e14',
      bg: '#fff3e8',
      target: 'Live Rates',
      description: "Today's gold & silver rates"
    },
    {
      title: 'Banners',
      count: stats.bannersCount,
      icon: '🖼️',
      color: '#17a2b8',
      bg: '#e8f7fa',
      target: 'Banners',
      description: 'Home promo sliders'
    },
    {
      title: 'Testimonials',
      count: stats.testimonialsCount,
      icon: '⭐',
      color: '#ffc107',
      bg: '#fff9e6',
      target: 'Testimonials',
      description: 'Customer reviews'
    },
    {
      title: 'Registered Users',
      count: stats.usersCount,
      icon: '👥',
      color: '#003B2F',
      bg: '#e6f4f1',
      target: 'Users',
      description: 'Customer accounts & addresses'
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-text">
          <h2>Welcome to Admin Dashboard </h2>
          <p>Monitor your little_rr store performance, inventory, and live rates at a glance.</p>
        </div>
        <div className="dashboard-quick-actions">
          <button
            className="admin-btn-primary"
            onClick={() => dispatch(setActiveMenu('Products'))}
          >
            + Add Product
          </button>
          <button
            className="admin-btn-secondary"
            onClick={() => dispatch(setActiveMenu('Live Rates'))}
          >
            Update Live Rates
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="dashboard-stats-grid">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="dashboard-stat-card"
            onClick={() => dispatch(setActiveMenu(card.target))}
            title={`Go to ${card.target}`}
          >
            <div className="stat-card-top">
              <div className="stat-card-icon" style={{ backgroundColor: card.bg, color: card.color }}>
                {card.icon}
              </div>
              <span className="stat-card-arrow">→</span>
            </div>
            <div className="stat-card-value">
              {isLoading ? (
                <div className="admin-shimmer" style={{ width: '60px', height: '32px', marginBottom: '8px' }}></div>
              ) : (
                <>
                  {card.count} {card.unit && <small style={{ fontSize: '0.8rem', color: '#666' }}>{card.unit}</small>}
                </>
              )}
            </div>
            <div className="stat-card-title">{card.title}</div>
            <div className="stat-card-desc">{card.description}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Today's Rates + Recent Products */}
      <div className="dashboard-row">
        {/* Live Rates Card */}
        <div className="admin-card dashboard-half-card">
          <div className="admin-card-header">
            <h3>📈 Current Live Rates</h3>
            <button
              className="admin-btn-outline"
              onClick={() => dispatch(setActiveMenu('Live Rates'))}
            >
              Manage Rates
            </button>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="admin-shimmer" style={{ height: '40px' }}></div>
              <div className="admin-shimmer" style={{ height: '40px' }}></div>
              <div className="admin-shimmer" style={{ height: '40px' }}></div>
            </div>
          ) : liveRates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
              No active live rates found. Click Manage Rates to configure today's prices.
            </div>
          ) : (
            <div className="dashboard-rates-list">
              {liveRates.map((r) => (
                <div key={r.dbId || r.id} className="dashboard-rate-item">
                  <div className="rate-item-info">
                    <strong>{r.name}</strong>
                    <span>{r.gram}g • GST {r.gst || 3}%</span>
                  </div>
                  <div className="rate-item-price">
                    ₹{Number(r.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Navigation Card */}
        <div className="admin-card dashboard-half-card">
          <div className="admin-card-header">
            <h3>⚡ Quick Navigation</h3>
          </div>
          <div className="dashboard-shortcuts-grid">
            <button
              type="button"
              className="shortcut-tile"
              onClick={() => dispatch(setActiveMenu('Categories'))}
            >
              <span className="shortcut-icon">🏷️</span>
              <span className="shortcut-label">Categories</span>
            </button>
            <button
              type="button"
              className="shortcut-tile"
              onClick={() => dispatch(setActiveMenu('Subcategories'))}
            >
              <span className="shortcut-icon">📂</span>
              <span className="shortcut-label">Subcategories</span>
            </button>
            <button
              type="button"
              className="shortcut-tile"
              onClick={() => dispatch(setActiveMenu('Tags'))}
            >
              <span className="shortcut-icon">🔖</span>
              <span className="shortcut-label">Tags</span>
            </button>
            <button
              type="button"
              className="shortcut-tile"
              onClick={() => dispatch(setActiveMenu('Banners'))}
            >
              <span className="shortcut-icon">🖼️</span>
              <span className="shortcut-label">Banners</span>
            </button>
            <button
              type="button"
              className="shortcut-tile"
              onClick={() => dispatch(setActiveMenu('Testimonials'))}
            >
              <span className="shortcut-icon">⭐</span>
              <span className="shortcut-label">Testimonials</span>
            </button>
            <button
              type="button"
              className="shortcut-tile"
              onClick={() => dispatch(setActiveMenu('Shop Details'))}
            >
              <span className="shortcut-icon">⚙️</span>
              <span className="shortcut-label">Shop Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Products Card */}
      <div className="admin-card" style={{ marginTop: '20px' }}>
        <div className="admin-card-header">
          <h3>💎 Recently Added Products</h3>
          <button
            className="admin-btn-outline"
            onClick={() => dispatch(setActiveMenu('Products'))}
          >
            View All Products →
          </button>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Purity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`shimmer-dash-${idx}`}>
                    <td><div className="admin-shimmer" style={{ width: '45px', height: '45px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '140px', height: '16px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '100px', height: '16px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '80px', height: '16px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '60px', height: '24px', borderRadius: '12px' }}></div></td>
                  </tr>
                ))
              ) : recentProducts.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                    No products added yet.
                  </td>
                </tr>
              ) : (
                recentProducts.map((p) => (
                  <tr key={p.dbId || p.id}>
                    <td>
                      <img
                        src={p.image}
                        alt={p.name}
                        className="list-img"
                        style={{ height: '45px', width: '45px' }}
                      />
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                      {p.productCode && (
                        <span style={{ marginLeft: '6px', color: '#888', fontSize: '0.8rem' }}>
                          #{p.productCode}
                        </span>
                      )}
                    </td>
                    <td>{p.categoryName || '—'}</td>
                    <td>
                      <span style={{ color: '#b8860b', fontWeight: '500' }}>
                        {p.purity || '22K Gold'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${p.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
