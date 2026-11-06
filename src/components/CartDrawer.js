import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './CartDrawer.css';
import { supabase } from '../supabaseClient';
import { createOrderInSupabase } from '../services/orderService';

const CartDrawer = ({ isOpen, onClose, cart, onUpdateQuantity, onRemoveItem, initialCheckout = false, isLoading = false }) => {
  const [isCheckoutStep, setIsCheckoutStep] = useState(initialCheckout);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderNumber, setPlacedOrderNumber] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);

  const [checkoutForm, setCheckoutForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    street_address: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    payment_method: 'Cash on Delivery',
    order_notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setIsCheckoutStep(Boolean(initialCheckout));
      document.body.style.overflow = 'hidden';
      setIsDrawerLoading(true);
      const timer = setTimeout(() => {
        setIsDrawerLoading(false);
      }, 400);

      // Attempt to prefill user details if logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u = session.user;
          setCheckoutForm(prev => ({
            ...prev,
            customer_name: u.user_metadata?.full_name || prev.customer_name,
            customer_email: u.email || prev.customer_email,
            customer_phone: u.user_metadata?.phone || prev.customer_phone
          }));
        }
      });

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, initialCheckout]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const grandTotal = subtotal;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!cart || cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const orderPayload = {
        customer_name: checkoutForm.customer_name,
        customer_phone: checkoutForm.customer_phone,
        customer_email: checkoutForm.customer_email,
        street_address: checkoutForm.street_address,
        city: checkoutForm.city,
        state: checkoutForm.state,
        country: 'India',
        pincode: checkoutForm.pincode,
        payment_method: checkoutForm.payment_method,
        order_notes: checkoutForm.order_notes,
        subtotal: grandTotal,
        delivery_charge: 0,
        total_amount: grandTotal,
        items: cart.map(item => ({
          id: item.id || item.product_id,
          product_id: item.product_id || item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size || null,
          color: item.color || null,
          image: item.image || '',
          weight: item.weight || null,
          purity: item.purity || null
        }))
      };

      const res = await createOrderInSupabase(orderPayload);
      if (res.success && res.order) {
        setPlacedOrderNumber(res.order.order_number);
        setOrderSuccess(true);
        window.dispatchEvent(new Event('orderPlaced'));
      } else {
        alert('Failed to place order: ' + (res.error || 'Please try again.'));
      }
    } catch (err) {
      console.error('Order placement error:', err);
      alert('Error placing order: ' + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container animate-slide-in" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <h3>{isCheckoutStep ? 'Checkout Order' : 'Your Shopping Cart'} ({cart.reduce((a, b) => a + b.quantity, 0)})</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>×</button>
        </div>

        {orderSuccess ? (
          <div className="order-success-screen">
            <div className="success-icon-badge">✓</div>
            <h2>Order Placed Successfully!</h2>
            <p className="order-id">Order Number: <strong>{placedOrderNumber}</strong></p>
            <p className="success-msg">
              Thank you for ordering with Sri Vinayaga Moulding! Your 100% BIS Hallmarked little_rr order is confirmed and will be processed right away.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '14px' }}>
              <button
                className="btn-gold"
                onClick={() => {
                  setOrderSuccess(false);
                  setIsCheckoutStep(false);
                  onClose();
                  window.location.href = '/account';
                }}
              >
                📦 VIEW ORDER IN MY ACCOUNT
              </button>
              <button
                type="button"
                className="btn-outline-gold"
                onClick={() => {
                  setOrderSuccess(false);
                  setIsCheckoutStep(false);
                  onClose();
                }}
              >
                CONTINUE SHOPPING
              </button>
            </div>
          </div>
        ) : (isLoading || isDrawerLoading) ? (
          <div className="cart-shimmer-container">
            <div className="cart-shimmer-list">
              {[1, 2, 3].map((n) => (
                <div key={n} className="cart-item-card cart-item-shimmer-card">
                  <div className="cart-shimmer-thumb cart-shimmer-wave"></div>
                  <div className="cart-shimmer-info">
                    <div className="cart-shimmer-line line-purity cart-shimmer-wave"></div>
                    <div className="cart-shimmer-line line-title cart-shimmer-wave"></div>
                    <div className="cart-shimmer-line line-weight cart-shimmer-wave"></div>
                    <div className="cart-shimmer-line line-price cart-shimmer-wave"></div>
                    <div className="cart-shimmer-line line-btn cart-shimmer-wave"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="drawer-footer cart-shimmer-footer">
              <div className="cart-shimmer-line line-total cart-shimmer-wave"></div>
              <div className="cart-shimmer-line line-checkout-btn cart-shimmer-wave"></div>
            </div>
          </div>
        ) : isCheckoutStep ? (
          <form className="checkout-form-container" onSubmit={handlePlaceOrder}>
            <div className="form-section-title">Shipping & Contact Details</div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Ananya Sundaram"
                value={checkoutForm.customer_name}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={checkoutForm.customer_phone}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_phone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="customer@gmail.com"
                  value={checkoutForm.customer_email}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Door No, Street & Landmark *</label>
              <textarea
                placeholder="Door No, Street, Landmark..."
                rows="2"
                value={checkoutForm.street_address}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, street_address: e.target.value })}
                required
              ></textarea>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City / Town *</label>
                <input
                  type="text"
                  placeholder="e.g. Coimbatore"
                  value={checkoutForm.city}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, city: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  placeholder="641001"
                  value={checkoutForm.pincode}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, pincode: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-section-title" style={{ marginTop: '1.25rem' }}>Select Payment Method</div>
            <div className="payment-options-grid">
              <label className="payment-radio-card">
                <input
                  type="radio"
                  name="payment"
                  value="Cash on Delivery"
                  checked={checkoutForm.payment_method === 'Cash on Delivery'}
                  onChange={() => setCheckoutForm({ ...checkoutForm, payment_method: 'Cash on Delivery' })}
                />
                <span>📦 Cash on Delivery</span>
              </label>

              <label className="payment-radio-card">
                <input
                  type="radio"
                  name="payment"
                  value="UPI / GooglePay / PhonePe"
                  checked={checkoutForm.payment_method === 'UPI / GooglePay / PhonePe'}
                  onChange={() => setCheckoutForm({ ...checkoutForm, payment_method: 'UPI / GooglePay / PhonePe' })}
                />
                <span>📱 UPI / GooglePay / PhonePe</span>
              </label>

              <label className="payment-radio-card">
                <input
                  type="radio"
                  name="payment"
                  value="Credit / Debit Card"
                  checked={checkoutForm.payment_method === 'Credit / Debit Card'}
                  onChange={() => setCheckoutForm({ ...checkoutForm, payment_method: 'Credit / Debit Card' })}
                />
                <span>💳 Credit / Debit Card</span>
              </label>

              <label className="payment-radio-card">
                <input
                  type="radio"
                  name="payment"
                  value="Net Banking"
                  checked={checkoutForm.payment_method === 'Net Banking'}
                  onChange={() => setCheckoutForm({ ...checkoutForm, payment_method: 'Net Banking' })}
                />
                <span>🏦 Net Banking</span>
              </label>
            </div>

            <div className="checkout-summary-mini">
              <div>Total Payable Amount: <strong>₹{grandTotal.toLocaleString('en-IN')}</strong></div>
            </div>

            <div className="checkout-form-buttons">
              <button
                type="button"
                className="btn-outline-gold"
                disabled={isSubmittingOrder}
                onClick={() => setIsCheckoutStep(false)}
              >
                ← Back to Cart
              </button>
              <button
                type="submit"
                className="btn-gold"
                disabled={isSubmittingOrder}
              >
                {isSubmittingOrder ? 'Placing Order...' : `PLACE ORDER ₹${grandTotal.toLocaleString('en-IN')}`}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="drawer-body">
              {cart.length === 0 ? (
                <div className="empty-cart-view">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--gold-dark)" strokeWidth="1">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <h4>Your Cart is Empty</h4>
                  <p>Explore our exquisite gold and diamond little_rr collections.</p>
                  <button className="btn-gold" onClick={onClose}>BROWSE little_rr</button>
                </div>
              ) : (
                <div className="cart-items-list">
                  {cart.map((item) => (
                    <div key={item.id} className="cart-item-card">
                      <img src={item.image} alt={item.name} className="cart-item-img" />
                      <div className="cart-item-info">
                        <span className="cart-item-purity">{item.purity}</span>
                        <h4 className="cart-item-name">{item.name}</h4>
                        <div className="cart-item-weight">Weight: {item.weight} gms</div>
                        <div className="cart-item-price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</div>

                        <div className="cart-item-qty-row">
                          <div className="qty-picker">
                            <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>+</button>
                          </div>
                          <button className="remove-item-btn" onClick={() => onRemoveItem(item.id)}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="drawer-footer">
                <div className="cart-grand-total" style={{ marginBottom: '1.25rem' }}>
                  <span>Total Amount:</span>
                  <span className="total-price-gold">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>

                <button
                  className="btn-gold full-width"
                  onClick={() => {
                    onClose();
                    window.location.href = '/checkout';
                  }}
                >
                  PROCEED TO CHECKOUT
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CartDrawer;
