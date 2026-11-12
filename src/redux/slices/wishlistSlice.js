import { createSlice } from '@reduxjs/toolkit';

const deduplicateItems = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const unique = [];
  for (const item of list) {
    if (!item) continue;
    const key = (
      String(item.product_id || item.dbId || item.id || item.productCode || '').trim().toLowerCase() ||
      String(item.name || item.product_name || '').trim().toLowerCase()
    );
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique;
};

const matchesProduct = (w, targetId) => {
  const target = String(targetId || '').trim().toLowerCase();
  if (!target) return false;
  return (
    String(w.product_id || '').trim().toLowerCase() === target ||
    String(w.dbId || '').trim().toLowerCase() === target ||
    String(w.id || '').trim().toLowerCase() === target ||
    String(w.name || '').trim().toLowerCase() === target ||
    String(w.product_name || '').trim().toLowerCase() === target ||
    String(w.productCode || '').trim().toLowerCase() === target
  );
};

const loadWishlistFromStorage = () => {
  try {
    const saved = localStorage.getItem('wishlist');
    return saved ? deduplicateItems(JSON.parse(saved)) : [];
  } catch (e) {
    return [];
  }
};

const saveWishlistToStorage = (items) => {
  try {
    const unique = deduplicateItems(items);
    localStorage.setItem('wishlist', JSON.stringify(unique));
  } catch (e) {
    console.error('Failed to save wishlist to localStorage:', e);
  }
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: loadWishlistFromStorage(),
  },
  reducers: {
    setWishlist: (state, action) => {
      state.items = deduplicateItems(action.payload || []);
      saveWishlistToStorage(state.items);
    },
    toggleWishlist: (state, action) => {
      const product = action.payload;
      const id = String(product.product_id || product.dbId || product.id || product.productCode || product.name || '');
      const prodName = product.name || product.product_name || '';

      const index = state.items.findIndex(
        (w) => matchesProduct(w, id) || (prodName && matchesProduct(w, prodName))
      );

      if (index >= 0) {
        state.items.splice(index, 1);
      } else {
        state.items.push(product);
      }
      state.items = deduplicateItems(state.items);
      saveWishlistToStorage(state.items);
    },
    addToWishlist: (state, action) => {
      const product = action.payload;
      const id = String(product.product_id || product.dbId || product.id || product.productCode || product.name || '');
      const prodName = product.name || product.product_name || '';

      const exists = state.items.some(
        (w) => matchesProduct(w, id) || (prodName && matchesProduct(w, prodName))
      );
      if (!exists) {
        state.items.push(product);
        state.items = deduplicateItems(state.items);
        saveWishlistToStorage(state.items);
      }
    },
    removeFromWishlist: (state, action) => {
      const id = String(action.payload || '');
      state.items = state.items.filter((w) => !matchesProduct(w, id));
      saveWishlistToStorage(state.items);
    },
    clearWishlist: (state) => {
      state.items = [];
      saveWishlistToStorage([]);
    },
  },
});

export const { setWishlist, toggleWishlist, addToWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
