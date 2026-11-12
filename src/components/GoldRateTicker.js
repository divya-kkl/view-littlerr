import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getTopBannersFromSupabase } from '../services/topBannerService';
import RateHistoryModal from './RateHistoryModal';
import './GoldRateTicker.css';

const GoldRateTicker = ({ rates = [], onOpenCalculator, siteSettings, isLoadingSettings, isLoadingRates, lastRateUpdate }) => {
  const [topBanners, setTopBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [shimmering, setShimmering] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fetchBanners = async () => {
    const res = await getTopBannersFromSupabase(true);
    if (res.data) {
      setTopBanners(res.data);
    }
  };

  useEffect(() => {
    fetchBanners();

    // Supabase Realtime Listener on top_banners
    const channel = supabase
      .channel('top_banners_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'top_banners' },
        () => {
          fetchBanners();
        }
      )
      .subscribe();

    const timer = setTimeout(() => {
      setShimmering(false);
    }, 1200);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  // Cycle through banners if there are multiple active
  useEffect(() => {
    if (topBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % topBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [topBanners.length]);

  const activeBanner = topBanners[currentBannerIndex] || topBanners[0];
  const isRatesLoading = shimmering && topBanners.length === 0;

  return (
    <div className="gold-ticker-wrapper">
      <div className={`container ticker-container ${topBanners.length > 0 && !isRatesLoading ? 'has-top-banner' : ''}`}>
        {isRatesLoading ? (
          <div className="ticker-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span
                className="ticker-badge-shimmer"
                style={{
                  display: 'inline-block',
                  width: '90px',
                  height: '22px',
                  borderRadius: '4px',
                }}
              />
              <span
                className="ticker-item-shimmer"
                style={{ display: 'inline-block', width: '220px', height: '14px', borderRadius: '4px' }}
              />
            </div>
          </div>
        ) : topBanners.length > 0 ? (
          <>
            <div className="ticker-spacer" aria-hidden="true" />
            <div className="ticker-announcement-center">
              <div className="ticker-rates-content" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeBanner.link ? (
                  <a
                    href={activeBanner.link}
                    style={{
                      color: '#ffffff',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    <span className="rate-item" style={{ cursor: 'pointer', fontWeight: 500 }}>
                      {activeBanner.content}
                    </span>
                    <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>→</span>
                  </a>
                ) : (
                  <span className="rate-item" style={{ fontWeight: 500 }}>
                    {activeBanner.content}
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="ticker-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {rates.length > 0 ? (
              <>
                <button
                  type="button"
                  className="live-badge live-badge-clickable"
                  onClick={() => setIsHistoryOpen(true)}
                  title="Click to view 7-Day Gold & Silver Rate History"
                  aria-label="View 7-Day Gold & Silver Rate History"
                >
                  <span className="pulse-dot"></span> RATE HISTORY
                  <svg className="live-badge-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className="ticker-rates-wrapper">
                  <div className="ticker-rates-content">
                    <div className="ticker-rates-track">
                      {rates.map((rate, idx) => (
                        <React.Fragment key={`orig-${rate.id || idx}`}>
                          <span className="rate-item">
                            <strong>{rate.type}:</strong> ₹{rate.amount ? rate.amount.toLocaleString('en-IN') : 'N/A'}
                          </span>
                          <span className="divider">|</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <span className="rate-item" style={{ opacity: 0.9 }}>
                Welcome to {siteSettings?.shop_name || 'Sri Vinayaga Moulding'}
              </span>
            )}
          </div>
        )}

        <div className="ticker-right">
          <a
            href={siteSettings?.store_phone ? `tel:${siteSettings.store_phone}` : '#'}
            className="phone-contact"
            title={siteSettings?.store_phone || 'Call Us'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            {isLoadingSettings ? (
              <span className="nav-shimmer phone-number-shimmer" style={{ display: 'inline-block', width: '100px', height: '14px', borderRadius: '4px', marginLeft: '5px' }}></span>
            ) : (
              <span className="phone-number-text">{siteSettings?.store_phone || ''}</span>
            )}
          </a>
        </div>
      </div>

      {/* 7-Day Gold & Silver Rate History Modal (Supabase) */}
      <RateHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onOpenCalculator={onOpenCalculator}
        liveRates={rates}
      />
    </div>
  );
};

export default GoldRateTicker;
