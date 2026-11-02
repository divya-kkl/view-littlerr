import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Navbar.css';
import { getCategoriesFromSupabase } from '../services/categoryService';
import { getSubcategoriesFromSupabase } from '../services/subcategoryService';
import { searchProductsInSupabase } from '../services/productService';
import { getSiteSettings } from '../services/settingService';

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

  // Automatically close mobile menu when exiting responsive view to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1080) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Dynamic Shop Details from Admin Panel (logo and shop name)
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

  // Live Search States
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchBarRef = useRef(null);

  // Detect scroll to style navbar smoothly
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      setIsScrolled(scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close search/dropdown when clicked outside
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

  // Local Search Input State with 350ms Debounce
  const [searchTerm, setSearchTerm] = useState(searchQuery || '');

  // Fetch search results with debounced query
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

  // Fetch categories & subcategories from Supabase
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

  // Purely Dynamic Categories from Supabase + Contact Link
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

        {/* 3. Right: Search in Navbar */}
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
                    {isSearching ? 'Searching Jewellery...' : `Found ${searchResults.length} Products`}
                  </span>
                  <span className="vj-search-hint">Press Enter ↵</span>
                </div>

                {searchResults.length === 0 && !isSearching ? (
                  <div className="vj-search-empty-state">
                    <p>No jewellery found for <strong>"{searchTerm}"</strong></p>
                    <span>  </span>
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
                              {item.categoryName || 'Jewellery'} {item.purity ? `• ${item.purity}` : ''} {item.netWeight ? `• ${item.netWeight}g` : ''}
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

          {/* Mobile Search Icon Trigger */}
          <button
            type="button"
            className={`vj-search-icon-btn mobile-only ${isSearchOpen ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Search by jewellery name"
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

          {/* Bilingual Live Search Suggestions Dropdown */}
          {searchTerm.trim() && (
            <div className="vj-floating-search-results">
              <div className="vj-search-header-row">
                <span>
                  {isSearching ? 'Searching Jewellery...' : `Found ${searchResults.length} Products`}
                </span>
                <span className="vj-search-hint">Press Enter ↵</span>
              </div>

              {searchResults.length === 0 && !isSearching ? (
                <div className="vj-search-empty-state">
                  <p>No jewellery found for <strong>"{searchTerm}"</strong></p>
                  <span>  </span>
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
                            {item.categoryName || 'Jewellery'} {item.purity ? `• ${item.purity}` : ''} {item.netWeight ? `• ${item.netWeight}g` : ''}
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
    </header>
  );
};

export default Navbar;