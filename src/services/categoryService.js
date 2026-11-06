import { supabase } from '../supabaseClient';
import { CATEGORIES as DEFAULT_CATEGORIES } from '../data/little_rrData';

export const CATEGORIES_SQL_SCHEMA = `-- SQL Setup`;

const FALLBACK_IMAGE = 'https://via.placeholder.com/150?text=No+Image';

const normalizeCategory = (row) => ({
  id: row.id,
  dbId: row.id,
  name: row.name,
  description: row.description || '',
  image: row.image_url || FALLBACK_IMAGE,
  status: row.status ? row.status.toUpperCase() : 'ACTIVE',
  createdAt: row.created_at
});

export async function getCategoriesFromSupabase(activeOnly = false) {
  try {
    let query = supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('status', 'ACTIVE');
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetch categories error:', error.message);
      return { data: null, error: error.message, tableMissing: error.code === '42P01' || error.message?.includes('does not exist') };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null, isEmpty: true };
    }

    return { data: data.map(normalizeCategory), error: null };
  } catch (err) {
    console.error('Error fetching categories from Supabase:', err);
    return { data: null, error: err.message || 'Unknown network error' };
  }
}

export async function createCategoryInSupabase(category) {
  try {
    const insertPayload = {
      name: category.name.trim(),
      description: category.description || '',
      image_url: category.image || FALLBACK_IMAGE,
      status: category.status ? category.status.toUpperCase() : 'ACTIVE'
    };

    const { data, error } = await supabase
      .from('categories')
      .insert([insertPayload])
      .select();

    if (error) throw error;
    return { success: true, data: data ? normalizeCategory(data[0]) : null };
  } catch (err) {
    console.error('Error creating category:', err);
    return { success: false, error: err.message };
  }
}

export async function updateCategoryInSupabase(dbId, updates) {
  try {
    const updatePayload = {};
    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.description !== undefined) updatePayload.description = updates.description.trim();
    if (updates.image !== undefined) updatePayload.image_url = updates.image.trim();
    if (updates.status !== undefined) updatePayload.status = updates.status.toUpperCase();

    const { data, error } = await supabase
      .from('categories')
      .update(updatePayload)
      .eq('id', dbId)
      .select();

    if (error) throw error;
    return { success: true, data: data ? normalizeCategory(data[0]) : null };
  } catch (err) {
    console.error('Error updating category:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteCategoryInSupabase(dbId) {
  try {

    const { error: prodErr, count: prodCount } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('category_id', dbId);

    if (!prodErr && prodCount && prodCount > 0) {
      return {
        success: false,
        hasProducts: true,
        count: prodCount,
        error: `Cannot delete this category because ${prodCount} product(s) are linked to it. Please delete all products in this category first before deleting it.`
      };
    }


    const { error: subErr, count: subCount } = await supabase
      .from('subcategories')
      .select('id', { count: 'exact' })
      .eq('category_id', dbId);

    if (!subErr && subCount && subCount > 0) {
      return {
        success: false,
        hasSubcategories: true,
        count: subCount,
        error: `Cannot delete this category because ${subCount} subcategory(s) exist under it. Please delete the subcategories first before deleting this category.`
      };
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', dbId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleting category:', err);
    return { success: false, error: err.message };
  }
}

export async function seedDefaultCategoriesToSupabase() {
  try {
    const rows = DEFAULT_CATEGORIES.map((cat) => ({
      slug: cat.id,
      name: cat.name,
      image: cat.image,
      item_count: cat.itemCount,
      tag: cat.tag,
      status: 'ACTIVE'
    }));

    const { data, error } = await supabase
      .from('categories')
      .insert(rows)
      .select();

    if (error) throw error;
    return { success: true, count: data ? data.length : rows.length };
  } catch (err) {
    console.error('Error seeding categories:', err);
    return { success: false, error: err.message };
  }
}

export async function uploadImageToSupabase(file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `cat-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to 'images' bucket
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return { success: true, url: data.publicUrl };
  } catch (err) {
    console.error('Error uploading image:', err);
    return { success: false, error: err.message };
  }
}
