import React, { useState } from 'react';
import './GoldCalculatorModal.css';

const GoldCalculatorModal = ({ isOpen, onClose, rates }) => {
  const [metalType, setMetalType] = useState('22k');
  const [weightGrams, setWeightGrams] = useState(8);
  const [makingChargesPercent, setMakingChargesPercent] = useState(8);

  if (!isOpen) return null;

  let ratePerGram = rates.gold22k;
  let metalLabel = '22K Hallmarked Gold (916)';
  if (metalType === '24k') {
    ratePerGram = rates.gold24k;
    metalLabel = '24K Fine Gold (999)';
  } else if (metalType === '18k') {
    ratePerGram = rates.gold18k;
    metalLabel = '18K Diamond Standard Gold';
  } else if (metalType === 'silver') {
    ratePerGram = rates.silver925;
    metalLabel = '925 Sterling Silver';
  }

  const rawMetalPrice = weightGrams * ratePerGram;
  const makingChargesAmount = (rawMetalPrice * makingChargesPercent) / 100;
  const subtotalBeforeGst = rawMetalPrice + makingChargesAmount;
  const gstAmount = subtotalBeforeGst * 0.03;
  const totalEstimatedPrice = Math.round(subtotalBeforeGst + gstAmount);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card calc-modal animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold-primary)" strokeWidth="2">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="16" y1="14" x2="16" y2="18" />
              <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
            </svg>
            <div>
              <h3 className="modal-title">Live Gold Rate Calculator</h3>
              <span className="modal-subtitle">Transparent pricing based on today's live market rate</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">

          <div className="calc-input-group">
            <label className="calc-label">Select Metal Purity:</label>
            <div className="metal-type-grid">
              <button
                className={`metal-type-btn ${metalType === '22k' ? 'active' : ''}`}
                onClick={() => setMetalType('22k')}
              >
                <span>22K Gold</span>
                <small>₹{rates.gold22k}/g</small>
              </button>
              <button
                className={`metal-type-btn ${metalType === '24k' ? 'active' : ''}`}
                onClick={() => setMetalType('24k')}
              >
                <span>24K Gold</span>
                <small>₹{rates.gold24k}/g</small>
              </button>
              <button
                className={`metal-type-btn ${metalType === '18k' ? 'active' : ''}`}
                onClick={() => setMetalType('18k')}
              >
                <span>18K Gold</span>
                <small>₹{rates.gold18k}/g</small>
              </button>
              <button
                className={`metal-type-btn ${metalType === 'silver' ? 'active' : ''}`}
                onClick={() => setMetalType('silver')}
              >
                <span>Silver 925</span>
                <small>₹{rates.silver925}/g</small>
              </button>
            </div>
          </div>

          <div className="calc-input-group">
            <div className="label-with-val">
              <label className="calc-label">little_rr Weight (Grams):</label>
              <span className="highlight-val">{weightGrams} gms ({(weightGrams / 8).toFixed(2)} Sovereign / Pavan)</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="0.5"
              value={weightGrams}
              onChange={(e) => setWeightGrams(parseFloat(e.target.value))}
              className="calc-range-slider"
            />
            <div className="quick-weight-chips">
              {[2, 4, 8, 16, 24, 40, 80].map((w) => (
                <button
                  key={w}
                  className={`weight-chip ${weightGrams === w ? 'active' : ''}`}
                  onClick={() => setWeightGrams(w)}
                >
                  {w}g {w === 8 ? '(1 Pavan)' : ''}
                </button>
              ))}
            </div>
          </div>


          <div className="calc-input-group">
            <div className="label-with-val">
              <label className="calc-label">Making & Wastage Charges:</label>
              <span className="highlight-val">{makingChargesPercent}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="18"
              step="0.5"
              value={makingChargesPercent}
              onChange={(e) => setMakingChargesPercent(parseFloat(e.target.value))}
              className="calc-range-slider"
            />
          </div>


          <div className="price-breakdown-box">
            <h4 className="breakdown-title">Estimated Cost Breakdown ({metalLabel})</h4>
            <div className="breakdown-row">
              <span>Gold Metal Value ({weightGrams}g × ₹{ratePerGram}):</span>
              <span>₹{Math.round(rawMetalPrice).toLocaleString('en-IN')}</span>
            </div>
            <div className="breakdown-row">
              <span>Making & Wastage ({makingChargesPercent}%):</span>
              <span>+ ₹{Math.round(makingChargesAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="breakdown-row">
              <span>GST (3% on Total):</span>
              <span>+ ₹{Math.round(gstAmount).toLocaleString('en-IN')}</span>
            </div>
            <div className="breakdown-divider"></div>
            <div className="breakdown-total-row">
              <span>Total Estimated Price:</span>
              <span className="total-gold-price">₹{totalEstimatedPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-gold full-width" onClick={onClose}>
            Book Custom Order at Live Rate
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoldCalculatorModal;
