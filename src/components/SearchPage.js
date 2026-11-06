import React, { useState, useEffect } from 'react';
import './CategoryPage.css';
import { searchProductsInSupabase } from '../services/productService';
import { getProductWeightDisplay, getProductPriceInfo } from '../admin/product/ProductPriceCalculator';
import LoadMoreSection from './LoadMoreSection';
import SortDropdown from './SortDropdown';

const SearchPage = ({ liveRates = [] }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [sortBy, setSortBy] = useState('position');
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const fetchSearchResults = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get('q') || '';
      setSearchQuery(q);

      if (!q.trim()) {
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await searchProductsInSupabase(q);

      if (data) {
        setProducts(data);
        setFilteredProducts(data);
      }
      setLoading(false);
    };

    fetchSearchResults();
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
      <div className="container category-breadcrumbs" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', fontSize: '0.95rem', color: 'var(--primary-green, #003B2F)', fontWeight: '500', letterSpacing: '0.5px' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-green, #003B2F)', textDecoration: 'none', cursor: 'pointer', transition: 'color 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </a>
        <span style={{ margin: '0 12px', color: 'var(--primary-green, #003B2F)' }}>&gt;</span>
        <span>SEARCH RESULTS FOR "{searchQuery}"</span>
      </div>

        <div className="container category-page-layout">
        <main className="category-main-content">
          <div className="category-toolbar">
            <div className="sort-box">
              <label>Sort by:</label>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>
            <div className="items-count">
              {loading ? (
                <div className="product-shimmer" style={{ width: '140px', height: '16px', borderRadius: '4px' }}></div>
              ) : (
                <>Found {filteredProducts.length} products</>
              )}
            </div>
          </div>

          {loading ? (
            <div className="products-grid">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`shimmer-search-${idx}`} className="product-card" style={{ height: '400px' }}>
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
              <h3>No products found for "{searchQuery}".</h3>
              <button className="btn-gold" onClick={() => window.location.href = '/'} style={{ marginTop: '20px' }}>
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
                    </div>

                    <div className="product-info-box">
                      <h3 className="product-title" onClick={() => { window.location.href = `/product/${encodeURIComponent(product.name.toLowerCase())}` }} style={{ marginBottom: '8px', color: '#001a33', fontSize: '1.05rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        {product.name}
                      </h3>

                      <div className="product-weight-purity" style={{ marginBottom: '8px', color: '#003366', fontSize: '0.88rem' }}>
                        {getProductWeightDisplay(product)} • {product.purity ? product.purity.replace(/\s*gold/i, '').trim() || '22K' : '22K'}
                      </div>

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

export default SearchPage;
