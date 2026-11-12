import { supabase } from '../supabaseClient';

const WISHLIST_SESSION_KEY = 'sv_wishlist_session_id';
const LOCAL_STORAGE_KEY = 'wishlist';

/**
 * Generate or retrieve persistent guest session ID
 */
export const getWishlistSessionId = () => {
  let sessionId = localStorage.getItem(WISHLIST_SESSION_KEY);
  if (!sessionId) {
    sessionId = 'guest_wl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem(WISHLIST_SESSION_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Get active Supabase auth user
 */
export const getWishlistAuthUser = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (err) {
    console.error('Error fetching auth user for wishlist:', err);
    return null;
  }
};

/**
 * Fetch all items from wishlist_items table for current session / user
 * Ensures items are NEVER wiped out on page refresh.
 */
export const fetchWishlistFromSupabase = async () => {
  let localSaved = [];
  try {
    localSaved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch (e) {
    localSaved = [];
  }

  try {
    const user = await getWishlistAuthUser();
    const sessionId = getWishlistSessionId();
    const userId = user?.id || null;

    let query = supabase.from('wishlist_items').select('*').order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Wishlist table query warning (fallback to local):', error.message);
      return { success: true, wishlist: localSaved };
    }

    // If Supabase returned 0 items but localStorage has saved items, preserve and sync them up!
    if ((!data || data.length === 0) && localSaved && localSaved.length > 0) {
      for (const item of localSaved) {
        addToWishlistInSupabase(item).catch(() => {});
      }
      return { success: true, wishlist: localSaved };
    }

    // Merge Supabase rows and localStorage items so nothing is lost
    const seen = new Set();
    const merged = [];

    for (const row of (data || [])) {
      const pid = String(row.product_id || row.id);
      if (!seen.has(pid)) {
        seen.add(pid);
        const localMatch = localSaved.find(it => String(it.id || it.dbId || it.product_id || it.name) === pid) || {};
        merged.push({
          id: row.id,
          product_id: row.product_id,
          dbId: row.product_id,
          name: row.product_name,
          image: row.product_image || localMatch.image || '',
          price: Number(row.price || localMatch.price || localMatch.sellingPrice) || 0,
          weight: row.weight || localMatch.weight || 0,
          purity: row.purity || localMatch.purity || '22K Gold',
          category: row.category || localMatch.category || ''
        });
      }
    }

    // If there are any local items not yet in Supabase, preserve them and sync to Supabase
    for (const it of localSaved) {
      const pid = String(it.id || it.dbId || it.product_id || it.name);
      if (!seen.has(pid)) {
        seen.add(pid);
        merged.push(it);
        addToWishlistInSupabase(it).catch(() => {});
      }
    }

    // Persist to local storage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {}

    return { success: true, wishlist: merged };
  } catch (err) {
    console.warn('Error fetching wishlist, fallback to local storage:', err);
    return { success: true, wishlist: localSaved };
  }
};

/**
 * Add product to wishlist (Supabase + localStorage)
 * Automatically adapts to table schema whether price/weight/purity columns exist or not.
 */
export const addToWishlistInSupabase = async (product) => {
  const prodId = String(product.dbId || product.id || product.productCode || product.name);
  const prodName = product.name || product.product_name || 'Jewellery Item';
  const prodImg = product.image || (product.images && product.images[0]) || product.product_image || '';
  const prodPrice = Number(product.sellingPrice || product.price) || 0;
  const prodWeight = parseFloat(product.weight || product.netWeight || product.grossWeight) || 0;
  const prodPurity = product.purity || '22K Gold';
  const prodCategory = product.category || product.categoryName || '';

  const itemObj = {
    id: prodId,
    dbId: prodId,
    product_id: prodId,
    name: prodName,
    image: prodImg,
    price: prodPrice,
    weight: prodWeight,
    purity: prodPurity,
    category: prodCategory
  };

  // 1. Update localStorage instantly
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const filtered = local.filter(it => String(it.id || it.dbId || it.product_id || it.name) !== prodId);
    filtered.unshift(itemObj);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {}

  window.dispatchEvent(new Event('wishlistUpdated'));

  // 2. Persist to Supabase
  try {
    const user = await getWishlistAuthUser();
    const sessionId = getWishlistSessionId();
    const userId = user?.id || null;

    // Delete existing duplicate if any
    let delQuery = supabase.from('wishlist_items').delete().eq('product_id', prodId);
    if (userId) {
      delQuery = delQuery.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    } else {
      delQuery = delQuery.eq('session_id', sessionId);
    }
    await delQuery;

    // Base payload exactly matching the user's current table schema
    const basePayload = {
      user_id: userId,
      session_id: sessionId,
      product_id: prodId,
      product_name: prodName,
      product_image: prodImg,
      category: prodCategory,
      updated_at: new Date().toISOString()
    };

    // Try full payload with price/weight/purity first
    const fullPayload = {
      ...basePayload,
      price: prodPrice,
      weight: prodWeight,
      purity: prodPurity
    };

    const { error: fullError } = await supabase.from('wishlist_items').insert([fullPayload]);
    if (fullError) {
      // If price/weight/purity columns don't exist yet, insert with base payload
      const { error: baseError } = await supabase.from('wishlist_items').insert([basePayload]);
      if (baseError) {
        console.error('Supabase wishlist insert error:', baseError.message);
      }
    }
  } catch (err) {
    console.warn('Supabase wishlist insert skipped/failed:', err);
  }

  return { success: true, item: itemObj };
};

/**
 * Remove product from wishlist (Supabase + localStorage)
 */
export const removeFromWishlistInSupabase = async (productId) => {
  const prodId = String(productId);

  // 1. Update localStorage
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const updated = local.filter(it => String(it.id || it.dbId || it.product_id || it.name) !== prodId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('wishlistUpdated'));

  // 2. Delete from Supabase
  try {
    const user = await getWishlistAuthUser();
    const sessionId = getWishlistSessionId();
    const userId = user?.id || null;

    let query = supabase.from('wishlist_items').delete().eq('product_id', prodId);
    if (userId) {
      query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    } else {
      query = query.eq('session_id', sessionId);
    }
    await query;
  } catch (err) {
    console.warn('Supabase wishlist delete skipped/failed:', err);
  }

  return { success: true };
};

/**
 * Clear all items in wishlist for current user / session
 */
export const clearWishlistInSupabase = async () => {
  // 1. Clear localStorage
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (e) {}

  window.dispatchEvent(new Event('wishlistUpdated'));

  // 2. Clear from Supabase
  try {
    const user = await getWishlistAuthUser();
    const sessionId = getWishlistSessionId();
    const userId = user?.id || null;

    let query = supabase.from('wishlist_items').delete();
    if (userId) {
      query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    } else {
      query = query.eq('session_id', sessionId);
    }
    await query;
  } catch (err) {
    console.warn('Supabase wishlist clear failed:', err);
  }

  return { success: true };
};

/**
 * Toggle Wishlist item in Supabase + localStorage
 */
export const toggleWishlistInSupabase = async (product) => {
  const prodId = String(product.dbId || product.id || product.productCode || product.name);
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch (e) {}

  const exists = local.some(it => String(it.id || it.dbId || it.product_id || it.name) === prodId);

  if (exists) {
    await removeFromWishlistInSupabase(prodId);
    return { inWishlist: false };
  } else {
    await addToWishlistInSupabase(product);
    return { inWishlist: true };
  }
};
