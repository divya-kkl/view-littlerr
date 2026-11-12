// Service to manage coupon codes, validation, and storage across Cart and Checkout
import { supabase } from '../supabaseClient';

const APPLIED_COUPON_STORAGE_KEY = 'sv_applied_coupon';

export const AVAILABLE_COUPONS = [
  {
    code: 'WELCOME10',
    title: '10% Off Welcome Offer',
    description: 'Get 10% instant discount on orders above ₹1,000 (Max ₹1,000)',
    type: 'percentage',
    value: 10,
    minOrder: 1000,
    maxDiscount: 1000
  },
  {
    code: 'GOLD500',
    title: 'Flat ₹500 Off',
    description: 'Save flat ₹500 on gold and moulding jewellery above ₹4,999',
    type: 'flat',
    value: 500,
    minOrder: 4999,
    maxDiscount: 500
  },
  {
    code: 'LITTLERR',
    title: '5% Instant Store Discount',
    description: 'Special 5% discount on all purchases without minimum limit',
    type: 'percentage',
    value: 5,
    minOrder: 0,
    maxDiscount: 2000
  },
  {
    code: 'FESTIVE1000',
    title: 'Festive Celebration ₹1,000 Off',
    description: 'Celebrate with flat ₹1,000 savings on purchases above ₹10,000',
    type: 'flat',
    value: 1000,
    minOrder: 10000,
    maxDiscount: 1000
  }
];

/**
 * Fetch dynamic coupons from Supabase table `coupons`, falling back to AVAILABLE_COUPONS
 */
export const fetchCouponsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map(c => ({
        code: String(c.code).toUpperCase().trim(),
        title: c.title || c.code,
        description: c.description || '',
        type: c.discount_type || 'percentage',
        value: Number(c.discount_value) || 0,
        minOrder: Number(c.min_order_value) || 0,
        maxDiscount: c.max_discount ? Number(c.max_discount) : null
      }));
    }
  } catch (e) {
    // Silent fallback to static coupons
  }
  return AVAILABLE_COUPONS;
};

/**
 * Validate a coupon code against current subtotal
 */
export const validateCoupon = (inputCode, subtotal = 0, couponList = AVAILABLE_COUPONS) => {
  const code = String(inputCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false, message: 'Please enter a coupon code.' };
  }

  const list = Array.isArray(couponList) && couponList.length > 0 ? couponList : AVAILABLE_COUPONS;
  const coupon = list.find(c => c.code.toUpperCase() === code);
  if (!coupon) {
    return { success: false, message: `Coupon "${code}" is invalid or expired.` };
  }

  if (subtotal < coupon.minOrder) {
    return {
      success: false,
      message: `Minimum order amount of ₹${coupon.minOrder.toLocaleString('en-IN')} required for "${coupon.code}".`
    };
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else if (coupon.type === 'flat') {
    discount = Math.min(coupon.value, subtotal);
  }

  return {
    success: true,
    message: `Coupon "${coupon.code}" applied successfully!`,
    coupon: {
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      discountAmount: discount
    }
  };
};

/**
 * Retrieve saved applied coupon from localStorage
 */
export const getStoredCoupon = () => {
  try {
    const saved = localStorage.getItem(APPLIED_COUPON_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Save applied coupon to localStorage
 */
export const saveStoredCoupon = (coupon) => {
  try {
    if (coupon) {
      localStorage.setItem(APPLIED_COUPON_STORAGE_KEY, JSON.stringify(coupon));
    } else {
      localStorage.removeItem(APPLIED_COUPON_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error saving coupon to localStorage:', e);
  }
};

/**
 * Clear applied coupon from localStorage
 */
export const removeStoredCoupon = () => {
  try {
    localStorage.removeItem(APPLIED_COUPON_STORAGE_KEY);
  } catch (e) {}
};

