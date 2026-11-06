import { supabase } from '../supabaseClient';

export const DEFAULT_PAYMENT_METHODS = [
  {
    id: 'default-cod',
    name: 'Cash on Delivery',
    code: 'cod',
    description: 'Pay safely in cash or UPI when your package arrives at your doorstep.',
    badge: 'Recommended',
    icon: '📦',
    is_active: true,
    sort_order: 1
  },
  {
    id: 'default-upi',
    name: 'UPI / Google Pay / PhonePe / QR',
    code: 'upi',
    description: 'Scan QR code or use GPay, PhonePe, Paytm upon delivery / confirmation.',
    badge: 'Instant',
    icon: '📱',
    is_active: true,
    sort_order: 2
  },
  {
    id: 'default-card',
    name: 'Credit / Debit Card / Net Banking',
    code: 'card',
    description: 'All major Visa, Mastercard, RuPay & net banking supported.',
    badge: null,
    icon: '💳',
    is_active: true,
    sort_order: 3
  }
];

const LOCAL_ADMIN_PM_KEY = 'sv_local_payment_methods';

const getLocalFallback = () => {
  try {
    const saved = localStorage.getItem(LOCAL_ADMIN_PM_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_PAYMENT_METHODS;
};

const saveLocalFallback = (methods) => {
  try {
    localStorage.setItem(LOCAL_ADMIN_PM_KEY, JSON.stringify(methods));
  } catch (e) {}
};

/**
 * Fetch all active payment methods for customer checkout
 */
export async function getPaymentMethodsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      const fallback = getLocalFallback().filter(p => p.is_active);
      return { success: true, data: fallback };
    }

    if (data && data.length > 0) {
      saveLocalFallback(data);
      return { success: true, data };
    }

    const fallback = getLocalFallback().filter(p => p.is_active);
    return { success: true, data: fallback };
  } catch (err) {
    const fallback = getLocalFallback().filter(p => p.is_active);
    return { success: true, data: fallback };
  }
}

/**
 * Fetch all payment methods (active & inactive) for Admin Panel
 */
export async function getAllPaymentMethodsForAdmin() {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Supabase fetch error, using local fallback:', error.message);
      return { success: true, data: getLocalFallback() };
    }

    if (data && data.length > 0) {
      saveLocalFallback(data);
      return { success: true, data };
    }

    return { success: true, data: getLocalFallback() };
  } catch (err) {
    return { success: true, data: getLocalFallback() };
  }
}

/**
 * Create a new payment method
 */
export async function createPaymentMethodInSupabase(payload) {
  try {
    const newRecord = {
      name: payload.name.trim(),
      code: (payload.code || payload.name.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim(),
      description: (payload.description || '').trim(),
      badge: payload.badge ? payload.badge.trim() : null,
      icon: (payload.icon || '💳').trim(),
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      sort_order: Number(payload.sort_order) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('payment_methods')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.warn('Failed to insert into Supabase, saving to local fallback:', error.message);
      const current = getLocalFallback();
      const localItem = { id: 'pm_' + Date.now(), ...newRecord };
      const updated = [...current, localItem];
      saveLocalFallback(updated);
      return { success: true, data: localItem, isLocal: true };
    }

    const current = getLocalFallback();
    saveLocalFallback([...current.filter(p => p.code !== data.code), data]);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Update an existing payment method
 */
export async function updatePaymentMethodInSupabase(id, payload) {
  try {
    const updateRecord = {
      name: payload.name.trim(),
      code: payload.code.trim(),
      description: (payload.description || '').trim(),
      badge: payload.badge ? payload.badge.trim() : null,
      icon: (payload.icon || '💳').trim(),
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      sort_order: Number(payload.sort_order) || 0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('payment_methods')
      .update(updateRecord)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.warn('Failed to update in Supabase, updating local fallback:', error.message);
      const current = getLocalFallback();
      const updated = current.map(p => (String(p.id) === String(id) || p.code === payload.code) ? { ...p, ...updateRecord } : p);
      saveLocalFallback(updated);
      return { success: true, data: { id, ...updateRecord }, isLocal: true };
    }

    const current = getLocalFallback();
    saveLocalFallback(current.map(p => p.id === id ? data : p));
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Toggle payment method active status (true/false)
 */
export async function togglePaymentMethodStatus(id, currentStatus) {
  const newStatus = !currentStatus;
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const current = getLocalFallback();
      const updated = current.map(p => String(p.id) === String(id) ? { ...p, is_active: newStatus } : p);
      saveLocalFallback(updated);
      return { success: true, data: { id, is_active: newStatus } };
    }

    const current = getLocalFallback();
    saveLocalFallback(current.map(p => p.id === id ? data : p));
    return { success: true, data };
  } catch (err) {
    const current = getLocalFallback();
    const updated = current.map(p => String(p.id) === String(id) ? { ...p, is_active: newStatus } : p);
    saveLocalFallback(updated);
    return { success: true, data: { id, is_active: newStatus } };
  }
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethodInSupabase(id) {
  try {
    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) {
      const current = getLocalFallback();
      saveLocalFallback(current.filter(p => String(p.id) !== String(id)));
      return { success: true };
    }

    const current = getLocalFallback();
    saveLocalFallback(current.filter(p => p.id !== id));
    return { success: true };
  } catch (err) {
    const current = getLocalFallback();
    saveLocalFallback(current.filter(p => String(p.id) !== String(id)));
    return { success: true };
  }
}
