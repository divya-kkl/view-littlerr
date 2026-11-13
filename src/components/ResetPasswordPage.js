import React, { useState, useEffect } from 'react';
import './ResetPasswordPage.css';
import { updateUserPassword, logoutUser } from '../services/userService';
import { supabase } from '../supabaseClient';

const ResetPasswordPage = ({ siteSettings }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Check if user came from a valid recovery link
    const verifyRecoverySession = async () => {
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';

        // If URL contains recovery hash, Supabase automatically establishes a session
        const { data: { session } } = await supabase.auth.getSession();

        if (session || hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token')) {
          setHasValidSession(true);
        } else {
          // Listen once for auth state change in case token is being parsed asynchronously
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && hash.includes('type=recovery'))) {
              setHasValidSession(true);
              setIsCheckingSession(false);
            }
          });

          // Fallback timeout
          setTimeout(() => {
            setIsCheckingSession(false);
          }, 1200);

          return () => {
            subscription?.unsubscribe();
          };
        }
      } catch (err) {
        console.error('Error verifying recovery session:', err);
      } finally {
        setIsCheckingSession(false);
      }
    };

    verifyRecoverySession();
  }, []);

  // Strong password individual criteria
  const hasLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  const criteriaCount = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const isStrong = criteriaCount === 5;

  const getStrengthData = () => {
    if (!newPassword) return { label: 'Enter password', color: '#cbd5e1', width: '0%' };
    if (criteriaCount <= 2) return { label: 'Weak', color: '#ef4444', width: '25%' };
    if (criteriaCount <= 4) return { label: 'Medium', color: '#f59e0b', width: '65%' };
    return { label: 'Strong & Secure ✓', color: '#10b981', width: '100%' };
  };

  const strength = getStrengthData();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isStrong) {
      setErrorMsg('Please satisfy all strong password criteria below before saving.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter both carefully.');
      return;
    }

    setIsLoading(true);

    const res = await updateUserPassword(newPassword);

    if (res.success) {
      setIsSuccess(true);
      // Log out recovery session so user explicitly signs in with their new password
      try {
        await logoutUser();
      } catch (logoutErr) {
        console.warn('Error clearing recovery session:', logoutErr);
      }
    } else {
      setErrorMsg(res.error || 'Failed to update password. Your reset link may have expired.');
    }

    setIsLoading(false);
  };

  return (
    <div className="reset-pwd-page-wrapper">
      {/* Banner */}
      <div className="reset-pwd-hero-banner">
        <div className="reset-pwd-hero-container">
          <div className="reset-pwd-breadcrumb">
            <a href="/">Home</a>
            <span>/</span>
            <span className="current">Reset Password</span>
          </div>
          <h1 className="reset-pwd-hero-title">Reset Your Password</h1>
          <p className="reset-pwd-hero-sub">
            {siteSettings?.shop_name || 'Sri Vinayagam Jewellery'} • Secure Account Recovery
          </p>
        </div>
      </div>

      <div className="reset-pwd-content-container">
        <div className="reset-pwd-card">
          {/* Header Icon */}
          <div className="reset-pwd-icon-circle">
            {isSuccess ? '✓' : '🔑'}
          </div>

          {/* SUCCESS VIEW */}
          {isSuccess ? (
            <div className="reset-pwd-success-box">
              <h2 className="reset-pwd-title">Password Changed Successfully!</h2>
              <p className="reset-pwd-desc">
                Your account password has been updated securely. You can now sign in using your new strong password.
              </p>

              <button
                type="button"
                className="reset-pwd-submit-btn"
                onClick={() => {
                  window.location.href = '/account';
                }}
              >
                Sign In to Account
              </button>
            </div>
          ) : isCheckingSession ? (
            /* LOADING / VERIFYING STATE */
            <div className="reset-pwd-loading-state">
              <div className="reset-pwd-spinner"></div>
              <p>Verifying your password reset link...</p>
            </div>
          ) : !hasValidSession ? (
            /* INVALID OR EXPIRED LINK */
            <div className="reset-pwd-invalid-box">
              <h2 className="reset-pwd-title">Link Expired or Invalid</h2>
              <p className="reset-pwd-desc">
                This password reset link is invalid or has already been used. Please request a fresh reset link.
              </p>

              <button
                type="button"
                className="reset-pwd-submit-btn"
                onClick={() => {
                  window.location.href = '/account';
                }}
              >
                Back to Sign In / Request Reset
              </button>
            </div>
          ) : (
            /* RESET PASSWORD FORM */
            <>
              <h2 className="reset-pwd-title">Create New Strong Password</h2>
              <p className="reset-pwd-desc">
                Please create a strong password to ensure your account security.
              </p>

              {errorMsg && (
                <div className="reset-pwd-alert error">
                  ⚠️ {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="reset-pwd-form">
                {/* New Password Input */}
                <div className="reset-pwd-form-group">
                  <label>New Password *</label>
                  <div className="reset-pwd-input-wrap">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter new strong password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="reset-pwd-eye-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showNewPassword ? (
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

                  {/* Strength Bar */}
                  {newPassword && (
                    <div className="reset-pwd-strength-container">
                      <div className="reset-pwd-strength-bar">
                        <div
                          className="reset-pwd-strength-fill"
                          style={{ width: strength.width, background: strength.color }}
                        />
                      </div>
                      <span className="reset-pwd-strength-label" style={{ color: strength.color }}>
                        {strength.label}
                      </span>
                    </div>
                  )}

                  {/* Live Criteria Checklist */}
                  <div className="reset-pwd-criteria-box">
                    <div className="criteria-heading">Password must contain:</div>
                    <div className="criteria-grid">
                      <div className={`criteria-item ${hasLength ? 'valid' : ''}`}>
                        <span className="criteria-bullet">{hasLength ? '✓' : '○'}</span>
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`criteria-item ${hasUpper ? 'valid' : ''}`}>
                        <span className="criteria-bullet">{hasUpper ? '✓' : '○'}</span>
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`criteria-item ${hasLower ? 'valid' : ''}`}>
                        <span className="criteria-bullet">{hasLower ? '✓' : '○'}</span>
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`criteria-item ${hasNumber ? 'valid' : ''}`}>
                        <span className="criteria-bullet">{hasNumber ? '✓' : '○'}</span>
                        <span>One number (0-9)</span>
                      </div>
                      <div className={`criteria-item ${hasSpecial ? 'valid' : ''}`}>
                        <span className="criteria-bullet">{hasSpecial ? '✓' : '○'}</span>
                        <span>One special character (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="reset-pwd-form-group">
                  <label>Confirm New Password *</label>
                  <div className="reset-pwd-input-wrap">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="reset-pwd-eye-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
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
                  {confirmPassword && newPassword !== confirmPassword && (
                    <span className="reset-pwd-match-error">Passwords do not match</span>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
                    <span className="reset-pwd-match-success">✓ Passwords match</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="reset-pwd-submit-btn"
                  disabled={isLoading || !isStrong}
                >
                  {isLoading ? 'Updating Password...' : isStrong ? 'Save Strong Password' : 'Meet all requirements to save'}
                </button>

                <div className="reset-pwd-back-link">
                  <a href="/account">← Cancel and return to Sign In</a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
