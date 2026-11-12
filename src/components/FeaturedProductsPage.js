import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlist } from '../redux/slices/wishlistSlice';
import { toggleWishlistInSupabase, matchesWishlistItem } from '../services/wishlistService';
import './CategoryPage.css';
import { getProductsFromSupabase } from '../services/productService';
import { getTagsFromSupabase } from '../services/tagService';
import { getProductPriceInfo } from '../admin/product/ProductPriceCalculator';
import LoadMoreSection from './LoadMoreSection';
import SortDropdown from './SortDropdown';

const FeaturedProductsPage = ({ liveRates = [], wishlist: propWishlist, onToggleWishlist }) => {
  const dispatch = useDispatch();
  const reduxWishlist = useSelector((state) => state.wishlist?.items || []);
  const wishlist = Array.isArray(propWishlist) ? propWishlist : reduxWishlist;
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagTitle, setTagTitle] = useState('');

  const [sortBy, setSortBy] = useState('position');
  const [visibleCount, setVisibleCount] = useState(12);

  const isItemInWishlist = (prod) => {
    if (!prod) return false;
    const pId = String(prod.product_id || prod.dbId || prod.id || prod.productCode || prod.name || '');
    return Array.isArray(wishlist) && wishlist.some(
      w => matchesWishlistItem(w, pId, prod.name)
    );
  };

  useEffect(() => {
    const fetchTaggedProducts = async () => {
      setLoading(true);
      const pathname = window.location.pathname;
      let targetTagName = '';

      if (pathname.startsWith('/tag/')) {
        const parts = pathname.split('/');
        targetTagName = decodeURIComponent(parts[parts.length - 1] || '').trim();
      } else {
        const params = new URLSearchParams(window.location.search);
        targetTagName = params.get('tag') || '';
      }

      const { data: allProducts } = await getProductsFromSupabase(true);
      const { data: allTags } = await getTagsFromSupabase(true);

      if (allProducts) {
        let matched = [];
        if (targetTagName) {
          // Find tag by name or ID
          const matchedTag = allTags?.find(
            t => t.name?.toLowerCase() === targetTagName.toLowerCase() || t.dbId === targetTagName
          );

          setTagTitle(matchedTag ? `${matchedTag.name} Collection` : `${targetTagName.toUpperCase()} little_rr`);

          matched = allProducts.filter(p => {
            if (matchedTag) {
              return p.tagId === matchedTag.dbId || (p.tagName && p.tagName.toLowerCase() === matchedTag.name.toLowerCase());
            }
            return (p.tagName && p.tagName.toLowerCase() === targetTagName.toLowerCase()) || p.tagId === targetTagName;
          });
        } else {
          setTagTitle('All little_rr Collections');
          // Show all products when viewing all-products or favorites
          matched = allProducts;
        }



        setProducts(matched);
        setFilteredProducts(matched);
      }

      setLoading(false);
    };

    fetchTaggedProducts();
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
      <div className="container category-breadcrumbs" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', fontSize: '0.95rem', color: 'var(--primary-green, #003B2F)', fontWeight: '500', letterSpacing: '0.5px' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-green, #003B2F)', textDecoration: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </a>
        <span style={{ margin: '0 10px', color: '#888' }}>&gt;</span>
        {loading ? (
          <div
            className="product-shimmer"
            style={{ width: '160px', height: '18px', borderRadius: '4px', display: 'inline-block' }}
          ></div>
        ) : (
          <span style={{ textTransform: 'uppercase', fontWeight: '700', color: 'var(--primary-green, #003B2F)' }}>
            {tagTitle}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      <div className="container category-page-layout">
        <main className="category-main-content">
          <div className="category-toolbar">
            <div className="sort-box">
              <label>Sort by:</label>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
            <div className="items-count">
              {loading ? (
                <div className="product-shimmer" style={{ width: '180px', height: '16px', borderRadius: '4px' }}></div>
              ) : (
                <>Showing {filteredProducts.length} of {products.length} products</>
              )}
            </div>
          </div>

          {loading ? (
            <div className="products-grid">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`shimmer-tag-${idx}`} className="product-card" style={{ height: '400px' }}>
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
              <h3>No products found in this collection.</h3>
              <button className="btn-gold" onClick={() => { window.location.href = '/'; }} style={{ marginTop: '20px' }}>
                Continue Shopping
              </button>
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
                      <h3
                        className="product-title"
                        onClick={() => {
                          window.location.href = `/product/${encodeURIComponent(product.name.toLowerCase())}`;
                        }}
                        style={{ marginBottom: '8px', color: '#001a33', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer' }}
                      >
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                );
              })}
              </div>

              <LoadMoreSection
                currentCount={Math.min(visibleCount, filteredProducts.length)}
                totalCount={filteredProducts.length}
                onLoadMore={() => setVisibleCount(prev => prev + 12)}
                step={12}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default FeaturedProductsPage;
