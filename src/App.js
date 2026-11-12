import React, { useState, useEffect } from 'react';
import './App.css';
import GoldRateTicker from './components/GoldRateTicker';
import Navbar from './components/Navbar';
import HeroCarousel from './components/HeroCarousel';
import Categories from './components/Categories';
import ProductGrid from './components/ProductGrid';
import GoldCalculatorModal from './components/GoldCalculatorModal';
import Banner2Section from './components/Banner2Section';
import Testimonials from './components/Testimonials';

import QuickViewModal from './components/QuickViewModal';
import ProductDetailsPage from './components/ProductDetailsPage';
import CategoryPage from './components/CategoryPage';
import SearchPage from './components/SearchPage';
import FeaturedProductsPage from './components/FeaturedProductsPage';
import Footer from './components/Footer';
import ContactUs from './components/ContactUs';
import AccountPage from './components/AccountPage';
import CartPage from './components/CartPage';
import CheckoutPage from './components/CheckoutPage';
import WishlistPage from './components/WishlistPage';
import AdminPanel from './admin/AdminPanel';

import { PRODUCTS } from './data/little_rrData';
import { getRatesFromSupabase } from './services/rateService';
import { getSiteSettings } from './services/settingService';
import { getTagsFromSupabase } from './services/tagService';
import {
  fetchWishlistFromSupabase,
  addToWishlistInSupabase,
  removeFromWishlistInSupabase,
  matchesWishlistItem
} from './services/wishlistService';
import { supabase } from './supabaseClient';
import { useDispatch, useSelector } from 'react-redux';
import { setWishlist, addToWishlist, removeFromWishlist } from './redux/slices/wishlistSlice';
import { setLiveRates } from './redux/slices/ratesSlice';

function App() {
  const dispatch = useDispatch();
  const reduxWishlist = useSelector((state) => state.wishlist?.items || []);
  const reduxRates = useSelector((state) => state.rates?.liveRates || []);

  const [activeCategory, setActiveCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [goldRates, setGoldRates] = useState([]);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [products] = useState(PRODUCTS);
  const [siteTags, setSiteTags] = useState([]);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [siteSettings, setSiteSettings] = useState(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
      setShowScrollTop(scrollY > 250);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchRates = async () => {
      setIsLoadingRates(true);
      const { data, error } = await getRatesFromSupabase();
      if (!error && data) {
        const current = data.filter(r => r.isCurrent);
        setGoldRates(current);
        dispatch(setLiveRates(current));
      }
      setTimeout(() => {
        setIsLoadingRates(false);
      }, 1500);
    };

    const fetchTags = async () => {
      const { data } = await getTagsFromSupabase(true);
      if (data && data.length > 0) {
        setSiteTags(data);
      }
    };

    const fetchSettings = async () => {
      const { data } = await getSiteSettings();
      if (data) {
        setSiteSettings(data);
      } else {
        setSiteSettings({ shop_name: 'Sri vinayaga Moulding' });
      }

      const hasShimmered = sessionStorage.getItem('appShimmerDone');
      if (hasShimmered) {
        setIsLoadingSettings(false);
      } else {
        setTimeout(() => {
          setIsLoadingSettings(false);
          sessionStorage.setItem('appShimmerDone', 'true');
        }, 1500);
      }
    };

    fetchRates();
    fetchTags();
    fetchSettings();

    // Fetch Wishlist from Supabase on load
    fetchWishlistFromSupabase().then((res) => {
      if (res && res.wishlist) {
        dispatch(setWishlist(res.wishlist));
      }
    });

    const handleWishlistSync = () => {
      try {
        const saved = localStorage.getItem('wishlist');
        if (saved) {
          dispatch(setWishlist(JSON.parse(saved)));
        }
      } catch (e) {}
    };
    window.addEventListener('wishlistUpdated', handleWishlistSync);

    // Supabase Realtime Listener for Tags
    const tagChannel = supabase
      .channel('app_tags_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => {
        fetchTags();
      })
      .subscribe();

    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistSync);
      supabase.removeChannel(tagChannel);
    };
  }, [dispatch]);

  const handleToggleWishlist = async (product) => {
    const prodId = String(product.product_id || product.dbId || product.id || product.productCode || product.name || '');
    const isCurrentlyInWishlist = reduxWishlist.some(
      (w) => matchesWishlistItem(w, prodId, product.name)
    );

    if (isCurrentlyInWishlist) {
      dispatch(removeFromWishlist(prodId));
      await removeFromWishlistInSupabase(product);
    } else {
      dispatch(addToWishlist(product));
      await addToWishlistInSupabase(product);
    }
  };

  const currentRates = goldRates.length > 0 ? goldRates : reduxRates;
  const currentWishlist = reduxWishlist;

  const isAdminRoute = window.location.pathname === '/admin';
  const isProductRoute = window.location.pathname.startsWith('/product/');
  const isSubcategoryRoute = window.location.pathname.startsWith('/subcategory/');
  const isSearchRoute = window.location.pathname.startsWith('/search');
  const isContactRoute = window.location.pathname === '/contact' || window.location.pathname === '/contact-us';
  const isWishlistRoute = window.location.pathname === '/wishlist' || window.location.pathname === '/my-wishlist';
  const isCartRoute = window.location.pathname === '/cart' || window.location.pathname === '/shopping-cart';
  const isCheckoutRoute = window.location.pathname === '/checkout' ||
    window.location.pathname === '/order';
  const isAccountRoute = window.location.pathname === '/account' ||
    window.location.pathname === '/profile' ||
    window.location.pathname === '/login' ||
    window.location.pathname === '/register' ||
    window.location.pathname === '/user' ||
    window.location.pathname === '/orders' ||
    window.location.pathname === '/my-orders';
  const isFeaturedRoute = window.location.pathname === '/featured' ||
    window.location.pathname === '/products' ||
    window.location.pathname === '/all-products' ||
    window.location.pathname.startsWith('/tag/');

  if (isAdminRoute) {
    return (
      <AdminPanel
        onClose={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  return (
    <div className="god-little_rr-app">
      <GoldRateTicker
        rates={goldRates}
        isLoadingRates={isLoadingRates}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        siteSettings={siteSettings}
        isLoadingSettings={isLoadingSettings}
        lastRateUpdate={goldRates.length > 0 ? (goldRates[0].updatedAt || goldRates[0].createdAt) : null}
      />

      {/* 2. Main Royal Navigation Bar */}
      <Navbar
        activeCategory={isContactRoute ? 'contact' : activeCategory}
        setActiveCategory={setActiveCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        wishlistCount={currentWishlist.length}
        onOpenWishlist={() => { }}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        logoUrl={siteSettings?.logo_url}
        shopName={siteSettings?.shop_name}
        isLoadingSettings={isLoadingSettings}
        liveRates={currentRates}
        isOverlay={false}
      />

      {isContactRoute ? (
        <ContactUs siteSettings={siteSettings} isLoadingSettings={isLoadingSettings} />
      ) : isWishlistRoute ? (
        <WishlistPage liveRates={currentRates} />
      ) : isAccountRoute ? (
        <AccountPage siteSettings={siteSettings} />
      ) : isCartRoute ? (
        <CartPage />
      ) : isCheckoutRoute ? (
        <CheckoutPage siteSettings={siteSettings} liveRates={currentRates} />
      ) : isProductRoute ? (
        <ProductDetailsPage
          key={window.location.pathname}
          liveRates={currentRates}
          wishlist={currentWishlist}
          onToggleWishlist={handleToggleWishlist}
        />
      ) : isSubcategoryRoute ? (
        <CategoryPage
          liveRates={currentRates}
          wishlist={currentWishlist}
          onToggleWishlist={handleToggleWishlist}
        />
      ) : isSearchRoute ? (
        <SearchPage
          liveRates={currentRates}
          wishlist={currentWishlist}
          onToggleWishlist={handleToggleWishlist}
        />
      ) : isFeaturedRoute ? (
        <FeaturedProductsPage
          liveRates={currentRates}
          wishlist={currentWishlist}
          onToggleWishlist={handleToggleWishlist}
        />
      ) : (
        <>
          <HeroCarousel
            onSelectCategory={(catId) => {
              if (catId === 'scheme') {
                const el = document.getElementById('gold-savings-scheme');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              } else {
                setActiveCategory(catId);
              }
            }}
            onOpenCalculator={() => setIsCalculatorOpen(true)}
          />

          <Categories
            activeCategory="all"
            onSelectCategory={setActiveCategory}
            onSelectSubcategory={(subcat) => {
              window.location.href = `/subcategory/${encodeURIComponent(subcat.name.toLowerCase())}`;
            }}
          />

          {/* Dynamic Product Sections based on Active Tags */}
          {siteTags.length > 0 ? (
            siteTags.map((tag, idx) => (
              <React.Fragment key={tag.id || tag.dbId || idx}>
                <ProductGrid
                  title={tag.name}
                  subtitle={tag.code ? `${tag.code.toUpperCase()} COLLECTION` : 'EXQUISITE CRAFTSMANSHIP'}
                  targetTag={tag.name}
                  sectionId={`tag-section-${tag.id || idx}`}
                  products={products}
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  searchQuery={searchQuery}
                  wishlist={currentWishlist}
                  onToggleWishlist={handleToggleWishlist}
                  onQuickView={(product) => setQuickViewProduct(product)}
                  liveRates={currentRates}
                />
                {idx === 0 && <Banner2Section />}
              </React.Fragment>
            ))
          ) : (
            <>
              <ProductGrid
                title="Featured Products"
                subtitle="EXQUISITE CRAFTSMANSHIP"
                targetTag={null}
                sectionId="featured-products"
                products={products}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                searchQuery={searchQuery}
                wishlist={currentWishlist}
                onToggleWishlist={handleToggleWishlist}
                onQuickView={(product) => setQuickViewProduct(product)}
                liveRates={currentRates}
              />
              <Banner2Section />
            </>
          )}

          <Testimonials shopName={siteSettings?.shop_name} isLoadingSettings={isLoadingSettings} />
        </>
      )}

      <Footer
        onSelectCategory={setActiveCategory}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        logoUrl={siteSettings?.logo_url}
        shopName={siteSettings?.shop_name}
        siteSettings={siteSettings}
        isLoadingSettings={isLoadingSettings}
      />

      <GoldCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        rates={currentRates}
      />

      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        liveRates={goldRates}
      />

      {/* Floating WhatsApp Button (Bottom Right) */}
      {(() => {
        const rawPhone = siteSettings?.store_phone;
        const digits = String(rawPhone).replace(/\D/g, '');
        const formattedPhone = digits.length >= 10 ? (digits.length === 10 ? `91${digits}` : digits) : "";
        const shopName = siteSettings?.shop_name;
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Hello ${shopName}, I would like to inquire about your little_rr collections.`)}`;
        return (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="floating-whatsapp-btn"
            title="Chat with us on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <span className="floating-whatsapp-tooltip">Chat with us</span>
            <img
              src="/whatappicon.png"
              alt="WhatsApp"
              className="floating-whatsapp-img"
              onError={(e) => {
                if (!e.target.src.includes('whatsapp.png')) {
                  e.target.src = '/whatsapp.png';
                } else {
                  e.target.style.display = 'none';
                  const svgEl = e.target.parentElement.querySelector('.floating-whatsapp-svg');
                  if (svgEl) svgEl.style.display = 'block';
                }
              }}
            />
            <svg viewBox="0 0 32 32" className="floating-whatsapp-svg" style={{ display: 'none' }}>
              <path d="M16.002 2.667C8.64 2.667 2.669 8.638 2.669 16c0 2.583.742 5.087 2.148 7.234L3.109 29.14l6.109-1.603a13.255 13.255 0 006.784 1.796h.005c7.36 0 13.332-5.972 13.332-13.333 0-3.564-1.388-6.914-3.909-9.435s-5.871-3.901-9.428-3.901zm7.777 18.917c-.324.912-1.884 1.743-2.633 1.856-.673.101-1.523.142-2.457-.156-.567-.18-1.294-.421-2.223-.822-3.916-1.691-6.471-5.633-6.667-5.892-.196-.261-1.593-2.117-1.593-4.037 0-1.921 1.008-2.866 1.366-3.257.358-.39.78-.488 1.04-.488.261 0 .521.002.748.013.239.011.56-.09.877.671.325.78 1.106 2.698 1.203 2.894.098.196.163.424.033.684-.13.261-.196.423-.39.651-.196.229-.412.511-.587.685-.196.196-.399.408-.171.8.228.391 1.01 1.667 2.169 2.702 1.49 1.33 2.747 1.742 3.137 1.938.391.195.62.163.847-.099.228-.261.978-1.139 1.238-1.53.26-.391.521-.326.879-.195.358.13 2.276 1.073 2.666 1.269.391.196.652.293.749.456.097.163.097.945-.228 1.856z" />
            </svg>
          </a>
        );
      })()}

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          className="floating-scroll-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default App;
