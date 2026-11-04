import React, { useState, useEffect } from 'react';
import './Testimonials.css';
import { supabase } from '../supabaseClient';
import { INSTAGRAM_POSTS } from '../data/jewelleryData';
import { getTestimonialsFromSupabase } from '../services/testimonialService';

const DEFAULT_FALLBACK_TESTIMONIALS = [
  {
    id: 'default-1',
    name: 'Priya R.',
    location: 'Kalayarkovil',
    review: 'Exceptional craftsmanship and transparent gold pricing. The hallmark purity and lightweight temple design exceeded our expectations.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    verifiedBuyer: true
  },
  {
    id: 'default-2',
    name: 'Iniya M.',
    location: 'Madurai',
    review: 'Outstanding quality and pure 916 gold finishing. Customer service and billing transparency are truly commendable.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    verifiedBuyer: true
  },
  {
    id: 'default-3',
    name: 'Kavitha S.',
    location: 'Coimbatore',
    review: 'Authentic 916 BIS Hallmarked jewellery. The temple necklace craftsmanship is absolutely stunning and divine!',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    verifiedBuyer: true
  }
];

const Testimonials = ({ shopName = 'Sri vinayaga Moulding', isLoadingSettings }) => {
  const [dynamicTestimonials, setDynamicTestimonials] = useState([]);
  const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true);

  const fetchTestimonials = async () => {
    setIsLoadingTestimonials(true);
    const { data } = await getTestimonialsFromSupabase(true);
    if (data && data.length > 0) {
      setDynamicTestimonials(data);
    }
    setIsLoadingTestimonials(false);
  };

  useEffect(() => {
    fetchTestimonials();

    // Supabase Realtime Listener for Testimonials
    const subscription = supabase
      .channel('testimonials_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'testimonials' },
        () => {
          fetchTestimonials();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Guarantee exactly 3 cards in the row for a professional 3-container layout
  const getDisplayedTestimonials = () => {
    if (dynamicTestimonials.length >= 3) {
      return dynamicTestimonials.slice(0, 3);
    }
    // Supplement with authentic luxury fallbacks if fewer than 3 reviews are in Supabase
    const combined = [...dynamicTestimonials];
    for (let i = 0; combined.length < 3 && i < DEFAULT_FALLBACK_TESTIMONIALS.length; i++) {
      if (!combined.some(t => t.name?.toLowerCase() === DEFAULT_FALLBACK_TESTIMONIALS[i].name.toLowerCase())) {
        combined.push(DEFAULT_FALLBACK_TESTIMONIALS[i]);
      }
    }
    return combined.slice(0, 3);
  };

  const displayedList = getDisplayedTestimonials();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayedList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === displayedList.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="testimonials-section">
      <div className="container">
        {/* Section Header */}
        <div className="section-header text-center">
          <span className="section-subtitle brand-font">REAL STORIES OF TRUST</span>
          <h2 className="section-title">Loved by Thousands of Customers</h2>
          <div className="gold-divider"></div>
        </div>

        {/* Testimonials Slider Area */}
        <div className="testimonials-slider-container">
          {displayedList.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="testi-side-arrow prev"
              aria-label="Previous review"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Professional 3-Container Grid */}
          <div className="testimonials-grid">
          {isLoadingTestimonials ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`shimmer-t-${idx}`} className="testimonial-card">
                <div className="testi-shimmer" style={{ width: '80px', height: '16px', marginBottom: '15px', borderRadius: '4px' }}></div>
                <div className="testi-shimmer" style={{ width: '100%', height: '14px', marginBottom: '8px', borderRadius: '4px' }}></div>
                <div className="testi-shimmer" style={{ width: '80%', height: '14px', marginBottom: '20px', borderRadius: '4px' }}></div>

                <div className="customer-profile-row" style={{ marginTop: 'auto' }}>
                  <div className="testi-shimmer" style={{ width: '48px', height: '48px', borderRadius: '50%' }}></div>
                  <div className="customer-meta" style={{ flex: 1 }}>
                    <div className="testi-shimmer" style={{ width: '100px', height: '14px', marginBottom: '6px', borderRadius: '4px' }}></div>
                    <div className="testi-shimmer" style={{ width: '140px', height: '12px', borderRadius: '4px' }}></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            displayedList.map((t, idx) => (
              <div
                key={t.id}
                className={`testimonial-card ${idx === currentIndex ? 'mobile-active' : 'mobile-hidden'}`}
              >
                {/* Card Header with Stars and Elegant Quote Mark */}
                <div className="testi-card-header">
                  <div className="stars-row" title={`${t.rating || 5} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={i < (t.rating || 5) ? '#D4AF37' : '#E0E0E0'}
                        stroke={i < (t.rating || 5) ? '#D4AF37' : '#E0E0E0'}
                        strokeWidth="1"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                  </div>

                  <svg className="quote-mark-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>

                <p className="testimonial-quote">“{t.review}”</p>

                {/* Customer Profile Row */}
                <div className="customer-profile-row">
                  {t.image ? (
                    <img src={t.image} alt={t.name} className="customer-avatar" />
                  ) : (
                    <div className="customer-avatar customer-avatar-initials">
                      {t.name ? t.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                  )}
                  <div className="customer-meta">
                    <h4 className="customer-name">{t.name}</h4>
                    <div className="customer-sub-meta">
                      {t.location && <span className="customer-location">📍 {t.location}</span>}
                      {t.verifiedBuyer !== false && (
                        <span className="verified-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Verified Buyer
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          </div>

          {displayedList.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="testi-side-arrow next"
              aria-label="Next review"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Mobile Dots Indicator */}
        {displayedList.length > 1 && (
          <div className="testi-nav-dots">
            {displayedList.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`testi-dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(i)}
                aria-label={`Go to review ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Instagram Showcase */}
        <div className="social-showcase-wrapper">
          <div className="section-header text-center" style={{ marginTop: '5rem', marginBottom: '2rem' }}>
            <h2 className="section-title">Shop Our Instagram Gallery</h2>
            <div className="gold-divider"></div>
            <p className="insta-gallery-subtitle">
              Real moments, handcrafted bridal designs & divine temple heirlooms. Tag us to get featured!
            </p>
          </div>

          <div className="insta-gallery-grid">
            {isLoadingTestimonials ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={`shimmer-insta-${idx}`} className="insta-post-card testi-shimmer"></div>
              ))
            ) : (
              INSTAGRAM_POSTS.map((post) => (
                <a
                  key={post.id}
                  href={post.url || "https://www.instagram.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="insta-post-card"
                  title={`View ${post.tag} on Instagram`}
                >
                  <img
                    src={post.image}
                    alt="Jewellery Instagram Showcase"
                    loading="lazy"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="insta-overlay">
                    <div className="insta-icon-badge">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </div>
                    {post.likes && (
                      <span className="insta-likes">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#D4AF37" stroke="#D4AF37" strokeWidth="1.5">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        {post.likes}
                      </span>
                    )}
                    {post.tag && <span className="insta-post-tag">{post.tag}</span>}
                  </div>
                </a>
              ))
            )}
          </div>

          {/* Luxury Instagram Follow CTA */}
          {/* <div className="insta-cta-row">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="insta-follow-btn"
            >
              <svg className="insta-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span>Follow Us On Instagram</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div> */}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
