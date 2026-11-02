import React, { useState, useEffect, useRef } from 'react';
import './ContactUs.css';
import { FaLocationDot } from "react-icons/fa6";
import { IoCall } from "react-icons/io5";
import { MdEmail } from "react-icons/md";
import { FaClock } from "react-icons/fa6";

const ContactUs = ({ siteSettings, isLoadingSettings }) => {
    const [pageLoading, setPageLoading] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        inquiryType: 'Bridal Jewellery Sets',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const timeoutRef = useRef(null);

    const shopName = siteSettings?.shop_name || 'Sri Vinayaga Moulding';
    const storePhone = siteSettings?.store_phone || '+91 98431 72314';
    const storeEmail = siteSettings?.store_email;
    const storeAddress = siteSettings?.store_address || 'No. 42, Cathedral Road, T. Nagar, Chennai - 600017';
    const storeTiming = siteSettings?.store_timing || 'Mon - Sun: 10:00 AM - 9:00 PM';

    const rawDigits = String(storePhone).replace(/\D/g, '');
    const callUrl = `tel:${rawDigits}`;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const timer = setTimeout(() => {
            setPageLoading(false);
        }, 1000);
        return () => {
            clearTimeout(timer);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        if (!storeEmail) {
            e.preventDefault();
            alert('Shop email is not configured in settings.');
            return;
        }
        setIsSubmitting(true);
        setIsSubmitted(false);
    };

    const handleIframeLoad = () => {
        if (isSubmitting) {
            setIsSubmitting(false);
            setIsSubmitted(true);
            setFormData({
                name: '',
                phone: '',
                email: '',
                inquiryType: 'Bridal Jewellery Sets',
                message: ''
            });
            timeoutRef.current = setTimeout(() => {
                setIsSubmitted(false);
            }, 8000);
        }
    };

    const mapQuery = siteSettings?.latitude && siteSettings?.longitude
        ? `${siteSettings.latitude},${siteSettings.longitude}`
        : storeAddress;
    if (isLoadingSettings || pageLoading) {
        return (
            <div className="vj-contact-page">
                <section className="vj-contact-hero-banner vj-shimmer-hero">
                    <div className="vj-shimmer-pill" />
                    <div className="vj-shimmer-line vj-shimmer-title" />
                    <div className="vj-shimmer-divider" />
                    <div className="vj-shimmer-line vj-shimmer-sub" />
                </section>

                <div className="vj-contact-main-wrapper">
                    <div className="vj-contact-grid">
                        <div className="vj-contact-info-col">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="vj-info-card vj-shimmer-card">
                                    <div className="vj-shimmer-icon" />
                                    <div className="vj-info-body">
                                        <div className="vj-shimmer-line" style={{ width: '90px', height: '12px', marginBottom: '8px' }} />
                                        <div className="vj-shimmer-line" style={{ width: '150px', height: '18px', marginBottom: '8px' }} />
                                        <div className="vj-shimmer-line" style={{ width: '85%', height: '14px' }} />
                                    </div>
                                </div>
                            ))}

                            <div className="vj-contact-actions-row">
                                <div className="vj-shimmer-line" style={{ height: '48px', borderRadius: '12px' }} />
                                <div className="vj-shimmer-line" style={{ height: '48px', borderRadius: '12px' }} />
                            </div>
                        </div>

                        <div className="vj-contact-form-card vj-shimmer-card">
                            <div className="vj-form-header">
                                <div className="vj-shimmer-line" style={{ width: '220px', height: '28px', marginBottom: '10px' }} />
                                <div className="vj-shimmer-line" style={{ width: '75%', height: '14px' }} />
                            </div>

                            <div className="vj-contact-form">
                                <div className="vj-form-row">
                                    <div>
                                        <div className="vj-shimmer-line" style={{ width: '120px', height: '14px', marginBottom: '8px' }} />
                                        <div className="vj-shimmer-line" style={{ width: '100%', height: '46px', borderRadius: '10px' }} />
                                    </div>
                                    <div>
                                        <div className="vj-shimmer-line" style={{ width: '120px', height: '14px', marginBottom: '8px' }} />
                                        <div className="vj-shimmer-line" style={{ width: '100%', height: '46px', borderRadius: '10px' }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="vj-shimmer-line" style={{ width: '110px', height: '14px', marginBottom: '8px' }} />
                                    <div className="vj-shimmer-line" style={{ width: '100%', height: '46px', borderRadius: '10px' }} />
                                </div>

                                <div>
                                    <div className="vj-shimmer-line" style={{ width: '180px', height: '14px', marginBottom: '8px' }} />
                                    <div className="vj-shimmer-line" style={{ width: '100%', height: '120px', borderRadius: '10px' }} />
                                </div>

                                <div className="vj-shimmer-line" style={{ width: '100%', height: '52px', borderRadius: '12px', marginTop: '10px' }} />
                            </div>
                        </div>
                    </div>

                    <div className="vj-contact-map-section vj-shimmer-card" style={{ marginTop: '3.5rem' }}>
                        <div className="vj-map-section-header" style={{ marginBottom: '1.5rem' }}>
                            <div>
                                <div className="vj-shimmer-line" style={{ width: '220px', height: '22px', marginBottom: '6px' }} />
                                <div className="vj-shimmer-line" style={{ width: '280px', height: '14px' }} />
                            </div>
                            <div className="vj-shimmer-line" style={{ width: '180px', height: '38px', borderRadius: '8px' }} />
                        </div>
                        <div className="vj-shimmer-line" style={{ width: '100%', height: '380px', borderRadius: '14px' }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="vj-contact-page">
            <section className="vj-contact-hero-banner">
                <h1 className="vj-contact-hero-title">
                    Connect With <span className="vj-gold-text">{shopName}</span>
                </h1>
                <div className="vj-contact-hero-divider" />
                
            </section>

            <div className="vj-contact-main-wrapper">
                <div className="vj-contact-grid">
                    <div className="vj-contact-info-col">
                        <div className="vj-info-card">
                            <div className="vj-info-icon-box"><FaLocationDot /></div>
                            <div className="vj-info-body">
                                <h3 className="vj-info-title">Store Address</h3>
                                <p className="vj-info-desc">{storeAddress}</p>
                            </div>
                        </div>
                        <div className="vj-info-card">
                            <div className="vj-info-icon-box"><IoCall /></div>
                            <div className="vj-info-body">
                                <h3 className="vj-info-title">Call For Inquiry</h3>
                                <p className="vj-info-desc">
                                    <a href={callUrl}>{storePhone}</a>
                                </p>
                            </div>
                        </div>
                        <div className="vj-info-card">
                            <div className="vj-info-icon-box"><MdEmail /></div>
                            <div className="vj-info-body">
                                <h3 className="vj-info-title">Write To Us</h3>
                                <p className="vj-info-desc">
                                    <a href={`mailto:${storeEmail}`}>{storeEmail}</a>
                                </p>
                            </div>
                        </div>
                        <div className="vj-info-card">
                            <div className="vj-info-icon-box"><FaClock /></div>
                            <div className="vj-info-body">
                                <h3 className="vj-info-title">Visiting Timings</h3>
                                <p className="vj-info-desc">{storeTiming}</p>
                            </div>
                        </div>
                        <div className="vj-contact-actions-row">
                           
                            <a href={callUrl} className="vj-action-btn call">
                                <IoCall size={18} />
                                <span>Call Directly</span>
                            </a>
                        </div>



                    </div>
                    <div className="vj-contact-form-card">
                        <div className="vj-form-header">
                            <h2 className="vj-form-title">Send An Inquiry</h2>
                            <p className="vj-form-subtitle">
                                Please leave your details below. Our jewellery specialists will get in touch with you shortly.
                            </p>
                        </div>

                        {isSubmitted && (
                            <div className="vj-submit-alert-success">
                                <span>✓ Thank you! Your inquiry has been sent to our showroom team. We will contact you shortly.</span>
                            </div>
                        )}


                        <form
                            action={`https://formsubmit.co/${storeEmail}`}
                            method="POST"
                            target="mail_iframe"
                            onSubmit={handleSubmit}
                            className="vj-contact-form"
                        >
                            <input type="hidden" name="_subject" value={`New Jewellery Inquiry from ${formData.name || 'Customer'} - ${shopName}`} />
                            <input type="hidden" name="_template" value="table" />
                            <input type="hidden" name="_captcha" value="false" />
                            <input type="text" name="_honey" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                            <div className="vj-form-row">
                                <div className="vj-form-group">
                                    <label htmlFor="form-name">Your Full Name <span className="req">*</span></label>
                                    <input
                                        id="form-name"
                                        type="text"
                                        name="name"
                                        placeholder="e.g. Priya R."
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="vj-form-group">
                                    <label htmlFor="form-phone">Phone Number <span className="req">*</span></label>
                                    <input
                                        id="form-phone"
                                        type="tel"
                                        name="phone"
                                        placeholder="e.g. +91 98765 43210"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="vj-form-row">
                                <div className="vj-form-group">
                                    <label htmlFor="form-email">Email Address</label>
                                    <input
                                        id="form-email"
                                        type="email"
                                        name="email"
                                        placeholder="e.g. priya@gmail.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="vj-form-group">
                                <label htmlFor="form-message">Jewellery Specifications &amp; Inquiry Details <span className="req">*</span></label>
                                <textarea
                                    id="form-message"
                                    name="message"
                                    rows="4"
                                    placeholder="Tell us about the gold weight (grams), design specifications, or god moulding details you require..."
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="vj-form-submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="vj-btn-spinner" />
                                        <span>Submitting Inquiry...</span>
                                    </>
                                ) : (
                                    <span>Send Inquiry →</span>
                                )}
                            </button>
                        </form>
                        <iframe
                            name="mail_iframe"
                            id="mail_iframe"
                            style={{ display: 'none' }}
                            onLoad={handleIframeLoad}
                            title="Mail Submission Iframe"
                        />
                    </div>

                </div>
                <section className="vj-contact-map-section">
                    <div className="vj-map-section-header">
                        <div>
                            <h3>Visit Our Showroom in Person</h3>
                            <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: '0.92rem' }}>
                                📍 {shopName} • {storeAddress}
                            </p>
                        </div>
                     
                    </div>

                    <div className="vj-map-iframe-box">
                        <iframe
                            title={`${shopName} Location Map`}
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            loading="lazy"
                            allowFullScreen
                        />
                    </div>
                </section>

            </div>
        </div>
    );
};

export default ContactUs;
