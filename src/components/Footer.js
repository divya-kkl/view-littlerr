import React from 'react';
import './Footer.css';
import { FaLocationDot, FaClock } from "react-icons/fa6";
import { IoCall } from "react-icons/io5";
import { MdEmail } from "react-icons/md";

const Footer = ({ onSelectCategory, onOpenCalculator, logoUrl, shopName = 'Sri vinayaga Moulding', siteSettings = {}, isLoadingSettings }) => {
  return (
    <footer className="main-footer-section">
      <div className="container">
        <div className="footer-top-grid">

          <div className="footer-brand-col">
            <div className="brand-logo-wrapper" style={{ marginBottom: '1rem', cursor: 'pointer' }} onClick={() => { if (typeof onSelectCategory === 'function') onSelectCategory('all'); if (window.location.pathname !== '/') window.location.href = '/'; }}>
              {logoUrl ? (
                <img src={logoUrl} alt={shopName} style={{ maxHeight: '45px', objectFit: 'contain', marginRight: '10px' }} />
              ) : (
                <div className="brand-emblem">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#goldGradient2)" strokeWidth="1.5">
                    <defs>
                      <linearGradient id="goldGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFE082" />
                        <stop offset="50%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#9E7412" />
                      </linearGradient>
                    </defs>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
              )}
              <div className="brand-text">
                {isLoadingSettings ? (
                  <>
                    <div className="nav-shimmer" style={{ width: '150px', height: '24px', marginBottom: '4px', borderRadius: '4px' }}></div>
                    <div className="nav-shimmer" style={{ width: '180px', height: '12px', borderRadius: '4px' }}></div>
                  </>
                ) : (
                  <>
                    <span className="brand-title brand-font">{shopName?.toUpperCase() || ''}</span>
                    {/* <span className="brand-subtitle">EXQUISITE GOLD & DIAMONDS</span> */}
                  </>
                )}
              </div>
            </div>

            <div className="footer-about-text">
              {isLoadingSettings ? (
                <>
                  <div className="nav-shimmer" style={{ width: '100%', height: '14px', marginBottom: '8px', borderRadius: '4px' }}></div>
                  <div className="nav-shimmer" style={{ width: '90%', height: '14px', marginBottom: '8px', borderRadius: '4px' }}></div>
                  <div className="nav-shimmer" style={{ width: '60%', height: '14px', borderRadius: '4px' }}></div>
                </>
              ) : (
                <p style={{ margin: 0 }}>Experience royal craftsmanship, exclusive gold, diamond and platinum collections, and check live gold rates updated daily. 100% BIS Hallmarked purity guaranteed.</p>
              )}
            </div>

            {/* <div className="footer-social-icons">
              <span className="social-icon">Instagram</span>
              <span className="social-icon">Facebook</span>
              <span className="social-icon">YouTube</span>
              <span className="social-icon">WhatsApp</span>
            </div> */}
          </div>

          {/* Quick Links Col */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Quick Links</h4>
            <ul className="footer-links-list">
              <li onClick={() => { if (typeof onSelectCategory === 'function') onSelectCategory('all'); if (window.location.pathname !== '/') window.location.href = '/'; }}>Home</li>
              <li onClick={() => { window.location.href = '/contact'; }}>Contact Us</li>
            </ul>
          </div>

          {/* Contact Details Col */}
          <div className="footer-contact-col">
            <h4 className="footer-col-title">Store & Contact Info</h4>
            <ul className="footer-contact-list">
              <li>
                <span className="c-icon"><FaLocationDot /></span>
                <span>{isLoadingSettings ? <div className="nav-shimmer" style={{ display: 'inline-block', width: '200px', height: '14px', borderRadius: '4px' }}></div> : (siteSettings?.store_address || 'Sri vinayaga Moulding Flagship Store, No. 42, Cathedral Road, T. Nagar, Chennai - 600017')}</span>
              </li>
              <li
                className="footer-contact-phone-item"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  const phoneString = siteSettings?.store_phone || '+91 98431 72314';
                  const parts = phoneString.split('/');
                  const cleanNumber = parts[0]?.trim().replace(/[^0-9+]/g, '') || '';
                  if (cleanNumber) {
                    window.location.href = `tel:${cleanNumber}`;
                  }
                }}
              >
                {isLoadingSettings ? (
                  <>
                    <span className="c-icon"><IoCall /></span>
                    <div className="nav-shimmer" style={{ display: 'inline-block', width: '120px', height: '14px', borderRadius: '4px' }}></div>
                  </>
                ) : (
                  (() => {
                    const phoneString = siteSettings?.store_phone || '+91 98431 72314';
                    const parts = phoneString.split('/');
                    const firstCleanNumber = parts[0]?.trim().replace(/[^0-9+]/g, '') || '';
                    return (
                      <>
                        <a
                          href={`tel:${firstCleanNumber}`}
                          className="footer-phone-icon-link"
                          title="Call Us"
                          aria-label="Call store"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `tel:${firstCleanNumber}`;
                          }}
                        >
                          <span className="c-icon"><IoCall /></span>
                        </a>
                        <span className="footer-phone-numbers">
                          {parts.map((part, index) => {
                            const trimmed = part.trim();
                            const dialNumber = trimmed.replace(/[^0-9+]/g, '');
                            return (
                              <React.Fragment key={index}>
                                <a
                                  href={`tel:${dialNumber}`}
                                  className="footer-phone-link"
                                  title={`Call ${trimmed}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = `tel:${dialNumber}`;
                                  }}
                                >
                                  {trimmed}
                                </a>
                                {index < parts.length - 1 && <span className="footer-phone-separator"> / </span>}
                              </React.Fragment>
                            );
                          })}
                        </span>
                      </>
                    );
                  })()
                )}
              </li>
              <li>
                <span className="c-icon"><MdEmail /></span>
                <span>
                  {isLoadingSettings ? (
                    <div className="nav-shimmer" style={{ display: 'inline-block', width: '150px', height: '14px', borderRadius: '4px' }}></div>
                  ) : (
                    <a
                      href={`mailto:${siteSettings?.store_email || 'support@godlittle_rr.com'}`}
                      className="footer-phone-link"
                      title="Send Email"
                    >
                      {siteSettings?.store_email || 'support@godlittle_rr.com'}
                    </a>
                  )}
                </span>
              </li>
              <li>
                <span className="c-icon"><FaClock /></span>
                <span>{isLoadingSettings ? <div className="nav-shimmer" style={{ display: 'inline-block', width: '140px', height: '14px', borderRadius: '4px' }}></div> : (siteSettings?.store_timing || 'Mon - Sun: 10:00 AM - 9:00 PM')}</span>
              </li>
            </ul>

            {/* WhatsApp and Instagram Social Links */}
            <div className="footer-contact-socials">
              <a
                href={`https://wa.me/${(() => {
                  const raw = siteSettings?.store_phone || '9843172314';
                  const digits = raw.replace(/\D/g, '');
                  return digits.length >= 10 ? (digits.length === 10 ? `91${digits}` : digits) : '919843172314';
                })()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-icon whatsapp-icon"
                title="Chat on WhatsApp"
                aria-label="WhatsApp"
              >
                <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M16.002 2.667C8.64 2.667 2.669 8.638 2.669 16c0 2.583.742 5.087 2.148 7.234L3.109 29.14l6.109-1.603a13.255 13.255 0 006.784 1.796h.005c7.36 0 13.332-5.972 13.332-13.333 0-3.564-1.388-6.914-3.909-9.435s-5.871-3.901-9.428-3.901zm7.777 18.917c-.324.912-1.884 1.743-2.633 1.856-.673.101-1.523.142-2.457-.156-.567-.18-1.294-.421-2.223-.822-3.916-1.691-6.471-5.633-6.667-5.892-.196-.261-1.593-2.117-1.593-4.037 0-1.921 1.008-2.866 1.366-3.257.358-.39.78-.488 1.04-.488.261 0 .521.002.748.013.239.011.56-.09.877.671.325.78 1.106 2.698 1.203 2.894.098.196.163.424.033.684-.13.261-.196.423-.39.651-.196.229-.412.511-.587.685-.196.196-.399.408-.171.8.228.391 1.01 1.667 2.169 2.702 1.49 1.33 2.747 1.742 3.137 1.938.391.195.62.163.847-.099.228-.261.978-1.139 1.238-1.53.26-.391.521-.326.879-.195.358.13 2.276 1.073 2.666 1.269.391.196.652.293.749.456.097.163.097.945-.228 1.856z" />
                </svg>
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-icon instagram-icon"
                title="Follow on Instagram"
                aria-label="Instagram"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>



          <div className="footer-map-col">
            <h4 className="footer-col-title">Store Location</h4>
            <div className="map-snippet-box">
              {isLoadingSettings ? (
                <div className="nav-shimmer" style={{ width: '100%', height: '210px', borderRadius: '10px' }}></div>
              ) : siteSettings?.latitude && siteSettings?.longitude ? (
                <iframe
                  title="Store Location"
                  width="100%"
                  height="210"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://maps.google.com/maps?q=${siteSettings.latitude},${siteSettings.longitude}&hl=en&z=14&output=embed`}
                  style={{ borderRadius: '10px', border: 'none', display: 'block' }}
                ></iframe>
              ) : (
                <div className="map-fake-bg" style={{ minHeight: '210px' }}>
                  <span className="map-pin-icon">📍</span>
                  <span className="map-location-name">{shopName}</span>
                  <small>Open in Google Maps</small>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="copyright-text">
            {isLoadingSettings ? (
              <div className="nav-shimmer" style={{ display: 'inline-block', width: '220px', height: '14px', borderRadius: '4px' }}></div>
            ) : (
              `© ${new Date().getFullYear()} ${shopName}. All Rights Reserved.`
            )}
          </div>

          <div className="developer-attribution">
            <a
              href="https://www.kitzo.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="kitzo-link"
              title="Kitzo Technologies"
            >
              Designed &amp; Developed by Kitzo Technologies
            </a>
          </div>
          {/* 
          <div className="payment-badges-row">
            <span className="p-badge">BIS 916 Hallmark</span>
            <span className="p-badge">IGI Diamond Certified</span>
            <span className="p-badge">Razorpay Secure</span>
            <span className="p-badge">Insured Delivery</span>
          </div> */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
