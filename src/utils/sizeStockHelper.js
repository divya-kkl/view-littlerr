/**
 * Helper to parse size variants with stock from product data.
 * Supports:
 * - "S:0, M:10, L:5, XL:0"
 * - "S(0), M(10), L(5)"
 * - JSON string '[{"size":"S","stock":0},{"size":"M","stock":10}]'
 * - Plain comma-separated list "S, M, L" (defaults to product stock)
 */
export const parseSizeVariants = (product) => {
  if (!product) return [];

  // 1. If variants array is already present on product
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants
      .map((v) => ({
        size: String(v.size || v.name || '').trim(),
        stock: v.stock !== undefined ? parseInt(v.stock, 10) : (product.stock || 0)
      }))
      .filter((v) => v.size);
  }

  // 2. Parse from product.size string
  const rawSize = String(product.size || '').trim();
  if (!rawSize) {
    if (product.hasSize) {
      const defaultStock = product.stock !== undefined ? parseInt(product.stock, 10) : 10;
      return [
        { size: 'S', stock: defaultStock },
        { size: 'M', stock: defaultStock },
        { size: 'L', stock: defaultStock },
        { size: 'XL', stock: defaultStock }
      ];
    }
    return [];
  }

  // Check if rawSize is JSON string
  if (rawSize.startsWith('[') && rawSize.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawSize);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => ({
            size: typeof item === 'object' ? String(item.size || item.name || '').trim() : String(item).trim(),
            stock: typeof item === 'object' && item.stock !== undefined ? parseInt(item.stock, 10) : (product.stock || 0)
          }))
          .filter((v) => v.size);
      }
    } catch (e) {}
  }

  // Parse comma-separated string e.g. "S:0, M:10, L:5, XL:0"
  const tokens = rawSize.split(',').map((t) => t.trim()).filter(Boolean);
  return tokens
    .map((token) => {
      if (token.includes(':')) {
        const [sz, stk] = token.split(':').map((x) => x.trim());
        const parsedStock = parseInt(stk, 10);
        return {
          size: sz,
          stock: isNaN(parsedStock) ? 0 : parsedStock
        };
      }
      const match = token.match(/^([^(]+)\s*\(([0-9]+)\)$/);
      if (match) {
        return {
          size: match[1].trim(),
          stock: parseInt(match[2], 10)
        };
      }
      return {
        size: token,
        stock: product.stock !== undefined && product.stock !== null ? parseInt(product.stock, 10) : 10
      };
    })
    .filter((v) => v.size);
};

export const serializeSizeVariants = (variants) => {
  if (!Array.isArray(variants) || variants.length === 0) return '';
  return variants
    .filter((v) => v && v.size)
    .map((v) => `${v.size.trim()}:${v.stock !== undefined ? Math.max(0, parseInt(v.stock, 10) || 0) : 0}`)
    .join(', ');
};

