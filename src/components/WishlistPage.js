import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import './WishlistPage.css';
import { addToCartInSupabase } from '../services/cartService';
import {
  fetchWishlistFromSupabase,
  removeFromWishlistInSupabase,
  clearWishlistInSupabase
} from '../services/wishlistService';
import { removeFromWishlist, clearWishlist, setWishlist } from '../redux/slices/wishlistSlice';
import { getProductPriceInfo } from '../admin/product/ProductPriceCalculator';

const WISHLIST_KEY = 'wishlist';

const WishlistPage = ({ liveRates = [] }) => {
  const dispatch = useDispatch();
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toastMsg, setToastMsg] = useState('');
  const [movingId, setMovingId] = useState(null);

  const loadWishlist = useCallback(async () => {
    try {
      const res = await fetchWishlistFromSupabase();
      if (res && res.wishlist) {
        setWishlistItems(res.wishlist);
        dispatch(setWishlist(res.wishlist));
      }
    } catch {
      const saved = localStorage.getItem(WISHLIST_KEY);
      if (saved) {
        setWishlistItems(JSON.parse(saved));
      }
    }
  }, [dispatch]);

  useEffect(() => {
    loadWishlist();

    const handleSync = () => loadWishlist();
    window.addEventListener('wishlistUpdated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('wishlistUpdated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadWishlist]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg('');
    }, 2800);
  };

  const handleRemove = async (item) => {
    const id = String(item.dbId || item.id || item.product_id || item.name);
    try {
      setWishlistItems(prev =>
        prev.filter(w => String(w.dbId || w.id || w.product_id || w.name) !== id)
      );
      dispatch(removeFromWishlist(id));
      await removeFromWishlistInSupabase(id);
      showToast(`Removed "${item.name}" from your Wishlist.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveToCart = async (item) => {
    const id = String(item.dbId || item.id || item.product_id || item.name);
    setMovingId(id);

    try {
      const itemPrice = Number(item.sellingPrice || item.price) || 0;
      const cartPayload = {
        product_id: id,
        product_name: item.name,
        product_image: item.image || (item.images && item.images[0]) || '',
        price: itemPrice,
        quantity: 1,
        size: item.size || null,
        color: item.color || null,
        weight: parseFloat(item.weight || item.netWeight) || 0,
        purity: item.purity || '22K Gold'
      };

      // 1. Add to Cart in Supabase & LocalStorage
      await addToCartInSupabase(cartPayload);
      window.dispatchEvent(new Event('cartUpdated'));

      // 2. Remove from Wishlist
      setWishlistItems(prev =>
        prev.filter(w => String(w.dbId || w.id || w.product_id || w.name) !== id)
      );
      dispatch(removeFromWishlist(id));
      await removeFromWishlistInSupabase(id);

      showToast(`"${item.name}" moved to your Shopping Cart!`);
    } catch (err) {
      console.error('Move to cart error:', err);
      showToast('Could not move item to cart. Please try again.');
    } finally {
      setMovingId(null);
    }
  };

  return (
    <div className="wl-page-wrapper">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="wl-toast-banner">
          <div className="wl-toast-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Clean Breadcrumb Navigation */}
      <div className="wl-container" style={{ paddingTop: '20px', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.95rem', color: 'var(--primary-green, #003B2F)', fontWeight: '500', letterSpacing: '0.5px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-green, #003B2F)', textDecoration: 'none', cursor: 'pointer' }} title="Home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </a>
          <span style={{ margin: '0 10px', color: '#888' }}>&gt;</span>
          <span style={{ textTransform: 'uppercase', fontWeight: '700', color: 'var(--primary-green, #003B2F)' }}>
            MY WISHLIST {wishlistItems.length > 0 ? `(${wishlistItems.length})` : ''}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="wl-container wl-main-content">
        {wishlistItems.length === 0 ? (
          /* Empty State */
          <div className="wl-empty-card">
            <div className="wl-empty-art-wrap">
              <div className="wl-empty-art-circle">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="wl-empty-sparkle sparkle-1">✦</div>
              <div className="wl-empty-sparkle sparkle-2">✦</div>
            </div>

            <h2 className="wl-empty-title">Your Wishlist is Empty</h2>
            <p className="wl-empty-text">
              Discover our exquisite collections of 100% BIS 916 hallmarked jewellery. Tap the heart icon on any piece to save it for easy access anytime!
            </p>

            <a href="/" className="wl-btn-explore-luxury">
              <span>Explore little_rr Collections</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="wl-grid">
            {wishlistItems.map((item) => {
              const priceInfo = getProductPriceInfo(item, liveRates);
              const displayPrice = priceInfo.sellingPrice > 0 ? priceInfo.sellingPrice : (Number(item.price) || 0);
              const cardKey = String(item.dbId || item.id || item.product_id || item.name);
              const productUrl = `/product/${encodeURIComponent((item.name || '').toLowerCase())}`;
              const categoryLabel = (item.category || item.categoryName || 'Fine Jewellery').toUpperCase();

              return (
                <div key={cardKey} className="wl-product-card">
                  {/* Image Container */}
                  <div className="wl-card-media">
                    <img
                      src={item.image || '/whatappicon.png'}
                      alt={item.name}
                      loading="lazy"
                      onClick={() => { window.location.href = productUrl; }}
                      className="wl-product-img"
                    />

                    {/* Hallmark / Purity Badge */}
                    <div className="wl-media-badge">
                      <span className="wl-badge-dot" />
                      <span>{item.purity || 'BIS 916'}</span>
                    </div>

                    {/* Remove Action Button */}
                    <button
                      type="button"
                      className="wl-card-remove-action"
                      onClick={() => handleRemove(item)}
                      title="Remove from Wishlist"
                      aria-label="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="wl-card-content">
                    {/* Category Tag */}
                    <span className="wl-category-tag">{categoryLabel}</span>

                    {/* Title */}
                    <h3
                      className="wl-card-name"
                      onClick={() => { window.location.href = productUrl; }}
                      title={item.name}
                    >
                      {item.name}
                    </h3>

                    {/* Price Row */}
                    <div className="wl-price-container">
                      {displayPrice > 0 ? (
                        <>
                          <span className="wl-price-main">
                            ₹{displayPrice.toLocaleString('en-IN')}
                          </span>
                          {priceInfo.mrp > displayPrice && (
                            <span className="wl-price-mrp">
                              ₹{priceInfo.mrp.toLocaleString('en-IN')}
                            </span>
                          )}
                          {priceInfo.discount > 0 && (
                            <span className="wl-discount-pill">
                              {priceInfo.discount}% OFF
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="wl-price-request">Price on Request</span>
                      )}
                    </div>

                    {/* Specs / Meta Badges */}
                    <div className="wl-specs-row">
                      {item.weight && parseFloat(item.weight) > 0 ? (
                        <div className="wl-spec-badge" title="Net Weight">
                          <span className="wl-spec-icon">⚖️</span>
                          <span>{item.weight}g</span>
                        </div>
                      ) : null}
                      <div className="wl-spec-badge" title="Certified Purity">
                        <span className="wl-spec-icon">✨</span>
                        <span>{item.purity || '22K Gold'}</span>
                      </div>
                    </div>

                    {/* Primary Action: Move to Cart */}
                    <button
                      type="button"
                      className="wl-btn-add-cart"
                      onClick={() => handleMoveToCart(item)}
                      disabled={movingId === cardKey}
                    >
                      {movingId === cardKey ? (
                        <span className="wl-loading-text">Moving to Cart...</span>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                          </svg>
                          <span>Move to Cart</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
