import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './AdminPanel.css';
import { supabase } from '../supabaseClient';
import {
  setAdminSession,
  setActiveMenu,
  setIsProfileDropdownOpen,
  toggleProfileDropdown,
  logoutAdmin,
} from '../redux/slices/adminSlice';
import DashboardPanel from './dashboard/DashboardPanel';
import CategoryPanel from './category/CategoryPanel';
import TopBannerPanel from './banner/TopBannerPanel';
import BannerPanel from './banner/BannerPanel';
import Banner2Panel from './banner/Banner2Panel';
import SubcategoryPanel from './subcategory/SubcategoryPanel';
import ChildCategoryPanel from './childcategory/ChildCategoryPanel';
import ProductPanel from './product/ProductPanel';
import TagPanel from './tag/TagPanel';
import RatePanel from './rate/RatePanel';
import RateTypePanel from './rate/RateTypePanel';
import TestimonialPanel from './testimonial/TestimonialPanel';
import SettingsPanel from './settings/SettingsPanel';
import UserPanel from './user/UserPanel';
import CartPanel from './cart/CartPanel';
import OrderPanel from './orders/OrderPanel';
import PaymentMethodPanel from './payment/PaymentMethodPanel';

const AdminPanel = ({ onClose }) => {
  const dispatch = useDispatch();
  const { session, loading, activeMenu, isProfileDropdownOpen } = useSelector((state) => state.admin);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setAdminSession(session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setAdminSession(session));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message);
    } else if (data?.session) {
      dispatch(setActiveMenu('Dashboard'));
      dispatch(setAdminSession(data.session));
    }
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(logoutAdmin());
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;

  if (!session) {
    return (
      <div className="admin-login-screen">
        <div className="login-box">
          <h2>Admin Login</h2>
          {loginError && <div className="login-error">{loginError}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '10px' }}>
              {isLoggingIn ? 'Logging in...' : 'Login'}
            </button>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}>
              Back to Store
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-brand">
          Admin
        </div>
        <div className="admin-menu">
          {['Dashboard', 'Orders', 'Payment Methods', 'Cart Items', 'Users', 'Products', 'Top Banners', 'Banners', 'Banner 2', 'Categories', 'Subcategories', 'Child Categories', 'Tags', 'Testimonials', 'Live Rates', 'Rate Types', 'Shop Details'].map((menu) => (
            <div
              key={menu}
              className={`admin-menu-item ${activeMenu === menu ? 'active' : ''}`}
              onClick={() => dispatch(setActiveMenu(menu))}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>{menu}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-main">
        <div className="admin-header">
          <h2>{activeMenu}</h2>
          <div className="admin-profile">
            <div
              className="profile-icon"
              onClick={() => dispatch(toggleProfileDropdown())}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            {isProfileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  <strong>Admin Account</strong>
                  <span>{session?.user?.email}</span>
                </div>
                <div className="dropdown-item" onClick={() => {
                  dispatch(setIsProfileDropdownOpen(false));
                  alert('Settings clicked');
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  Account Settings
                </div>
                <div className="dropdown-item danger" onClick={handleLogout}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="admin-content-body">
          {activeMenu === 'Dashboard' ? (
            <DashboardPanel />
          ) : activeMenu === 'Orders' ? (
            <OrderPanel />
          ) : activeMenu === 'Payment Methods' ? (
            <PaymentMethodPanel />
          ) : activeMenu === 'Users' ? (
            <UserPanel />
          ) : activeMenu === 'Cart Items' ? (
            <CartPanel />
          ) : activeMenu === 'Top Banners' ? (
            <TopBannerPanel />
          ) : activeMenu === 'Live Rates' ? (
            <RatePanel />
          ) : activeMenu === 'Rate Types' ? (
            <RateTypePanel />
          ) : activeMenu === 'Banners' ? (
            <BannerPanel />
          ) : activeMenu === 'Banner 2' ? (
            <Banner2Panel />
          ) : activeMenu === 'Categories' ? (
            <CategoryPanel />
          ) : activeMenu === 'Subcategories' ? (
            <SubcategoryPanel />
          ) : activeMenu === 'Child Categories' ? (
            <ChildCategoryPanel />
          ) : activeMenu === 'Tags' ? (
            <TagPanel />
          ) : activeMenu === 'Products' ? (
            <ProductPanel />
          ) : activeMenu === 'Testimonials' ? (
            <TestimonialPanel />
          ) : activeMenu === 'Shop Details' ? (
            <SettingsPanel />
          ) : (
            <div style={{ padding: '50px', textAlign: 'center', color: '#888' }}>
              {activeMenu} management is under construction.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
