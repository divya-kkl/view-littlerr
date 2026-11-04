import React, { useState, useEffect } from 'react';
import './Categories.css';
import { getSubcategoriesFromSupabase } from '../services/subcategoryService';

const Categories = ({ activeCategory, onSelectCategory, onSelectSubcategory }) => {
  const [dynamicSubcats, setDynamicSubcats] = useState([]);
  const [isLoadingSubcats, setIsLoadingSubcats] = useState(true);

  useEffect(() => {
    const fetchSubcats = async () => {
      setIsLoadingSubcats(true);
      const catId = activeCategory === 'all' ? null : activeCategory;
      const { data } = await getSubcategoriesFromSupabase(catId, true);
      if (data) {
        // Only show Main Subcategories (Level 1), hide Child categories
        const mainSubcategories = data.filter((s) => !s.subcategoryId);
        setDynamicSubcats(mainSubcategories);
      }

      const hasShimmered = sessionStorage.getItem('appShimmerDone');
      if (hasShimmered) {
        setIsLoadingSubcats(false);
      } else {
        setTimeout(() => {
          setIsLoadingSubcats(false);
        }, 1200);
      }
    };
    fetchSubcats();
  }, [activeCategory]);

  return (
    <section className="categories-section">
      <div className="container">
        <div className="categories-slider-wrapper">
          {/* Cards Track */}
          <div className="categories-slider-track">
            {isLoadingSubcats ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={`shimmer-${idx}`} className="category-tile-card shimmer-tile" />
              ))
            ) : (
              dynamicSubcats.map((subcat) => (
                <div
                  key={subcat.id}
                  className={`category-tile-card ${activeCategory === subcat.id ? 'active' : ''}`}
                  onClick={() => {
                    if (typeof onSelectSubcategory === 'function') {
                      onSelectSubcategory(subcat);
                    } else if (typeof onSelectCategory === 'function') {
                      onSelectCategory(subcat.id);
                    } else {
                      window.location.href = `/subcategory/${encodeURIComponent((subcat.name || '').toLowerCase())}`;
                    }
                  }}
                >
                  <img
                    src={subcat.image || 'https://via.placeholder.com/300x300?text=Jewellery'}
                    alt={subcat.name}
                    className="category-tile-img"
                    loading="lazy"
                  />
                  <div className="category-tile-vignette" />
                  <span className="category-tile-name">{subcat.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Categories;
