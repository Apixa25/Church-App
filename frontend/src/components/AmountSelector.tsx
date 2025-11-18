import React, { useState, useEffect } from 'react';
import { DONATION_PRESETS } from '../config/stripe';
import './AmountSelector.css';

interface AmountSelectorProps {
  amount: number;
  onChange: (amount: number) => void;
  error?: string;
}

const AmountSelector: React.FC<AmountSelectorProps> = ({ amount, onChange, error }) => {
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);

  useEffect(() => {
    // Check if current amount matches a preset
    const preset = DONATION_PRESETS.find(p => p.amount === amount);
    if (preset) {
      setSelectedPreset(preset.amount);
      setCustomAmount('');
    } else if (amount > 0) {
      setSelectedPreset(null);
      setCustomAmount(amount.toString());
    }
  }, [amount]);

  const handlePresetClick = (presetAmount: number) => {
    setSelectedPreset(presetAmount);
    setCustomAmount('');
    onChange(presetAmount);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedPreset(null);

    // Parse and validate the amount
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue >= 0) {
      onChange(numericValue);
    } else if (value === '') {
      onChange(0);
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="amount-selector">
      <div className="preset-amounts">
        {DONATION_PRESETS.map((preset) => (
          <button
            key={preset.amount}
            type="button"
            className={`preset-btn ${
              selectedPreset === preset.amount ? 'selected' : ''
            }`}
            onClick={() => handlePresetClick(preset.amount)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="custom-amount-section">
        <div className="custom-amount-input">
          <span className="currency-symbol">$</span>
          <input
            type="number"
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => handleCustomAmountChange(e.target.value)}
            min="1"
            step="0.01"
            className={`custom-input ${error ? 'error' : ''}`}
          />
        </div>

        {customAmount && !isNaN(parseFloat(customAmount)) && parseFloat(customAmount) > 0 && (
          <div className="amount-preview">
            <span className="amount-display">
              {formatAmount(parseFloat(customAmount))}
            </span>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {amount > 0 && (
        <div className="amount-info">
          <div className="selected-amount">
            Selected Amount: <strong>{formatAmount(amount)}</strong>
          </div>

          <div className="fee-info">
            <small>
              Processing fee: ~{formatAmount(calculateEstimatedFee(amount))} |{' '}
              You're giving: ~{formatAmount(amount - calculateEstimatedFee(amount))}
            </small>
          </div>
        </div>
      )}

    </div>
  );
};

// Helper function to calculate estimated processing fee
const calculateEstimatedFee = (amount: number): number => {
  // Stripe fee: 2.9% + $0.30
  return Math.round((amount * 0.029 + 0.30) * 100) / 100;
};

export default AmountSelector;