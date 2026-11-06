import React, { useState, useEffect } from 'react';
import './AccountPage.css';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
  getUserAddresses
} from '../services/userService';
import { getUserOrders } from '../services/orderService';
import { addToCartInSupabase } from '../services/cartService';

const STATUS_COLORS = {
  PLACED: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  PROCESSING: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  SHIPPED: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  DELIVERED: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  CANCELLED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' }
};

const AccountPage = ({ siteSettings }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [mainTab, setMainTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'orders' || window.location.hash === '#orders') {
        return 'orders';
      }
    }
    return 'profile';
  });
  const [userAddresses, setUserAddresses] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasPendingAction, setHasPendingAction] = useState(() => {
    return Boolean(localStorage.getItem('pending_cart_action'));
  });

  const handlePostAuthAction = async () => {
    try {
      const rawPending = localStorage.getItem('pending_cart_action');
      if (rawPending) {
        const pending = JSON.parse(rawPending);
        if (pending?.productPayload) {
          await addToCartInSupabase(pending.productPayload);
          localStorage.removeItem('pending_cart_action');
          setHasPendingAction(false);
          window.dispatchEvent(new Event('cartUpdated'));

          if (pending.action === 'buy_now') {
            window.location.href = '/checkout';
            return true;
          } else {
            const dest = pending.returnUrl || '/';
            window.location.href = dest;
            return true;
          }
        }
      }
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return true;
      }
    } catch (err) {
      console.error('Error handling post auth action:', err);
    }
    return false;
  };

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form states
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regGender, setRegGender] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('');
  const [regCountry, setRegCountry] = useState('India');
  const [regPincode, setRegPincode] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Instantly load any existing orders from local store
    try {
      const cached = JSON.parse(localStorage.getItem('sv_my_orders') || '[]');
      if (cached && cached.length > 0) {
        setUserOrders(cached);
      }
    } catch (e) { }
    checkSession();

    const handleOrderSync = () => {
      try {
        const cached = JSON.parse(localStorage.getItem('sv_my_orders') || '[]');
        if (cached && cached.length > 0) setUserOrders(cached);
      } catch (e) { }
      checkSession();
    };

    const handleHashChange = () => {
      if (window.location.hash === '#orders') {
        setMainTab('orders');
      } else if (window.location.hash === '#profile') {
        setMainTab('profile');
      }
    };

    window.addEventListener('orderPlaced', handleOrderSync);
    window.addEventListener('storage', handleOrderSync);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('orderPlaced', handleOrderSync);
      window.removeEventListener('storage', handleOrderSync);
      window.removeEventListener('hashchange', handleHashChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrdersForUser = async (user, phone) => {
    setIsLoadingOrders(true);
    try {
      const cached = JSON.parse(localStorage.getItem('sv_my_orders') || '[]');
      if (cached && cached.length > 0) {
        setUserOrders(cached);
      }
    } catch (e) { }

    const userPhone = phone || user?.user_metadata?.phone;
    const ordersRes = await getUserOrders(user?.id, user?.email, userPhone);
    if (ordersRes.success && ordersRes.data && ordersRes.data.length > 0) {
      setUserOrders(ordersRes.data);
    }
    setIsLoadingOrders(false);
  };

  const checkSession = async () => {
    setIsLoading(true);
    const user = await getCurrentUser();
    setCurrentUser(user);
    if (user) {
      const redirected = await handlePostAuthAction();
      if (redirected) return;
      const res = await getUserAddresses(user.id, user.email);
      let phone = null;
      if (res.success && res.data) {
        setUserAddresses(res.data);
        phone = res.data[0]?.phone_number;
      }
      loadOrdersForUser(user, phone);
    }
    setIsLoading(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const res = await loginUser(loginEmail, loginPassword);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      const redirected = await handlePostAuthAction();
      if (redirected) return;
      const addrRes = await getUserAddresses(res.user.id, res.user.email);
      let phone = null;
      if (addrRes.success && addrRes.data) {
        setUserAddresses(addrRes.data);
        phone = addrRes.data[0]?.phone_number;
      }
      loadOrdersForUser(res.user, phone);
    } else {
      setErrorMsg(res.error || 'Login failed. Please check your credentials.');
    }
    setIsSubmitting(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const res = await registerUser({
      username: regUsername,
      email: regEmail,
      password: regPassword,
      fullName: regUsername,
      phone: regPhone,
      gender: regGender,
      address: regAddress,
      city: regCity,
      state: regState,
      country: regCountry,
      pincode: regPincode
    });

    if (res.success) {
      if (res.session) {
        setCurrentUser(res.user);
        const redirected = await handlePostAuthAction();
        if (redirected) return;
        const addrRes = await getUserAddresses(res.user.id, res.user.email);
        if (addrRes.success && addrRes.data) {
          setUserAddresses(addrRes.data);
        }
      } else {
        setSuccessMsg('Account created successfully! You can now sign in.');
        setActiveTab('login');
        setLoginEmail(regEmail);
      }
    } else {
      setErrorMsg(res.error || 'Registration failed. Please try again.');
    }
    setIsSubmitting(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserAddresses([]);
    setActiveTab('login');
  };

  const meta = currentUser?.user_metadata || {};
  const primaryAddress = userAddresses[0] || {};
  const displayName = meta.full_name || meta.username || currentUser?.email?.split('@')[0] || 'Customer';
  const displayAddress = primaryAddress.street_address || meta.address || '';
  const displayCity = primaryAddress.city || meta.city || '';
  const displayState = primaryAddress.state || meta.state || '';
  const displayPincode = primaryAddress.pincode || meta.pincode || '';
  const displayPhone = primaryAddress.phone_number || meta.phone || '';
  const displayGender = meta.gender || '';

  const renderOrdersSection = () => (
    <div className="account-card user-orders-card">
      <div className="card-header-styled">
        <span className="card-header-icon">📦</span>
        <div>
          <h3 className="card-header-title">My Orders ({userOrders.length})</h3>
          <p className="card-header-sub">View and track all little_rr orders placed with us.</p>
        </div>
      </div>

      {isLoadingOrders ? (
        <div className="user-orders-shimmer-list">
          {[1, 2].map((k) => (
            <div key={k} className="user-single-order-card user-order-shimmer-card">
              <div className="user-order-top-row">
                <div className="account-shimmer-line line-order-num account-shimmer-wave"></div>
                <div className="account-shimmer-pill-mini account-shimmer-wave"></div>
              </div>
              <div className="user-order-items-wrapper">
                <div className="user-order-item-box">
                  <div className="account-shimmer-thumb account-shimmer-wave"></div>
                  <div style={{ flex: 1 }}>
                    <div className="account-shimmer-line line-item-title account-shimmer-wave"></div>
                    <div className="account-shimmer-line line-item-sub account-shimmer-wave"></div>
                  </div>
                  <div className="account-shimmer-line line-item-price account-shimmer-wave"></div>
                </div>
              </div>
              <div className="user-order-bottom-bar">
                <div className="account-shimmer-line line-address account-shimmer-wave"></div>
                <div className="account-shimmer-line line-total-amt account-shimmer-wave"></div>
              </div>
            </div>
          ))}
        </div>
      ) : userOrders.length === 0 ? (
        <div className="user-empty-orders">
          <div style={{ fontSize: '2.4rem', marginBottom: '8px' }}>🛍️</div>
          <h4 style={{ margin: '0 0 6px 0', color: '#003B2F', fontSize: '1.05rem', fontWeight: 700 }}>No orders placed yet</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#64748b' }}>
            Once you place an order using Buy Now or Cart Checkout, you can track its delivery status here.
          </p>
          <a href="/all-products" className="account-action-link primary" style={{ display: 'inline-flex' }}>
            🛍️ Explore little_rr Collections
          </a>
        </div>
      ) : (
        <div className="user-orders-list">
          {userOrders.map((order) => {
            const statusColor = STATUS_COLORS[order.order_status] || STATUS_COLORS.PLACED;
            return (
              <div key={order.id} className="user-single-order-card">
                <div className="user-order-top-row">
                  <div>
                    <span className="user-order-code">{order.order_number}</span>
                    <div className="user-order-timestamp">
                      Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span
                    className="user-order-status-pill"
                    style={{
                      background: statusColor.bg,
                      color: statusColor.text,
                      border: `1.5px solid ${statusColor.border}`
                    }}
                  >
                    ● {order.order_status}
                  </span>
                </div>

                <div className="user-order-items-wrapper">
                  {Array.isArray(order.items) && order.items.map((it, idx) => (
                    <div key={idx} className="user-order-item-box">
                      <img
                        src={it.image || '/whatappicon.png'}
                        alt={it.name}
                        className="user-order-item-photo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="user-order-item-text">
                        <div className="user-order-item-heading">{it.name}</div>
                        <div className="user-order-item-subtext">
                          Qty: <strong>{it.quantity || 1}</strong>
                          {it.size ? ` • Size: ${it.size}` : ''}
                          {it.weight ? ` • Wt: ${it.weight}g` : ''}
                          {it.purity ? ` • ${it.purity}` : ''}
                        </div>
                      </div>
                      <div className="user-order-item-amount">
                        ₹{((Number(it.price) || 0) * (Number(it.quantity) || 1)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="user-order-bottom-bar">
                  <div className="user-order-delivery-address">
                    📍 Delivery: <strong>{order.street_address}, {order.city} - {order.pincode}</strong>
                  </div>
                  <div className="user-order-total-group">
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total:</span>
                    <span className="user-order-total-price">
                      ₹{(Number(order.total_amount) || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="user-order-payment-pill">
                      {order.payment_method}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="account-page-wrapper">
        <div className="account-hero-banner account-shimmer-hero">
          <div className="account-hero-container">
            <div className="account-shimmer-line line-crumb account-shimmer-wave"></div>
            <div className="account-shimmer-line line-title account-shimmer-wave"></div>
            <div className="account-shimmer-line line-subtitle account-shimmer-wave"></div>
          </div>
        </div>

        <div className="account-content-container">
          <div className="account-main-tabs-bar">
            <div className="account-shimmer-pill account-shimmer-wave"></div>
            <div className="account-shimmer-pill account-shimmer-wave"></div>
          </div>

          <div className="account-dashboard-grid">
            {/* Left card shimmer */}
            <div className="account-card profile-main-card">
              <div className="profile-shimmer-avatar account-shimmer-wave"></div>
              <div className="account-shimmer-line line-name account-shimmer-wave"></div>
              <div className="account-shimmer-line line-email account-shimmer-wave"></div>
              <div className="profile-divider"></div>
              <div className="account-shimmer-line line-btn-nav account-shimmer-wave"></div>
              <div className="account-shimmer-line line-btn-nav account-shimmer-wave"></div>
              <div className="profile-divider"></div>
              <div className="account-shimmer-meta">
                <div className="account-shimmer-line line-meta-row account-shimmer-wave"></div>
                <div className="account-shimmer-line line-meta-row account-shimmer-wave"></div>
                <div className="account-shimmer-line line-meta-row account-shimmer-wave"></div>
              </div>
            </div>

            {/* Right details shimmer */}
            <div className="account-details-column">
              <div className="account-card">
                <div className="account-shimmer-line line-card-header account-shimmer-wave"></div>
                <div className="account-shimmer-grid">
                  <div className="account-shimmer-tile account-shimmer-wave"></div>
                  <div className="account-shimmer-tile account-shimmer-wave"></div>
                  <div className="account-shimmer-tile account-shimmer-wave"></div>
                  <div className="account-shimmer-tile account-shimmer-wave"></div>
                </div>
              </div>

              <div className="account-card" style={{ marginTop: '20px' }}>
                <div className="account-shimmer-line line-card-header account-shimmer-wave"></div>
                <div className="account-shimmer-grid">
                  <div className="account-shimmer-tile account-shimmer-wave" style={{ gridColumn: '1 / -1' }}></div>
                  <div className="account-shimmer-tile account-shimmer-wave"></div>
                  <div className="account-shimmer-tile account-shimmer-wave"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page-wrapper">
      {/* Breadcrumb Header */}
      <div className="account-hero-banner">
        <div className="account-hero-container">
          <div className="account-breadcrumb">
            <a href="/">Home</a>
            <span>/</span>
            <span className="current">{currentUser ? (mainTab === 'orders' ? 'My Orders' : 'My Profile') : (mainTab === 'orders' ? 'My Orders' : 'Customer Sign In')}</span>
          </div>
          <h1 className="account-hero-title">
            {currentUser ? (mainTab === 'orders' ? 'My Orders' : `Welcome, ${displayName}`) : (mainTab === 'orders' ? 'My Orders' : 'Customer Portal')}
          </h1>
          <p className="account-hero-subtitle">
            {mainTab === 'orders'
              ? 'Track real-time status and view details of your placed orders.'
              : (currentUser
                ? 'Manage your personal profile, credentials and shopping preferences.'
                : 'Sign in to access your account or create a new profile with us.')}
          </p>
        </div>
      </div>

      <div className="account-content-container">
        {/* Top Header Tabs: Profile & Orders */}
        <div className="account-main-tabs-bar">
          <button
            type="button"
            className={`account-main-tab-btn ${mainTab === 'profile' ? 'active' : ''}`}
            onClick={() => setMainTab('profile')}
          >
            <span className="account-main-tab-icon">👤</span>
            <span className="account-main-tab-text">Profile</span>
          </button>
          <button
            type="button"
            className={`account-main-tab-btn ${mainTab === 'orders' ? 'active' : ''}`}
            onClick={() => setMainTab('orders')}
          >
            <span className="account-main-tab-icon">📦</span>
            <span className="account-main-tab-text">Orders</span>
            {userOrders.length > 0 && (
              <span className="account-main-tab-badge">{userOrders.length}</span>
            )}
          </button>
        </div>

        {currentUser ? (
          /* ========================================================
             LOGGED IN CUSTOMER DASHBOARD
             ======================================================== */
          <div className="account-dashboard-grid">
            {/* Left Sidebar Card */}
            <div className="account-card profile-main-card">
              <div className="profile-badge-row">
                <span className="account-status-pill">Active Customer</span>
                <span className="account-verified-pill">✓ Verified</span>
              </div>

              <div className="account-avatar-large">
                {displayName[0].toUpperCase()}
              </div>

              <h2 className="profile-display-name">{displayName}</h2>
              <p className="profile-display-email">{currentUser.email}</p>

              {/* Sidebar Navigation */}
              <div className="profile-sidebar-nav">
                <button
                  type="button"
                  className={`profile-sidebar-nav-btn ${mainTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setMainTab('profile')}
                >
                  <span className="side-nav-left">
                    <span className="side-nav-icon">👤</span> Profile Section
                  </span>
                  <span className="side-nav-arrow">→</span>
                </button>
                <button
                  type="button"
                  className={`profile-sidebar-nav-btn ${mainTab === 'orders' ? 'active' : ''}`}
                  onClick={() => setMainTab('orders')}
                >
                  <span className="side-nav-left">
                    <span className="side-nav-icon">📦</span> Order Details
                  </span>
                  {userOrders.length > 0 ? (
                    <span className="profile-side-badge">{userOrders.length}</span>
                  ) : (
                    <span className="side-nav-arrow">→</span>
                  )}
                </button>
              </div>

              <div className="profile-divider"></div>

              <div className="profile-meta-list">
                <div className="profile-meta-item">
                  <span className="profile-meta-label">Email:</span>
                  <span className="profile-meta-value">{currentUser.email}</span>
                </div>

                {displayPhone && (
                  <div className="profile-meta-item">
                    <span className="profile-meta-label">Phone:</span>
                    <span className="profile-meta-value">📞 {displayPhone}</span>
                  </div>
                )}

                {displayGender && (
                  <div className="profile-meta-item">
                    <span className="profile-meta-label">Gender:</span>
                    <span className="profile-meta-value">👤 {displayGender}</span>
                  </div>
                )}

                <div className="profile-meta-item">
                  <span className="profile-meta-label">Joined:</span>
                  <span className="profile-meta-value">
                    {currentUser.created_at
                      ? new Date(currentUser.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                      : 'Member'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="account-signout-btn"
                onClick={handleLogout}
              >
                <span>🚪</span> Sign Out of Account
              </button>
            </div>

            {/* Right Details Column */}
            <div className="account-details-column">
              {/* If Order tab is selected, show order details */}
              {mainTab === 'orders' && renderOrdersSection()}

              {/* If Profile tab is selected, show profile section */}
              {mainTab === 'profile' && (
                <>
                  {/* Personal Information Box */}
                  <div className="account-card">
                    <div className="card-header-styled">
                      <span className="card-header-icon">👤</span>
                      <div>
                        <h3 className="card-header-title">Personal Information</h3>
                        <p className="card-header-sub">Your registered credentials and account details.</p>
                      </div>
                    </div>

                    <div className="account-info-grid">
                      <div className="info-tile">
                        <span className="info-tile-label">Full Name / Username</span>
                        <strong className="info-tile-value">{displayName}</strong>
                      </div>

                      <div className="info-tile">
                        <span className="info-tile-label">Registered Email</span>
                        <strong className="info-tile-value">{currentUser.email}</strong>
                      </div>

                      <div className="info-tile">
                        <span className="info-tile-label">Contact Number</span>
                        <strong className="info-tile-value">{displayPhone || 'Not provided'}</strong>
                      </div>

                      <div className="info-tile">
                        <span className="info-tile-label">Gender</span>
                        <strong className="info-tile-value">{displayGender || 'Not specified'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Address Information Box */}
                  {(displayAddress || displayCity || displayPincode) && (
                    <div className="account-card" style={{ marginTop: '20px' }}>
                      <div className="card-header-styled">
                        <span className="card-header-icon">📍</span>
                        <div>
                          <h3 className="card-header-title">Registered Location & Address</h3>
                          <p className="card-header-sub">Delivery address on file for orders.</p>
                        </div>
                      </div>

                      <div className="account-info-grid">
                        {displayAddress && (
                          <div className="info-tile" style={{ gridColumn: '1 / -1' }}>
                            <span className="info-tile-label">Street Address</span>
                            <strong className="info-tile-value">{displayAddress}</strong>
                          </div>
                        )}

                        <div className="info-tile">
                          <span className="info-tile-label">City</span>
                          <strong className="info-tile-value">{displayCity || '—'}</strong>
                        </div>

                        <div className="info-tile">
                          <span className="info-tile-label">State</span>
                          <strong className="info-tile-value">{displayState || '—'}</strong>
                        </div>

                        <div className="info-tile">
                          <span className="info-tile-label">Country</span>
                          <strong className="info-tile-value">{meta.country || 'India'}</strong>
                        </div>

                        <div className="info-tile">
                          <span className="info-tile-label">Pincode</span>
                          <strong className="info-tile-value">{displayPincode || '—'}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : mainTab === 'orders' ? (
          /* GUEST ORDERS VIEW */
          <div className="account-orders-guest-wrapper">
            {renderOrdersSection()}
          </div>
        ) : (
          /* ========================================================
             UNAUTHENTICATED: LOGIN & REGISTER TABS
             ======================================================== */
          <div className="account-auth-container">
            <div className="account-auth-box">
              {/* Tab Selector */}
              <div className="auth-pill-tabs">
                <button
                  type="button"
                  className={`auth-pill-btn ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                >
                  🔐 Sign In
                </button>
                <button
                  type="button"
                  className={`auth-pill-btn ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
                >
                  ✨ Create Account
                </button>
              </div>

              {hasPendingAction && (
                <div className="account-alert info" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857', marginBottom: '1.25rem', padding: '0.85rem 1.15rem', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #a7f3d0' }}>
                  <span>🔒 Please sign in or create an account to save your selected item to cart & proceed.</span>
                </div>
              )}
              {errorMsg && <div className="account-alert error">⚠️ {errorMsg}</div>}
              {successMsg && <div className="account-alert success">✓ {successMsg}</div>}

              {/* 1. SIGN IN FORM */}
              {activeTab === 'login' && (
                <form onSubmit={handleLoginSubmit} className="account-form">
                  <div className="account-input-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>

                  <div className="account-input-group">
                    <label>Password *</label>
                    <div className="account-password-input-wrap">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="account-pwd-toggle"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showLoginPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="account-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In to Account'}
                  </button>

                  <div className="account-form-switch">
                    Don't have an account yet?{' '}
                    <span onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}>
                      Create one now
                    </span>
                  </div>
                </form>
              )}

              {/* 2. REGISTER FORM */}
              {activeTab === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="account-form">
                  <div className="account-input-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Divya"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                    />
                  </div>

                  <div className="account-input-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="kkl@gmail.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>

                  <div className="account-input-group">
                    <label>Password *</label>
                    <div className="account-password-input-wrap">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="account-pwd-toggle"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {showRegPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="account-input-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                    />
                  </div>

                  <div className="account-input-group">
                    <label>Gender</label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="account-input-group">
                    <label>Address</label>
                    <input
                      type="text"
                      placeholder="Street / Area / House No"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                    />
                  </div>

                  <div className="account-grid-2">
                    <div className="account-input-group">
                      <label>City</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                      />
                    </div>

                    <div className="account-input-group">
                      <label>State</label>
                      <input
                        type="text"
                        placeholder="State"
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="account-grid-2">
                    <div className="account-input-group">
                      <label>Country</label>
                      <input
                        type="text"
                        placeholder="Country"
                        value={regCountry}
                        onChange={(e) => setRegCountry(e.target.value)}
                      />
                    </div>

                    <div className="account-input-group">
                      <label>Pincode</label>
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={regPincode}
                        onChange={(e) => setRegPincode(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="account-submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </button>

                  <div className="account-form-switch">
                    Already registered?{' '}
                    <span onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}>
                      Sign in here
                    </span>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;

