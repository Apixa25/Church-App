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

      <style jsx>{`
        .category-selector {
          width: 100%;
        }

        .category-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .category-card {
          display: flex;
          align-items: center;
          padding: 1.5rem;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .category-card:hover {
          border-color: #4682b4;
          background: #f8f9fa;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(70, 130, 180, 0.15);
        }

        .category-card.selected {
          border-color: #4682b4;
          background: linear-gradient(135deg, #4682b4 0%, #5a9bd3 100%);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(70, 130, 180, 0.3);
        }

        .category-icon {
          font-size: 2.5rem;
          margin-right: 1rem;
          flex-shrink: 0;
        }

        .category-content {
          flex: 1;
          text-align: left;
        }

        .category-title {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: inherit;
        }

        .category-description {
          font-size: 0.95rem;
          margin: 0;
          opacity: 0.8;
          line-height: 1.4;
        }

        .category-card.selected .category-description {
          opacity: 0.9;
        }

        .category-selector-indicator {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .selected-indicator {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid white;
          border-radius: 50%;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 1rem;
        }

        @media (min-width: 768px) {
          .category-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }
        }

        @media (max-width: 767px) {
          .category-card {
            padding: 1rem;
          }

          .category-icon {
            font-size: 2rem;
            margin-right: 0.75rem;
          }

          .category-title {
            font-size: 1.1rem;
          }

          .category-description {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CategorySelector;