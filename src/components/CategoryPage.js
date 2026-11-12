import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleWishlist } from '../redux/slices/wishlistSlice';
import { toggleWishlistInSupabase } from '../services/wishlistService';
import './CategoryPage.css';
import { getProductsFromSupabase } from '../services/productService';
import { getSubcategoriesFromSupabase, getChildCategories, getCategoryBreadcrumbs } from '../services/subcategoryService';
import { getProductPriceInfo } from '../admin/product/ProductPriceCalculator';
import LoadMoreSection from './LoadMoreSection';
import SortDropdown from './SortDropdown';

const CategoryPage = ({ liveRates = [], wishlist: propWishlist, onToggleWishlist }) => {
  const dispatch = useDispatch();
  const reduxWishlist = useSelector((state) => state.wishlist?.items || []);
  const wishlist = Array.isArray(propWishlist) && propWishlist.length > 0 ? propWishlist : reduxWishlist;

  const isItemInWishlist = (prod) => {
    const pId = String(prod.dbId || prod.id || prod.productCode || prod.name);
    return Array.isArray(wishlist) && wishlist.some(
      w => String(w.dbId || w.id || w.product_id || w.name) === pId
    );
  };

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [childCategories, setChildCategories] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('position');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const fetchCategoryPageData = async () => {
      const pathParts = window.location.pathname.split('/');
      const urlName = decodeURIComponent(pathParts[pathParts.length - 1] || '');
      setSubcategoryName(urlName);

      if (!urlName) {
        setLoading(false);
        return;
      }

      // 1. Fetch subcategory data to find current ID and child categories
      const { data: allSubcats } = await getSubcategoriesFromSupabase(null, true);
      let matchedSubcat = null;

      if (allSubcats && allSubcats.length > 0) {
        matchedSubcat = allSubcats.find(
          s => s.name && s.name.toLowerCase() === urlName.toLowerCase()
        );

        if (matchedSubcat) {
          // Fetch child categories for this subcategory
          const { data: children } = await getChildCategories(matchedSubcat.dbId, true);
          setChildCategories(children || []);

          // Fetch breadcrumb hierarchy
          const { data: crumbs } = await getCategoryBreadcrumbs(matchedSubcat.dbId);
          setBreadcrumbs(crumbs || []);
        } else {
          setChildCategories([]);
          setBreadcrumbs([]);
        }
      }

      // 2. Fetch products directly assigned to this subcategory
      const { data: allProducts } = await getProductsFromSupabase(true);
      if (allProducts) {
        const matchingProducts = allProducts.filter(p => {
          if (matchedSubcat) {
            return p.subcategoryId === matchedSubcat.dbId;
          }
          return p.subcategoryName && p.subcategoryName.toLowerCase() === urlName.toLowerCase();
        });
        setProducts(matchingProducts);
        setFilteredProducts(matchingProducts);
      }

      const hasShimmered = sessionStorage.getItem(`catShimmer_${urlName}`);
      if (hasShimmered) {
        setLoading(false);
      } else {
        setTimeout(() => {
          setLoading(false);
          sessionStorage.setItem(`catShimmer_${urlName}`, 'true');
        }, 800);
      }
    };

    fetchCategoryPageData();
  }, []);

  useEffect(() => {
    let result = [...products];

    if (sortBy === 'name-a-z') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'name-z-a') {
      result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sortBy === 'position') {
      result.sort((a, b) => (a.position || 0) - (b.position || 0));
    }

    setFilteredProducts(result);
    setVisibleCount(12);
  }, [sortBy, products]);

  return (
    <div className="category-page-container animate-fade-in" style={{ paddingTop: '20px' }}>
      {/* Breadcrumbs Navigation */}
      <div className="container category-breadcrumbs" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', fontSize: '0.95rem', color: 'var(--primary-green, #003B2F)', fontWeight: '500', letterSpacing: '0.5px', flexWrap: 'wrap', gap: '6px' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-green, #003B2F)', textDecoration: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </a>

        {breadcrumbs.length > 0 ? (
          breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || idx}>
              <span style={{ color: '#888' }}>&gt;</span>
              {idx === breadcrumbs.length - 1 ? (
                <span style={{ textTransform: 'uppercase', fontWeight: '700', color: 'var(--primary-green, #003B2F)' }}>{crumb.name}</span>
              ) : crumb.isMainCategory ? (
                <span style={{ textTransform: 'uppercase', color: '#666' }}>{crumb.name}</span>
              ) : (
                <a href={`/subcategory/${encodeURIComponent(crumb.name)}`} style={{ textTransform: 'uppercase', color: 'var(--primary-green, #003B2F)', textDecoration: 'none' }}>
                  {crumb.name}
                </a>
              )}
            </React.Fragment>
          ))
        ) : (
          <>
            <span style={{ margin: '0 6px', color: 'var(--primary-green, #003B2F)' }}>&gt;</span>
            <span style={{ textTransform: 'uppercase' }}>{subcategoryName}</span>
          </>
        )}
      </div>

      <div className="container category-page-layout">
        <main className="category-main-content">

          {childCategories.length > 0 && (
            <div className="category-child-cards-section">
              <div className="shop-by-category-header">
                <div className="header-line"></div>
                <span className="header-diamond">◆</span>
                <h3 className="shop-by-category-title">SHOP BY CATEGORY</h3>
                <span className="header-diamond">◆</span>
                <div className="header-line"></div>
              </div>

              <div className="category-child-grid">
                {childCategories.map(child => (
                  <div
                    key={child.id}
                    className="child-card-wrapper"
                    onClick={() => {
                      window.location.href = `/subcategory/${encodeURIComponent(child.name)}`;
                    }}
                  >
                    <div className="child-card-img-box">
                      {child.image ? (
                        <img
                          src={child.image}
                          alt={child.name}
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="child-card-fallback">
                          <span>{child.name?.charAt(0)?.toUpperCase() || 'J'}</span>
                        </div>
                      )}
                    </div>
                    <div className="child-card-meta">
                      <h4 className="child-card-title">{child.name}</h4>
                      <span className="child-card-explore">
                        Explore Now <span className="explore-arrow">→</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="category-toolbar">
            <div className="sort-box">
              <label>Sort by:</label>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
            <div className="items-count">
              {loading ? (
                <div className="product-shimmer" style={{ width: '200px', height: '16px', borderRadius: '4px' }}></div>
              ) : (
                <>Showing {filteredProducts.length} of {products.length} products directly in <strong>{subcategoryName}</strong></>
              )}
            </div>
          </div>

          {loading ? (
            <div className="products-grid">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`shimmer-cat-${idx}`} className="product-card" style={{ height: '400px' }}>
                  <div className="product-shimmer" style={{ width: '100%', height: '240px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}></div>
                  <div className="product-info-box">
                    <div className="product-shimmer" style={{ width: '80%', height: '20px', marginBottom: '12px', borderRadius: '4px' }}></div>
                    <div className="product-shimmer" style={{ width: '60%', height: '14px', marginBottom: '16px', borderRadius: '4px' }}></div>
                    <div className="product-shimmer" style={{ width: '40%', height: '24px', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="no-products-found" style={{ padding: '50px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💎</div>
              <h3 style={{ color: 'var(--primary-green, #003B2F)' }}>No products directly listed in {subcategoryName}</h3>
              {childCategories.length > 0 && (
                <p style={{ color: '#666', marginTop: '8px' }}>
                  Please explore the Child Collections above to see related little_rr items.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="products-grid">
                {filteredProducts.slice(0, visibleCount).map((product) => {
                  const priceInfo = getProductPriceInfo(product, liveRates);
                  return (
                  <div key={product.id} className="product-card">
                    <div
                      className="product-img-wrapper"
                      onClick={() => {
                        window.location.href = `/product/${encodeURIComponent(product.name.toLowerCase())}`;
                      }}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                      title={`Click to view ${product.name}`}
                    >
                      <img src={product.image} alt={product.name} loading="lazy" />
                      {product.badge && <span className="product-badge">{product.badge}</span>}

                      {/* Floating Wishlist Heart Icon */}
                      <button
                        type="button"
                        className={`wishlist-heart-btn ${isItemInWishlist(product) ? 'in-wishlist' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof onToggleWishlist === 'function') {
                            onToggleWishlist(product);
                          } else {
                            dispatch(toggleWishlist(product));
                            toggleWishlistInSupabase(product);
                          }
                        }}
                        title={isItemInWishlist(product) ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        aria-label="Wishlist"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill={isItemInWishlist(product) ? '#e11d48' : 'none'}
                          stroke={isItemInWishlist(product) ? '#e11d48' : '#003B2F'}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>
                    </div>

                    <div className="product-info-box">
                      <h3 className="product-title" onClick={() => { window.location.href = `/product/${encodeURIComponent(product.name.toLowerCase())}` }} style={{ marginBottom: '8px', color: '#001a33', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        {product.name}
                      </h3>

                      <div className="product-price-section" style={{ marginBottom: '12px' }}>
                        {priceInfo.sellingPrice > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-green, #003B2F)' }}>
                              ₹{priceInfo.sellingPrice.toLocaleString('en-IN')}
                            </span>
                            {priceInfo.mrp > priceInfo.sellingPrice && (
                              <span style={{ fontSize: '0.85rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                                ₹{priceInfo.mrp.toLocaleString('en-IN')}
                              </span>
                            )}
                            {priceInfo.discount > 0 && (
                              <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 'bold' }}>
                                ({priceInfo.discount}% OFF)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#003B2F', fontSize: '0.9rem', fontWeight: 600 }}>
                            Price on Request
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="view-product-btn"
                      onClick={() => {
                        window.location.href = `/product/${encodeURIComponent(product.name.toLowerCase())}`;
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--primary-green, #003B2F)',
                        color: 'white',
                        border: 'none',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 'bold',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        marginTop: 'auto'
                      }}
                    >
                      VIEW PRODUCT
                    </button>
                  </div>
                );
              })}
              </div>

              <LoadMoreSection
                currentCount={Math.min(visibleCount, filteredProducts.length)}
                totalCount={filteredProducts.length}
                onLoadMore={() => setVisibleCount((prev) => prev + 12)}
                step={12}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CategoryPage;
