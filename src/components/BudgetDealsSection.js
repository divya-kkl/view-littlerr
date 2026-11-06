import React, { useState, useEffect, useRef, useCallback } from 'react';
import './BudgetDealsSection.css';
import { supabase } from '../supabaseClient';
import { getProductsFromSupabase, resolveImageUrl } from '../services/productService';
import { calculateFinalPrice } from '../admin/product/ProductPriceCalculator';

const DEFAULT_TILES = [
  {
    id: 'budget-1',
    label: 'UNDER ₹5000',
    min: 0,
    max: 5000,
    alt: 'little_rr Under ₹5000'
  },
  {
    id: 'budget-2',
    label: '₹5000 - ₹10000',
    min: 5000,
    max: 10000,
    alt: 'little_rr ₹5000 - ₹10000'
  },
  {
    id: 'budget-3',
    label: '₹10000 - ₹25000',
    min: 10000,
    max: 25000,
    alt: 'little_rr ₹10000 - ₹25000'
  },
  {
    id: 'budget-4',
    label: '₹25000 - ₹50000',
    min: 25000,
    max: 50000,
    alt: 'little_rr ₹25000 - ₹50000'
  }
];

const BudgetDealsSection = ({ liveRates = [] }) => {
  const scrollRef = useRef(null);
  const [dealCards, setDealCards] = useState(DEFAULT_TILES);
  const [supabaseProductsList, setSupabaseProductsList] = useState([]);

  // Fetch products dynamically from Supabase
  const loadDynamicProducts = useCallback(async () => {
    try {
      const { data: supabaseProducts } = await getProductsFromSupabase(true);
      const productList = supabaseProducts && supabaseProducts.length > 0 ? supabaseProducts : [];
      setSupabaseProductsList(productList);

      // Map each budget tile dynamically to products from Supabase
      const updatedTiles = DEFAULT_TILES.map((tile, index) => {
        // 1. Try to find a product matching this price range with live rates
        let matchedProduct = null;
        if (liveRates && liveRates.length > 0) {
          matchedProduct = productList.find(p => {
            const { finalPrice } = calculateFinalPrice(p, liveRates);
            return finalPrice >= tile.min && finalPrice <= tile.max && p.image;
          });
        }

        const productForCard = matchedProduct || productList[index % productList.length] || productList[0];

        let imageUrl = '';
        if (productForCard && productForCard.image) {
          imageUrl = resolveImageUrl(productForCard.image);
        } else if (productList[index]?.image) {
          imageUrl = resolveImageUrl(productList[index].image);
        }

        return {
          ...tile,
          image: imageUrl,
          productName: productForCard?.name || tile.alt,
          productId: productForCard?.id || null
        };
      });

      setDealCards(updatedTiles);
    } catch (err) {
      console.error('Error loading dynamic deals products from Supabase:', err);
    }
  }, [liveRates]);

  useEffect(() => {
    loadDynamicProducts();

    // Supabase Realtime Listener: Automatically refresh whenever a new product is added/updated in Supabase
    const subscription = supabase
      .channel('deals_section_products_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          loadDynamicProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [loadDynamicProducts]);

  const handleCardClick = (tile) => {
    let url = '/all-products';
    const params = [];
    if (tile.min !== undefined && tile.min !== null) params.push(`min=${tile.min}`);
    if (tile.max !== undefined && tile.max !== null) params.push(`max=${tile.max}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    window.location.href = url;
  };

  const handleFindFavorites = () => {
    // Shows all little_rr products on one page
    window.location.href = '/all-products';
  };

  const handleImageError = (e, index) => {
    e.target.onerror = null;
    const backupProduct = (supabaseProductsList && supabaseProductsList.length > 0)
      ? supabaseProductsList[(index + 1) % supabaseProductsList.length]
      : null;
    if (backupProduct && backupProduct.image) {
      e.target.src = resolveImageUrl(backupProduct.image);
    }
  };

  return (
    <section className="deals-section" id="budget-deals-section">
      <div className="deals-container">
        <div className="deals-layout-grid">
          {/* 1. Left Text Block & Action Button */}
          <div className="deals-header-card">
            <h2 className="deals-title">Deals You Can't Miss!!</h2>
            <p className="deals-subtitle">
              Grab top budget picks before they're gone!
            </p>
            <button
              type="button"
              className="deals-cta-btn"
              onClick={handleFindFavorites}
              id="deals-find-favorites-btn"
            >
              <span>Find Your Favorites</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* 2. Right Price-Range Cards Grid - 4 columns full cover */}
          <div className="deals-track-wrapper">
            <div className="deals-cards-track" ref={scrollRef}>
              {dealCards.map((tile, idx) => (
                <div
                  key={tile.id}
                  className="deals-tile-card"
                  onClick={() => handleCardClick(tile)}
                  title={`Shop little_rr ${tile.label} - ${tile.productName || ''}`}
                >
                  {tile.image ? (
                    <img
                      src={tile.image}
                      alt={tile.productName || tile.label}
                      className="deals-tile-img"
                      loading="lazy"
                      onError={(e) => handleImageError(e, idx)}
                    />
                  ) : (
                    <div className="deals-tile-placeholder" />
                  )}
                  <div className="deals-tile-vignette" />
                  <span className="deals-tile-badge">{tile.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BudgetDealsSection;
