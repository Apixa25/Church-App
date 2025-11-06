import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DonationCategory } from '../config/stripe';
import './QuickDonationWidget.css';

interface QuickDonationWidgetProps {
  className?: string;
  showTitle?: boolean;
}

const QuickDonationWidget: React.FC<QuickDonationWidgetProps> = ({
  className = '',
  showTitle = true
}) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<DonationCategory>(DonationCategory.TITHES);
  const [quickAmount, setQuickAmount] = useState<number>(25);

  const quickAmounts = [10, 25, 50, 100, 250];

  const handleQuickDonation = () => {
    // Navigate to donation page with pre-selected amount and category
    navigate('/donations', {
      state: {
        presetAmount: quickAmount,
        presetCategory: selectedCategory
      }
    });
  };

  const handleViewHistory = () => {
    navigate('/donations', {
      state: {
        activeTab: 'history'
      }
    });
  };

  const handleViewSubscriptions = () => {
    navigate('/donations', {
      state: {
        activeTab: 'subscriptions'
      }
    });
  };

  return (
    <div className={`quick-donation-widget ${className}`}>
      {showTitle && (
        <div className="widget-header">
          <h3>💝 Quick Giving</h3>
          <p>Support your church community</p>
        </div>
      )}

      <div className="widget-content">
        {/* Category Selector */}
        <div className="donation-category-section">
          <label className="section-label">Donation Category</label>
          <div className="category-buttons">
            <button
              className={`category-btn ${selectedCategory === DonationCategory.TITHES ? 'active' : ''}`}
              onClick={() => setSelectedCategory(DonationCategory.TITHES)}
            >
              🌾 Tithes
            </button>
            <button
              className={`category-btn ${selectedCategory === DonationCategory.OFFERINGS ? 'active' : ''}`}
              onClick={() => setSelectedCategory(DonationCategory.OFFERINGS)}
            >
              💖 Offerings
            </button>
            <button
              className={`category-btn ${selectedCategory === DonationCategory.MISSIONS ? 'active' : ''}`}
              onClick={() => setSelectedCategory(DonationCategory.MISSIONS)}
            >
              🌍 Missions
            </button>
          </div>
        </div>

        {/* Quick Amount Selector */}
        <div className="quick-amount-section">
          <label className="section-label">Quick Amount</label>
          <div className="amount-buttons">
            {quickAmounts.map(amount => (
              <button
                key={amount}
                className={`amount-btn ${quickAmount === amount ? 'active' : ''}`}
                onClick={() => setQuickAmount(amount)}
              >
                ${amount}
              </button>
            ))}
          </div>

          <div className="custom-amount">
            <label htmlFor="customAmount">Custom Amount</label>
            <div className="custom-amount-input">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                id="customAmount"
                min="1"
                max="10000"
                value={quickAmount}
                onChange={(e) => setQuickAmount(Number(e.target.value))}
                placeholder="Enter amount"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="widget-actions">
          <button
            className="btn btn-primary btn-large"
            onClick={handleQuickDonation}
            disabled={!quickAmount || quickAmount < 1}
          >
            Give ${quickAmount} Now
          </button>

          <div className="secondary-actions">
            <button
              className="btn btn-secondary btn-small"
              onClick={handleViewHistory}
            >
              📋 View History
            </button>
            <button
              className="btn btn-secondary btn-small"
              onClick={handleViewSubscriptions}
            >
              🔄 Recurring
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="security-info">
          <div className="security-badge">
            <span className="security-icon">🔒</span>
            <span className="security-text">Secure payments powered by Stripe</span>
          </div>
          <p className="privacy-note">
            Your donation information is encrypted and secure.
            Receipts are automatically generated for tax purposes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuickDonationWidget;