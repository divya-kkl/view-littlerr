import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Navbar.css';
import { getCategoriesFromSupabase } from '../services/categoryService';
import { getSubcategoriesFromSupabase } from '../services/subcategoryService';
import { searchProductsInSupabase } from '../services/productService';
import { getSiteSettings } from '../services/settingService';
import { getCurrentUser } from '../services/userService';
import { supabase } from '../supabaseClient';
import AuthModal from './AuthModal';
import CartDrawer from './CartDrawer';
import {
  fetchCartItemsFromSupabase,
  updateCartItemQuantityInSupabase,
  removeCartItemFromSupabase
} from '../services/cartService';

const Navbar = ({
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  logoUrl,
  shopName = '',
  isLoadingSettings,
  liveRates = [],
  isOverlay = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileExpandedCat, setMobileExpandedCat] = useState(null);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [dynamicSubcategories, setDynamicSubcategories] = useState([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Cart State for Navbar
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('luxury_jewel_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const loadNavCart = () => {
    fetchCartItemsFromSupabase().then(res => {
      if (res?.success && res.cart) {
        setCartItems(res.cart);
        try {
          localStorage.setItem('luxury_jewel_cart', JSON.stringify(res.cart));
        } catch (e) {
          console.warn(e);
        }
      }
    });
  };

  useEffect(() => {
    loadNavCart();

    const handleCartSync = () => {
      try {
        const saved = localStorage.getItem('luxury_jewel_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCartItems(parsed);
        }
      } catch (e) { }
      loadNavCart();
    };

    window.addEventListener('storage', handleCartSync);
    window.addEventListener('cartUpdated', handleCartSync);

    return () => {
      window.removeEventListener('storage', handleCartSync);
      window.removeEventListener('cartUpdated', handleCartSync);
    };
  }, []);

  const handleUpdateNavCartQuantity = async (id, newQty) => {
    setCartItems(prev => {
      let updated;
      if (newQty <= 0) {
        updated = prev.filter(item => item.id !== id);
      } else {
        updated = prev.map(item => item.id === id ? { ...item, quantity: newQty } : item);
      }
      try {
        localStorage.setItem('luxury_jewel_cart', JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });

    if (id) {
      await updateCartItemQuantityInSupabase(id, newQty);
    }
  };

  const handleRemoveNavCartItem = async (id) => {
    setCartItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      try {
        localStorage.setItem('luxury_jewel_cart', JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });

    if (id) {
      await removeCartItemFromSupabase(id);
    }
  };

  const cartCount = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);

  useEffect(() => {
    getCurrentUser().then(u => setCurrentUser(u));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1080) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [currentLogo, setCurrentLogo] = useState(logoUrl || null);
  const [currentShopName, setCurrentShopName] = useState(shopName || '');

  useEffect(() => {
    if (logoUrl !== undefined) setCurrentLogo(logoUrl);
  }, [logoUrl]);

  useEffect(() => {
    if (shopName) setCurrentShopName(shopName);
  }, [shopName]);

  useEffect(() => {
    const fetchFreshSettings = async () => {
      const { data } = await getSiteSettings();
      if (data) {
        setCurrentLogo(data.logo_url || null);
        setCurrentShopName(data.shop_name || '');
      }
    };
    fetchFreshSettings();

    window.addEventListener('siteSettingsUpdated', fetchFreshSettings);
    return () => window.removeEventListener('siteSettingsUpdated', fetchFreshSettings);
  }, []);

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchBarRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      setIsScrolled(scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(e.target) &&
        !e.target.closest('.vj-search-floating-card')
      ) {
        setIsSearchOpen(false);
      }
      if (!e.target.closest('.vj-nav-item-wrapper')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState(searchQuery || '');

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      if (setSearchQuery) setSearchQuery('');
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await searchProductsInSupabase(trimmed);
        setSearchResults(data || []);
        if (setSearchQuery) setSearchQuery(trimmed);
      } catch (err) {
        console.error('Debounced search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm, setSearchQuery]);

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await getCategoriesFromSupabase(true);
      if (data && data.length > 0) {
        setDynamicCategories(data);
      }

      const subcatRes = await getSubcategoriesFromSupabase();
      if (subcatRes.data) {
        setDynamicSubcategories(subcatRes.data.filter((s) => s.status === 'ACTIVE'));
      }
      setIsLoadingCats(false);
    };
    fetchCats();
  }, []);

  useEffect(() => {
    if (window.location.pathname === '/contact' || window.location.pathname === '/contact-us') {
      setActiveCategory('contact');
    } else if (window.location.pathname.startsWith('/subcategory/')) {
      const pathParts = window.location.pathname.split('/');
      const subName = decodeURIComponent(pathParts[pathParts.length - 1] || '').toLowerCase();
      const matchedSub = dynamicSubcategories.find(s => s.name?.toLowerCase() === subName);
      if (matchedSub && matchedSub.categoryId) {
        setActiveCategory(matchedSub.categoryId);
      }
    }
  }, [dynamicSubcategories, setActiveCategory]);

  const navLinks = [
    { id: 'all', label: 'HOME' },
    ...dynamicCategories.map((cat) => ({
      id: cat.id,
      label: (cat.name || '').toUpperCase()
    })),
    { id: 'contact', label: 'CONTACT' }
  ];

  return (
    <header className={`vj-luxury-navbar ${isOverlay ? 'vj-overlay-navbar' : ''} ${isScrolled ? 'vj-scrolled' : ''}`}>
      <div className="vj-nav-container">

        {/* Mobile Hamburger Button */}
        <button
          className="vj-mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isMobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>

        {/* 1. Left: Dynamic Shop Logo and Name from Admin Panel */}
        <div
          className="vj-brand-wrapper"
          onClick={() => {
            setActiveCategory('all');
            if (window.location.pathname !== '/') window.location.href = '/';
          }}
          style={{ cursor: 'pointer' }}
          title={currentShopName || 'Home'}
        >
          {isLoadingSettings && !currentShopName && !currentLogo ? (
            <div className="vj-brand-shimmer-box" />
          ) : (
            <div className="vj-brand-identity">
              {currentLogo && (
                <img
                  src={currentLogo}
                  alt={currentShopName || 'Shop Logo'}
                  className="vj-shop-logo-img"
                />
              )}
              {currentShopName && (
                <span className="vj-shop-brand-name">{currentShopName}</span>
              )}
            </div>
          )}
        </div>

        {/* 2. Center: Dynamic Categories Navigation Links */}
        <nav className="vj-center-navigation desktop-only">
          {isLoadingCats ? (
            <div className="vj-nav-shimmer-row">
              <span className="vj-cat-shimmer-pill" style={{ width: '110px' }} />
              <span className="vj-cat-shimmer-pill" style={{ width: '80px' }} />
              <span className="vj-cat-shimmer-pill" style={{ width: '75px' }} />
              <span className="vj-cat-shimmer-pill" style={{ width: '90px' }} />
            </div>
          ) : (
            navLinks.map((link) => {
              const categorySubcats = dynamicSubcategories.filter(
                (s) => s.categoryId === link.id && !s.subcategoryId
              );
              const hasDropdown = categorySubcats.length > 0;
              const isOpen = openDropdownId === link.id;

              return (
                <div key={link.id} className="vj-nav-item-wrapper">
                  <button
                    type="button"
                    className={`vj-category-link ${activeCategory === link.id ? 'active' : ''}`}
                    onClick={(e) => {
                      if (link.id === 'all') {
                        setActiveCategory('all');
                        setOpenDropdownId(null);
                        if (window.location.pathname !== '/') window.location.href = '/';
                      } else if (link.id === 'contact') {
                        setActiveCategory('contact');
                        setOpenDropdownId(null);
                        if (window.location.pathname !== '/contact') window.location.href = '/contact';
                      } else if (hasDropdown) {
                        e.preventDefault();
                        setOpenDropdownId((prev) => (prev === link.id ? null : link.id));
                      } else {
                        window.location.href = `/subcategory/${encodeURIComponent((link.label || '').toLowerCase())}`;
                      }
                    }}
                  >
                    <span>{link.label}</span>
                    {hasDropdown && (
                      <svg
                        className={`vj-nav-chevron ${isOpen ? 'rotated' : ''}`}
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </button>

                  {hasDropdown && (
                    <div className={`vj-dropdown-menu ${isOpen ? 'show' : ''}`}>
                      {categorySubcats.map((sub) => (
                        <div
                          key={sub.dbId}
                          className="vj-dropdown-item"
                          onClick={() => {
                            setActiveCategory(link.id);
                            setOpenDropdownId(null);
                            window.location.href = `/subcategory/${encodeURIComponent(sub.name.toLowerCase())}`;
                          }}
                        >
                          {(sub.name || '').replace(/[-_]/g, ' ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* 3. Right: Search & Profile in Navbar */}
        <div className="vj-right-actions" ref={searchBarRef}>
          {/* Desktop Search Bar directly inside Navbar */}
          <div className="vj-navbar-search-box desktop-only">
            <div className="vj-search-input-wrapper">
              <svg className="vj-search-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="vj-search-floating-input"
                placeholder="Search By Product"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.trim()) setIsSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchTerm.trim()) setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim()) {
                    setIsSearchOpen(false);
                    window.location.href = `/search?q=${encodeURIComponent(searchTerm.trim())}`;
                  } else if (e.key === 'Escape') {
                    setIsSearchOpen(false);
                  }
                }}
              />
              {isSearching && <div className="vj-search-spinner" />}
              {searchTerm && (
                <button
                  type="button"
                  className="vj-search-close-icon-btn"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults([]);
                    if (setSearchQuery) setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  title="Clear search"
                  aria-label="Clear"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            {/* Desktop Live Search Suggestions Dropdown */}
            {isSearchOpen && searchTerm.trim() && (
              <div className="vj-floating-search-results">
                <div className="vj-search-header-row">
                  <span>
                    {isSearching ? 'Searching little_rr...' : `Found ${searchResults.length} Products`}
                  </span>
                  <span className="vj-search-hint">Press Enter ↵</span>
                </div>

                {searchResults.length === 0 && !isSearching ? (
                  <div className="vj-search-empty-state">
                    <p>No little_rr found for <strong>"{searchTerm}"</strong></p>
                  </div>
                ) : (
                  <div className="vj-floating-results-list">
                    {searchResults.slice(0, 5).map((item) => {
                      return (
                        <div
                          key={item.id}
                          className="vj-search-result-row"
                          onClick={() => {
                            setIsSearchOpen(false);
                            window.location.href = `/product/${encodeURIComponent(item.name.toLowerCase())}`;
                          }}
                        >
                          <img src={item.image} alt={item.name} className="vj-result-thumb" />
                          <div className="vj-result-info">
                            <span className="vj-result-name">{item.name}</span>
                            <span className="vj-result-sub">
                              {item.categoryName || 'little_rr'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div
                    className="vj-search-footer-action"
                    onClick={() => {
                      setIsSearchOpen(false);
                      window.location.href = `/search?q=${encodeURIComponent(searchTerm.trim())}`;
                    }}
                  >
                    View all {searchResults.length} results →
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shopping Cart Button */}
          <button
            type="button"
            className="vj-cart-btn"
            onClick={() => {
              loadNavCart();
              setIsCartOpen(true);
            }}
            title={cartCount > 0 ? `Shopping Cart (${cartCount} items)` : 'Shopping Cart (Empty)'}
            aria-label="Shopping Cart"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="vj-cart-count-badge">{cartCount}</span>
            )}
          </button>

          {/* User Profile Button */}
          <button
            type="button"
            className="vj-profile-btn"
            onClick={() => { window.location.href = '/account'; }}
            title={currentUser ? ('Account: ' + (currentUser.user_metadata?.full_name || currentUser.email)) : 'Sign In / Register'}
            aria-label="Profile"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {/* Mobile Search Icon Trigger */}
          <button
            type="button"
            className={`vj-search-icon-btn mobile-only ${isSearchOpen ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Search by little_rr name"
            aria-label="Search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Floating Search Card */}
      {isSearchOpen && (
        <div className="vj-search-floating-card mobile-only animate-fade-in">
          <div className="vj-search-input-wrapper">
            <svg className="vj-search-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              autoFocus
              className="vj-search-floating-input"
              placeholder="Search By Product"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  setIsSearchOpen(false);
                  window.location.href = `/search?q=${encodeURIComponent(searchTerm.trim())}`;
                } else if (e.key === 'Escape') {
                  setIsSearchOpen(false);
                }
              }}
            />
            {isSearching && <div className="vj-search-spinner" />}
            <button
              type="button"
              className="vj-search-close-icon-btn"
              onClick={() => {
                setSearchTerm('');
                setSearchResults([]);
                if (setSearchQuery) setSearchQuery('');
                setIsSearchOpen(false);
              }}
              title="Close search"
              aria-label="Close search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Side Drawer Menu (Portaled to document.body) */}
      {typeof document !== 'undefined' && createPortal(
        <>
          <div
            className={`vj-mobile-drawer-overlay ${isMobileMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className={`vj-mobile-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
            <div className="vj-drawer-header">
              <div
                className="vj-drawer-brand-identity"
                onClick={() => {
                  setActiveCategory('all');
                  setIsMobileMenuOpen(false);
                  if (window.location.pathname !== '/') window.location.href = '/';
                }}
              >
                {currentLogo && (
                  <img
                    src={currentLogo}
                    alt={currentShopName || 'Shop Logo'}
                    className="vj-drawer-logo-img"
                  />
                )}
                <span className="vj-drawer-shop-name">
                  {currentShopName || 'Sri Vinayaga Moulding'}
                </span>
              </div>
              <button
                type="button"
                className="vj-drawer-close"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="vj-drawer-links">
              {/* User Account / Profile link in mobile drawer */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  color: '#D4AF37'
                }}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.location.href = '/account';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {currentUser ? (currentUser.user_metadata?.full_name || 'My Account') : 'Sign In / Register'}
                </span>
              </div>

              {navLinks.map((link) => {
                const categorySubcats = dynamicSubcategories.filter(
                  (s) => s.categoryId === link.id && !s.subcategoryId
                );
                const hasSubcats = categorySubcats.length > 0;
                const isExpanded = mobileExpandedCat === link.id;

                return (
                  <div key={link.id} className="vj-drawer-item-group">
                    <div
                      className="vj-drawer-link-row"
                      onClick={() => {
                        if (hasSubcats) {
                          setMobileExpandedCat(isExpanded ? null : link.id);
                        }
                      }}
                      style={hasSubcats ? { cursor: 'pointer' } : undefined}
                    >
                      <button
                        type="button"
                        className={`vj-drawer-link ${activeCategory === link.id ? 'active' : ''}`}
                        onClick={(e) => {
                          if (hasSubcats) {
                            e.stopPropagation();
                            setMobileExpandedCat(isExpanded ? null : link.id);
                            return;
                          }
                          setActiveCategory(link.id);
                          setIsMobileMenuOpen(false);
                          if (link.id === 'all') {
                            if (window.location.pathname !== '/') window.location.href = '/';
                          } else if (link.id === 'contact') {
                            if (window.location.pathname !== '/contact') window.location.href = '/contact';
                          } else {
                            window.location.href = `/subcategory/${encodeURIComponent((link.label || '').toLowerCase())}`;
                          }
                        }}
                      >
                        {link.label}
                      </button>
                      {hasSubcats && (
                        <button
                          type="button"
                          className={`vj-drawer-chevron-btn ${isExpanded ? 'rotated' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMobileExpandedCat(isExpanded ? null : link.id);
                          }}
                          aria-label="Toggle Subcategories"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {hasSubcats && isExpanded && (
                      <div className="vj-drawer-subcats">
                        {categorySubcats.map((sub) => (
                          <div
                            key={sub.dbId}
                            className="vj-drawer-subcat-link"
                            onClick={() => {
                              setActiveCategory(link.id);
                              setIsMobileMenuOpen(false);
                              window.location.href = `/subcategory/${encodeURIComponent(sub.name.toLowerCase())}`;
                            }}
                          >
                            {sub.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </>,
        document.body
      )}

      {/* Customer Login / Register / Profile & Addresses Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthChange={(u) => setCurrentUser(u)}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cartItems}
        onUpdateQuantity={handleUpdateNavCartQuantity}
        onRemoveItem={handleRemoveNavCartItem}
      />
    </header>
  );
};

export default Navbar;
