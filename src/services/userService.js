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
export async function getUserAddresses(userId, email) {
  try {
    let query = supabase.from('user_addresses').select('*');
    if (userId && email) {
      query = query.or(`user_id.eq.${userId},email.eq.${email}`);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else if (email) {
      query = query.eq('email', email);
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
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || []
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


