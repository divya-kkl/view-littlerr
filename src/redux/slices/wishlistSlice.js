import { createSlice } from '@reduxjs/toolkit';

const loadWishlistFromStorage = () => {
  try {
    const saved = localStorage.getItem('wishlist');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const saveWishlistToStorage = (items) => {
  try {
    localStorage.setItem('wishlist', JSON.stringify(items));
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
      state.items = action.payload || [];
      saveWishlistToStorage(state.items);
    },
    toggleWishlist: (state, action) => {
      const product = action.payload;
      const id = String(product.dbId || product.id || product.productCode || product.name);
      const index = state.items.findIndex(
        (w) => String(w.dbId || w.id || w.product_id || w.name) === id
      );

      if (index >= 0) {
        state.items.splice(index, 1);
      } else {
        state.items.push(product);
      }
      saveWishlistToStorage(state.items);
    },
    addToWishlist: (state, action) => {
      const product = action.payload;
      const id = String(product.dbId || product.id || product.productCode || product.name);
      const exists = state.items.some(
        (w) => String(w.dbId || w.id || w.product_id || w.name) === id
      );
      if (!exists) {
        state.items.push(product);
        saveWishlistToStorage(state.items);
      }
    },
    removeFromWishlist: (state, action) => {
      const id = String(action.payload);
      state.items = state.items.filter(
        (w) => String(w.dbId || w.id || w.product_id || w.name) !== id
      );
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
