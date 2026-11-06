import React, { useState, useEffect } from 'react';
import './Banner2Section.css';
import { getBanner2FromSupabase } from '../services/banner2Service';

const DEFAULT_BANNER2_SLIDES = [
  {
    id: 'default-b2-1',
    image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=1600&q=80',
    title: 'Divine Temple little_rr Collection',
    subtitle: 'Handcrafted Heritage • 916 BIS Hallmarked Purity'
  }
];

const Banner2Section = () => {
  const [slides, setSlides] = useState(DEFAULT_BANNER2_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      setIsLoading(true);
      const { data } = await getBanner2FromSupabase(true);
      if (data && data.length > 0) {
        setSlides(data);
      } else {
        // Fallback default promotional banner if table is empty or being set up
        setSlides(DEFAULT_BANNER2_SLIDES);
      }
      setIsLoading(false);
    };

    fetchBanners();
  }, []);

  // Auto-cycle if multiple Banner 2 slides exist
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="banner2-section">
      <div className="banner2-fullwidth-container">
        <div className="banner2-card-wrapper">
          {isLoading ? (
            <div className="banner2-shimmer-box" />
          ) : (
            <div className="banner2-slider-container">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id || idx}
                  className={`banner2-slide ${currentSlide === idx ? 'active' : ''}`}
                  style={{
                    opacity: currentSlide === idx ? 1 : 0,
                    zIndex: currentSlide === idx ? 2 : 1
                  }}
                  onClick={() => {
                    if (slide.linkUrl) {
                      window.location.href = slide.linkUrl;
                    }
                  }}
                >
                  <img
                    src={slide.image}
                    alt={`Banner 2 Slide ${idx + 1}`}
                    className="banner2-image"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}

              {/* Slider Arrows if multiple banners exist */}
              {slides.length > 1 && (
                <>
                  <button
                    type="button"
                    className="banner2-nav-arrow prev"
                    onClick={handlePrev}
                    aria-label="Previous Slide"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="banner2-nav-arrow next"
                    onClick={handleNext}
                    aria-label="Next Slide"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  <div className="banner2-dots">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`banner2-dot ${currentSlide === idx ? 'active' : ''}`}
                        onClick={() => setCurrentSlide(idx)}
                        aria-label={`Go to Banner 2 slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Banner2Section;
