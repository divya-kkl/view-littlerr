import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import './ProductDetailsPage.css';
import { getProductsFromSupabase } from '../services/productService';
import { calculateFinalPrice } from '../admin/product/ProductPriceCalculator';
import { setCurrentProduct, setActiveImage as setReduxActiveImage } from '../redux/slices/productsSlice';
import { toggleWishlist } from '../redux/slices/wishlistSlice';
import { toggleWishlistInSupabase, matchesWishlistItem } from '../services/wishlistService';
import CartDrawer from './CartDrawer';
import {
  addToCartInSupabase,
  fetchCartItemsFromSupabase,
  updateCartItemQuantityInSupabase,
  removeCartItemFromSupabase
} from '../services/cartService';
import { parseSizeVariants } from '../utils/sizeStockHelper';
import { supabase } from '../supabaseClient';

const POLICY_PILLS = [
  { id: 'best-price', label: 'Best Price' },
  { id: 'best-quality', label: 'Best Quality' },
  { id: 'secured-shipping', label: 'Secured Shipping' },
  { id: '15-day-return', label: '15 day return' },
  { id: '100-refund', label: '100% Refund' },
  { id: 'lifetime-exchange', label: 'Lifetime Exchange' },
  { id: 'certification', label: 'Certification' },
];

const POLICY_TEXTS = {
  'best-quality':
    'A one-stop-shop for the most supreme ornaments and articles, backed by the quality revolution. Having pioneered the quality revolution by educating customers about various Government-certified quality aspects, Sri vinayaga Moulding is one of the first institutions to offer only BIS 916-hallmarked little_rr in the market. Home to sophisticated machinery that accurately determines the quality and carat value of little_rr, the measurements obtained at Sri vinayaga Moulding are scientific and tamper proof, thereby giving the customer an assurance with regards to the quality of little_rr offered.',
  'best-price':
    'We provide complete transparency in our pricing structure with daily live gold and silver rates, minimal wastage, fair making charges, and zero hidden costs on all our exquisite collections.',
  'secured-shipping':
    'All online orders are 100% insured during transit and packaged securely in tamper-evident security cases delivered safely to your doorstep by trusted courier partners.',
  '15-day-return':
    'Enjoy hassle-free 15-day return policy. If you are not completely satisfied with your purchase, you can return or exchange the product in its original condition with invoice and certificate.',
  '100-refund':
    'Get a 100% money-back guarantee for returns processed within the eligible return period, credited directly back to your original payment method with complete transparency.',
  'lifetime-exchange':
    'Enjoy our Lifetime Exchange and buyback policy across all our plain gold, diamond, and studded little_rr. Exchange anytime at prevailing bullion market rates.',
  'certification':
    'Every piece of gold little_rr is certified with 100% BIS 916 Hallmark, and diamonds are certified by reputed international gemological laboratories like IGI and SGL.',
};

const detectProductType = (item) => {
  if (!item) return '';
  const sub = (item.subcategoryName || '').toLowerCase().trim();
  if (sub && sub !== 'unknown') {
    return sub.replace(/s$/, ''); // e.g. "bangles" -> "bangle"
  }
  const name = (item.name || '').toLowerCase();
  const KNOWN_TYPES = [
    'bangle',
    'ring',
    'chain',
    'necklace',
    'earring',
    'pendant',
    'bracelet',
    'haram',
    'choker',
    'anklet',
    'coin',
    'mangalsutra',
    'stud',
    'jhumka',
    'kada',
    'valayal'
  ];
  for (const t of KNOWN_TYPES) {
    if (name.includes(t)) return t.replace(/s$/, '');
  }
  return '';
};

const ProductDetailsPage = ({ liveRates = [], wishlist = [], onToggleWishlist }) => {
  const dispatch = useDispatch();
  const reduxRates = useSelector((state) => state.rates?.liveRates || []);
  const ratesToUse = liveRates && liveRates.length > 0 ? liveRates : reduxRates;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(false);

  // E-Commerce Cart & Ordering States
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('Free Size');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDirectCheckout, setIsDirectCheckout] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('luxury_jewel_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isCurrentInWishlist = Boolean(
    product && Array.isArray(wishlist) && wishlist.some(
      w => matchesWishlistItem(w, product.dbId || product.id || product.productCode || product.name, product.name)
    )
  );

  const handleToggleProductWishlist = () => {
    if (!product) return;
    if (typeof onToggleWishlist === 'function') {
      onToggleWishlist(product);
    } else {
      dispatch(toggleWishlist(product));
      toggleWishlistInSupabase(product);
    }
    setToastMsg(isCurrentInWishlist ? `Removed "${product.name}" from Wishlist` : `Saved "${product.name}" to Wishlist!`);
    setTimeout(() => setToastMsg(''), 2500);
  };

  // Load existing cart items from Supabase cart_items table
  useEffect(() => {
    fetchCartItemsFromSupabase().then(res => {
      if (res?.success && res.cart && res.cart.length > 0) {
        setCartItems(res.cart);
        try {
          localStorage.setItem('luxury_jewel_cart', JSON.stringify(res.cart));
        } catch (e) {
          console.warn(e);
        }
      }
    });
  }, []);

  // Magnifying Loupe Lens State
  const mainImgContainerRef = useRef(null);
  const mainImgRef = useRef(null);
  const [lensState, setLensState] = useState({
    show: false,
    x: 0,
    y: 0,
    bgX: 0,
    bgY: 0,
    bgWidth: 0,
    bgHeight: 0
  });

  const LENS_SIZE = 160;
  const ZOOM_LEVEL = 1.85;

  // Tabs State
  const [activeTab, setActiveTab] = useState('more_info');
  const [activePolicyTab, setActivePolicyTab] = useState('best-quality');

  // Drag-to-scroll and swipe references for thumbnails and main image
  const pdThumbStripRef = useRef(null);
  const isDraggingPdStripRef = useRef(false);
  const startXPdStripRef = useRef(0);
  const scrollLeftPdStripRef = useRef(0);
  const hasMovedPdStripRef = useRef(false);
  const mainTouchStartXRef = useRef(0);

  const fetchProduct = async () => {
    const pathParts = window.location.pathname.split('/');
    const urlProductName = decodeURIComponent(pathParts[pathParts.length - 1] || '');

    if (!urlProductName) {
      setLoading(false);
      return;
    }

    const startTime = Date.now();
    const { data } = await getProductsFromSupabase(true);
    if (data) {
      const foundProduct = data.find(
        (p) =>
          (p.name && p.name.toLowerCase() === urlProductName.toLowerCase()) ||
          (p.productCode && p.productCode.toLowerCase() === urlProductName.toLowerCase()) ||
          (p.id !== undefined && String(p.id).toLowerCase() === urlProductName.toLowerCase()) ||
          (p.dbId !== undefined && String(p.dbId).toLowerCase() === urlProductName.toLowerCase())
      );
      setProduct(foundProduct || null);
      if (foundProduct) {
        dispatch(setCurrentProduct(foundProduct));
        setActiveImage(foundProduct.image);
        dispatch(setReduxActiveImage(foundProduct.image));

        const variants = parseSizeVariants(foundProduct);
        const firstInStock = variants.find((v) => v.stock > 0);
        if (firstInStock) {
          setSelectedSize(firstInStock.size);
        } else if (variants.length > 0) {
          setSelectedSize(variants[0].size);
        } else if (foundProduct.hasSize) {
          setSelectedSize('Free Size');
        } else {
          setSelectedSize('');
        }

        // Find related products strictly matching the same item type (e.g. Bangle -> ONLY Bangles)
        const currentType = detectProductType(foundProduct);
        const normSub = foundProduct.subcategoryName && foundProduct.subcategoryName !== 'Unknown'
          ? foundProduct.subcategoryName.toLowerCase().replace(/s$/, '').trim()
          : '';

        const sameTypeProducts = data.filter((p) => {
          if (p.id === foundProduct.id || p.dbId === foundProduct.dbId) return false;

          // 1. Exact subcategoryId match
          if (
            foundProduct.subcategoryId &&
            p.subcategoryId &&
            String(p.subcategoryId) === String(foundProduct.subcategoryId)
          ) {
            return true;
          }

          // 2. Subcategory Name match (normalized without trailing 's')
          if (normSub && p.subcategoryName && p.subcategoryName !== 'Unknown') {
            const pNormSub = p.subcategoryName.toLowerCase().replace(/s$/, '').trim();
            if (pNormSub === normSub) return true;
          }

          // 3. Keyword / Type match (e.g. 'bangle')
          if (currentType) {
            const pType = detectProductType(p);
            if (pType && pType === currentType) return true;
            if (p.name && p.name.toLowerCase().includes(currentType)) return true;
            if (p.subcategoryName && p.subcategoryName.toLowerCase().includes(currentType)) return true;
          }

          return false;
        });

        // Deduplicate and prioritize same-type items (e.g. Bangles first)
        const seenIds = new Set();
        const uniqueRelated = [];

        // 1. Add same-type products first (Bangles)
        for (const p of sameTypeProducts) {
          const key = p.dbId || p.id || p.name;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            uniqueRelated.push(p);
          }
          if (uniqueRelated.length >= 4) break;
        }

        // 2. If fewer than 4, fill remaining slots from same category (e.g. Gold) so related products ALWAYS show
        if (uniqueRelated.length < 4 && foundProduct.categoryName && foundProduct.categoryName !== 'Unknown') {
          const catProds = data.filter((p) => {
            if (p.id === foundProduct.id || p.dbId === foundProduct.dbId) return false;
            const key = p.dbId || p.id || p.name;
            if (seenIds.has(key)) return false;
            return (
              p.categoryName &&
              p.categoryName.toLowerCase() === foundProduct.categoryName.toLowerCase()
            );
          });
          for (const p of catProds) {
            const key = p.dbId || p.id || p.name;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              uniqueRelated.push(p);
            }
            if (uniqueRelated.length >= 4) break;
          }
        }

        // 3. Fallback to any other active products if still under 4
        if (uniqueRelated.length < 4) {
          const fallbackProds = data.filter((p) => {
            if (p.id === foundProduct.id || p.dbId === foundProduct.dbId) return false;
            const key = p.dbId || p.id || p.name;
            return !seenIds.has(key);
          });
          for (const p of fallbackProds) {
            const key = p.dbId || p.id || p.name;
            if (!seenIds.has(key)) {
              seenIds.add(key);
              uniqueRelated.push(p);
            }
            if (uniqueRelated.length >= 4) break;
          }
        }

        setRelatedProducts(uniqueRelated);
      }
    }

    const elapsed = Date.now() - startTime;
    const minDisplayTime = 800;
    if (elapsed < minDisplayTime) {
      setTimeout(() => {
        setLoading(false);
      }, minDisplayTime - elapsed);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      fetchProduct();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isLightboxOpen]);

  const displayImages = (product?.images && product.images.length > 0)
    ? product.images
    : (product?.image ? [product.image] : []);

  const currentImgIndex = displayImages.indexOf(activeImage);
  const handlePrevImage = (e) => {
    e?.stopPropagation();
    if (displayImages.length <= 1) return;
    const prevIdx = (currentImgIndex - 1 + displayImages.length) % displayImages.length;
    const prevImg = displayImages[prevIdx];
    setActiveImage(prevImg);
    dispatch(setReduxActiveImage(prevImg));
    setLightboxZoom(false);
  };
  const handleNextImage = (e) => {
    e?.stopPropagation();
    if (displayImages.length <= 1) return;
    const nextIdx = (currentImgIndex + 1) % displayImages.length;
    const nextImg = displayImages[nextIdx];
    setActiveImage(nextImg);
    dispatch(setReduxActiveImage(nextImg));
    setLightboxZoom(false);
  };

  // Drag-to-scroll handlers for thumbnails
  const handleMouseDownThumbStrip = (e) => {
    if (!pdThumbStripRef.current) return;
    isDraggingPdStripRef.current = true;
    hasMovedPdStripRef.current = false;
    startXPdStripRef.current = e.pageX - pdThumbStripRef.current.offsetLeft;
    scrollLeftPdStripRef.current = pdThumbStripRef.current.scrollLeft;
  };

  const handleMouseMoveThumbStrip = (e) => {
    if (!isDraggingPdStripRef.current || !pdThumbStripRef.current) return;
    e.preventDefault();
    const x = e.pageX - pdThumbStripRef.current.offsetLeft;
    const walk = (x - startXPdStripRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedPdStripRef.current = true;
    }
    pdThumbStripRef.current.scrollLeft = scrollLeftPdStripRef.current - walk;
  };

  const handleMouseUpThumbStrip = () => {
    isDraggingPdStripRef.current = false;
  };

  const handleScrollThumbStrip = (direction) => {
    if (!pdThumbStripRef.current) return;
    const amount = 140;
    pdThumbStripRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  const handleThumbnailSelect = (img) => {
    if (hasMovedPdStripRef.current) return;
    setActiveImage(img);
    dispatch(setReduxActiveImage(img));
  };

  // Touch swipe handlers on main image
  const handleTouchStartMainImg = (e) => {
    mainTouchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEndMainImg = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = mainTouchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
  };

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (pdThumbStripRef.current) {
      const activeEl = pdThumbStripRef.current.querySelector('.pd-thumbnail-item.active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeImage]);

  const handleMouseMove = (e) => {
    if (!mainImgContainerRef.current) return;
    const rect = mainImgContainerRef.current.getBoundingClientRect();
    const imgEl = mainImgRef.current;
    if (!imgEl) return;

    const cW = rect.width;
    const cH = rect.height;

    // Natural image dimensions
    const nW = imgEl.naturalWidth || cW;
    const nH = imgEl.naturalHeight || cH;

    // Calculate exact rendered scale of object-fit: cover
    const scale = Math.max(cW / nW, cH / nH);
    const renderedW = nW * scale;
    const renderedH = nH * scale;
    const offsetX = (cW - renderedW) / 2;
    const offsetY = (cH - renderedH) / 2;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const half = LENS_SIZE / 2;
    const lensX = Math.max(0, Math.min(cW - LENS_SIZE, mouseX - half));
    const lensY = Math.max(0, Math.min(cH - LENS_SIZE, mouseY - half));

    const imgMouseX = mouseX - offsetX;
    const imgMouseY = mouseY - offsetY;

    const bgWidth = renderedW * ZOOM_LEVEL;
    const bgHeight = renderedH * ZOOM_LEVEL;

    const bgX = -(imgMouseX * ZOOM_LEVEL - half);
    const bgY = -(imgMouseY * ZOOM_LEVEL - half);

    setLensState({
      show: true,
      x: lensX,
      y: lensY,
      bgX,
      bgY,
      bgWidth,
      bgHeight
    });
  };

  const handleMouseEnter = () => setLensState(prev => ({ ...prev, show: true }));
  const handleMouseLeave = () => setLensState(prev => ({ ...prev, show: false }));

  const handleShare = async () => {
    if (!product) return;
    const productUrl = window.location.href;
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
      const tempInput = document.createElement('input');
      tempInput.value = productUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="product-details-page animate-fade-in">
        {/* 1. Breadcrumbs Shimmer */}
        <div className="pd-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div className="pd-shimmer" style={{ width: '22px', height: '16px', borderRadius: '4px' }} />
          <span className="pd-breadcrumb-sep">&gt;</span>
          <div className="pd-shimmer" style={{ width: '85px', height: '16px', borderRadius: '4px' }} />
          <span className="pd-breadcrumb-sep">&gt;</span>
          <div className="pd-shimmer" style={{ width: '140px', height: '16px', borderRadius: '4px' }} />
        </div>

        {/* 2. Main Product Card Shimmer */}
        <div className="product-details-container">
          <div className="product-details-grid">
            {/* Left Column: Vertical Thumbnails Strip + Main Large Image */}
            <div className="product-img-box">
              <div className="product-gallery-layout">
                {/* Vertical Thumbnails on the left */}
                <div className="pd-thumbnails-vertical">
                  <div className="pd-shimmer pd-thumbnail-item" style={{ border: 'none' }} />
                  <div className="pd-shimmer pd-thumbnail-item" style={{ border: 'none' }} />
                  <div className="pd-shimmer pd-thumbnail-item" style={{ border: 'none' }} />
                  <div className="pd-shimmer pd-thumbnail-item" style={{ border: 'none' }} />
                </div>

                {/* Main Large Image Container */}
                <div className="product-main-img-container" style={{ border: 'none', background: '#f8fafc' }}>
                  <div className="pd-shimmer" style={{ width: '100%', height: '100%', borderRadius: '16px' }} />
                </div>
              </div>
            </div>

            {/* Right Column: Info, Specs, Pricing & Actions */}
            <div className="product-info-section">
              {/* Product Header: Title & Share Button */}
              <div className="product-header" style={{ marginBottom: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="pd-shimmer" style={{ width: '70%', height: '34px', borderRadius: '6px' }} />
                <div className="pd-shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
              </div>

              {/* Status / Code Pill */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1.4rem' }}>
                <div className="pd-shimmer" style={{ width: '110px', height: '24px', borderRadius: '4px' }} />
                <div className="pd-shimmer" style={{ width: '95px', height: '24px', borderRadius: '4px' }} />
              </div>

              {/* Specifications List */}
              <div className="specs-list" style={{ marginBottom: '1.8rem' }}>
                <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="pd-shimmer" style={{ width: '130px', height: '16px', borderRadius: '4px' }} />
                  <div className="pd-shimmer" style={{ width: '90px', height: '16px', borderRadius: '4px' }} />
                </div>
                <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="pd-shimmer" style={{ width: '150px', height: '16px', borderRadius: '4px' }} />
                  <div className="pd-shimmer" style={{ width: '110px', height: '16px', borderRadius: '4px' }} />
                </div>
                <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="pd-shimmer" style={{ width: '110px', height: '16px', borderRadius: '4px' }} />
                  <div className="pd-shimmer" style={{ width: '80px', height: '16px', borderRadius: '4px' }} />
                </div>
                <div className="spec-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="pd-shimmer" style={{ width: '120px', height: '16px', borderRadius: '4px' }} />
                  <div className="pd-shimmer" style={{ width: '100px', height: '16px', borderRadius: '4px' }} />
                </div>
              </div>

              {/* Pricing Section Container */}
              <div className="pd-price-container" style={{ padding: '1.4rem', background: '#fafaf9', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '1.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                  <div className="pd-shimmer" style={{ width: '160px', height: '36px', borderRadius: '6px' }} />
                  <div className="pd-shimmer" style={{ width: '90px', height: '22px', borderRadius: '4px' }} />
                  <div className="pd-shimmer" style={{ width: '70px', height: '22px', borderRadius: '12px' }} />
                </div>
                <div className="pd-shimmer" style={{ width: '280px', height: '14px', borderRadius: '4px' }} />
              </div>

              {/* Action Buttons (Add to Cart & Buy Now) */}
              <div style={{ display: 'flex', gap: '14px', marginBottom: '1.6rem' }}>
                <div className="pd-shimmer" style={{ flex: 1, height: '52px', borderRadius: '8px' }} />
                <div className="pd-shimmer" style={{ flex: 1, height: '52px', borderRadius: '8px' }} />
              </div>

              {/* Trust Badges */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div className="pd-shimmer" style={{ width: '150px', height: '32px', borderRadius: '20px' }} />
                <div className="pd-shimmer" style={{ width: '165px', height: '32px', borderRadius: '20px' }} />
                <div className="pd-shimmer" style={{ width: '145px', height: '32px', borderRadius: '20px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Related Products Section Shimmer */}
        <div className="pd-related-section" style={{ marginTop: '3.5rem' }}>
          <div className="pd-shimmer" style={{ width: '240px', height: '28px', borderRadius: '6px', marginBottom: '1.8rem' }} />
          <div className="pd-related-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '14px', border: '1px solid #f1f5f9', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div className="pd-shimmer" style={{ width: '100%', height: '210px', borderRadius: '8px', marginBottom: '14px' }} />
                <div className="pd-shimmer" style={{ width: '75%', height: '18px', borderRadius: '4px', marginBottom: '8px' }} />
                <div className="pd-shimmer" style={{ width: '45%', height: '20px', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-error">
        <h2>Product not found</h2>
        <button onClick={() => (window.location.href = '/')}>Return Home</button>
      </div>
    );
  }

  const breadcrumbSubcategory = product.subcategoryName
    ? product.subcategoryName.toUpperCase()
    : product.categoryName
      ? product.categoryName.toUpperCase()
      : 'little_rr';

  const productCodeDisplay = product.productCode || `GJ ${product.name}`;

  // Price resolution: check direct product.price first, otherwise weight-based calculateFinalPrice
  const calc = calculateFinalPrice(product, ratesToUse);
  let sellingPrice = 0;
  let mrpPrice = 0;
  let discountPct = 0;

  if (product.price && parseFloat(product.price) > 0) {
    sellingPrice = parseFloat(product.price);
    mrpPrice = parseFloat(product.mrp) > sellingPrice ? parseFloat(product.mrp) : 0;
    discountPct = parseFloat(product.discountPercentage) || (mrpPrice > sellingPrice ? Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100) : 0);
  } else if (calc.finalPrice && calc.finalPrice > 0) {
    sellingPrice = calc.finalPrice;
  }

  const sizeVariants = parseSizeVariants(product);
  const currentVariant = sizeVariants.find(
    (v) => v.size.toLowerCase() === (selectedSize || '').toLowerCase()
  );
  const currentSizeStock = currentVariant !== undefined
    ? currentVariant.stock
    : (product.stock !== undefined ? parseInt(product.stock, 10) : 10);
  const isSelectedSizeOutOfStock = sizeVariants.length > 0
    ? (currentSizeStock <= 0)
    : ((product.stock !== undefined ? parseInt(product.stock, 10) : 10) <= 0);

  const handleAddToCart = async () => {
    if (!product) return;
    if (isSelectedSizeOutOfStock) {
      alert(`The selected size "${selectedSize}" is currently out of stock.`);
      return;
    }
    const itemPrice = sellingPrice > 0 ? sellingPrice : 0;
    const itemWeight = parseFloat(product.netWeight) || parseFloat(product.grossWeight) || parseFloat(product.weight) || 0;
    const prodId = String(product.id || product.dbId || product.productCode || product.name || 'prod');
    const itemImg = activeImage || product.image || (product.images && product.images[0]) || '';

    const cartPayload = {
      product_id: prodId,
      product_name: product.name,
      product_image: itemImg,
      price: itemPrice,
      quantity: quantity,
      size: selectedSize || null,
      color: product.color || null,
      weight: itemWeight,
      purity: product.purity || '22K Gold'
    };

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      localStorage.setItem('pending_cart_action', JSON.stringify({
        action: 'add_to_cart',
        productPayload: cartPayload,
        returnUrl: window.location.pathname + window.location.search
      }));
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    const newItem = {
      id: `${prodId}-${selectedSize || 'std'}`,
      productId: prodId,
      name: product.name,
      image: itemImg,
      price: itemPrice,
      mrp: mrpPrice || itemPrice,
      weight: itemWeight,
      purity: product.purity || '22K Gold',
      quantity: quantity,
      size: selectedSize || ''
    };

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === newItem.id);
      let updated;
      if (existingIndex > -1) {
        updated = [...prev];
        updated[existingIndex].quantity = Math.min(5, updated[existingIndex].quantity + quantity);
      } else {
        updated = [...prev, newItem];
      }
      try {
        localStorage.setItem('luxury_jewel_cart', JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });

    setToastMsg(`${quantity} item(s) added to Cart!`);
    setTimeout(() => setToastMsg(''), 3500);
    setIsDirectCheckout(false);
    // Don't auto-open drawer on "Add to Cart" - user opens details via navbar cart icon
    setIsCartOpen(false);
    window.dispatchEvent(new Event('cartUpdated'));

    // Sync with Supabase cart_items table
    try {
      const res = await addToCartInSupabase(cartPayload);
      if (res?.success && res.item?.id) {
        setCartItems(prev => prev.map(item => item.id === newItem.id ? { ...item, dbId: res.item.id } : item));
      }
    } catch (err) {
      console.error('Supabase addToCart error:', err);
    }
  };

  const handleBuyNow = async () => {
    if (isSelectedSizeOutOfStock) {
      alert(`The selected size "${selectedSize}" is currently out of stock.`);
      return;
    }

    const itemPrice = sellingPrice > 0 ? sellingPrice : 0;
    const itemWeight = parseFloat(product.netWeight) || parseFloat(product.grossWeight) || parseFloat(product.weight) || 0;
    const prodId = String(product.id || product.dbId || product.productCode || product.name || 'prod');
    const itemImg = activeImage || product.image || (product.images && product.images[0]) || '';

    const cartPayload = {
      product_id: prodId,
      product_name: product.name,
      product_image: itemImg,
      price: itemPrice,
      quantity: quantity,
      size: selectedSize || null,
      color: product.color || null,
      weight: itemWeight,
      purity: product.purity || '22K Gold'
    };

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      localStorage.setItem('pending_cart_action', JSON.stringify({
        action: 'buy_now',
        productPayload: cartPayload,
        returnUrl: '/checkout'
      }));
      window.location.href = `/login?redirect=${encodeURIComponent('/checkout')}`;
      return;
    }

    await handleAddToCart();
    window.location.href = '/checkout';
  };

  const handleUpdateCartQuantity = async (id, newQty) => {
    const targetItem = cartItems.find(item => item.id === id);

    setCartItems(prev => {
      let updated;
      if (newQty <= 0) {
        updated = prev.filter(item => item.id !== id);
      } else {
        updated = prev.map(item => item.id === id ? { ...item, quantity: newQty } : item);
      }
      try {
        localStorage.setItem('luxury_jewel_cart', JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });

    if (targetItem?.dbId || (typeof id === 'string' && id.length > 20 && !id.includes('-'))) {
      await updateCartItemQuantityInSupabase(targetItem?.dbId || id, newQty);
    }
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const handleRemoveCartItem = async (id) => {
    const targetItem = cartItems.find(item => item.id === id);

    setCartItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem('luxury_jewel_cart', JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });

    if (targetItem?.dbId || (typeof id === 'string' && id.length > 20 && !id.includes('-'))) {
      await removeCartItemFromSupabase(targetItem?.dbId || id);
    }
    window.dispatchEvent(new Event('cartUpdated'));
  };

  return (
    <div className="product-details-page animate-fade-in">


      {/* 1. Breadcrumbs */}
      <div className="pd-breadcrumb">
        <a href="/" title="Home">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </a>
        <span className="pd-breadcrumb-sep">&gt;</span>
        <a
          href={
            product.subcategoryName
              ? `/subcategory/${encodeURIComponent(product.subcategoryName.toLowerCase())}`
              : '/'
          }
        >
          {breadcrumbSubcategory}
        </a>
      </div>

      {/* Main Product Card */}
      <div className="product-details-container">
        <div className="product-details-grid">
          {/* Left Column: Product Images with Left Vertical Thumbnails */}
          <div className="product-img-box">
            <div className="product-gallery-layout">
              {/* Image Thumbnails with Drag & Mobile Scroll Arrows */}
              {displayImages && displayImages.length > 0 && (
                <div className="pd-thumbnails-wrapper">
                  {displayImages.length > 1 && (
                    <button
                      type="button"
                      className="pd-thumb-scroll-btn prev"
                      onClick={() => handleScrollThumbStrip('left')}
                      title="Scroll Left"
                      aria-label="Scroll thumbnails left"
                    >
                      ‹
                    </button>
                  )}

                  <div
                    ref={pdThumbStripRef}
                    className="pd-thumbnails-vertical"
                    onMouseDown={handleMouseDownThumbStrip}
                    onMouseMove={handleMouseMoveThumbStrip}
                    onMouseUp={handleMouseUpThumbStrip}
                    onMouseLeave={handleMouseUpThumbStrip}
                  >
                    {displayImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={`pd-thumbnail-item ${activeImage === img ? 'active' : ''}`}
                        onClick={() => handleThumbnailSelect(img)}
                        onMouseEnter={() => {
                          setActiveImage(img);
                          dispatch(setReduxActiveImage(img));
                        }}
                        title={`View image ${idx + 1}`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>

                  {displayImages.length > 1 && (
                    <button
                      type="button"
                      className="pd-thumb-scroll-btn next"
                      onClick={() => handleScrollThumbStrip('right')}
                      title="Scroll Right"
                      aria-label="Scroll thumbnails right"
                    >
                      ›
                    </button>
                  )}
                </div>
              )}

              {/* Main Large Image Container */}
              <div
                ref={mainImgContainerRef}
                className="product-main-img-container"
                onClick={() => {
                  setIsLightboxOpen(true);
                  setLightboxZoom(false);
                }}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStartMainImg}
                onTouchEnd={handleTouchEndMainImg}
              >
                <span className={`zoom-hint-pill ${lensState.show ? 'hidden' : ''}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  Hover to Inspect
                </span>

                <img
                  ref={mainImgRef}
                  src={activeImage}
                  alt={product.name}
                  className="product-zoom-img"
                />

                {/* Mobile Main Image Navigation Arrows */}
                {displayImages && displayImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="pd-main-nav-btn prev"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage(e);
                      }}
                      title="Previous Image"
                      aria-label="Previous Image"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="pd-main-nav-btn next"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage(e);
                      }}
                      title="Next Image"
                      aria-label="Next Image"
                    >
                      ›
                    </button>
                  </>
                )}

                {/* Magnifying Loupe Square Lens (matches customer jewelry inspection view) */}
                {lensState.show && (
                  <div
                    className="product-zoom-loupe"
                    style={{
                      left: `${lensState.x}px`,
                      top: `${lensState.y}px`,
                      width: `${LENS_SIZE}px`,
                      height: `${LENS_SIZE}px`,
                      backgroundImage: `url(${activeImage})`,
                      backgroundSize: `${lensState.bgWidth}px ${lensState.bgHeight}px`,
                      backgroundPosition: `${lensState.bgX}px ${lensState.bgY}px`
                    }}
                  />
                )}

                <div className={`img-zoom-badge ${lensState.show ? 'hide-badge' : ''}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Product Info */}
          <div className="product-info-section">
            <div className="product-header">
              <h1 className="product-title">{product.name}</h1>
              <div className="product-header-actions">
                {/* Luxury Wishlist Button */}
                <button
                  type="button"
                  className={`pd-action-btn pd-wishlist-btn ${isCurrentInWishlist ? 'in-wishlist' : ''}`}
                  onClick={handleToggleProductWishlist}
                  title={isCurrentInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  aria-label="Wishlist"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill={isCurrentInWishlist ? '#e11d48' : 'none'}
                    stroke={isCurrentInWishlist ? '#e11d48' : '#334155'}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>

                {/* Professional Share Button */}
                <button
                  type="button"
                  className={`pd-action-btn pd-share-btn share-btn ${copied ? 'copied' : ''}`}
                  onClick={handleShare}
                  title={copied ? 'Link Copied!' : 'Share Product'}
                  aria-label="Share"
                >
                  {copied ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                  )}
                  {copied && <span className="share-copied-tooltip">Copied!</span>}
                </button>
              </div>
            </div>



            {product.description && product.description.trim() ? (
              <p className="product-desc">{product.description}</p>
            ) : null}

            <div className="specs-list">
              <div className="spec-item">
                <span>AVAILABILITY:</span>
                <strong>IN STOCK</strong>
              </div>
              <div className="spec-item">
                <span>PRODUCT CODE NO:</span>
                <strong>{productCodeDisplay}</strong>
              </div>
              {product.categoryName && product.categoryName !== 'Unknown' && (
                <div className="spec-item">
                  <span>CATEGORY:</span>
                  <strong>{product.categoryName}</strong>
                </div>
              )}
              {product.material && (
                <div className="spec-item">
                  <span>MATERIAL / FABRIC:</span>
                  <strong>{product.material}</strong>
                </div>
              )}
              {product.color && (
                <div className="spec-item">
                  <span>COLOR:</span>
                  <strong>{product.color}</strong>
                </div>
              )}

              {product.sleeves && (
                <div className="spec-item">
                  <span>SLEEVES:</span>
                  <strong>{product.sleeves}</strong>
                </div>
              )}
              {product.neck && (
                <div className="spec-item">
                  <span>NECK:</span>
                  <strong>{product.neck}</strong>
                </div>
              )}
              {product.brand && (
                <div className="spec-item">
                  <span>BRAND:</span>
                  <strong>{product.brand}</strong>
                </div>
              )}
              {product.grossWeight && parseFloat(product.grossWeight) > 0 && (
                <div className="spec-item">
                  <span>GROSS WEIGHT:</span>
                  <strong>{product.grossWeight} g</strong>
                </div>
              )}
              {product.netWeight && parseFloat(product.netWeight) > 0 && (
                <div className="spec-item">
                  <span>NET WEIGHT:</span>
                  <strong>{product.netWeight} g</strong>
                </div>
              )}
              {!(parseFloat(product.grossWeight) > 0 || parseFloat(product.netWeight) > 0) && product.weight && parseFloat(product.weight) > 0 && (
                <div className="spec-item">
                  <span>WEIGHT:</span>
                  <strong>{product.weight} g</strong>
                </div>
              )}
              {product.purity && product.purity !== '-' && (
                <div className="spec-item">
                  <span>PURITY:</span>
                  <strong>{product.purity.replace(' Gold', '')}</strong>
                </div>
              )}
            </div>

            {/* 1. Pricing Section */}
            <div className="pd-price-container">
              {sellingPrice > 0 ? (
                <>
                  <div className="pd-price-row">
                    <span className="pd-price-val">₹{sellingPrice.toLocaleString('en-IN')}</span>
                    {mrpPrice > sellingPrice && (
                      <span className="pd-mrp-val">₹{mrpPrice.toLocaleString('en-IN')}</span>
                    )}
                    {discountPct > 0 && (
                      <span className="pd-discount-pill">{discountPct}% OFF</span>
                    )}
                  </div>
                  <div className="pd-tax-inclusive-tag">
                    ✓ Price inclusive of all taxes • Free Insured Delivery across India
                  </div>
                </>
              ) : (
                <div className="pd-price-inquiry-box">
                  <span className="pd-price-inquiry-text">⭐ Pure BIS 916 Hallmarked Collection</span>
                  <div className="pd-tax-inclusive-tag">Contact us for real-time gold bullion pricing</div>
                </div>
              )}
            </div>

            {/* 2. Size Selector (Dynamic Stock-based from Supabase) */}
            {sizeVariants.length > 0 && (
              <div className="pd-attribute-box">
                <div className="pd-attr-header">
                  <span className="pd-attr-title">Available Sizes:</span>
                  <div className="pd-size-stock-info">
                    <span className="pd-attr-current">{selectedSize}</span>
                    {isSelectedSizeOutOfStock ? (
                      <span className="pd-stock-pill out">❌ Out of Stock</span>
                    ) : (
                      <span className="pd-stock-pill in">✓ In Stock</span>
                    )}
                  </div>
                </div>

                <div className="pd-size-pill-group">
                  {sizeVariants.map((v) => {
                    const isOut = parseInt(v.stock, 10) <= 0;
                    const isSelected = (selectedSize || '').toLowerCase() === v.size.toLowerCase();
                    return (
                      <button
                        key={v.size}
                        type="button"
                        className={`pd-size-btn ${isSelected ? 'active' : ''} ${isOut ? 'out-of-stock' : ''}`}
                        onClick={() => setSelectedSize(v.size)}
                        title={isOut ? `${v.size} - Out of Stock` : `${v.size} - In Stock`}
                      >
                        <span className="pd-size-text">{v.size}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Quantity Selector (Allowed maximum: 5) */}
            <div className="pd-quantity-row">
              <span className="pd-quantity-label">Quantity:</span>
              <div className="pd-quantity-picker">
                <button
                  type="button"
                  className="pd-qty-btn minus"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isSelectedSizeOutOfStock}
                  aria-label="Decrease quantity"
                  title="Decrease quantity"
                >
                  −
                </button>
                <span className="pd-qty-count">{quantity}</span>
                <button
                  type="button"
                  className="pd-qty-btn plus"
                  onClick={() => setQuantity(q => Math.min(5, q + 1))}
                  disabled={quantity >= 5 || isSelectedSizeOutOfStock}
                  aria-label="Increase quantity"
                  title={quantity >= 5 ? 'Maximum 5 units allowed per item' : 'Increase quantity'}
                >
                  +
                </button>
              </div>
            </div>

            {/* 4. Action Buttons: ADD TO CART & BUY NOW */}
            <div className="pd-cart-actions-group">
              <button
                type="button"
                className={`pd-btn-add-to-cart ${isSelectedSizeOutOfStock ? 'disabled-btn' : ''}`}
                onClick={handleAddToCart}
                disabled={isSelectedSizeOutOfStock}
              >
                {isSelectedSizeOutOfStock ? (
                  <span>🚫 Out of Stock</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className={`pd-btn-buy-now ${isSelectedSizeOutOfStock ? 'disabled-btn' : ''}`}
                onClick={handleBuyNow}
                disabled={isSelectedSizeOutOfStock}
              >
                {isSelectedSizeOutOfStock ? (
                  <span>Unavailable</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    <span>Buy Now</span>
                  </>
                )}
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                className={`pd-btn-wishlist ${isCurrentInWishlist ? 'active' : ''}`}
                onClick={handleToggleProductWishlist}
                title={isCurrentInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                aria-label="Wishlist"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={isCurrentInWishlist ? '#e11d48' : 'none'} stroke={isCurrentInWishlist ? '#e11d48' : '#003B2F'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>



            {/* 6. Success Notification Toast (Floating Top Alert) */}
            {toastMsg &&
              createPortal(
                <div className="pd-cart-toast-top">
                  <div className="pd-toast-icon-wrap">
                    {toastMsg.toLowerCase().includes('wishlist') ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <div className="pd-toast-text-wrap">
                    <span className="pd-toast-title">
                      {toastMsg.toLowerCase().includes('wishlist') ? 'Wishlist' : 'Added to Cart!'}
                    </span>
                    <span className="pd-toast-desc">{toastMsg}</span>
                  </div>
                  <button
                    type="button"
                    className="pd-toast-action-btn"
                    onClick={() => {
                      setToastMsg('');
                      window.location.href = toastMsg.toLowerCase().includes('wishlist') ? '/wishlist' : '/cart';
                    }}
                  >
                    {toastMsg.toLowerCase().includes('wishlist') ? 'View Wishlist →' : 'View Cart →'}
                  </button>
                  <button
                    type="button"
                    className="pd-toast-close"
                    onClick={() => setToastMsg('')}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>

      {/* Tabs Section: MORE INFORMATION & REVIEWS */}
      <div className="pd-tabs-section">
        <div className="pd-tabs-header">
          <button
            type="button"
            className={`pd-tab-btn ${activeTab === 'more_info' ? 'active' : ''}`}
            onClick={() => setActiveTab('more_info')}
          >
            MORE INFORMATION
          </button>
          {/* <button
            type="button"
            className={`pd-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            REVIEWS
          </button> */}
        </div>

        {activeTab === 'more_info' && (
          <div className="pd-tab-content">
            {/* 2-Column Specs Key-Value Table */}
            <div className="pd-info-table">
              <div className="pd-info-row">
                <div className="pd-info-label">Product Code No</div>
                <div className="pd-info-value">{productCodeDisplay}</div>
              </div>

              <div className="pd-info-row">
                <div className="pd-info-label">Stock Availability</div>
                <div className="pd-info-value">IN STOCK</div>
              </div>

              <div className="pd-info-row">
                <div className="pd-info-label">Brand</div>
                <div className="pd-info-value">{product.categoryName || 'Gold'}</div>
              </div>
            </div>

            {/* SHIPPING AND RETURN POLICY Section */}
            <div className="pd-policy-section">
              <h3 className="pd-policy-title">SHIPPING AND RETURN POLICY</h3>
              <div className="pd-policy-pills">
                {POLICY_PILLS.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    className={`pd-policy-pill ${activePolicyTab === pill.id ? 'active' : ''}`}
                    onClick={() => setActivePolicyTab(pill.id)}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="pd-policy-content">
                <p>{POLICY_TEXTS[activePolicyTab]}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="pd-tab-content pd-reviews-content">
            <div className="pd-reviews-summary">
              <div className="pd-rating-big">5.0</div>
              <div className="pd-stars">★★★★★</div>
              <div className="pd-rating-count">Based on verified customer orders</div>
            </div>
            <div className="pd-review-list">
              <div className="pd-review-item">
                <div className="pd-review-header">
                  <strong>Priya S.</strong>
                  <span className="pd-review-stars">★★★★★</span>
                  <span className="pd-review-date">Verified Purchase</span>
                </div>
                <p className="pd-review-body">
                  Exquisite finishing and 100% authentic hallmark. The weight and purity matched the certificate exactly. Fast, insured delivery!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Related Products Section */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="pd-related-section">
          <h2 className="pd-related-heading">Related Products</h2>
          <div className="pd-related-grid">
            {relatedProducts.map((relProd) => {
              const relSubtitle = `${relProd.categoryName || 'GOLD'} ${relProd.purity ? relProd.purity.replace(' Gold', '') : ''}`.trim() || 'GOLD 18K';

              return (
                <div
                  key={relProd.id || relProd.dbId}
                  className="pd-related-card"
                  onClick={() => {
                    window.location.href = `/product/${encodeURIComponent(relProd.name.toLowerCase())}`;
                  }}
                >
                  <div className="pd-related-img-container">
                    <img src={relProd.image} alt={relProd.name} loading="lazy" />

                    {/* Badge */}
                    {(relProd.badge || relProd.tagName || relProd.tagId) && (
                      <span className="pd-related-badge">
                        {relProd.badge || relProd.tagName || 'NEW ARRIVAL'}
                      </span>
                    )}

                    {/* Bottom Floating Bar on Hover */}
                    <div className="pd-related-bottom-actions">
                      <button
                        type="button"
                        className="pd-related-view-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/product/${encodeURIComponent(relProd.name.toLowerCase())}`;
                        }}
                      >
                        <span>View Details</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                          <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Text details below card image */}
                  <div className="pd-related-details">
                    <span className="pd-related-subtitle">{relSubtitle}</span>
                    <h3 className="pd-related-title" title={relProd.name}>
                      {relProd.name}
                    </h3>

                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Separate Full Image Lightbox Modal */}
      {isLightboxOpen &&
        createPortal(
          <div className="pd-lightbox-overlay" onClick={() => setIsLightboxOpen(false)}>
            <button
              type="button"
              className="pd-lightbox-close"
              onClick={() => setIsLightboxOpen(false)}
              title="Close (Esc)"
              aria-label="Close image modal"
            >
              ×
            </button>

            <div className="pd-lightbox-content" onClick={(e) => e.stopPropagation()}>
              {product.images && product.images.length > 1 && (
                <>
                  <button type="button" className="pd-lightbox-nav prev" onClick={handlePrevImage} title="Previous Image">
                    ‹
                  </button>
                  <button type="button" className="pd-lightbox-nav next" onClick={handleNextImage} title="Next Image">
                    ›
                  </button>
                </>
              )}

              <div
                className={`pd-lightbox-img-wrapper ${lightboxZoom ? 'is-zoomed' : ''}`}
                onClick={() => setLightboxZoom((prev) => !prev)}
                title={lightboxZoom ? 'Click to Zoom Out' : 'Click to Zoom In (2x)'}
              >
                <img
                  src={activeImage}
                  alt={product.name}
                  className={`pd-lightbox-img ${lightboxZoom ? 'zoomed' : ''}`}
                />
              </div>

              <div className="pd-lightbox-footer">
                <span className="pd-lightbox-title">{product.name}</span>
                {product.images && product.images.length > 1 && (
                  <span className="pd-lightbox-counter">
                    {currentImgIndex >= 0 ? currentImgIndex + 1 : 1} / {product.images.length}
                  </span>
                )}
              </div>

              {product.images && product.images.length > 1 && (
                <div className="pd-lightbox-thumbs">
                  {product.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      onClick={() => {
                        setActiveImage(img);
                        dispatch(setReduxActiveImage(img));
                      }}
                      className={`pd-lightbox-thumb ${activeImage === img ? 'active' : ''}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        initialCheckout={isDirectCheckout}
      />
    </div>
  );
};

export default ProductDetailsPage;
