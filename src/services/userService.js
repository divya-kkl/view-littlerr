import { supabase } from '../supabaseClient';

export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (err) {
    console.error('Error getting current user:', err);
    return null;
  }
}

export async function loginUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    return { success: false, error: err.message };
  }
}


export async function sendPasswordResetEmail(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { success: true, data };
  }
  catch (err) {
    return {success:false, error:err.message}
  }
}

export async function updateUserPassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return {success: true, data };
  }
  catch (err) {
    return { success: false, error: err.message };
  }
}

export async function registerUser({
  email,
  password,
  username,
  fullName,
  phone,
  gender,
  address,
  city,
  state,
  country,
  pincode
}) {
  try {
    const displayName = username || fullName || '';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: displayName,
          full_name: displayName,
          phone: phone || '',
          gender: gender || '',
          address: address || '',
          city: city || '',
          state: state || '',
          country: country || 'India',
          pincode: pincode || ''
        }
      }
    });
    if (error) throw error;

    // Always auto-create user record in user_addresses table so the user is visible to Admin
    if (data?.user) {
      try {
        await supabase.from('user_addresses').insert([{
          user_id: data.user.id,
          email: data.user.email,
          full_name: displayName || data.user.email,
          phone_number: phone || '',
          street_address: address || '',
          city: city || '',
          state: state || '',
          country: country || 'India',
          pincode: pincode || '',
          address_type: gender ? `Home (${gender})` : 'Home',
          is_default: true
        }]);
      } catch (addrErr) {
        console.warn('Could not auto-insert address on registration:', addrErr);
      }
    }

    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// User Addresses CRUD
export async function getUserAddresses(userId, email, phone) {
  try {
    let query = supabase.from('user_addresses').select('*');
    const orParts = [];
    if (userId) orParts.push(`user_id.eq.${userId}`);
    if (email) orParts.push(`email.eq.${email}`);
    if (phone) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      if (cleanPhone.length >= 7) {
        orParts.push(`phone_number.ilike.%${cleanPhone.slice(-10)}%`);
      }
    }

    if (orParts.length > 0) {
      query = query.or(orParts.join(','));
    }

    const { data, error } = await query
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error fetching addresses:', err);
    return { success: false, error: err.message, data: [] };
  }
}

export async function addUserAddress(addressData) {
  try {
    // If set as default, reset other addresses first
    if (addressData.is_default && addressData.user_id) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', addressData.user_id);
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .insert([addressData])
      .select();

    if (error) throw error;
    return { success: true, data: data ? data[0] : null };
  } catch (err) {
    console.error('Error adding address:', err);
    return { success: false, error: err.message };
  }
}

export async function updateUserAddress(id, addressData) {
  try {
    if (addressData.is_default && addressData.user_id) {
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', addressData.user_id);
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .update({
        ...addressData,
        updated_at: new Date()
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { success: true, data: data ? data[0] : null };
  } catch (err) {
    console.error('Error updating address:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteUserAddress(id) {
  try {
    const { error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleting address:', err);
    return { success: false, error: err.message };
  }
}

// ==========================================
// Admin Panel: Fetch all registered users & addresses
// ==========================================
export async function getAllUsersForAdmin() {
  try {
    let combined = [];
    const seen = new Set();

    // 1. Fetch from user_addresses table
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach(item => {
          const key = `${item.full_name || ''}_${item.phone_number || ''}_${item.street_address || ''}`.toLowerCase();
          if (item.full_name || item.street_address) {
            seen.add(key);
            combined.push(item);
          }
        });
      }
    } catch (e) {
      console.warn('Error fetching from user_addresses:', e);
    }

    // 2. Also fetch customer delivery addresses from orders table
    try {
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, customer_email, street_address, city, state, country, pincode, address_type, order_notes, created_at')
        .order('created_at', { ascending: false });

      if (!ordersErr && Array.isArray(ordersData)) {
        ordersData.forEach(o => {
          if (o.customer_name || o.street_address) {
            const key = `${o.customer_name || ''}_${o.customer_phone || ''}_${o.street_address || ''}`.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              combined.push({
                id: `order_addr_${o.id}`,
                user_id: null,
                email: o.customer_email || '',
                full_name: o.customer_name || 'Customer',
                phone_number: o.customer_phone || '',
                street_address: o.street_address || '',
                city: o.city || '',
                state: o.state || '',
                country: o.country || 'India',
                pincode: o.pincode || '',
                address_type: o.address_type || 'Home',
                order_notes: o.order_notes || '',
                is_default: false,
                created_at: o.created_at,
                source: 'Checkout Order'
              });
            }
          }
        });
      }
    } catch (e) {
      console.warn('Error fetching addresses from orders:', e);
    }

    // 3. Also check localStorage for any locally saved addresses
    try {
      const localList = JSON.parse(localStorage.getItem('sv_all_saved_addresses') || '[]');
      if (Array.isArray(localList)) {
        localList.forEach(item => {
          const key = `${item.full_name || ''}_${item.phone_number || ''}_${item.street_address || ''}`.toLowerCase();
          if (!seen.has(key) && (item.full_name || item.street_address)) {
            seen.add(key);
            combined.push(item);
          }
        });
      }
    } catch (e) {}

    return {
      success: true,
      data: combined
    };
  } catch (err) {
    console.error('Error fetching users for admin:', err);
    return {
      success: false,
      error: err.message,
      data: []
    };
  }
}


