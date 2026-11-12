import React, { useState, useEffect } from 'react';
import './CartPage.css';
import {
  fetchCartItemsFromSupabase,
  updateCartItemQuantityInSupabase,
  removeCartItemFromSupabase,
  clearCartInSupabase
} from '../services/cartService';

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

  const totalItemsCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const grandTotal = subtotal;

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
        {/* Breadcrumb Header */}
        <div className="cart-page-header">
          <div>
            <div className="cart-breadcrumbs">
              <a href="/">Home</a>
              <span>/</span>
              <span className="cart-bread-current">Shopping Cart</span>
            </div>
            <h1 className="cart-page-title">
              Shopping Cart <span className="cart-title-count">({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})</span>
            </h1>
          </div>
          <button
            type="button"
            className="cart-btn-clear"
            onClick={handleClearCart}
            disabled={isUpdating}
          >
            🗑️ Clear Cart
          </button>
        </div>

        <div className="cart-page-layout">
          {/* LEFT COLUMN: Items List */}
          <div className="cart-items-column">
            <div className="cart-items-card">
              <div className="cart-table-head">
                <span className="col-product">Product</span>
                <span className="col-price">Price</span>
                <span className="col-qty">Quantity</span>
                <span className="col-subtotal">Subtotal</span>
              </div>

              <div className="cart-items-list">
                {cart.map((item) => {
                  const price = Number(item.price) || 0;
                  const qty = Number(item.quantity) || 1;
                  const itemSubtotal = price * qty;
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
                            <div className="cart-item-size-pill">
                              Size: <strong>{item.size}</strong>
                            </div>
                          )}
                          <div className="cart-item-mobile-price">
                            ₹{price.toLocaleString('en-IN')}
                          </div>
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
                        ₹{price.toLocaleString('en-IN')}
                      </div>

                      <div className="cart-item-qty-cell">
                        <div className="cart-qty-picker">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, qty - 1)}
                            title="Decrease quantity"
                          >-</button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.id, qty + 1)}
                            disabled={qty >= 5}
                            title={qty >= 5 ? 'Maximum 5 units allowed' : 'Increase quantity'}
                          >+</button>
                        </div>
                      </div>

                      <div className="cart-item-subtotal-cell">
                        ₹{itemSubtotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="cart-card-footer">
                <a href="/" className="cart-link-continue">
                  ← Continue Shopping
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary Card */}
          <div className="cart-summary-column">
            <div className="cart-summary-card">
              <h3 className="cart-summary-title">Order Summary</h3>

              <div className="cart-summary-breakdown">
                <div className="cart-summary-row">
                  <span>Subtotal ({totalItemsCount} items)</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="cart-summary-row">
                  <span>Delivery Charges</span>
                  <span className="cart-free-tag">FREE</span>
                </div>
                <div className="cart-summary-row cart-grand-row">
                  <span>Estimated Total</span>
                  <span className="cart-grand-val">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <small className="cart-tax-notice">✓ Inclusive of all taxes</small>
              </div>

              <button
                type="button"
                className="cart-btn-checkout"
                onClick={() => { window.location.href = '/checkout'; }}
              >
                PROCEED TO CHECKOUT →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

