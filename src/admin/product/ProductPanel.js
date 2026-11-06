import React, { useState, useEffect } from 'react';
import '../AdminPanel.css';
import {
  getProductsFromSupabase,
  createProductInSupabase,
  updateProductInSupabase,
  deleteProductInSupabase,
  uploadProductImageToSupabase
} from '../../services/productService';
import { getCategoriesFromSupabase } from '../../services/categoryService';
import { getSubcategoriesFromSupabase } from '../../services/subcategoryService';
import { getTagsFromSupabase } from '../../services/tagService';
import { parseSizeVariants, serializeSizeVariants } from '../../utils/sizeStockHelper';

const ProductPanel = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [sizeVariants, setSizeVariants] = useState([]);

  const initialFormState = {
    categoryId: '',
    subcategoryId: '',
    tagId: '',
    productCode: '',
    name: '',
    brand: '',
    price: '',
    mrp: '',
    discountPercentage: '',
    stock: '',
    couponCode: '',
    hasSize: false,
    isFeatured: false,
    color: '',
    size: '',
    material: '',
    embellishment: '',
    neck: '',
    sleeves: '',
    closure: '',
    lining: '',
    washCare: '',
    ironCare: '',
    description: '',
    status: 'ACTIVE',
    badge: '',
    image: '',
    images: []
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const catRes = await getCategoriesFromSupabase(false);
    if (catRes.data) setCategories(catRes.data);

    const subcatRes = await getSubcategoriesFromSupabase(null, false);
    if (subcatRes.data) setSubcategories(subcatRes.data);

    const tagRes = await getTagsFromSupabase(false);
    if (tagRes.data) setTags(tagRes.data);

    const prodRes = await getProductsFromSupabase();
    if (prodRes.data) setProducts(prodRes.data);

    setIsLoading(false);
  };

  const buildTreeOptions = (items, parentSubId = null, depth = 0) => {
    const list = [];
    const filtered = items.filter(i => (i.subcategoryId || null) === parentSubId);

    for (const item of filtered) {
      list.push({
        ...item,
        label: `${'— '.repeat(depth)}${item.name} ${depth > 0 ? '(Child)' : ''}`
      });
      list.push(...buildTreeOptions(items, item.dbId, depth + 1));
    }
    return list;
  };

  const openForm = (product = null) => {
    if (product) {
      setEditingProduct(product);
      const parsedVariants = parseSizeVariants(product);
      setSizeVariants(parsedVariants);
      setFormData({
        categoryId: product.categoryId || '',
        subcategoryId: product.subcategoryId || '',
        tagId: product.tagId || '',
        productCode: product.productCode || '',
        name: product.name || '',
        brand: product.brand || '',
        price: product.price !== undefined && product.price !== null ? product.price : '',
        mrp: product.mrp !== undefined && product.mrp !== null ? product.mrp : '',
        discountPercentage: product.discountPercentage !== undefined && product.discountPercentage !== null ? product.discountPercentage : '',
        stock: product.stock !== undefined && product.stock !== null ? product.stock : '',
        couponCode: product.couponCode || '',
        hasSize: Boolean(product.hasSize),
        isFeatured: Boolean(product.isFeatured),
        color: product.color || '',
        size: product.size || '',
        material: product.material || '',
        embellishment: product.embellishment || '',
        neck: product.neck || '',
        sleeves: product.sleeves || '',
        closure: product.closure || '',
        lining: product.lining || '',
        washCare: product.washCare || '',
        ironCare: product.ironCare || '',
        description: product.description || '',
        status: product.status || 'ACTIVE',
        badge: product.badge || '',
        image: product.image || '',
        images: product.images || (product.image ? [product.image] : [])
      });
    } else {
      setEditingProduct(null);
      setSizeVariants([]);
      setFormData({
        ...initialFormState,
        categoryId: categories.length > 0 ? categories[0].dbId : ''
      });
    }
    setImageFiles([]);
    setIsFormOpen(true);
  };

  const handlePriceChange = (field, val) => {
    let nextPrice = field === 'price' ? val : formData.price;
    let nextMrp = field === 'mrp' ? val : formData.mrp;
    let nextDiscount = field === 'discountPercentage' ? val : formData.discountPercentage;

    const p = parseFloat(nextPrice);
    const m = parseFloat(nextMrp);

    if (field === 'price' || field === 'mrp') {
      if (m > 0 && p >= 0 && m >= p) {
        nextDiscount = Math.round(((m - p) / m) * 100);
      }
    } else if (field === 'discountPercentage') {
      const d = parseFloat(val);
      if (m > 0 && !isNaN(d)) {
        nextPrice = Math.round(m - (m * (d / 100)));
      }
    }

    setFormData(prev => ({
      ...prev,
      [field]: val,
      ...(field !== 'price' ? { price: nextPrice } : {}),
      ...(field !== 'discountPercentage' ? { discountPercentage: nextDiscount } : {})
    }));
  };

  const syncVariantsToFormData = (variants) => {
    setSizeVariants(variants);
    const sizeStr = serializeSizeVariants(variants);
    const totalStock = variants.length > 0
      ? variants.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0)
      : formData.stock;
    setFormData(prev => ({
      ...prev,
      size: sizeStr,
      hasSize: variants.length > 0,
      ...(variants.length > 0 ? { stock: totalStock } : {})
    }));
  };

  const handleToggleSizeVariant = (sizeName, defaultStock = 10) => {
    const exists = sizeVariants.some(v => v.size.toLowerCase() === sizeName.toLowerCase());
    let nextVariants;
    if (exists) {
      nextVariants = sizeVariants.filter(v => v.size.toLowerCase() !== sizeName.toLowerCase());
    } else {
      nextVariants = [...sizeVariants, { size: sizeName, stock: defaultStock }];
    }
    syncVariantsToFormData(nextVariants);
  };

  const handleUpdateSizeStock = (sizeName, newStock) => {
    const stockVal = Math.max(0, parseInt(newStock, 10) || 0);
    const nextVariants = sizeVariants.map(v => {
      if (v.size.toLowerCase() === sizeName.toLowerCase()) {
        return { ...v, stock: stockVal };
      }
      return v;
    });
    syncVariantsToFormData(nextVariants);
  };

  const handleRemoveSizeVariant = (sizeName) => {
    const nextVariants = sizeVariants.filter(v => v.size.toLowerCase() !== sizeName.toLowerCase());
    syncVariantsToFormData(nextVariants);
  };

  const handleAddCustomSizeVariant = (e) => {
    if (e) e.preventDefault();
    const clean = (customSizeInput || '').trim();
    if (!clean) return;
    if (!sizeVariants.some(v => v.size.toLowerCase() === clean.toLowerCase())) {
      const nextVariants = [...sizeVariants, { size: clean, stock: 10 }];
      syncVariantsToFormData(nextVariants);
    }
    setCustomSizeInput('');
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.categoryId) {
      alert("Please select a Category!");
      return;
    }

    setIsSaving(true);

    let finalImages = [...(formData.images || [])];

    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        const { success, url, error } = await uploadProductImageToSupabase(file);
        if (success) {
          finalImages.push(url);
        } else {
          alert("Image upload failed!\nError: " + error);
          setIsSaving(false);
          return;
        }
      }
    }

    finalImages = finalImages.filter(Boolean);

    if (finalImages.length === 0) {
      finalImages = [formData.image || ''];
    }

    const payload = {
      ...formData,
      image: finalImages[0],
      images: finalImages
    };

    if (editingProduct) {
      const { success, error } = await updateProductInSupabase(editingProduct.dbId, payload);
      if (success) {
        loadData();
        setIsFormOpen(false);
      } else {
        alert("Error updating: " + error);
      }
    } else {
      const { success, error } = await createProductInSupabase(payload);
      if (success) {
        loadData();
        setIsFormOpen(false);
      } else {
        alert("Error creating: " + error);
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (dbId, name) => {
    if (window.confirm(`Delete product "${name}"?`)) {
      const { success } = await deleteProductInSupabase(dbId);
      if (success) loadData();
    }
  };

  const q = (searchQuery || '').trim().toLowerCase();
  const filteredProducts = products.filter(p => {
    if (!q) return true;
    const name = (p?.name || '').toLowerCase();
    const code = (p?.productCode || '').toLowerCase();
    const cat = (p?.categoryName || '').toLowerCase();
    const sub = (p?.subcategoryName || '').toLowerCase();
    const brand = (p?.brand || '').toLowerCase();
    const id = String(p?.id || '').toLowerCase();
    const dbId = String(p?.dbId || '').toLowerCase();
    return name.includes(q) || code.includes(q) || cat.includes(q) || sub.includes(q) || brand.includes(q) || id.includes(q) || dbId.includes(q);
  });

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const totalImagesCount = (formData.images?.length || 0) + imageFiles.length;

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 style={{ margin: 0 }}>Products List</h3>
            {!isLoading && filteredProducts.length > 0 && (
              <div className="admin-pagination-info" style={{ marginTop: '5px', fontSize: '0.86rem' }}>
                Showing <span>{startIndex + 1}</span> to <span>{endIndex}</span> of <span>{totalItems}</span> products
              </div>
            )}
          </div>
          <div className="admin-controls">
            <input
              type="text"
              className="admin-search"
              placeholder="Search product name, code, category, brand..."
              value={searchQuery || ''}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            <button className="admin-btn-primary" onClick={() => openForm()}>
              + Add Product
            </button>
          </div>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Category</th>
                <th>Product Details</th>
                <th>Status</th>
                <th>Price & MRP</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`shimmer-${idx}`}>
                    <td><div className="admin-shimmer" style={{ width: '60px', height: '60px' }}></div></td>
                    <td>
                      <div className="admin-shimmer" style={{ width: '80px', height: '15px', marginBottom: '4px' }}></div>
                      <div className="admin-shimmer" style={{ width: '60px', height: '12px' }}></div>
                    </td>
                    <td>
                      <div className="admin-shimmer" style={{ width: '150px', height: '15px', marginBottom: '4px' }}></div>
                      <div className="admin-shimmer" style={{ width: '200px', height: '12px' }}></div>
                    </td>
                    <td><div className="admin-shimmer" style={{ width: '60px', height: '24px', borderRadius: '12px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '80px', height: '15px' }}></div></td>
                    <td><div className="admin-shimmer" style={{ width: '40px', height: '15px' }}></div></td>
                    <td>
                      <div className="admin-shimmer" style={{ display: 'inline-block', width: '30px', height: '30px', marginRight: '5px' }}></div>
                      <div className="admin-shimmer" style={{ display: 'inline-block', width: '30px', height: '30px' }}></div>
                    </td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                    {searchQuery ? `No products found matching "${searchQuery}"` : 'No products found'}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => (
                  <tr key={prod.dbId}>
                    <td>
                      <img src={prod.image} alt={prod.name} className="list-img" style={{ height: '60px', width: '60px', objectFit: 'cover', borderRadius: '6px' }} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold', color: '#111827' }}>{prod.categoryName}</div>
                      {prod.subcategoryName && prod.subcategoryName !== 'Unknown' && (
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{prod.subcategoryName}</div>
                      )}
                    </td>
                    <td>
                      <div className="list-title" style={{ marginBottom: '4px', fontWeight: 600 }}>
                        {prod.name}
                        {prod.productCode && <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '0.8rem', fontWeight: 'normal' }}>#{prod.productCode}</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#4b5563', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {prod.brand && <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>{prod.brand}</span>}
                        {prod.tagName && <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>{prod.tagName}</span>}
                        {prod.isFeatured && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500 }}>★ Featured</span>}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${prod.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                        {prod.status}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#059669', fontSize: '1.05rem' }}>
                        ₹{parseFloat(prod.price || 0).toLocaleString('en-IN')}
                      </strong>
                      {parseFloat(prod.mrp) > parseFloat(prod.price) && (
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', textDecoration: 'line-through' }}>
                          ₹{parseFloat(prod.mrp).toLocaleString('en-IN')}
                        </div>
                      )}
                      {parseFloat(prod.discountPercentage) > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold' }}>
                          {prod.discountPercentage}% OFF
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: (prod.stock > 0 ? '#111827' : '#dc2626') }}>
                        {prod.stock !== undefined && prod.stock !== null ? prod.stock : 0}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn edit" onClick={() => openForm(prod)} title="Edit">✎</button>
                      <button className="action-btn delete" onClick={() => handleDelete(prod.dbId, prod.name)} title="Delete">🗑</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredProducts.length > 0 && (
          <div className="admin-pagination">
            <div className="admin-pagination-nav">
              <button
                type="button"
                className="page-btn nav-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage === 1}
                title="Previous Page"
              >
                ‹
              </button>

              {getPageNumbers().map((item, idx) =>
                item === '...' ? (
                  <span key={`dots-${idx}`} className="page-ellipsis">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`page-btn ${safeCurrentPage === item ? 'active' : ''}`}
                    onClick={() => setCurrentPage(item)}
                  >
                    {item}
                  </button>
                )
              )}

              <button
                type="button"
                className="page-btn nav-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage === totalPages}
                title="Next Page"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: '920px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="admin-modal-header" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button className="close-modal-btn" onClick={() => setIsFormOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="admin-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                {/* Section 1: Category & Basic Information */}
                <div>
                  <div style={{ borderBottom: '2px solid #2563eb', paddingBottom: '8px', marginBottom: '18px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                      📦 1. Category & Basic Information
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Category (productCategoriesID) *
                      </label>
                      <select
                        required
                        value={formData.categoryId}
                        onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      >
                        <option value="" disabled>Select a Category...</option>
                        {categories.map(c => (
                          <option key={c.dbId} value={c.dbId}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Subcategory (Optional)
                      </label>
                      <select
                        value={formData.subcategoryId}
                        onChange={e => setFormData({ ...formData, subcategoryId: e.target.value })}
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      >
                        <option value="">None (Under Category Only)</option>
                        {buildTreeOptions(subcategories.filter(s => s.categoryId === formData.categoryId)).map(s => (
                          <option key={s.dbId} value={s.dbId}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Product Name (name) *
                      </label>
                      <input
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Royal Silk Anarkali / Gold Necklace"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Brand (brand)
                      </label>
                      <input
                        value={formData.brand}
                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="e.g. Sri Vinayaga / Tanishq"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Product Code (SKU)
                      </label>
                      <input
                        value={formData.productCode}
                        onChange={e => setFormData({ ...formData, productCode: e.target.value })}
                        placeholder="e.g. PRD-1024"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Tag (Badge)
                      </label>
                      <select
                        value={formData.tagId}
                        onChange={e => setFormData({ ...formData, tagId: e.target.value })}
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      >
                        <option value="">No Tag</option>
                        {tags.map(t => (
                          <option key={t.dbId} value={t.dbId}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Pricing, Discount & Stock Inventory */}
                <div>
                  <div style={{ borderBottom: '2px solid #10b981', paddingBottom: '8px', marginBottom: '18px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                      💰 2. Pricing, Discount & Stock Inventory
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={e => handlePriceChange('price', e.target.value)}
                        placeholder="e.g. 2499"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        MRP (Original Price ₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.mrp}
                        onChange={e => handlePriceChange('mrp', e.target.value)}
                        placeholder="e.g. 3999"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Discount Percentage (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.discountPercentage}
                        onChange={e => handlePriceChange('discountPercentage', e.target.value)}
                        placeholder="e.g. 25"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Stock Quantity (stock) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                        placeholder="e.g. 50"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Coupon Code (couponCode)
                      </label>
                      <input
                        value={formData.couponCode}
                        onChange={e => setFormData({ ...formData, couponCode: e.target.value })}
                        placeholder="e.g. FESTIVE20"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, color: '#374151', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={formData.hasSize}
                          onChange={e => setFormData({ ...formData, hasSize: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>Has Size Options? (hasSize)</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, color: '#374151', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={formData.isFeatured}
                          onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span>Featured Product? (isFeatured)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section 3: Style, Color, Size & Material Attributes */}
                <div>
                  <div style={{ borderBottom: '2px solid #8b5cf6', paddingBottom: '8px', marginBottom: '18px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                      🎨 3. Style, Color, Size & Material Attributes
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Primary Color (color)
                      </label>
                      <input
                        value={formData.color}
                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                        placeholder="e.g. Gold / Maroon / Red / Yellow"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontWeight: 700, fontSize: '0.94rem', color: '#1e293b', display: 'block' }}>
                            📏 Size-wise Stock Management (Supabase)
                          </label>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            Assign stock for each size. If stock is 0, the size will be automatically crossed out (struck through) on the customer page.
                          </span>
                        </div>
                        <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                          {sizeVariants.length} size(s) active
                        </span>
                      </div>

                      {/* Active Size Variant Cards with Stock Inputs */}
                      {sizeVariants.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                          {sizeVariants.map((v) => {
                            const isZero = parseInt(v.stock, 10) === 0;
                            return (
                              <div
                                key={v.size}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '12px',
                                  background: isZero ? '#fff5f5' : '#ffffff',
                                  border: isZero ? '1.5px solid #fecaca' : '1px solid #cbd5e1',
                                  borderRadius: '8px',
                                  padding: '10px 14px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '110px' }}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '4px 12px',
                                      borderRadius: '6px',
                                      background: isZero ? '#ef4444' : '#003B2F',
                                      color: '#ffffff',
                                      fontWeight: 800,
                                      fontSize: '0.9rem',
                                      letterSpacing: '0.5px'
                                    }}
                                  >
                                    {v.size}
                                  </span>
                                  {isZero ? (
                                    <span style={{ fontSize: '0.74rem', color: '#dc2626', fontWeight: 700 }}>
                                      ❌ Out of Stock (Struck out)
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
                                      ✓ In Stock
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                                    Stock:
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={v.stock !== undefined ? v.stock : 0}
                                    onChange={(e) => handleUpdateSizeStock(v.size, e.target.value)}
                                    style={{
                                      width: '80px',
                                      padding: '6px 8px',
                                      borderRadius: '6px',
                                      border: isZero ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                                      fontSize: '0.88rem',
                                      fontWeight: 700,
                                      textAlign: 'center',
                                      background: isZero ? '#fef2f2' : '#ffffff'
                                    }}
                                  />

                                  {/* Quick preset stock buttons */}
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSizeStock(v.size, 0)}
                                      title="Set Out of Stock"
                                      style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #fca5a5',
                                        background: isZero ? '#fee2e2' : '#ffffff',
                                        color: '#dc2626',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      0 (Out)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSizeStock(v.size, 5)}
                                      style={{
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        background: '#f8fafc',
                                        color: '#475569',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      5
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSizeStock(v.size, 10)}
                                      style={{
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        background: '#f8fafc',
                                        color: '#475569',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      10
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSizeStock(v.size, 20)}
                                      style={{
                                        padding: '4px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        background: '#f8fafc',
                                        color: '#475569',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      20
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSizeVariant(v.size)}
                                    title="Remove this size"
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      background: '#ffffff',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      marginLeft: '4px'
                                    }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '14px', padding: '12px', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                          No sizes added yet. Click any size preset below or add a custom size.
                        </div>
                      )}

                      {/* Presets Group */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
                            👕 Click to Add Adult Sizes:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size'].map(s => {
                              const active = sizeVariants.some(v => v.size.toLowerCase() === s.toLowerCase());
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleToggleSizeVariant(s, 10)}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: '6px',
                                    border: active ? '1.5px solid #003B2F' : '1px solid #cbd5e1',
                                    background: active ? '#003B2F' : '#ffffff',
                                    color: active ? '#ffffff' : '#334155',
                                    fontSize: '0.8rem',
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {active ? `✓ ${s}` : `+ ${s}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
                            👶 Click to Add Kids Sizes:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {['0-3M', '3-6M', '6-12M', '1-2Y', '2-3Y', '3-4Y', '4-5Y', '5-6Y', '7-8Y', '9-10Y', '11-12Y'].map(s => {
                              const active = sizeVariants.some(v => v.size.toLowerCase() === s.toLowerCase());
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleToggleSizeVariant(s, 10)}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: active ? '1.5px solid #003B2F' : '1px solid #cbd5e1',
                                    background: active ? '#003B2F' : '#ffffff',
                                    color: active ? '#ffffff' : '#334155',
                                    fontSize: '0.8rem',
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {active ? `✓ ${s}` : `+ ${s}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
                            🔢 Click to Add Numeric Sizes:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {['24', '26', '28', '30', '32', '34', '36', '38', '40', '42'].map(s => {
                              const active = sizeVariants.some(v => v.size.toLowerCase() === s.toLowerCase());
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => handleToggleSizeVariant(s, 10)}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    border: active ? '1.5px solid #003B2F' : '1px solid #cbd5e1',
                                    background: active ? '#003B2F' : '#ffffff',
                                    color: active ? '#ffffff' : '#334155',
                                    fontSize: '0.8rem',
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {active ? `✓ ${s}` : `+ ${s}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom size input */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <input
                            type="text"
                            value={customSizeInput}
                            onChange={e => setCustomSizeInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSizeVariant(); } }}
                            placeholder="Add custom size (e.g. 13-14Y, 44, XL-Long)..."
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomSizeVariant}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '6px',
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            + Add Size
                          </button>
                        </div>

                        {/* Direct preview */}
                        <div style={{ marginTop: '4px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Raw value saved in Supabase <code>products.size</code> (Format: <code>SIZE:STOCK</code>):
                          </span>
                          <input
                            value={formData.size}
                            onChange={e => {
                              const val = e.target.value;
                              setFormData(prev => ({
                                ...prev,
                                size: val,
                                hasSize: val.trim().length > 0
                              }));
                              const reparsed = parseSizeVariants({ size: val });
                              setSizeVariants(reparsed);
                            }}
                            placeholder="e.g. S:0, M:10, L:5, XL:0"
                            style={{ width: '100%', marginTop: '3px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#334155', background: '#fff' }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Material / Fabric (material)
                      </label>
                      <input
                        value={formData.material}
                        onChange={e => setFormData({ ...formData, material: e.target.value })}
                        placeholder="e.g. Pure Silk / 22K Gold / Georgette"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Embellishment (embellishment)
                      </label>
                      <input
                        value={formData.embellishment}
                        onChange={e => setFormData({ ...formData, embellishment: e.target.value })}
                        placeholder="e.g. Zari Embroidery / Kundan / Pearl"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Design Details & Care Instructions */}
                <div>
                  <div style={{ borderBottom: '2px solid #f59e0b', paddingBottom: '8px', marginBottom: '18px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                      👔 4. Design Details & Care Instructions
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Neck Design (neck)
                      </label>
                      <input
                        value={formData.neck}
                        onChange={e => setFormData({ ...formData, neck: e.target.value })}
                        placeholder="e.g. Round Neck / Choker / Boat Neck"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Sleeves (sleeves)
                      </label>
                      <input
                        value={formData.sleeves}
                        onChange={e => setFormData({ ...formData, sleeves: e.target.value })}
                        placeholder="e.g. 3/4th Sleeves / Sleeveless"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Closure Type (closure)
                      </label>
                      <input
                        value={formData.closure}
                        onChange={e => setFormData({ ...formData, closure: e.target.value })}
                        placeholder="e.g. S-Hook / Zipper / Drawstring"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Lining (lining)
                      </label>
                      <input
                        value={formData.lining}
                        onChange={e => setFormData({ ...formData, lining: e.target.value })}
                        placeholder="e.g. Attached Cotton / None"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Wash Care (washCare)
                      </label>
                      <input
                        value={formData.washCare}
                        onChange={e => setFormData({ ...formData, washCare: e.target.value })}
                        placeholder="e.g. Dry Clean Only / Wipe with Soft Cloth"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                        Iron Care (ironCare)
                      </label>
                      <input
                        value={formData.ironCare}
                        onChange={e => setFormData({ ...formData, ironCare: e.target.value })}
                        placeholder="e.g. Low Heat Steam / Do Not Iron Directly"
                        style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                      Product Description (description)
                    </label>
                    <textarea
                      rows="4"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter detailed description of the product, design, styling tips, etc."
                      style={{ padding: '12px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%', fontFamily: 'inherit' }}
                    ></textarea>
                  </div>
                </div>

                {/* Section 5: Status & Product Images */}
                <div>
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151' }}>
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%' }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.88rem', color: '#374151', marginBottom: '8px' }}>
                      Product Images (images: string[]) ({totalImagesCount} images selected)
                    </label>

                    <div
                      className="file-dropzone"
                      style={{
                        border: '2px dashed #3b82f6',
                        background: '#f8fafc',
                        padding: '24px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '6px' }}>📸</div>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: '4px' }}>
                        Click here to upload product images
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        You can select multiple images (JPG, PNG, WEBP)
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => {
                          if (e.target.files && e.target.files.length > 0) {
                            setImageFiles(prev => [...prev, ...Array.from(e.target.files)]);
                            e.target.value = '';
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    {/* 5 Permanent Slot Cards */}
                    <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                      {[0, 1, 2, 3, 4].map(idx => {
                        const allExisting = formData.images || [];
                        const isCover = idx === 0;

                        let item = null;
                        if (idx < allExisting.length) {
                          item = { type: 'existing', src: allExisting[idx], index: idx };
                        } else if (idx < allExisting.length + imageFiles.length) {
                          const fileIdx = idx - allExisting.length;
                          item = { type: 'new', src: URL.createObjectURL(imageFiles[fileIdx]), fileIdx };
                        }

                        return (
                          <div
                            key={idx}
                            style={{
                              position: 'relative',
                              height: '120px',
                              border: item
                                ? (isCover ? '2px solid #16a34a' : '2px solid #3b82f6')
                                : (isCover ? '2px dashed #16a34a' : '2px dashed #cbd5e1'),
                              borderRadius: '8px',
                              background: item ? '#fff' : (isCover ? '#f0fdf4' : '#ffffff'),
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              boxShadow: item ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                            }}
                          >
                            {item ? (
                              <>
                                <img
                                  src={item.src}
                                  alt={`Slot ${idx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <span style={{
                                  position: 'absolute',
                                  bottom: '5px',
                                  left: '5px',
                                  background: isCover ? '#16a34a' : 'rgba(0,0,0,0.75)',
                                  color: '#fff',
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontWeight: 'bold'
                                }}>
                                  {isCover ? '★ Cover Image' : `Image ${idx + 1}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.type === 'existing') {
                                      const copy = [...formData.images];
                                      copy.splice(item.index, 1);
                                      setFormData({ ...formData, images: copy });
                                    } else {
                                      setImageFiles(prev => prev.filter((_, i) => i !== item.fileIdx));
                                    }
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px',
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '22px',
                                    height: '22px',
                                    border: '2px solid #fff',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    zIndex: 4
                                  }}
                                  title={`Remove Image ${idx + 1}`}
                                >×</button>
                              </>
                            ) : (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                padding: '6px',
                                textAlign: 'center',
                                color: isCover ? '#16a34a' : '#64748b',
                                userSelect: 'none',
                                cursor: 'pointer'
                              }}>
                                <span style={{ fontSize: '24px', lineHeight: '20px', fontWeight: 'bold' }}>+</span>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px' }}>
                                  {isCover ? 'Cover Image' : `Image ${idx + 1}`}
                                </span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                  Click to add
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  title={`Click to select Image ${idx + 1}`}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: 0,
                                    cursor: 'pointer',
                                    zIndex: 3
                                  }}
                                  onChange={e => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      setImageFiles(prev => [...prev, ...Array.from(e.target.files)]);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer" style={{ position: 'sticky', bottom: 0, background: '#fff', zIndex: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSaving}
                  style={{ background: '#2563eb', borderColor: '#2563eb' }}
                >
                  {isSaving ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Save Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductPanel;
