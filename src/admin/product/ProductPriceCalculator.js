import React from 'react';

export const getProductWeightDisplay = (product) => {
  if (!product) return 'Weight: -';

  const cleanNum = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    return isNaN(num) || num <= 0 ? null : num;
  };

  const net = cleanNum(product.netWeight);
  const gross = cleanNum(product.grossWeight);
  const fallback = cleanNum(product.weight);

  if (net && gross && net !== gross) {
    return `Net: ${net}g • Gross: ${gross}g`;
  }

  const primaryWeight = net || gross || fallback;
  if (primaryWeight) {
    return `Weight: ${primaryWeight}g`;
  }

  return 'Weight: -';
};

export const calculateFinalPrice = (product, liveRates = []) => {
  const netWt = parseFloat(product?.netWeight) || parseFloat(product?.grossWeight) || parseFloat(product?.weight) || 0;
  if (!netWt) return { finalPrice: 0, basePrice: 0, makingCharge: 0, hallmarkCharge: 0, gstRate: 0 };

  const purityStr = (product.purity || '').toLowerCase().replace(/\s+/g, '');
  const rateItem = (liveRates || []).find(r => {
    const typeStr = (r.type || '').toLowerCase().replace(/\s+/g, '');
    const nameStr = (r.name || '').toLowerCase().replace(/\s+/g, '');
    return typeStr === purityStr || nameStr === purityStr || typeStr.includes(purityStr) || purityStr.includes(typeStr);
  });
  
  let rateAmount = rateItem ? parseFloat(rateItem.amount) : 0;
  let rateGram = rateItem ? parseFloat(rateItem.gram || 1) : 1;
  if (!rateAmount) {
    if (purityStr.includes('24')) rateAmount = 8125;
    else if (purityStr.includes('18')) rateAmount = 6110;
    else if (purityStr.includes('silver')) rateAmount = 95;
    else rateAmount = 7450;
  }
  const ratePerGram = rateAmount / rateGram;
  
  const basePrice = netWt * ratePerGram;
  
  const mcPercent = parseFloat(product.makingChargePercent) || 0;
  const mcFlat = parseFloat(product.makingCharge) || 0;

  let makingCharge = 0;
  if (product.mcType === 'percent' || mcPercent > 0) {
    const mcVal = product.mcType ? parseFloat(product.makingCharge) || 0 : mcPercent;
    makingCharge = basePrice * (mcVal / 100);
  } else {
    makingCharge = product.mcType ? (parseFloat(product.makingCharge) || 0) : mcFlat;
  }
  
  const hmc = rateItem && rateItem.hmc ? parseFloat(rateItem.hmc) : 0;
  const hallmarkCharge = rateItem && (rateItem.hmcType || '').toLowerCase() === 'percentage'
    ? (basePrice + makingCharge) * (hmc / 100)
    : hmc;
    
  const subtotal = basePrice + makingCharge + hallmarkCharge;
  
  const gstRate = rateItem ? parseFloat(rateItem.gst || 3) : 3;
  const gstAmount = subtotal * (gstRate / 100);
  const finalPrice = Math.round(subtotal + gstAmount);
  
  return { finalPrice, basePrice, makingCharge, hallmarkCharge, gstRate };
};

export const getProductPriceInfo = (product, liveRates = []) => {
  if (!product) return { sellingPrice: 0, mrp: 0, discount: 0 };
  let sellingPrice = 0;
  let mrp = 0;
  let discount = 0;

  if (product.price && parseFloat(product.price) > 0) {
    sellingPrice = parseFloat(product.price);
    mrp = parseFloat(product.mrp) > sellingPrice ? parseFloat(product.mrp) : 0;
    discount = parseFloat(product.discountPercentage) || (mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0);
  } else {
    const calc = calculateFinalPrice(product, liveRates);
    if (calc && calc.finalPrice > 0) {
      sellingPrice = calc.finalPrice;
      mrp = parseFloat(product.mrp) > sellingPrice ? parseFloat(product.mrp) : 0;
      discount = parseFloat(product.discountPercentage) || (mrp > sellingPrice ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0);
    }
  }

  return { sellingPrice, mrp, discount };
};

const ProductPriceCalculator = ({ formData, liveRates }) => {
  const { finalPrice } = calculateFinalPrice(formData, liveRates);

  if (!finalPrice) {
    return <strong style={{color: '#916327', fontSize: '1.1rem'}}>Calculated Price: ₹0</strong>;
  }
  
  return (
    <div style={{textAlign: 'center'}}>
      <strong style={{color: '#2e7d32', fontSize: '1.4rem', lineHeight: '1.2'}}>
        Calculation = ₹{finalPrice.toLocaleString('en-IN')}
      </strong>
    </div>
  );
};

export default ProductPriceCalculator;
