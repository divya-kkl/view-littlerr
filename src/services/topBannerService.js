import { supabase } from '../supabaseClient';

export const normalizeTopBanner = (row) => ({
  id: row.id,
  dbId: row.id,
  content: row.content || '',
  badgeText: row.badge_text || '',
  link: row.link || '',
  status: row.status ? row.status.toUpperCase() : 'ACTIVE',
  orderIndex: row.order_index !== undefined && row.order_index !== null ? parseInt(row.order_index, 10) : 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export async function getTopBannersFromSupabase(activeOnly = true) {
  try {
    let query = supabase
      .from('top_banners')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.or('status.eq.ACTIVE,status.eq.active');
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetch top_banners error:', error.message);
      return { data: [], error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null, isEmpty: true };
    }

    return {
      data: data.map(normalizeTopBanner),
      error: null
    };
  } catch (err) {
    console.error('Error fetching top_banners:', err);
    return { data: [], error: err.message || 'Unknown network error' };
  }
}

export async function createTopBannerInSupabase(banner) {
  try {
    const insertPayload = {
      content: banner.content ? banner.content.trim() : '',
      badge_text: banner.badgeText ? banner.badgeText.trim() : '',
      link: banner.link ? banner.link.trim() : '',
      order_index: parseInt(banner.orderIndex, 10) || 0,
      status: banner.status ? banner.status.toUpperCase() : 'ACTIVE'
    };

    const { data, error } = await supabase
      .from('top_banners')
      .insert([insertPayload])
      .select();

    if (error) throw error;
    return { success: true, data: data ? normalizeTopBanner(data[0]) : null };
  } catch (err) {
    console.error('Error creating top_banner:', err);
    return { success: false, error: err.message };
  }
}

export async function updateTopBannerInSupabase(id, updates) {
  try {
    const updatePayload = {};
    if (updates.content !== undefined) updatePayload.content = updates.content.trim();
    if (updates.badgeText !== undefined) updatePayload.badge_text = updates.badgeText.trim();
    if (updates.link !== undefined) updatePayload.link = updates.link.trim();
    if (updates.orderIndex !== undefined) updatePayload.order_index = parseInt(updates.orderIndex, 10) || 0;
    if (updates.status !== undefined) updatePayload.status = updates.status.toUpperCase();
    updatePayload.updated_at = new Date();

    const { data, error } = await supabase
      .from('top_banners')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) throw error;
    return { success: true, data: data ? normalizeTopBanner(data[0]) : null };
  } catch (err) {
    console.error('Error updating top_banner:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteTopBannerInSupabase(id) {
  try {
    const { error } = await supabase
      .from('top_banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleting top_banner:', err);
    return { success: false, error: err.message };
  }
}

