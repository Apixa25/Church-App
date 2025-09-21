import React from 'react';
import { DonationCategory, CATEGORY_LABELS } from '../config/stripe';

interface CategorySelectorProps {
  category: DonationCategory;
  onChange: (category: DonationCategory) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ category, onChange }) => {
  const categories = [
    {
      value: DonationCategory.TITHES,
      label: CATEGORY_LABELS[DonationCategory.TITHES],
      description: 'Regular giving as an act of worship and faith',
      icon: '💝',
    },
    {
      value: DonationCategory.OFFERINGS,
      label: CATEGORY_LABELS[DonationCategory.OFFERINGS],
      description: 'Special offerings for church programs and ministries',
      icon: '🙏',
    },
    {
      value: DonationCategory.MISSIONS,
      label: CATEGORY_LABELS[DonationCategory.MISSIONS],
      description: 'Supporting missionary work and outreach programs',
      icon: '🌍',
    },
  ];

  return (
    <div className="category-selector">
      <div className="category-grid">
        {categories.map((cat) => (
          <div
            key={cat.value}
            className={`category-card ${category === cat.value ? 'selected' : ''}`}
            onClick={() => onChange(cat.value)}
          >
            <div className="category-icon">{cat.icon}</div>
            <div className="category-content">
              <h4 className="category-title">{cat.label}</h4>
              <p className="category-description">{cat.description}</p>
            </div>
            <div className="category-selector-indicator">
              {category === cat.value && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default CategorySelector;