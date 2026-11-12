import React, { useState, useEffect } from 'react';
import './CartPage.css';
import {
  fetchCartItemsFromSupabase,
  updateCartItemQuantityInSupabase,
  removeCartItemFromSupabase,
  clearCartInSupabase
} from '../services/cartService';
import {
  AVAILABLE_COUPONS,
  validateCoupon,
  getStoredCoupon,
  saveStoredCoupon,
  removeStoredCoupon
} from '../services/couponService';

const CartPage = () => {
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadCart = async () => {
      setIsLoading(true);
      try {
        const res = await fetchCartItemsFromSupabase();
        if (isMounted) {
          if (res?.success && Array.isArray(res.cart)) {
            setCart(res.cart);
          } else {
            const local = localStorage.getItem('luxury_jewel_cart');
            if (local) setCart(JSON.parse(local));
          }
        }
      } catch (e) {
        console.error('Error fetching cart items:', e);
        const local = localStorage.getItem('luxury_jewel_cart');
        if (local && isMounted) {
          try {
            setCart(JSON.parse(local));
          } catch (err) {}
        }
      }

      setTimeout(() => {
        if (isMounted) setIsLoading(false);
      }, 450);
    };

    loadCart();

    const handleSync = () => {
      fetchCartItemsFromSupabase().then(res => {
        if (res?.success && res.cart && isMounted) {
          setCart(res.cart);
        }
      });
    };

    window.addEventListener('cartUpdated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('cartUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    const finalQty = Math.min(5, newQty);
    setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: finalQty } : item));
    try {
      await updateCartItemQuantityInSupabase(itemId, finalQty);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    try {
      await removeCartItemFromSupabase(itemId);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your shopping cart?')) {
      setIsUpdating(true);
      setCart([]);
      try {
        await clearCartInSupabase();
        localStorage.removeItem('luxury_jewel_cart');
        window.dispatchEvent(new Event('cartUpdated'));
      } catch (e) {
        console.error(e);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(() => getStoredCoupon());
  const [couponFeedback, setCouponFeedback] = useState({ type: '', text: '' });
  const [showOffers, setShowOffers] = useState(false);

  // Re-validate applied coupon whenever subtotal changes
  useEffect(() => {
    if (appliedCoupon && subtotal > 0) {
      const res = validateCoupon(appliedCoupon.code, subtotal);
      if (res.success) {
        setAppliedCoupon(res.coupon);
        saveStoredCoupon(res.coupon);
      } else {
        setAppliedCoupon(null);
        removeStoredCoupon();
        setCouponFeedback({ type: 'error', text: res.message });
      }
    } else if (subtotal === 0 && appliedCoupon) {
      setAppliedCoupon(null);
      removeStoredCoupon();
    }
  }, [subtotal, appliedCoupon]);

  const discountAmount = appliedCoupon?.discountAmount || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyCoupon = (codeToApply) => {
    const code = codeToApply || couponInput;
    const res = validateCoupon(code, subtotal);
    if (res.success) {
      setAppliedCoupon(res.coupon);
      saveStoredCoupon(res.coupon);
      setCouponInput('');
      setCouponFeedback({ type: 'success', text: res.message });
    } else {
      setCouponFeedback({ type: 'error', text: res.message });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    removeStoredCoupon();
    setCouponInput('');
    setCouponFeedback({ type: 'info', text: 'Coupon removed.' });
  };

  // 1. Shimmer Loading Skeleton Screen
  if (isLoading) {
    return (
      <div className="cart-page-wrapper">
        <div className="cart-page-container">
          {/* Header Shimmer */}
          <div className="cart-page-header">
            <div className="cart-shimmer-line line-title cart-shimmer-wave"></div>
            <div className="cart-shimmer-line line-crumb cart-shimmer-wave"></div>
          </div>

          <div className="cart-page-layout">
            {/* Left Items Shimmer */}
            <div className="cart-items-column">
              <div className="cart-items-card">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="cart-item-row cart-item-shimmer-row">
                    <div className="cart-shimmer-thumb cart-shimmer-wave"></div>
                    <div className="cart-item-info-col" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="cart-shimmer-line line-item-title cart-shimmer-wave"></div>
                      <div className="cart-shimmer-line line-item-size cart-shimmer-wave"></div>
                      <div className="cart-shimmer-line line-item-qty cart-shimmer-wave"></div>
                    </div>
                    <div className="cart-shimmer-line line-item-price cart-shimmer-wave"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Summary Shimmer */}
            <div className="cart-summary-column">
              <div className="cart-summary-card">
                <div className="cart-shimmer-line line-summary-title cart-shimmer-wave"></div>
                <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="cart-shimmer-line line-row cart-shimmer-wave"></div>
                  <div className="cart-shimmer-line line-row cart-shimmer-wave"></div>
                  <div className="cart-shimmer-line line-total cart-shimmer-wave" style={{ height: '24px', marginTop: '8px' }}></div>
                </div>
                <div className="cart-shimmer-btn cart-shimmer-wave" style={{ marginTop: '1.5rem', height: '48px', borderRadius: '10px' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Empty Cart Screen
  if (!isLoading && cart.length === 0) {
    return (
      <div className="cart-page-wrapper">
        <div className="cart-empty-container">
          <div className="cart-empty-icon-wrap">
            <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2>Your Shopping Cart is Empty</h2>
          <p>Explore our exclusive collections and find the perfect match for you.</p>
          <a href="/" className="cart-btn-primary" style={{ display: 'inline-block', marginTop: '1.5rem' }}>
            🛍️ Start Shopping Now
          </a>
        </div>
      </div>
    );
  }

  // 3. Main Cart View
  return (
    <div className="cart-page-wrapper">
      <div className="cart-page-container">
        {/* Centered Header */}
        <div className="cart-header-centered">
          <div className="cart-breadcrumbs-centered">
            <a href="/">Home</a> <span>•</span> <span>Your Shopping Cart</span>
          </div>
          <h1 className="cart-title-centered">Shopping Cart</h1>
          <p className="cart-subtitle-centered">
            Review your selected items before purchase. Enjoy a seamless shopping experience!
          </p>
        </div>

        {/* Urgency Purple Banner */}
        <div className="cart-urgency-banner">
          <span>You're out of time! Checkout now to avoid losing your order!</span>
        </div>

        {/* Main Cart Layout */}
        <div className="cart-page-layout">
          {/* LEFT COLUMN: Items Table */}
          <div className="cart-items-column">
            <div className="cart-items-table-card">
              <div className="cart-table-head">
                <span className="col-product">Product</span>
                <span className="col-price">Price</span>
                <span className="col-qty">Quantity</span>
                <span className="col-total">Total</span>
              </div>

              <div className="cart-items-list">
                {cart.map((item) => {
                  const price = Number(item.price) || 0;
                  const qty = Number(item.quantity) || 1;
                  const itemTotal = price * qty;
                  const productUrl = `/product/${encodeURIComponent(item.name.toLowerCase())}`;

                  return (
                    <div key={item.id} className="cart-item-row">
                      <div className="cart-item-prod-cell">
                        <a href={productUrl} className="cart-item-thumb-link">
                          <img
                            src={item.image || '/placeholder.png'}
                            alt={item.name}
                            className="cart-item-img"
                          />
                        </a>
                        <div className="cart-item-meta">
                          <a href={productUrl} className="cart-item-name">
                            {item.name}
                          </a>
                          {item.size && (
                            <div className="cart-item-size-text">
                              Size: {item.size}
                            </div>
                          )}
                          <button
                            type="button"
                            className="cart-item-btn-remove"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="cart-item-price-cell">
                        Rs. {price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>

                      <div className="cart-item-qty-cell">
                        <div className="cart-qty-stepper-box">
                          <button
                            type="button"
                            className="qty-stepper-btn"
                            onClick={() => handleUpdateQty(item.id, qty - 1)}
                            title="Decrease quantity"
                          >-</button>
                          <span className="qty-stepper-val">{qty}</span>
                          <button
                            type="button"
                            className="qty-stepper-btn"
                            onClick={() => handleUpdateQty(item.id, qty + 1)}
                            disabled={qty >= 5}
                            title={qty >= 5 ? 'Maximum 5 allowed' : 'Increase quantity'}
                          >+</button>
                        </div>
                      </div>

                      <div className="cart-item-total-cell">
                        Rs. {itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-card-footer">
                <a href="/" className="cart-link-continue">
                  ← Continue Shopping
                </a>
                <button
                  type="button"
                  className="cart-btn-clear-subtle"
                  onClick={handleClearCart}
                  disabled={isUpdating}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sidebar Summary & Coupon */}
          <div className="cart-summary-column">
            <div className="cart-summary-sidebar-box">
              {/* COUPON CODE BLOCK */}
              <div className="cart-coupon-section">
                <div className="cart-coupon-heading-row">
                  <label className="cart-coupon-title-label">COUPON CODE</label>
                  <button
                    type="button"
                    className="cart-toggle-offers-link"
                    onClick={() => setShowOffers(prev => !prev)}
                  >
                    {showOffers ? 'Hide Offers ▴' : 'View Offers ▾'}
                  </button>
                </div>

                {appliedCoupon ? (
                  <div className="cart-coupon-applied-pill">
                    <div className="coupon-pill-info">
                      <span className="coupon-pill-code">✓ {appliedCoupon.code} Applied</span>
                      <span className="coupon-pill-saving">
                        -Rs. {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="coupon-pill-remove"
                      onClick={handleRemoveCoupon}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="cart-coupon-input-wrap">
                    <input
                      type="text"
                      className="cart-input-coupon-dashed"
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="cart-btn-apply-slate"
                      onClick={() => handleApplyCoupon()}
                      disabled={!couponInput.trim()}
                    >
                      APPLY
                    </button>
                  </div>
                )}

                {couponFeedback.text && (
                  <div className={`cart-coupon-feedback-msg ${couponFeedback.type}`}>
                    {couponFeedback.text}
                  </div>
                )}

                {/* Available Offers Accordion */}
                {showOffers && (
                  <div className="cart-available-offers-list">
                    <div className="offers-list-title">Available Offers:</div>
                    {AVAILABLE_COUPONS.map((c) => {
                      const isEligible = subtotal >= c.minOrder;
                      const isCur = appliedCoupon?.code === c.code;

                      return (
                        <div key={c.code} className="offer-mini-card">
                          <div className="offer-mini-left">
                            <span className="offer-code-badge">{c.code}</span>
                            <span className="offer-title-text">{c.title}</span>
                          </div>
                          {isCur ? (
                            <span className="offer-applied-label">APPLIED</span>
                          ) : (
                            <button
                              type="button"
                              className="offer-apply-btn"
                              onClick={() => handleApplyCoupon(c.code)}
                              disabled={!isEligible}
                            >
                              {isEligible ? 'APPLY' : `Min Rs. ${c.minOrder}`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subtotal Block */}
              <div className="cart-subtotal-block">
                <div className="cart-subtotal-row">
                  <span className="subtotal-label">Subtotal</span>
                  <span className="subtotal-value">
                    Rs. {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="cart-subtotal-row discount-row">
                    <span className="discount-label">Discount ({appliedCoupon.code})</span>
                    <span className="discount-val">
                      -Rs. {discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="cart-tax-note">
                  Tax included. Shipping calculated at checkout.
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                className="cart-btn-checkout-navy"
                onClick={() => { window.location.href = '/checkout'; }}
              >
                Check out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

