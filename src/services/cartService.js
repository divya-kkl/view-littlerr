import { supabase } from '../supabaseClient';

const SESSION_KEY = 'sv_cart_session_id';

/**
 * Generate or retrieve persistent guest session ID
 */
export const getGuestSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

/**
 * Get active Supabase auth user
 */
export const getCurrentAuthUser = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (err) {
    console.error('Error fetching auth user for cart:', err);
    return null;
  }
};

/**
 * Add or update item in cart_items table
 * Table schema:
 * - id: uuid (auto)
 * - user_id: uuid (nullable)
 * - session_id: text
 * - product_id: text
 * - product_name: text
 * - product_image: text
 * - price: numeric
 * - quantity: int4
 * - size: text
 * - color: text
 * - created_at: timestamptz
 * - updated_at: timestamptz
 */
export const addToCartInSupabase = async (item) => {
  try {
    const user = await getCurrentAuthUser();
    const sessionId = getGuestSessionId();
    const userId = user?.id || null;

    const productIdStr = String(item.product_id || item.id || '');
    const itemSize = item.size || null;
    const itemColor = item.color || null;
    const quantityToAdd = Number(item.quantity) || 1;
    const priceNum = Number(item.price) || 0;

    // 1. Check if same product & size already exists in cart for this user/session
    let query = supabase.from('cart_items').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.eq('session_id', sessionId);
    }
    query = query.eq('product_id', productIdStr);

    if (itemSize) {
      query = query.eq('size', itemSize);
    } else {
      query = query.is('size', null);
    }

    const { data: existingRows, error: findError } = await query;

    if (findError) {
      console.warn('cart_items select warning (falling back to insert):', findError);
    }

    let savedItem = null;

    if (existingRows && existingRows.length > 0) {
      // 2. Existing item -> Update quantity
      const existing = existingRows[0];
      const updatedQty = Number(existing.quantity || 0) + quantityToAdd;

      const { data: updatedData, error: updateError } = await supabase
        .from('cart_items')
        .update({
          quantity: updatedQty,
          price: priceNum,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;
      savedItem = updatedData || { ...existing, quantity: updatedQty };
    } else {
      // 3. New item -> Insert into cart_items
      const insertPayload = {
        user_id: userId,
        session_id: sessionId,
        product_id: productIdStr,
        product_name: item.product_name || item.name || 'little_rr Product',
        product_image: item.product_image || item.image || '',
        price: priceNum,
        quantity: quantityToAdd,
        size: itemSize,
        color: itemColor,
        updated_at: new Date().toISOString()
      };

      const { data: insertedData, error: insertError } = await supabase
        .from('cart_items')
        .insert([insertPayload])
        .select()
        .single();

      if (insertError) throw insertError;
      savedItem = insertedData || insertPayload;
    }

    return { success: true, item: savedItem };
  } catch (err) {
    console.error('Error inserting into cart_items table in Supabase:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Fetch all items from cart_items for current session / user
 */
export const fetchCartItemsFromSupabase = async () => {
  try {
    const user = await getCurrentAuthUser();
    const sessionId = getGuestSessionId();
    const userId = user?.id || null;

    let query = supabase.from('cart_items').select('*').order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Map to the shape expected by CartDrawer UI
    const mapped = (data || []).map(row => ({
      id: row.id,
      product_id: row.product_id,
      name: row.product_name,
      image: row.product_image,
      price: Number(row.price) || 0,
      quantity: Number(row.quantity) || 1,
      size: row.size || '',
      color: row.color || '',
      weight: row.weight || '0.00',
      purity: row.purity || '22K BIS Hallmarked Gold'
    }));

    return { success: true, cart: mapped };
  } catch (err) {
    console.error('Error fetching cart_items from Supabase:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Update quantity in cart_items table
 */
export const updateCartItemQuantityInSupabase = async (cartItemId, newQty) => {
  try {
    if (newQty <= 0) {
      return await removeCartItemFromSupabase(cartItemId);
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({
        quantity: Number(newQty),
        updated_at: new Date().toISOString()
      })
      .eq('id', cartItemId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, item: data };
  } catch (err) {
    console.error('Error updating quantity in cart_items:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Remove an item from cart_items table
 */
export const removeCartItemFromSupabase = async (cartItemId) => {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleting from cart_items:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Clear the cart in Supabase
 */
export const clearCartInSupabase = async () => {
  try {
    const user = await getCurrentAuthUser();
    const sessionId = getGuestSessionId();
    const userId = user?.id || null;

    let query = supabase.from('cart_items').delete();
    if (userId) {
      query = query.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    } else {
      query = query.eq('session_id', sessionId);
    }

    const { error } = await query;
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error clearing cart in Supabase:', err);
    return { success: false, error: err.message || err };
  }
};

/* ==========================================================================
   ADMIN CART CRUD OPERATIONS
   ========================================================================== */

/**
 * Fetch ALL cart items across all users and guests for Admin panel
 */
export const getAllCartItemsForAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error fetching all cart items for admin:', err);
    return { success: false, error: err.message || err, data: [] };
  }
};

/**
 * Admin: Create a new cart item manually
 */
export const createCartItemByAdmin = async (cartData) => {
  try {
    const payload = {
      user_id: cartData.user_id ? cartData.user_id.trim() : null,
      session_id: cartData.session_id ? cartData.session_id.trim() : ('admin_manual_' + Date.now()),
      product_id: String(cartData.product_id || '').trim(),
      product_name: String(cartData.product_name || '').trim(),
      product_image: cartData.product_image ? String(cartData.product_image).trim() : '',
      price: Number(cartData.price) || 0,
      quantity: Math.max(1, parseInt(cartData.quantity, 10) || 1),
      size: cartData.size ? String(cartData.size).trim() : null,
      color: cartData.color ? String(cartData.color).trim() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cart_items')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error creating cart item by admin:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Admin: Update an existing cart item
 */
export const updateCartItemByAdmin = async (id, cartData) => {
  try {
    const payload = {
      product_id: String(cartData.product_id || '').trim(),
      product_name: String(cartData.product_name || '').trim(),
      product_image: cartData.product_image ? String(cartData.product_image).trim() : '',
      price: Number(cartData.price) || 0,
      quantity: Math.max(1, parseInt(cartData.quantity, 10) || 1),
      size: cartData.size ? String(cartData.size).trim() : null,
      color: cartData.color ? String(cartData.color).trim() : null,
      user_id: cartData.user_id ? cartData.user_id.trim() : null,
      session_id: cartData.session_id ? cartData.session_id.trim() : null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cart_items')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error updating cart item by admin:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Admin: Delete a cart item
 */
export const deleteCartItemByAdmin = async (id) => {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleting cart item by admin:', err);
    return { success: false, error: err.message || err };
  }
};


