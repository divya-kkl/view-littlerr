import { supabase } from '../supabaseClient';
import { clearCartInSupabase } from './cartService';

/**
 * Generate unique readable order number
 */
export const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${rand}`;
};

/**
 * Place a new order into the Supabase 'orders' table
 * Schema:
 * - id: uuid (auto)
 * - order_number: text
 * - user_id: uuid (nullable)
 * - customer_name: text
 * - customer_phone: text
 * - customer_email: text
 * - street_address: text
 * - city: text
 * - state: text
 * - country: text
 * - pincode: text
 * - address_type: text
 * - order_notes: text
 * - payment_method: text
 * - payment_status: text
 * - order_status: text
 * - subtotal: numeric
 * - delivery_charge: numeric
 * - total_amount: numeric
 * - items: jsonb
 * - created_at: timestamptz
 * - updated_at: timestamptz
 */
export const createOrderInSupabase = async (orderPayload) => {
  try {
    let authUserId = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      authUserId = session?.user?.id || null;
    } catch (e) {}

    const orderNumber = orderPayload.order_number || generateOrderNumber();
    const subtotal = Number(orderPayload.subtotal || orderPayload.total_amount) || 0;
    const deliveryCharge = Number(orderPayload.delivery_charge) || 0;
    const totalAmount = Number(orderPayload.total_amount) || (subtotal + deliveryCharge);

    const record = {
      order_number: orderNumber,
      user_id: orderPayload.user_id || authUserId,
      customer_name: (orderPayload.customer_name || 'Customer').trim(),
      customer_phone: (orderPayload.customer_phone || '').trim(),
      customer_email: (orderPayload.customer_email || '').trim(),
      street_address: (orderPayload.street_address || '').trim(),
      city: (orderPayload.city || '').trim(),
      state: (orderPayload.state || 'Tamil Nadu').trim(),
      country: (orderPayload.country || 'India').trim(),
      pincode: (orderPayload.pincode || '').trim(),
      address_type: orderPayload.address_type || 'Home',
      order_notes: (orderPayload.order_notes || '').trim(),
      payment_method: orderPayload.payment_method || 'Cash on Delivery',
      payment_status: orderPayload.payment_status || (orderPayload.payment_method === 'Cash on Delivery' ? 'PENDING' : 'PAID'),
      order_status: orderPayload.order_status || 'PLACED',
      subtotal: subtotal,
      delivery_charge: deliveryCharge,
      total_amount: totalAmount,
      items: Array.isArray(orderPayload.items) ? orderPayload.items : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([record])
      .select()
      .single();

    if (error) throw error;

    // After placing order, remove ONLY the ordered items from active cart in Supabase & localStorage
    try {
      const orderedItemIds = Array.isArray(orderPayload.items)
        ? orderPayload.items.map(it => it.id).filter(Boolean)
        : [];
      const orderedProductIds = Array.isArray(orderPayload.items)
        ? orderPayload.items.map(it => it.product_id).filter(Boolean)
        : [];

      if (orderedItemIds.length > 0) {
        // Delete only the items that were ordered
        await supabase
          .from('cart_items')
          .delete()
          .in('id', orderedItemIds);
      } else {
        await clearCartInSupabase();
      }

      // Update local storage cart: keep any items that were NOT ordered
      try {
        const localSaved = localStorage.getItem('luxury_jewel_cart');
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed)) {
            const remaining = parsed.filter(item =>
              !orderedItemIds.includes(item.id) && !orderedProductIds.includes(item.product_id || item.id)
            );
            if (remaining.length > 0) {
              localStorage.setItem('luxury_jewel_cart', JSON.stringify(remaining));
            } else {
              localStorage.removeItem('luxury_jewel_cart');
            }
          }
        }
      } catch (localErr) {
        console.warn('Error updating local cart:', localErr);
      }

      localStorage.removeItem('sv_cart_items');
      window.dispatchEvent(new Event('cartUpdated'));

      // Save confirmed order into browser's local order store
      const confirmedOrder = data || record;
      const currentOrders = JSON.parse(localStorage.getItem('sv_my_orders') || '[]');
      const updatedList = [confirmedOrder, ...currentOrders.filter(o => o.order_number !== confirmedOrder.order_number)];
      localStorage.setItem('sv_my_orders', JSON.stringify(updatedList));
    } catch (clearErr) {
      console.warn('Could not clear ordered items after order:', clearErr);
    }

    return { success: true, order: data || record };
  } catch (err) {
    console.error('Error placing order in Supabase:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Admin: Fetch all orders sorted by newest first
 */
export const getAllOrdersForAdmin = async () => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error fetching orders for admin:', err);
    return { success: false, error: err.message || err, data: [] };
  }
};

/**
 * Admin: Update order status (PLACED, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
 */
export const updateOrderStatusByAdmin = async (orderId, newStatus, newPaymentStatus = null) => {
  try {
    const updates = {
      order_status: newStatus,
      updated_at: new Date().toISOString()
    };
    if (newPaymentStatus) {
      updates.payment_status = newPaymentStatus;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Error updating order status:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Admin: Delete an order record
 */
export const deleteOrderByAdmin = async (orderId) => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleting order:', err);
    return { success: false, error: err.message || err };
  }
};

/**
 * Customer: Fetch orders placed by this user (by user_id, email, phone, or local order store)
 */
export const getUserOrders = async (userId, userEmail = null, userPhone = null) => {
  let supabaseOrders = [];

  // 1. If userId is provided, query by user_id
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        supabaseOrders.push(...data);
      }
    } catch (e) {
      console.warn('Query by user_id failed:', e);
    }
  }

  // 2. Query by customer_email
  if (userEmail && String(userEmail).trim()) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .ilike('customer_email', String(userEmail).trim())
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        supabaseOrders.push(...data);
      }
    } catch (e) {
      console.warn('Query by email failed:', e);
    }
  }

  // 3. Query by customer_phone
  if (userPhone && String(userPhone).trim()) {
    try {
      const cleanPhone = String(userPhone).trim();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', cleanPhone)
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        supabaseOrders.push(...data);
      }
    } catch (e) {
      console.warn('Query by phone failed:', e);
    }
  }

  // 4. Retrieve any orders saved in this browser's localStorage
  let localOrders = [];
  try {
    localOrders = JSON.parse(localStorage.getItem('sv_my_orders') || '[]');
  } catch (e) {}

  // 5. If we have local orders, also check if Supabase has live updated statuses for them
  const orderNums = localOrders.map(o => o.order_number).filter(Boolean);
  if (orderNums.length > 0) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('order_number', orderNums);
      if (!error && Array.isArray(data)) {
        supabaseOrders.push(...data);
      }
    } catch (e) {}
  }

  // 6. Deduplicate all orders by order_number or id
  const orderMap = new Map();
  localOrders.forEach(o => {
    const key = o.order_number || o.id;
    if (key) orderMap.set(key, o);
  });
  supabaseOrders.forEach(o => {
    const key = o.order_number || o.id;
    if (key) orderMap.set(key, o);
  });

  const merged = Array.from(orderMap.values()).sort((a, b) => {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  // Cache the merged list back to localStorage
  try {
    localStorage.setItem('sv_my_orders', JSON.stringify(merged));
  } catch (e) {}

  return { success: true, data: merged };
};

