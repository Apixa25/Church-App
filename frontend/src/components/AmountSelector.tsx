import React, { useState, useEffect } from 'react';
import { DONATION_PRESETS } from '../config/stripe';

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

      <style jsx>{`
        .amount-selector {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .preset-amounts {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 0.5rem;
        }

        .preset-btn {
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preset-btn:hover {
          border-color: #4682b4;
          background: #f8f9fa;
        }

        .preset-btn.selected {
          border-color: #4682b4;
          background: #4682b4;
          color: white;
        }

        .custom-amount-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .custom-amount-input {
          position: relative;
          display: flex;
          align-items: center;
        }

        .currency-symbol {
          position: absolute;
          left: 1rem;
          font-size: 1.2rem;
          font-weight: 600;
          color: #666;
          z-index: 1;
        }

        .custom-input {
          width: 100%;
          padding: 1rem 1rem 1rem 2.5rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1.1rem;
          font-weight: 600;
          transition: border-color 0.2s ease;
        }

        .custom-input:focus {
          outline: none;
          border-color: #4682b4;
        }

        .custom-input.error {
          border-color: #dc3545;
        }

        .amount-preview {
          text-align: center;
        }

        .amount-display {
          font-size: 1.5rem;
          font-weight: 700;
          color: #4682b4;
        }

        .amount-info {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #4682b4;
        }

        .selected-amount {
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .fee-info {
          color: #666;
        }

        .error-message {
          color: #dc3545;
          font-size: 0.9rem;
          margin-top: 0.25rem;
        }

        @media (max-width: 768px) {
          .preset-amounts {
            grid-template-columns: repeat(2, 1fr);
          }

          .preset-btn {
            padding: 0.8rem;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

// Helper function to calculate estimated processing fee
const calculateEstimatedFee = (amount: number): number => {
  // Stripe fee: 2.9% + $0.30
  return Math.round((amount * 0.029 + 0.30) * 100) / 100;
};

export default AmountSelector;