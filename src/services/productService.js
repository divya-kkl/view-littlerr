import { supabase } from '../supabaseClient';
import { filterProductsBilingual } from '../utils/tamilSearchHelper';

const FALLBACK_IMAGE = 'https://via.placeholder.com/150?text=No+Image';

export const resolveImageUrl = (img) => {
  if (!img) return FALLBACK_IMAGE;
  if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('/')) return img;
  return supabase.storage.from('products').getPublicUrl(img).data.publicUrl;
};

const normalizeProduct = (row) => {
  let imagesArray = [];
  try {
    const parsed = JSON.parse(row.image_url);
    if (Array.isArray(parsed)) {
      imagesArray = parsed;
    } else if (parsed && typeof parsed === 'string') {
      imagesArray = [parsed];
    } else {
      imagesArray = [row.image_url || FALLBACK_IMAGE];
    }
  } catch (e) {
    imagesArray = [row.image_url || FALLBACK_IMAGE];
  }

  imagesArray = imagesArray
    .filter(Boolean)
    .map(resolveImageUrl);

  if (imagesArray.length === 0) {
    imagesArray = [FALLBACK_IMAGE];
  }

  return {
    id: row.id,
    dbId: row.id,
    categoryId: row.category_id,
    productCategoriesID: row.category_id || '',
    subcategoryId: row.subcategory_id,
    tagId: row.tag_id,
    tags: Array.isArray(row.tags) ? row.tags : (row.tag_id ? [row.tag_id] : []),
    productCode: row.product_code || '',
    name: row.name,
    description: row.description || '',
    brand: row.brand || '',
    price: row.price !== undefined && row.price !== null ? parseFloat(row.price) : 0,
    mrp: row.mrp !== undefined && row.mrp !== null ? parseFloat(row.mrp) : 0,
    discountPercentage: row.discount_percentage !== undefined && row.discount_percentage !== null ? parseFloat(row.discount_percentage) : 0,
    hasSize: Boolean(row.has_size),
    isFeatured: Boolean(row.is_featured),
    color: row.color || '',
    size: row.size || '',
    stock: row.stock !== undefined && row.stock !== null ? parseInt(row.stock, 10) : 0,
    material: row.material || '',
    embellishment: row.embellishment || '',
    neck: row.neck || '',
    sleeves: row.sleeves || '',
    closure: row.closure || '',
    lining: row.lining || '',
    washCare: row.wash_care || '',
    ironCare: row.iron_care || '',
    couponCode: row.coupon_code || '',
    rating: row.rating !== undefined && row.rating !== null ? parseFloat(row.rating) : 0,
    numReviews: row.num_reviews !== undefined && row.num_reviews !== null ? parseInt(row.num_reviews, 10) : 0,
    variants: Array.isArray(row.variants) ? row.variants : [],
    image: imagesArray[0],
    images: imagesArray,
    badge: row.badge || '',
    status: row.status ? row.status.toUpperCase() : 'ACTIVE',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryName: row.categories ? row.categories.name : 'Unknown',
    subcategoryName: row.subcategories ? row.subcategories.name : 'Unknown',
    tagName: row.tags_relation ? row.tags_relation.name : (row.tags ? (typeof row.tags === 'object' && row.tags.name ? row.tags.name : '') : '')
  };
};

export async function getProductsFromSupabase(activeOnly = false) {
  try {
    let query = supabase
      .from('products')
      .select('*, categories(name), subcategories(name)')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('status', 'ACTIVE');
    }

    const [{ data, error }, { data: allTags }] = await Promise.all([
      query,
      supabase.from('tags').select('id, name')
    ]);

    if (error) {
      console.warn('Supabase fetch products error:', error.message);
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null, isEmpty: true };
    }

    const tagMap = new Map();
    (allTags || []).forEach(t => {
      if (t.id) tagMap.set(String(t.id), t.name);
    });

    return {
      data: data.map(row => {
        const itemTagId = row.tag_id || (Array.isArray(row.tags) && row.tags.length > 0 ? row.tags[0] : '');
        const resolvedTagName = tagMap.get(String(itemTagId)) || '';
        return normalizeProduct({
          ...row,
          tag_id: itemTagId,
          tags_relation: { name: resolvedTagName }
        });
      }),
      error: null
    };
  } catch (err) {
    console.error('Error fetching products:', err);
    return { data: null, error: err.message || 'Unknown network error' };
  }
}

export async function searchProductsInSupabase(searchQuery) {
  try {
    if (!searchQuery || !searchQuery.trim()) {
      return { data: [], error: null };
    }

    const { data, error } = await getProductsFromSupabase(true);

    if (error) {
      console.warn('Supabase search products error:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null, isEmpty: true };
    }

    const matches = filterProductsBilingual(data, searchQuery);

    return {
      data: matches,
      error: null
    };
  } catch (err) {
    console.error('Error searching products:', err);
    return { data: null, error: err.message || 'Unknown network error' };
  }
}

export const prepareImageUrl = (images) => {
  if (!images || images.length === 0) return JSON.stringify([FALLBACK_IMAGE]);
  const arr = Array.isArray(images) ? images.filter(Boolean) : [images];
  if (arr.length === 0) return JSON.stringify([FALLBACK_IMAGE]);

  const compact = arr.map(img => {
    if (!img) return '';
    const str = String(img).trim();
    const match = str.match(/\/products\/([^?#]+)/);
    if (match) return match[1];
    try {
      const u = new URL(str);
      return u.origin + u.pathname;
    } catch (e) {
      return str;
    }
  });

  return JSON.stringify(compact);
};

export async function createProductInSupabase(product) {
  try {
    const rawImages = product.images && product.images.length > 0
      ? product.images
      : [product.image || FALLBACK_IMAGE];

    const insertPayload = {
      category_id: product.categoryId,
      subcategory_id: product.subcategoryId || null,
      tag_id: product.tagId || null,
      tags: product.tagId ? [product.tagId] : [],
      product_code: product.productCode || '',
      name: product.name ? product.name.trim() : '',
      brand: product.brand || '',
      price: parseFloat(product.price) || 0,
      mrp: parseFloat(product.mrp) || 0,
      discount_percentage: parseFloat(product.discountPercentage) || 0,
      stock: parseInt(product.stock, 10) || 0,
      coupon_code: product.couponCode || '',
      has_size: Boolean(product.hasSize),
      is_featured: Boolean(product.isFeatured),
      color: product.color || '',
      size: product.size || '',
      material: product.material || '',
      embellishment: product.embellishment || '',
      neck: product.neck || '',
      sleeves: product.sleeves || '',
      closure: product.closure || '',
      lining: product.lining || '',
      wash_care: product.washCare || '',
      iron_care: product.ironCare || '',
      description: product.description || '',
      image_url: prepareImageUrl(rawImages),
      badge: product.badge || '',
      status: product.status ? product.status.toUpperCase() : 'ACTIVE'
    };

    let { data, error } = await supabase
      .from('products')
      .insert([insertPayload])
      .select();

    if (error) throw error;
    return { success: true, data: data ? data[0] : null };
  } catch (err) {
    console.error('Error creating product:', err);
    return { success: false, error: err.message };
  }
}

export async function updateProductInSupabase(dbId, updates) {
  try {
    const updatePayload = {};
    if (updates.categoryId !== undefined) updatePayload.category_id = updates.categoryId;
    if (updates.subcategoryId !== undefined) updatePayload.subcategory_id = updates.subcategoryId || null;
    if (updates.tagId !== undefined) {
      updatePayload.tag_id = updates.tagId || null;
      updatePayload.tags = updates.tagId ? [updates.tagId] : [];
    }
    if (updates.productCode !== undefined) updatePayload.product_code = updates.productCode.trim();
    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.brand !== undefined) updatePayload.brand = updates.brand.trim();
    if (updates.price !== undefined) updatePayload.price = parseFloat(updates.price) || 0;
    if (updates.mrp !== undefined) updatePayload.mrp = parseFloat(updates.mrp) || 0;
    if (updates.discountPercentage !== undefined) updatePayload.discount_percentage = parseFloat(updates.discountPercentage) || 0;
    if (updates.stock !== undefined) updatePayload.stock = parseInt(updates.stock, 10) || 0;
    if (updates.couponCode !== undefined) updatePayload.coupon_code = updates.couponCode.trim();
    if (updates.hasSize !== undefined) updatePayload.has_size = Boolean(updates.hasSize);
    if (updates.isFeatured !== undefined) updatePayload.is_featured = Boolean(updates.isFeatured);
    if (updates.color !== undefined) updatePayload.color = updates.color.trim();
    if (updates.size !== undefined) updatePayload.size = updates.size.trim();
    if (updates.material !== undefined) updatePayload.material = updates.material.trim();
    if (updates.embellishment !== undefined) updatePayload.embellishment = updates.embellishment.trim();
    if (updates.neck !== undefined) updatePayload.neck = updates.neck.trim();
    if (updates.sleeves !== undefined) updatePayload.sleeves = updates.sleeves.trim();
    if (updates.closure !== undefined) updatePayload.closure = updates.closure.trim();
    if (updates.lining !== undefined) updatePayload.lining = updates.lining.trim();
    if (updates.washCare !== undefined) updatePayload.wash_care = updates.washCare.trim();
    if (updates.ironCare !== undefined) updatePayload.iron_care = updates.ironCare.trim();
    if (updates.description !== undefined) updatePayload.description = updates.description.trim();

    if (updates.images !== undefined) {
      updatePayload.image_url = prepareImageUrl(updates.images);
    } else if (updates.image !== undefined) {
      updatePayload.image_url = prepareImageUrl([updates.image.trim()]);
    }

    if (updates.badge !== undefined) updatePayload.badge = updates.badge.trim();
    if (updates.status !== undefined) updatePayload.status = updates.status.toUpperCase();

    let { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', dbId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("Update failed. 0 rows modified (Check Supabase RLS policies for UPDATE).");
    }
    return { success: true, data: data[0] };
  } catch (err) {
    console.error('Error updating product:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteProductInSupabase(dbId) {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', dbId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Error deleting product:', err);
    return { success: false, error: err.message };
  }
}

export async function uploadProductImageToSupabase(file) {
  try {
    const rawExt = file.name.split('.').pop() || 'jpg';
    const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `p${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}.${cleanExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('products')
      .getPublicUrl(filePath);

    return { success: true, url: data.publicUrl, fileName: filePath };
  } catch (err) {
    console.error('Error uploading product image:', err);
    return { success: false, error: err.message };
  }
}
