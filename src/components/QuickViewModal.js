import React, { useState, useEffect, useRef } from 'react';
import './QuickViewModal.css';
import { addToCartInSupabase } from '../services/cartService';
import { parseSizeVariants } from '../utils/sizeStockHelper';
import { supabase } from '../supabaseClient';

const QuickViewModal = ({ product, onClose, onAddToCart, liveRates = [] }) => {
  const [activeImage, setActiveImage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const sizeVariants = parseSizeVariants(product);
  const [selectedSize, setSelectedSize] = useState(() => {
    const firstInStock = sizeVariants.find((v) => v.stock > 0);
    return firstInStock ? firstInStock.size : (sizeVariants.length > 0 ? sizeVariants[0].size : '');
  });

  useEffect(() => {
    if (sizeVariants.length > 0) {
      const firstInStock = sizeVariants.find((v) => v.stock > 0);
      setSelectedSize(firstInStock ? firstInStock.size : sizeVariants[0].size);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const currentVariant = sizeVariants.find(
    (v) => v.size.toLowerCase() === (selectedSize || '').toLowerCase()
  );
  const currentSizeStock = currentVariant !== undefined
    ? currentVariant.stock
    : (product?.stock !== undefined ? parseInt(product.stock, 10) : 10);
  const isSelectedSizeOutOfStock = sizeVariants.length > 0
    ? (currentSizeStock <= 0)
    : ((product?.stock !== undefined ? parseInt(product.stock, 10) : 10) <= 0);

  // References for drag-to-scroll on thumbnails strip
  const stripRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Touch swipe on main image
  const touchStartXRef = useRef(0);

  const images = product?.images && product.images.length > 0
    ? product.images
    : (product?.image ? [product.image] : []);

  useEffect(() => {
    if (product) setActiveImage(product.image || (product.images && product.images[0]) || '');
  }, [product]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (stripRef.current) {
      const activeThumb = stripRef.current.querySelector('.qv-thumbnail-item.active');
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeImage]);

  if (!product) return null;

  const currentIdx = images.indexOf(activeImage);

  const handlePrevImage = (e) => {
    e?.stopPropagation();
    if (images.length <= 1) return;
    const prevIdx = (currentIdx - 1 + images.length) % images.length;
    setActiveImage(images[prevIdx]);
  };

  const handleNextImage = (e) => {
    e?.stopPropagation();
    if (images.length <= 1) return;
    const nextIdx = (currentIdx + 1) % images.length;
    setActiveImage(images[nextIdx]);
  };

  // Touch swipe handlers on main image
  const handleTouchStartMain = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEndMain = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
  };

  // Drag-to-scroll handlers for thumbnails strip
  const handleMouseDownStrip = (e) => {
    if (!stripRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - stripRef.current.offsetLeft;
    scrollLeftRef.current = stripRef.current.scrollLeft;
  };

  const handleMouseMoveStrip = (e) => {
    if (!isDraggingRef.current || !stripRef.current) return;
    e.preventDefault();
    const x = e.pageX - stripRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    stripRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpStrip = () => {
    isDraggingRef.current = false;
  };

  const handleScrollStrip = (direction) => {
    if (!stripRef.current) return;
    const amount = 140;
    stripRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  const handleThumbnailClick = (img) => {
    if (hasMovedRef.current) return; // Prevent selection if user was dragging/swiping
    setActiveImage(img);
  };

  const handleShare = async () => {
    const productUrl = `${window.location.origin}/product/${encodeURIComponent(product.name.toLowerCase())}`;
    const shareText = `Check out ${product.name}${product.productCode ? ` (#${product.productCode})` : ''} at Sri vinayaga Moulding!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: productUrl,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const input = document.createElement('input');
      input.value = productUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sellingPrice = product.price && parseFloat(product.price) > 0 ? parseFloat(product.price) : 0;
  const mrpPrice = product.mrp && parseFloat(product.mrp) > sellingPrice ? parseFloat(product.mrp) : 0;
  const discountPct = product.discountPercentage || (mrpPrice > sellingPrice ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100) : 0);

  const handleAddToCart = async () => {
    if (isSelectedSizeOutOfStock) {
      alert(`The selected size "${selectedSize}" is currently out of stock.`);
      return;
    }

    const prodId = String(product.id || product.dbId || product.productCode || product.name || 'prod');
    const itemPrice = sellingPrice;
    const cartPayload = {
      product_id: prodId,
      product_name: product.name,
      product_image: activeImage || product.image || '',
      price: itemPrice,
      quantity: 1,
      size: selectedSize || product.size || null,
      color: product.color || null
    };

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      localStorage.setItem('pending_cart_action', JSON.stringify({
        action: 'add_to_cart',
        productPayload: cartPayload,
        returnUrl: window.location.pathname + window.location.search
      }));
      onClose();
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    setIsAdding(true);
    try {
      await addToCartInSupabase(cartPayload);

      try {
        const localCart = JSON.parse(localStorage.getItem('luxury_jewel_cart') || '[]');
        const existingIdx = localCart.findIndex(item => String(item.id) === prodId && item.size === (selectedSize || product.size));
        if (existingIdx > -1) {
          localCart[existingIdx].quantity = (Number(localCart[existingIdx].quantity) || 1) + 1;
        } else {
          localCart.push({
            id: `${prodId}-${selectedSize || 'std'}`,
            productId: prodId,
            name: product.name,
            image: activeImage || product.image || '',
            price: itemPrice,
            mrp: mrpPrice || itemPrice,
            quantity: 1,
            size: selectedSize || product.size || '',
            color: product.color || ''
          });
        }
        localStorage.setItem('luxury_jewel_cart', JSON.stringify(localCart));
      } catch (e) { }

      window.dispatchEvent(new Event('cartUpdated'));
      setToastMsg('✓ Added to Cart!');
      setTimeout(() => setToastMsg(''), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (isSelectedSizeOutOfStock) {
      alert(`The selected size "${selectedSize}" is currently out of stock.`);
      return;
    }

    const prodId = String(product.id || product.dbId || product.productCode || product.name || 'prod');
    const itemPrice = sellingPrice;
    const cartPayload = {
      product_id: prodId,
      product_name: product.name,
      product_image: activeImage || product.image || '',
      price: itemPrice,
      quantity: 1,
      size: selectedSize || product.size || null,
      color: product.color || null
    };

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      localStorage.setItem('pending_cart_action', JSON.stringify({
        action: 'buy_now',
        productPayload: cartPayload,
        returnUrl: '/checkout'
      }));
      onClose();
      window.location.href = `/login?redirect=${encodeURIComponent('/checkout')}`;
      return;
    }

    await handleAddToCart();
    onClose();
    window.location.href = '/checkout';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card quickview-modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <button className="quickview-close-btn" onClick={onClose}>×</button>

        <div className="quickview-grid">
          <div className="quickview-img-box">
            <div
              className="quickview-main-img-box"
              onTouchStart={handleTouchStartMain}
              onTouchEnd={handleTouchEndMain}
            >
              <img src={activeImage} alt={product.name} />

              {images.length > 1 && (
                <>
                  <span className="qv-img-counter">
                    {currentIdx >= 0 ? currentIdx + 1 : 1} / {images.length}
                  </span>

                  <button
                    type="button"
                    className="qv-main-nav-btn prev"
                    onClick={handlePrevImage}
                    title="Previous Image"
                    aria-label="Previous Image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="qv-main-nav-btn next"
                    onClick={handleNextImage}
                    title="Next Image"
                    aria-label="Next Image"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="qv-thumbnails-wrapper">
                <button
                  type="button"
                  className="qv-strip-scroll-btn prev"
                  onClick={() => handleScrollStrip('left')}
                  title="Scroll Left"
                  aria-label="Scroll thumbnails left"
                >
                  ‹
                </button>

                <div
                  ref={stripRef}
                  className="qv-thumbnails-strip"
                  onMouseDown={handleMouseDownStrip}
                  onMouseMove={handleMouseMoveStrip}
                  onMouseUp={handleMouseUpStrip}
                  onMouseLeave={handleMouseUpStrip}
                >
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`qv-thumbnail-item ${activeImage === img ? 'active' : ''}`}
                      onClick={() => handleThumbnailClick(img)}
                      title={`View image ${idx + 1}`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${idx + 1}`}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="qv-strip-scroll-btn next"
                  onClick={() => handleScrollStrip('right')}
                  title="Scroll Right"
                  aria-label="Scroll thumbnails right"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          <div className="quickview-details">
            <div className="qv-category-badge">
              {product.categoryName || product.category || product.subcategoryName || 'Apparel'}
            </div>

            <div className="quickview-header">
              <h2 className="quickview-title">{product.name}</h2>
              <button
                className={`share-btn ${copied ? 'copied' : ''}`}
                onClick={handleShare}
                title={copied ? "Link Copied!" : "Share Product"}
                style={{ position: 'relative' }}
              >
                {copied ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                )}
                {copied && (
                  <span className="share-copied-tooltip">Copied!</span>
                )}
              </button>
            </div>

            {/* Price Row */}
            <div className="qv-price-container">
              {sellingPrice > 0 ? (
                <div className="qv-price-main-row">
                  <span className="qv-selling-price">₹{Math.round(sellingPrice).toLocaleString('en-IN')}</span>
                  {mrpPrice > sellingPrice && (
                    <span className="qv-mrp-price">₹{Math.round(mrpPrice).toLocaleString('en-IN')}</span>
                  )}
                  {discountPct > 0 && (
                    <span className="qv-discount-pill">{discountPct}% OFF</span>
                  )}
                </div>
              ) : (
                <div className="qv-price-main-row">
                  <span className="qv-selling-price">Best Price Available</span>
                </div>
              )}
              <span className="qv-tax-note">✓ Inclusive of all taxes</span>
            </div>

            {product.description && product.description.trim() ? (
              <p className="quickview-desc">{product.description}</p>
            ) : null}

            {/* Size Selector with Stock Strikethrough */}
            {sizeVariants.length > 0 && (
              <div className="qv-size-selector">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="qv-size-label">
                    Select Size: <strong>{selectedSize}</strong>
                  </span>
                  {isSelectedSizeOutOfStock ? (
                    <span className="qv-stock-badge-pill out">❌ Out of Stock</span>
                  ) : (
                    <span className="qv-stock-badge-pill in">✓ In Stock</span>
                  )}
                </div>
                <div className="qv-size-pills">
                  {sizeVariants.map((v) => {
                    const isOut = parseInt(v.stock, 10) <= 0;
                    const isSelected = (selectedSize || '').toLowerCase() === v.size.toLowerCase();
                    return (
                      <button
                        key={v.size}
                        type="button"
                        className={`qv-size-pill ${isSelected ? 'active' : ''} ${isOut ? 'out-of-stock' : ''}`}
                        onClick={() => setSelectedSize(v.size)}
                        title={isOut ? `${v.size} - Out of Stock` : `${v.size} - In Stock`}
                      >
                        <span className="qv-size-text">{v.size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Specifications Grid - ONLY APPAREL / PRODUCT SPECS */}
            <div className="qv-specs-grid">
              <div className="qv-spec-tile">
                <span className="qv-spec-label">PRODUCT CODE</span>
                <strong className="qv-spec-val">{product.productCode || product.id || product.name}</strong>
              </div>
              <div className="qv-spec-tile">
                <span className="qv-spec-label">AVAILABILITY</span>
                <strong className="qv-spec-val" style={{ color: (product.stock === 0) ? '#dc2626' : '#2e7d32' }}>
                  {(product.stock === 0) ? 'Out of Stock' : 'In Stock'}
                </strong>
              </div>
              {product.categoryName && product.categoryName !== 'Unknown' && (
                <div className="qv-spec-tile">
                  <span className="qv-spec-label">CATEGORY</span>
                  <strong className="qv-spec-val">{product.categoryName}</strong>
                </div>
              )}
              {product.subcategoryName && product.subcategoryName !== 'Unknown' && (
                <div className="qv-spec-tile">
                  <span className="qv-spec-label">COLLECTION</span>
                  <strong className="qv-spec-val">{product.subcategoryName}</strong>
                </div>
              )}
              {product.material && (
                <div className="qv-spec-tile">
                  <span className="qv-spec-label">MATERIAL / FABRIC</span>
                  <strong className="qv-spec-val">{product.material}</strong>
                </div>
              )}
              {product.color && (
                <div className="qv-spec-tile">
                  <span className="qv-spec-label">COLOR</span>
                  <strong className="qv-spec-val">{product.color}</strong>
                </div>
              )}

              {product.sleeves && (
                <div className="qv-spec-tile">
                  <span className="qv-spec-label">SLEEVES</span>
                  <strong className="qv-spec-val">{product.sleeves}</strong>
                </div>
              )}
              {product.neck && (
                <div className="qv-spec-tile">
                  <span className="qv-spec-label">NECK STYLE</span>
                  <strong className="qv-spec-val">{product.neck}</strong>
                </div>
              )}
              {product.brand && (
                <div className="qv-spec-tile">
                  <span className="qv-spec-label">BRAND</span>
                  <strong className="qv-spec-val">{product.brand}</strong>
                </div>
              )}
              {product.washCare && (
                <div className="qv-spec-tile">
                  <span className="qv-spec-label">WASH CARE</span>
                  <strong className="qv-spec-val">{product.washCare}</strong>
                </div>
              )}
            </div>



            {/* Action Buttons */}
            {toastMsg && <div className="qv-toast-pill">{toastMsg}</div>}

            <div className="qv-actions-row">
              <button
                type="button"
                className={`qv-btn-cart ${isSelectedSizeOutOfStock ? 'disabled-btn' : ''}`}
                onClick={handleAddToCart}
                disabled={isAdding || isSelectedSizeOutOfStock}
              >
                {isSelectedSizeOutOfStock ? '🚫 Out of Stock' : (isAdding ? 'Adding...' : '🛒 Add to Cart')}
              </button>
              <button
                type="button"
                className={`qv-btn-buy ${isSelectedSizeOutOfStock ? 'disabled-btn' : ''}`}
                onClick={handleBuyNow}
                disabled={isSelectedSizeOutOfStock}
              >
                {isSelectedSizeOutOfStock ? 'Unavailable' : '⚡ Buy Now'}
              </button>
            </div>

            <a
              href={`/product/${encodeURIComponent(product.name.toLowerCase())}`}
              className="qv-btn-details-link"
            >
              View Full Product Details →
            </a>

            <div className="whatsapp-help">
              <span>Have Questions?</span>
              <a
                href={`https://wa.me/919843172314?text=Hi%2C%20I%20am%20inquiring%20about%20${encodeURIComponent(product.name)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#25D366" stroke="none"><path d="M12.031 0C5.388 0 0 5.388 0 12.032c0 2.656.828 5.118 2.304 7.2L.64 24l4.928-1.616c2.032 1.344 4.432 2.128 6.992 2.128 6.643 0 12.031-5.388 12.031-12.032C24.591 5.388 19.203 0 12.031 0zm0 22.48c-2.224 0-4.32-.576-6.144-1.584l-.448-.256-3.568 1.168 1.2-3.488-.288-.464A10.457 10.457 0 0 1 1.55 12.032c0-5.776 4.704-10.48 10.48-10.48s10.48 4.704 10.48 10.48-4.704 10.48-10.48 10.48zm5.632-7.664c-.304-.16-1.824-.912-2.112-1.008-.288-.112-.512-.16-.72.16-.208.32-.8 1.008-1.008 1.216-.192.208-.4.224-.72.064-.304-.16-1.312-.48-2.48-1.52-.912-.816-1.536-1.824-1.712-2.144-.192-.32-.016-.48.128-.64.128-.144.304-.368.464-.544.144-.176.208-.304.304-.512.112-.192.048-.384-.016-.544-.08-.16-.72-1.744-.992-2.384-.256-.624-.528-.544-.72-.56-.176-.016-.384-.016-.592-.016s-.56.08-.848.4c-.288.32-1.12 1.088-1.12 2.656 0 1.568 1.152 3.088 1.312 3.312.16.208 2.272 3.456 5.504 4.848.768.336 1.36.528 1.824.688.768.24 1.472.208 2.016.128.624-.096 1.824-.752 2.08-1.472.256-.72.256-1.344.176-1.472-.064-.144-.272-.224-.576-.384z" /></svg>
                + 91 9843172314
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
