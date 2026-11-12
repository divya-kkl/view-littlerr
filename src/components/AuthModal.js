import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './AuthModal.css';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser
} from '../services/userService';
import { addToCartInSupabase } from '../services/cartService';

const AuthModal = ({ isOpen, onClose, onAuthChange }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register' | 'profile'

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

  // Status & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Prevent background body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      checkUserSession();
    } else {
      document.body.style.overflow = '';
      setErrorMsg('');
      setSuccessMsg('');
    }
    return () => {
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const checkUserSession = async () => {
    setIsLoading(true);
    const user = await getCurrentUser();
    setCurrentUser(user);
    if (user) {
      setActiveTab('profile');
    } else {
      setActiveTab('login');
    }
    setIsLoading(false);
  };

  const handlePostAuthAction = async () => {
    try {
      const rawPending = localStorage.getItem('pending_cart_action');
      if (rawPending) {
        const pending = JSON.parse(rawPending);
        if (pending?.productPayload) {
          await addToCartInSupabase(pending.productPayload);
          localStorage.removeItem('pending_cart_action');
          window.dispatchEvent(new Event('cartUpdated'));
          onClose();
          if (pending.action === 'buy_now') {
            window.location.href = '/checkout';
          } else if (pending.returnUrl) {
            window.location.href = pending.returnUrl;
          }
          return true;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const res = await loginUser(loginEmail, loginPassword);
    if (res.success) {
      setCurrentUser(res.user);
      setActiveTab('profile');
      if (onAuthChange) onAuthChange(res.user);
      const redirected = await handlePostAuthAction();
      if (redirected) return;
    } else {
      setErrorMsg(res.error || 'Login failed. Please check your email and password.');
    }
    setIsLoading(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

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
      // After creating account, always switch to the Sign In (login) tab
      try {
        await logoutUser();
      } catch (err) {
        console.warn('Error clearing auto session on signup in modal:', err);
      }
      setCurrentUser(null);
      if (onAuthChange) onAuthChange(null);
      setSuccessMsg('Account created successfully! Please sign in with your email and password.');
      setActiveTab('login');
      setLoginEmail(regEmail);
      setLoginPassword('');
      setRegPassword('');
    } else {
      setErrorMsg(res.error || 'Registration failed. Please try again.');
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setActiveTab('login');
    if (onAuthChange) onAuthChange(null);
  };

  if (!isOpen) return null;

  const modalJSX = (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-header-left">
            <span className="auth-header-icon">
              {currentUser ? '👤' : (activeTab === 'login' ? '🔐' : '✨')}
            </span>
            <div>
              <h3 className="auth-modal-title">
                {currentUser
                  ? 'My Account'
                  : (activeTab === 'login' ? 'Customer Sign In' : 'Create New Account')}
              </h3>
              <p className="auth-modal-subtitle">
                {currentUser
                  ? currentUser.email
                  : (activeTab === 'login' ? 'Welcome back! Please enter your details.' : 'Join us for exclusive offers and fast checkout.')}
              </p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Tabs for unauthenticated view */}
        {!currentUser && (
          <div className="auth-tabs">
            <button
              className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Register
            </button>
          </div>
        )}

        <div className="auth-modal-body">
          {errorMsg && <div className="auth-error-msg">⚠️ {errorMsg}</div>}
          {successMsg && <div className="auth-success-msg">✓ {successMsg}</div>}

          {/* 1. Login Form */}
          {!currentUser && activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="auth-form-clean">
              <div className="auth-form-group">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="auth-form-group">
                <div className="auth-password-wrapper">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="auth-switch-prompt">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* 2. Registration Form */}
          {!currentUser && activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="auth-form-clean">
              {/* Username */}
              <div className="auth-form-group">
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="auth-form-group">
                <input
                  type="email"
                  required
                  placeholder="kkl@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              {/* Password with eye toggle */}
              <div className="auth-form-group">
                <div className="auth-password-wrapper">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showRegPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div className="auth-form-group">
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>

              {/* Select Gender */}
              <div className="auth-form-group">
                <select
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  className="auth-select-field"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Address */}
              <div className="auth-form-group">
                <input
                  type="text"
                  placeholder="Address"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                />
              </div>

              {/* City */}
              <div className="auth-form-group">
                <input
                  type="text"
                  placeholder="City"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                />
              </div>

              {/* State */}
              <div className="auth-form-group">
                <input
                  type="text"
                  placeholder="State"
                  value={regState}
                  onChange={(e) => setRegState(e.target.value)}
                />
              </div>

              {/* Country */}
              <div className="auth-form-group">
                <input
                  type="text"
                  placeholder="Country"
                  value={regCountry}
                  onChange={(e) => setRegCountry(e.target.value)}
                />
              </div>

              {/* Pincode */}
              <div className="auth-form-group">
                <input
                  type="text"
                  placeholder="Pincode"
                  value={regPincode}
                  onChange={(e) => setRegPincode(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="auth-switch-prompt">
                Already registered?{' '}
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* 3. Logged-in Profile Overview */}
          {currentUser && activeTab === 'profile' && (
            <div className="profile-overview-wrapper">
              <div className="account-profile-header">
                <div className="account-avatar">
                  {(currentUser.user_metadata?.full_name || currentUser.email || 'U')[0].toUpperCase()}
                </div>
                <div className="account-details">
                  <h4>{currentUser.user_metadata?.full_name || 'Customer'}</h4>
                  <p className="account-email">{currentUser.email}</p>
                  {currentUser.user_metadata?.phone && (
                    <p className="account-phone">📞 {currentUser.user_metadata.phone}</p>
                  )}
                </div>
              </div>

              {/* Account Details Overview */}
              <div className="profile-info-list">
                <div className="profile-info-row">
                  <span className="profile-info-label">Account Status</span>
                  <span className="profile-status-badge">Active Customer</span>
                </div>
                <div className="profile-info-row">
                  <span className="profile-info-label">Email Verified</span>
                  <span className="profile-verified-badge">✓ Verified</span>
                </div>
              </div>

              {/* View Full Orders & Account Page */}
              <button
                type="button"
                className="btn-gold"
                style={{
                  width: '100%',
                  marginTop: '16px',
                  marginBottom: '10px',
                  fontSize: '0.9rem',
                  padding: '11px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  onClose();
                  window.location.href = '/account';
                }}
              >
                📦 View My Orders ({currentUser ? 'Track' : ''})
              </button>

              {/* Sign Out Button */}
              <button
                type="button"
                className="auth-logout-btn"
                onClick={handleLogout}
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default AuthModal;
