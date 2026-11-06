import React, { useState, useEffect } from 'react';
import './CheckoutPage.css';
import { supabase } from '../supabaseClient';
import {
  fetchCartItemsFromSupabase,
  updateCartItemQuantityInSupabase,
  removeCartItemFromSupabase
} from '../services/cartService';
import { createOrderInSupabase } from '../services/orderService';
import { getPaymentMethodsFromSupabase, DEFAULT_PAYMENT_METHODS } from '../services/paymentMethodService';

const SAVED_CHECKOUT_KEY = 'sv_saved_checkout_details';

const CheckoutPage = ({ siteSettings }) => {
  const [cart, setCart] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [copiedOrder, setCopiedOrder] = useState(false);

  // Form State
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    street_address: '',
    landmark: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
    address_type: 'Home',
    payment_method: 'Cash on Delivery',
    order_notes: '',
    saveInfo: true
  });

  // Load Cart Items & Preload User Details
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      // 1. Fetch Cart from Supabase & fallback to localStorage
      try {
        const res = await fetchCartItemsFromSupabase();
        if (isMounted) {
          if (res?.success && Array.isArray(res.cart) && res.cart.length > 0) {
            setCart(res.cart);
          } else {
            const localSaved = localStorage.getItem('luxury_jewel_cart');
            if (localSaved) {
              try {
                const parsed = JSON.parse(localSaved);
                if (Array.isArray(parsed)) setCart(parsed);
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.error('Error fetching cart for checkout:', err);
        const localSaved = localStorage.getItem('luxury_jewel_cart');
        if (localSaved && isMounted) {
          try {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed)) setCart(parsed);
          } catch (e) {}
        }
      }

      // 2. Pre-fill from Saved Local Storage Info
      try {
        const savedInfo = localStorage.getItem(SAVED_CHECKOUT_KEY);
        if (savedInfo && isMounted) {
          const parsed = JSON.parse(savedInfo);
          setForm(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {}

      // 3. Pre-fill from Supabase Auth Session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const u = session.user;
          setForm(prev => ({
            ...prev,
            customer_name: prev.customer_name || u.user_metadata?.full_name || '',
            customer_email: prev.customer_email || u.email || '',
            customer_phone: prev.customer_phone || u.user_metadata?.phone || ''
          }));
        }
      } catch (e) {}

      // 4. Fetch Dynamic Payment Methods from Supabase
      try {
        const pmRes = await getPaymentMethodsFromSupabase();
        if (isMounted && pmRes?.data && pmRes.data.length > 0) {
          setPaymentMethods(pmRes.data);
          setForm(prev => {
            const hasMatch = pmRes.data.some(p => p.name === prev.payment_method);
            return hasMatch ? prev : { ...prev, payment_method: pmRes.data[0].name };
          });
        }
      } catch (e) {}

      setTimeout(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      }, 550);
    };

    loadData();

    // Listen for cart updates
    const handleCartSync = () => {
      fetchCartItemsFromSupabase().then(res => {
        if (res?.success && res.cart && isMounted) {
          setCart(res.cart);
        }
      });
    };
    window.addEventListener('cartUpdated', handleCartSync);

    // Listen for realtime payment method updates
    const pmChannel = supabase
      .channel('checkout_pm_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, async () => {
        const pmRes = await getPaymentMethodsFromSupabase();
        if (isMounted && pmRes?.data) {
          setPaymentMethods(pmRes.data);
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener('cartUpdated', handleCartSync);
      supabase.removeChannel(pmChannel);
    };
  }, []);

  // Update item quantity
  const handleUpdateQty = async (itemId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCart(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQty } : item));
    try {
      await updateCartItemQuantityInSupabase(itemId, newQty);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (e) {
      console.error(e);
    }
  };

  // Remove item
  const handleRemoveItem = async (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    try {
      await removeCartItemFromSupabase(itemId);
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (e) {
      console.error(e);
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const deliveryCharge = 0; // Free delivery
  const totalAmount = subtotal + deliveryCharge;
  const totalItemsCount = cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

  // Form Change Handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle Submit / Place Order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!cart || cart.length === 0) {
      alert('Your cart is empty. Please add items to proceed.');
      return;
    }

    if (!form.customer_name.trim()) {
      alert('Please enter your full name.');
      return;
    }

    const cleanPhone = form.customer_phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!form.street_address.trim()) {
      alert('Please enter your street address / door number.');
      return;
    }

    if (!form.city.trim()) {
      alert('Please enter your city / town.');
      return;
    }

    if (!form.pincode.trim() || form.pincode.trim().length < 6) {
      alert('Please enter a valid 6-digit postal pincode.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save details to localStorage if selected
      if (form.saveInfo) {
        const toSave = {
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email,
          street_address: form.street_address,
          landmark: form.landmark,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          address_type: form.address_type
        };
        localStorage.setItem(SAVED_CHECKOUT_KEY, JSON.stringify(toSave));
      }

      const orderPayload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_email: form.customer_email.trim(),
        street_address: form.landmark ? `${form.street_address.trim()} (Landmark: ${form.landmark.trim()})` : form.street_address.trim(),
        city: form.city.trim(),
        state: form.state.trim() || 'Tamil Nadu',
        country: 'India',
        pincode: form.pincode.trim(),
        address_type: form.address_type,
        order_notes: form.order_notes.trim(),
        payment_method: form.payment_method,
        subtotal: subtotal,
        delivery_charge: deliveryCharge,
        total_amount: totalAmount,
        items: cart.map(item => ({
          id: item.id || item.product_id,
          product_id: item.product_id || item.id,
          name: item.name,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          size: item.size || null,
          color: item.color || null,
          image: item.image || '',
          weight: item.weight || null,
          purity: item.purity || null
        }))
      };

      const res = await createOrderInSupabase(orderPayload);
      if (res.success && res.order) {
        setPlacedOrder(res.order);
        setOrderSuccess(true);
        setCart([]);
        window.dispatchEvent(new Event('orderPlaced'));
        window.dispatchEvent(new Event('cartUpdated'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Failed to place order: ' + (res.error || 'Please try again.'));
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Error placing order: ' + (err.message || 'Please check your connection and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyOrderNumber = () => {
    if (!placedOrder?.order_number) return;
    navigator.clipboard.writeText(placedOrder.order_number);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2000);
  };

  // SUCCESS SCREEN
  if (orderSuccess && placedOrder) {
    return (
      <div className="co-page-wrapper">
        <div className="co-success-container">
          <div className="co-success-badge">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>

          <h1 className="co-success-title">Order Placed Successfully!</h1>
          <p className="co-success-subtitle">
            Thank you for shopping with <strong>{siteSettings?.shop_name || 'Sri Vinayaga Moulding'}</strong>! Your order has been placed and is currently being processed.
          </p>

          <div className="co-success-card">
            <div className="co-order-meta-row">
              <div>
                <span className="co-meta-label">ORDER NUMBER</span>
                <div className="co-order-id-group">
                  <span className="co-order-id">{placedOrder.order_number}</span>
                  <button type="button" className="co-btn-copy" onClick={copyOrderNumber}>
                    {copiedOrder ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
              </div>
              <div>
                <span className="co-meta-label">PAYMENT METHOD</span>
                <strong className="co-meta-val">{placedOrder.payment_method}</strong>
              </div>
              <div>
                <span className="co-meta-label">TOTAL PAID / DUE</span>
                <strong className="co-meta-val co-price-highlight">₹{Number(placedOrder.total_amount).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="co-delivery-preview">
              <div className="co-delivery-icon">🚚</div>
              <div>
                <h4>Shipping to: {placedOrder.customer_name}</h4>
                <p>{placedOrder.street_address}, {placedOrder.city}, {placedOrder.state} - {placedOrder.pincode}</p>
                <p className="co-delivery-phone">Phone: {placedOrder.customer_phone}</p>
              </div>
            </div>

            {/* Ordered Items Preview */}
            {Array.isArray(placedOrder.items) && placedOrder.items.length > 0 && (
              <div className="co-confirmed-items">
                <h4>Ordered Items ({placedOrder.items.length})</h4>
                <div className="co-confirmed-items-list">
                  {placedOrder.items.map((it, idx) => (
                    <div key={idx} className="co-confirmed-item">
                      {it.image && <img src={it.image} alt={it.name} />}
                      <div className="co-confirmed-details">
                        <span className="co-confirmed-name">{it.name}</span>
                        <span className="co-confirmed-meta">
                          {it.size ? `Size: ${it.size} • ` : ''}Qty: {it.quantity}
                        </span>
                      </div>
                      <div className="co-confirmed-price">
                        ₹{(Number(it.price) * Number(it.quantity)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="co-success-actions">
            <a href="/account" className="co-btn-primary">
              📦 View My Orders & Tracking
            </a>
            <a href="/" className="co-btn-secondary">
              🛍️ Continue Shopping
            </a>
          </div>
        </div>
      </div>
    );
  }

  // SHIMMER LOADING SKELETON SCREEN
  if (isLoading) {
    return (
      <div className="co-page-wrapper">
        <div className="co-container">
          {/* Header Bar Shimmer */}
          <div className="co-header-bar">
            <div className="co-shimmer-line line-crumb co-shimmer-wave"></div>
            <div className="co-shimmer-steps">
              <div className="co-shimmer-step-pill co-shimmer-wave"></div>
              <div className="co-shimmer-line line-step-divider co-shimmer-wave"></div>
              <div className="co-shimmer-step-pill co-shimmer-wave"></div>
              <div className="co-shimmer-line line-step-divider co-shimmer-wave"></div>
              <div className="co-shimmer-step-pill co-shimmer-wave"></div>
            </div>
          </div>

          <div className="co-layout">
            {/* Left Column Shimmer */}
            <div className="co-left-col">
              {/* 1. Contact Info Card Shimmer */}
              <div className="co-card co-shimmer-card">
                <div className="co-card-header">
                  <div className="co-shimmer-badge co-shimmer-wave"></div>
                  <div className="co-shimmer-line line-card-title co-shimmer-wave"></div>
                </div>
                <div className="co-card-body">
                  <div className="co-form-row">
                    <div className="co-shimmer-field">
                      <div className="co-shimmer-line line-label co-shimmer-wave"></div>
                      <div className="co-shimmer-box box-input co-shimmer-wave"></div>
                    </div>
                    <div className="co-shimmer-field">
                      <div className="co-shimmer-line line-label co-shimmer-wave"></div>
                      <div className="co-shimmer-box box-input co-shimmer-wave"></div>
                    </div>
                  </div>
                  <div className="co-shimmer-field" style={{ marginTop: '0.85rem' }}>
                    <div className="co-shimmer-line line-label co-shimmer-wave"></div>
                    <div className="co-shimmer-box box-input co-shimmer-wave"></div>
                  </div>
                </div>
              </div>

              {/* 2. Delivery Address Card Shimmer */}
              <div className="co-card co-shimmer-card">
                <div className="co-card-header">
                  <div className="co-shimmer-badge co-shimmer-wave"></div>
                  <div className="co-shimmer-line line-card-title co-shimmer-wave"></div>
                </div>
                <div className="co-card-body">
                  <div className="co-shimmer-field">
                    <div className="co-shimmer-line line-label co-shimmer-wave"></div>
                    <div className="co-shimmer-box box-textarea co-shimmer-wave"></div>
                  </div>
                  <div className="co-form-row" style={{ marginTop: '0.85rem' }}>
                    <div className="co-shimmer-field">
                      <div className="co-shimmer-line line-label co-shimmer-wave"></div>
                      <div className="co-shimmer-box box-input co-shimmer-wave"></div>
                    </div>
                    <div className="co-shimmer-field">
                      <div className="co-shimmer-line line-label co-shimmer-wave"></div>
                      <div className="co-shimmer-box box-input co-shimmer-wave"></div>
                    </div>
                  </div>
                  <div className="co-form-row" style={{ marginTop: '0.85rem' }}>
                    <div className="co-shimmer-field">
                      <div className="co-shimmer-line line-label co-shimmer-wave"></div>
                      <div className="co-shimmer-box box-input co-shimmer-wave"></div>
                    </div>
                    <div className="co-shimmer-field">
                      <div className="co-shimmer-line line-label co-shimmer-wave"></div>
                      <div className="co-shimmer-box box-input co-shimmer-wave"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Payment Method Card Shimmer */}
              <div className="co-card co-shimmer-card">
                <div className="co-card-header">
                  <div className="co-shimmer-badge co-shimmer-wave"></div>
                  <div className="co-shimmer-line line-card-title co-shimmer-wave"></div>
                </div>
                <div className="co-card-body">
                  <div className="co-shimmer-payment-box co-shimmer-wave"></div>
                  <div className="co-shimmer-payment-box co-shimmer-wave" style={{ marginTop: '0.85rem' }}></div>
                  <div className="co-shimmer-payment-box co-shimmer-wave" style={{ marginTop: '0.85rem' }}></div>
                </div>
              </div>
            </div>

            {/* Right Column Shimmer */}
            <div className="co-right-col">
              <div className="co-summary-card co-shimmer-card">
                <div className="co-summary-header">
                  <div className="co-shimmer-line line-summary-title co-shimmer-wave"></div>
                  <div className="co-shimmer-badge-pill co-shimmer-wave"></div>
                </div>

                <div className="co-summary-items">
                  {[1, 2].map((i) => (
                    <div key={i} className="co-item-row co-shimmer-item-row">
                      <div className="co-shimmer-item-thumb co-shimmer-wave"></div>
                      <div className="co-item-details" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="co-shimmer-line line-item-name co-shimmer-wave"></div>
                        <div className="co-shimmer-line line-item-meta co-shimmer-wave"></div>
                        <div className="co-shimmer-line line-item-stepper co-shimmer-wave"></div>
                      </div>
                      <div className="co-shimmer-line line-item-price co-shimmer-wave"></div>
                    </div>
                  ))}
                </div>

                <div className="co-price-breakdown">
                  <div className="co-price-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="co-shimmer-line line-price-text co-shimmer-wave"></div>
                    <div className="co-shimmer-line line-price-val co-shimmer-wave"></div>
                  </div>
                  <div className="co-price-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem' }}>
                    <div className="co-shimmer-line line-price-text co-shimmer-wave"></div>
                    <div className="co-shimmer-line line-price-val co-shimmer-wave"></div>
                  </div>
                  <div className="co-price-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1.5px dashed #e2e8f0' }}>
                    <div className="co-shimmer-line line-grand-text co-shimmer-wave"></div>
                    <div className="co-shimmer-line line-grand-val co-shimmer-wave"></div>
                  </div>
                </div>

                <div className="co-shimmer-submit-btn co-shimmer-wave"></div>

                <div className="co-trust-box" style={{ marginTop: '1.5rem' }}>
                  <div className="co-shimmer-trust-row co-shimmer-wave"></div>
                  <div className="co-shimmer-trust-row co-shimmer-wave"></div>
                  <div className="co-shimmer-trust-row co-shimmer-wave"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY CART SCREEN
  if (!isLoading && cart.length === 0) {
    return (
      <div className="co-page-wrapper">
        <div className="co-empty-container">
          <div className="co-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2>Your Cart is Empty</h2>
          <p>You do not have any items in your cart to checkout yet.</p>
          <a href="/" className="co-btn-primary" style={{ display: 'inline-block', marginTop: '1.25rem' }}>
            Browse Latest Products
          </a>
        </div>
      </div>
    );
  }

  // MAIN CHECKOUT FORM & SUMMARY
  return (
    <div className="co-page-wrapper">
      <div className="co-container">
        {/* Breadcrumb & Step Progress */}
        <div className="co-header-bar">
          <div className="co-breadcrumbs">
            <a href="/">Home</a>
            <span>/</span>
            <span className="co-bread-current">Checkout</span>
          </div>
          <div className="co-steps-indicator">
            <div className="co-step active">
              <span className="co-step-num">1</span>
              <span className="co-step-label">Shipping Details</span>
            </div>
            <div className="co-step-line"></div>
            <div className="co-step active">
              <span className="co-step-num">2</span>
              <span className="co-step-label">Payment</span>
            </div>
            <div className="co-step-line"></div>
            <div className="co-step">
              <span className="co-step-num">3</span>
              <span className="co-step-label">Confirmation</span>
            </div>
          </div>
        </div>

        <form className="co-layout" onSubmit={handlePlaceOrder}>
          {/* LEFT COLUMN: Shipping & Payment Form */}
          <div className="co-left-col">
            {/* 1. Contact Info */}
            <div className="co-card">
              <div className="co-card-header">
                <span className="co-card-badge">1</span>
                <h3>Contact Information</h3>
              </div>
              <div className="co-card-body">
                <div className="co-form-row">
                  <div className="co-form-group">
                    <label>Full Name <span className="req">*</span></label>
                    <input
                      type="text"
                      name="customer_name"
                      placeholder="e.g. Rahul Sharma"
                      value={form.customer_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="co-form-group">
                    <label>Mobile Number <span className="req">*</span></label>
                    <div className="co-phone-input">
                      <span className="co-phone-prefix">+91</span>
                      <input
                        type="tel"
                        name="customer_phone"
                        placeholder="98765 43210"
                        maxLength="10"
                        value={form.customer_phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="co-form-group">
                  <label>Email Address <span className="co-optional">(for order updates & receipts)</span></label>
                  <input
                    type="email"
                    name="customer_email"
                    placeholder="customer@example.com"
                    value={form.customer_email}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className="co-card">
              <div className="co-card-header">
                <span className="co-card-badge">2</span>
                <h3>Delivery Address</h3>
              </div>
              <div className="co-card-body">
                <div className="co-form-group">
                  <label>Flat / House No., Building, Street Name <span className="req">*</span></label>
                  <textarea
                    rows="2"
                    name="street_address"
                    placeholder="Door No, Street Name, Apartment name..."
                    value={form.street_address}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>

                <div className="co-form-row">
                  <div className="co-form-group">
                    <label>Landmark <span className="co-optional">(Optional)</span></label>
                    <input
                      type="text"
                      name="landmark"
                      placeholder="Near Temple / Petrol bunk"
                      value={form.landmark}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="co-form-group">
                    <label>Pincode <span className="req">*</span></label>
                    <input
                      type="text"
                      name="pincode"
                      placeholder="e.g. 641001"
                      maxLength="6"
                      value={form.pincode}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="co-form-row">
                  <div className="co-form-group">
                    <label>City / Town / District <span className="req">*</span></label>
                    <input
                      type="text"
                      name="city"
                      placeholder="e.g. Coimbatore"
                      value={form.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="co-form-group">
                    <label>State <span className="req">*</span></label>
                    <select
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      className="co-select"
                      required
                    >
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Kerala">Kerala</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Telangana">Telangana</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Other State">Other State</option>
                    </select>
                  </div>
                </div>

                <div className="co-form-group" style={{ marginTop: '1rem' }}>
                  <label>Order Notes / Delivery Instructions <span className="co-optional">(Optional)</span></label>
                  <input
                    type="text"
                    name="order_notes"
                    placeholder="e.g. Please call before arriving or deliver at security"
                    value={form.order_notes}
                    onChange={handleChange}
                  />
                </div>

                <label className="co-save-info-checkbox">
                  <input
                    type="checkbox"
                    name="saveInfo"
                    checked={form.saveInfo}
                    onChange={handleChange}
                  />
                  <span>Save this address for fast 1-click checkout next time</span>
                </label>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="co-card">
              <div className="co-card-header">
                <span className="co-card-badge">3</span>
                <h3>Select Payment Method</h3>
              </div>
              <div className="co-card-body">
                <div className="co-payment-list">
                  {paymentMethods.map((pm) => {
                    const isSelected = form.payment_method === pm.name;
                    const badgeClass = pm.badge && pm.badge.toLowerCase().includes('instant')
                      ? 'co-payment-badge free'
                      : 'co-payment-badge';

                    return (
                      <label
                        key={pm.id || pm.code || pm.name}
                        className={`co-payment-card ${isSelected ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={pm.name}
                          checked={isSelected}
                          onChange={handleChange}
                        />
                        <div className="co-payment-info">
                          <div className="co-payment-title-row">
                            <span className="co-payment-name">
                              {pm.icon ? `${pm.icon} ` : ''}{pm.name}
                            </span>
                            {pm.badge && (
                              <span className={badgeClass}>{pm.badge}</span>
                            )}
                          </div>
                          {pm.description && (
                            <p className="co-payment-desc">{pm.description}</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Action */}
          <div className="co-right-col">
            <div className="co-summary-sticky">
              <div className="co-summary-card">
                <div className="co-summary-header">
                  <h3>Order Summary</h3>
                  <span className="co-items-badge">{totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}</span>
                </div>

                {/* Items List */}
                <div className="co-summary-items">
                  {cart.map((item) => {
                    const price = Number(item.price) || 0;
                    const qty = Number(item.quantity) || 1;
                    return (
                      <div key={item.id} className="co-item-row">
                        <div className="co-item-img-box">
                          <img src={item.image || '/placeholder.png'} alt={item.name} />
                          <span className="co-item-qty-tag">{qty}</span>
                        </div>
                        <div className="co-item-details">
                          <h4 className="co-item-title">{item.name}</h4>
                          {item.size && (
                            <span className="co-item-size">Size: <strong>{item.size}</strong></span>
                          )}
                          <div className="co-item-actions">
                            <div className="co-qty-stepper">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, qty - 1)}
                                title="Decrease quantity"
                              >-</button>
                              <span>{qty}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, qty + 1)}
                                title="Increase quantity"
                              >+</button>
                            </div>
                            <button
                              type="button"
                              className="co-btn-remove"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="co-item-price-col">
                          ₹{(price * qty).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price Breakdown */}
                <div className="co-price-breakdown">
                  <div className="co-price-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="co-price-row">
                    <span>Shipping / Delivery</span>
                    <span className="co-free-shipping">FREE</span>
                  </div>
                  <div className="co-price-row co-grand-total">
                    <span>Total Amount Payable</span>
                    <span className="co-total-value">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="co-tax-note">✓ Inclusive of all taxes</span>
                </div>

                {/* Place Order CTA Button */}
                <button
                  type="submit"
                  className="co-btn-submit-order"
                  disabled={isSubmitting || cart.length === 0}
                >
                  {isSubmitting ? (
                    <span className="co-btn-loading">
                      <span className="co-btn-spinner"></span>
                      Placing Your Order...
                    </span>
                  ) : (
                    <span>🔒 Place Order • ₹{totalAmount.toLocaleString('en-IN')}</span>
                  )}
                </button>

                {/* Trust Badges */}
                <div className="co-trust-box">
                  <div className="co-trust-item">
                    <span className="co-trust-icon">🛡️</span>
                    <div>
                      <strong>100% Genuine Quality</strong>
                      <span>Direct from manufacturer</span>
                    </div>
                  </div>
                  <div className="co-trust-item">
                    <span className="co-trust-icon">🔒</span>
                    <div>
                      <strong>Safe & Secure Checkout</strong>
                      <span>256-Bit SSL Encrypted</span>
                    </div>
                  </div>
                  <div className="co-trust-item">
                    <span className="co-trust-icon">🚚</span>
                    <div>
                      <strong>Free Insured Delivery</strong>
                      <span>Dispatched within 24-48 hrs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;

