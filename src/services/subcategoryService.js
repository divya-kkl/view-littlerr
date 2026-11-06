import { supabase } from '../supabaseClient';

const FALLBACK_IMAGE = 'https://via.placeholder.com/150?text=No+Image';

const normalizeSubcategory = (row) => ({
  id: row.id,
  dbId: row.id,
  categoryId: row.category_id,
  subcategoryId: row.subcategory_id || null, // NULL = Level 1 Subcategory, ID = Child
  name: row.name,
  description: row.description || '',
  image: row.image_url || FALLBACK_IMAGE,
  status: row.status ? row.status.toUpperCase() : 'ACTIVE',
  createdAt: row.created_at,
  categoryName: row.categories ? row.categories.name : 'Unknown'
});

export async function getSubcategoriesFromSupabase(categoryId = null, activeOnly = false) {
  try {
    let query = supabase
      .from('subcategories')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('status', 'ACTIVE');
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetch subcategories error:', error.message);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null, isEmpty: true };
    }

    // Build parent name lookup map
    const nameMap = {};
    data.forEach(item => {
      nameMap[item.id] = item.name;
    });

    return {
      data: data.map(row => ({
        ...normalizeSubcategory(row),
        parentSubcategoryName: row.subcategory_id ? (nameMap[row.subcategory_id] || 'Parent Subcategory') : null
      })),
      error: null
    };
  } catch (err) {
    console.error('Error fetching subcategories:', err);
    return { data: null, error: err.message || 'Unknown network error' };
  }
}

// Fetch immediate Child Categories for a given Subcategory
export async function getChildCategories(subcategoryId, activeOnly = true) {
  try {
    let query = supabase
      .from('subcategories')
      .select('*, categories(name)')
      .eq('subcategory_id', subcategoryId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('status', 'ACTIVE');
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      data: (data || []).map(normalizeSubcategory),
      error: null
    };
  } catch (err) {
    console.error('Error fetching child categories:', err);
    return { data: [], error: err.message };
  }
}

// Fetch Breadcrumb hierarchy (e.g. Home > little_rr > Bangles > Antique Bangles)
export async function getCategoryBreadcrumbs(subcategoryId) {
  const crumbs = [];
  let currentId = subcategoryId;

  try {
    while (currentId) {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id, name, subcategory_id, category_id, categories(id, name)')
        .eq('id', currentId)
        .single();

      if (error || !data) break;

      crumbs.unshift({
        id: data.id,
        name: data.name,
        isChild: !!data.subcategory_id
      });

      // If top-level subcategory reached, add main category
      if (!data.subcategory_id && data.categories) {
        crumbs.unshift({
          id: data.categories.id,
          name: data.categories.name,
          isMainCategory: true
        });
        break;
      }

      currentId = data.subcategory_id;
    }
    return { data: crumbs, error: null };
  } catch (err) {
    console.error('Error fetching breadcrumbs:', err);
    return { data: [], error: err.message };
  }
}

export async function createSubcategoryInSupabase(subcategory) {
  try {
    const insertPayload = {
      category_id: subcategory.categoryId,
      subcategory_id: subcategory.subcategoryId || null, // NULL = Level 1, ID = Child
      name: subcategory.name.trim(),
      description: subcategory.description || '',
      image_url: subcategory.image || FALLBACK_IMAGE,
      status: subcategory.status ? subcategory.status.toUpperCase() : 'ACTIVE'
    };

    const { data, error } = await supabase
      .from('subcategories')
      .insert([insertPayload])
      .select();

    if (error) throw error;
    return { success: true, data: data ? normalizeSubcategory(data[0]) : null };
  } catch (err) {
    console.error('Error creating subcategory:', err);
    return { success: false, error: err.message };
  }
}

export async function updateSubcategoryInSupabase(dbId, updates) {
  try {
    const updatePayload = {};
    if (updates.categoryId !== undefined) updatePayload.category_id = updates.categoryId;
    if (updates.subcategoryId !== undefined) updatePayload.subcategory_id = updates.subcategoryId || null;
    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.description !== undefined) updatePayload.description = updates.description.trim();
    if (updates.image !== undefined) updatePayload.image_url = updates.image.trim();
    if (updates.status !== undefined) updatePayload.status = updates.status.toUpperCase();

    const { data, error } = await supabase
      .from('subcategories')
      .update(updatePayload)
      .eq('id', dbId)
      .select();

    if (error) throw error;
    return { success: true, data: data ? normalizeSubcategory(data[0]) : null };
  } catch (err) {
    console.error('Error updating subcategory:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteSubcategoryInSupabase(dbId) {
  try {
    // 1. Check if Child categories exist under this subcategory
    const { count: childCount, error: childErr } = await supabase
      .from('subcategories')
      .select('id', { count: 'exact' })
      .eq('subcategory_id', dbId);

    if (!childErr && childCount && childCount > 0) {
      return {
        success: false,
        error: `Cannot delete! This subcategory has ${childCount} Child subcategory(s) under it. Please delete the Child subcategories first.`
      };
    }

    // 2. Check if products exist directly under this subcategory
    const { count: prodCount, error: prodErr } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('subcategory_id', dbId);

    if (!prodErr && prodCount && prodCount > 0) {
      return {
        success: false,
        hasProducts: true,
        count: prodCount,
        error: `Cannot delete this subcategory because ${prodCount} product(s) are linked to it. Please delete or reassign all products first.`
      };
    }

    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', dbId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleting subcategory:', err);
    return { success: false, error: err.message };
  }
}

export async function uploadSubcategoryImageToSupabase(file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `subcat-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to 'subcategories' bucket
    const { error: uploadError } = await supabase.storage
      .from('subcategories')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('subcategories')
      .getPublicUrl(filePath);

    return { success: true, url: data.publicUrl };
  } catch (err) {
    console.error('Error uploading subcategory image:', err);
    return { success: false, error: err.message };
  }
}

export async function uploadChildCategoryImageToSupabase(file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `child-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to dedicated 'childcategories' bucket
    const { error: uploadError } = await supabase.storage
      .from('childcategories')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('childcategories')
      .getPublicUrl(filePath);

    return { success: true, url: data.publicUrl };
  } catch (err) {
    console.error('Error uploading child category image:', err);
    return { success: false, error: err.message };
  }
}
