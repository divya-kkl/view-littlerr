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
 * Extract canonical product identifier (product_id, dbId, id, code, or name)
 */
export const getProductCanonicalId = (p) => {
  if (!p) return '';
  if (typeof p === 'string' || typeof p === 'number') return String(p).trim();
  return String(p.product_id || p.dbId || p.id || p.productCode || p.name || '').trim();
};

/**
 * Robust check if a wishlist item matches a given target ID or target Name
 */
export const matchesWishlistItem = (item, targetId, targetName) => {
  if (!item) return false;
  const tId = String(targetId || '').trim().toLowerCase();
  const tName = String(targetName || '').trim().toLowerCase();

  const itemId = String(item.product_id || item.dbId || item.id || item.productCode || '').trim().toLowerCase();
  const itemName = String(item.name || item.product_name || '').trim().toLowerCase();

  if (tId && itemId && tId === itemId) return true;
  if (tName && itemName && tName === itemName) return true;
  if (tId && itemName && tId === itemName) return true;
  if (tName && itemId && tName === itemId) return true;
  return false;
};

/**
 * Deduplicate wishlist array so each product appears at most once
 */
export const deduplicateWishlist = (items) => {
  if (!Array.isArray(items)) return [];
  const seenKeys = new Set();
  const unique = [];

  for (const item of items) {
    if (!item) continue;
    const prodId = getProductCanonicalId(item).toLowerCase();
    const prodName = String(item.name || item.product_name || '').trim().toLowerCase();
    const key = prodId || prodName;

    if (key && !seenKeys.has(key)) {
      seenKeys.add(key);
      if (prodName) seenKeys.add(prodName);
      unique.push(item);
    }
  }
  return unique;
};

/**
 * Helper to silently sync a single item to Supabase WITHOUT dispatching events (prevents infinite loops)
 */
const syncRowToSupabaseSilently = async (item, user, sessionId) => {
  try {
    const userId = user?.id || null;
    const prodId = getProductCanonicalId(item);
    const prodName = item.name || item.product_name || 'Jewellery Item';
    const prodImg = item.image || (item.images && item.images[0]) || item.product_image || '';
    const prodPrice = Number(item.sellingPrice || item.price) || 0;
    const prodWeight = parseFloat(item.weight || item.netWeight || item.grossWeight) || 0;
    const prodPurity = item.purity || '22K Gold';
    const prodCategory = item.category || item.categoryName || '';

    const basePayload = {
      user_id: userId,
      session_id: sessionId,
      product_id: prodId,
      product_name: prodName,
      product_image: prodImg,
      category: prodCategory,
      updated_at: new Date().toISOString()
    };

    const fullPayload = {
      ...basePayload,
      price: prodPrice,
      weight: prodWeight,
      purity: prodPurity
    };

    const { error: fullError } = await supabase.from('wishlist_items').insert([fullPayload]);
    if (fullError) {
      await supabase.from('wishlist_items').insert([basePayload]);
    }
  } catch (e) {
    // Silent catch
  }
};

/**
 * Fetch all items from wishlist_items table for current session / user.
 * Deduplicates both Supabase and localStorage rows to guarantee no runaway counts.
 */
export const fetchWishlistFromSupabase = async () => {
  let localSaved = [];
  try {
    localSaved = deduplicateWishlist(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]'));
  } catch (e) {
    localSaved = [];
  }

  try {
    const user = await getWishlistAuthUser();
    if (!user) {
      // User is not logged in -> guest cannot view or add wishlist items
      return { success: true, wishlist: [] };
    }
    const sessionId = getWishlistSessionId();
    const userId = user.id;

    let query = supabase.from('wishlist_items').select('*').order('created_at', { ascending: false });
    query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);

    const { data, error } = await query;
    if (error) {
      console.warn('Wishlist table query warning (fallback to local):', error.message);
      return { success: true, wishlist: localSaved };
    }

    // Merge Supabase rows and localStorage items into a strictly unique set
    const seen = new Set();
    const merged = [];

    for (const row of (data || [])) {
      const pid = String(row.product_id || row.id || '').trim();
      const pname = String(row.product_name || '').trim().toLowerCase();
      const canonicalKey = (pid || pname).toLowerCase();

      if (!seen.has(canonicalKey)) {
        seen.add(canonicalKey);
        if (pname) seen.add(pname);

        const localMatch = localSaved.find(it => matchesWishlistItem(it, pid, pname)) || {};
        merged.push({
          id: pid,
          product_id: pid,
          dbId: pid,
          name: row.product_name || localMatch.name || 'Jewellery Item',
          image: row.product_image || localMatch.image || '',
          price: Number(row.price || localMatch.price || localMatch.sellingPrice) || 0,
          weight: row.weight || localMatch.weight || 0,
          purity: row.purity || localMatch.purity || '22K Gold',
          category: row.category || localMatch.category || ''
        });
      }
    }

    // If there are any local items not yet in Supabase, preserve them and sync silently
    for (const it of localSaved) {
      const pid = getProductCanonicalId(it).toLowerCase();
      const pname = String(it.name || it.product_name || '').trim().toLowerCase();
      const canonicalKey = pid || pname;

      if (!seen.has(canonicalKey)) {
        seen.add(canonicalKey);
        if (pname) seen.add(pname);
        merged.push(it);
        syncRowToSupabaseSilently(it, user, sessionId).catch(() => {});
      }
    }

    const finalWishlist = deduplicateWishlist(merged);

    // Persist clean deduplicated list to local storage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalWishlist));
    } catch (e) {}

    return { success: true, wishlist: finalWishlist };
  } catch (err) {
    console.warn('Error fetching wishlist, fallback to local storage:', err);
    return { success: true, wishlist: localSaved };
  }
};

/**
 * Add product to wishlist (Supabase + localStorage)
 */
export const addToWishlistInSupabase = async (product) => {
  const user = await getWishlistAuthUser();
  if (!user) {
    console.warn('addToWishlistInSupabase blocked: user is not logged in.');
    return { success: false, requireLogin: true, message: 'Please sign in to add to wishlist.' };
  }

  const prodId = getProductCanonicalId(product);
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

  // 1. Update localStorage instantly & deduplicate
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const filtered = local.filter(it => !matchesWishlistItem(it, prodId, prodName));
    filtered.unshift(itemObj);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deduplicateWishlist(filtered)));
  } catch (e) {}

  window.dispatchEvent(new Event('wishlistUpdated'));

  // 2. Persist to Supabase
  try {
    const sessionId = getWishlistSessionId();
    const userId = user.id;

    // Delete existing duplicate for this item if any
    let delQuery = supabase.from('wishlist_items').delete();
    if (prodName && prodId && prodName !== prodId) {
      delQuery = delQuery.or(`product_id.eq.${prodId},product_name.eq.${prodName}`);
    } else {
      delQuery = delQuery.eq('product_id', prodId);
    }

    if (userId) {
      delQuery = delQuery.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    } else {
      delQuery = delQuery.eq('session_id', sessionId);
    }
    await delQuery;

    // Insert payload
    const basePayload = {
      user_id: userId,
      session_id: sessionId,
      product_id: prodId,
      product_name: prodName,
      product_image: prodImg,
      category: prodCategory,
      updated_at: new Date().toISOString()
    };

    const fullPayload = {
      ...basePayload,
      price: prodPrice,
      weight: prodWeight,
      purity: prodPurity
    };

    const { error: fullError } = await supabase.from('wishlist_items').insert([fullPayload]);
    if (fullError) {
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
 * Handles both product object or string identifier, ensuring clean deletion.
 */
export const removeFromWishlistInSupabase = async (productOrId) => {
  const prodId = typeof productOrId === 'object'
    ? getProductCanonicalId(productOrId)
    : String(productOrId || '').trim();
  const prodName = typeof productOrId === 'object'
    ? String(productOrId.name || productOrId.product_name || '').trim()
    : '';

  // 1. Immediately delete from localStorage
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const updated = local.filter(it => !matchesWishlistItem(it, prodId, prodName));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(deduplicateWishlist(updated)));
  } catch (e) {}

  // 2. Delete from Supabase
  try {
    const user = await getWishlistAuthUser();
    const sessionId = getWishlistSessionId();
    const userId = user?.id || null;

    let query = supabase.from('wishlist_items').delete();
    if (prodId && prodName && prodId !== prodName) {
      query = query.or(`product_id.eq.${prodId},product_name.eq.${prodName}`);
    } else if (prodId) {
      query = query.or(`product_id.eq.${prodId},product_name.eq.${prodId}`);
    }

    if (userId) {
      query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    } else {
      query = query.eq('session_id', sessionId);
    }
    await query;
  } catch (err) {
    console.warn('Supabase wishlist delete error:', err);
  }

  // 3. Dispatch event after local and remote deletion are executed
  window.dispatchEvent(new Event('wishlistUpdated'));

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
    console.warn('Supabase wishlist clear error:', err);
  }

  return { success: true };
};

/**
 * Toggle Wishlist item in Supabase + localStorage
 */
export const toggleWishlistInSupabase = async (product) => {
  const user = await getWishlistAuthUser();
  if (!user) {
    try {
      localStorage.setItem('pending_wishlist_action', JSON.stringify({
        action: 'add_to_wishlist',
        product: product,
        returnUrl: window.location.pathname + window.location.search
      }));
    } catch (e) {}
    window.location.href = '/account';
    return { inWishlist: false, requireLogin: true };
  }

  const prodId = getProductCanonicalId(product);
  const prodName = product.name || product.product_name || '';

  let local = [];
  try {
    local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch (e) {}

  const exists = local.some(it => matchesWishlistItem(it, prodId, prodName));

  if (exists) {
    await removeFromWishlistInSupabase(product);
    return { inWishlist: false };
  } else {
    await addToWishlistInSupabase(product);
    return { inWishlist: true };
  }
};
