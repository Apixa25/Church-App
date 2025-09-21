import React from 'react';
import { RecurringFrequency, FREQUENCY_LABELS } from '../config/stripe';

interface RecurringSelectorProps {
  isRecurring: boolean;
  frequency: RecurringFrequency;
  onRecurringChange: (isRecurring: boolean) => void;
  onFrequencyChange: (frequency: RecurringFrequency) => void;
}

const RecurringSelector: React.FC<RecurringSelectorProps> = ({
  isRecurring,
  frequency,
  onRecurringChange,
  onFrequencyChange,
}) => {
  const frequencies = [
    {
      value: RecurringFrequency.WEEKLY,
      label: FREQUENCY_LABELS[RecurringFrequency.WEEKLY],
      description: 'Every week',
      icon: '📅',
    },
    {
      value: RecurringFrequency.MONTHLY,
      label: FREQUENCY_LABELS[RecurringFrequency.MONTHLY],
      description: 'Every month',
      icon: '🗓️',
      recommended: true,
    },
    {
      value: RecurringFrequency.QUARTERLY,
      label: FREQUENCY_LABELS[RecurringFrequency.QUARTERLY],
      description: 'Every 3 months',
      icon: '📊',
    },
    {
      value: RecurringFrequency.YEARLY,
      label: FREQUENCY_LABELS[RecurringFrequency.YEARLY],
      description: 'Every year',
      icon: '📆',
    },
  ];

  return (
    <div className="recurring-selector">
      <div className="recurring-toggle">
        <label className="toggle-container">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => onRecurringChange(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-slider"></span>
          <span className="toggle-label">
            Set up recurring donation
          </span>
        </label>

        {!isRecurring && (
          <div className="one-time-info">
            <span className="info-icon">💡</span>
            <span>This will be a one-time donation</span>
          </div>
        )}
      </div>

      {isRecurring && (
        <div className="frequency-section">
          <h4 className="frequency-title">How often would you like to give?</h4>

          <div className="frequency-grid">
            {frequencies.map((freq) => (
              <div
                key={freq.value}
                className={`frequency-card ${frequency === freq.value ? 'selected' : ''}`}
                onClick={() => onFrequencyChange(freq.value)}
              >
                {freq.recommended && (
                  <div className="recommended-badge">Recommended</div>
                )}

                <div className="frequency-icon">{freq.icon}</div>
                <div className="frequency-content">
                  <h5 className="frequency-label">{freq.label}</h5>
                  <p className="frequency-description">{freq.description}</p>
                </div>

                <div className="frequency-selector-indicator">
                  {frequency === freq.value && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="recurring-info">
            <div className="info-card">
              <h5>About Recurring Donations</h5>
              <ul>
                <li>You can cancel or modify your recurring donation anytime</li>
                <li>You'll receive a receipt for each donation</li>
                <li>All recurring donations are secure and automatic</li>
                <li>Manage your recurring donations from your profile</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .recurring-selector {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .recurring-toggle {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .toggle-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          user-select: none;
        }

        .toggle-input {
          display: none;
        }

        .toggle-slider {
          position: relative;
          width: 3.5rem;
          height: 2rem;
          background: #ccc;
          border-radius: 1rem;
          transition: background 0.3s ease;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 1.5rem;
          height: 1.5rem;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }

        .toggle-input:checked + .toggle-slider {
          background: #4682b4;
        }

        .toggle-input:checked + .toggle-slider::before {
          transform: translateX(1.5rem);
        }

        .toggle-label {
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .one-time-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          color: #666;
        }

        .info-icon {
          font-size: 1.2rem;
        }

        .frequency-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.5rem;
          background: #f8f9fa;
          border-radius: 12px;
          border: 2px solid #e0e0e0;
        }

        .frequency-title {
          margin: 0;
          font-size: 1.2rem;
          color: #333;
        }

        .frequency-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .frequency-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem;
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .frequency-card:hover {
          border-color: #4682b4;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(70, 130, 180, 0.15);
        }

        .frequency-card.selected {
          border-color: #4682b4;
          background: #4682b4;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(70, 130, 180, 0.3);
        }

        .recommended-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #28a745;
          color: white;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 0.25rem 0.5rem;
          border-radius: 10px;
          text-transform: uppercase;
        }

        .frequency-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .frequency-content {
          flex: 1;
        }

        .frequency-label {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .frequency-description {
          margin: 0;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .frequency-card.selected .frequency-description {
          opacity: 0.9;
        }

        .frequency-selector-indicator {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .selected-indicator {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid white;
          border-radius: 50%;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
        }

        .recurring-info {
          margin-top: 1rem;
        }

        .info-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          border-left: 4px solid #4682b4;
        }

        .info-card h5 {
          margin: 0 0 1rem 0;
          color: #4682b4;
          font-size: 1.1rem;
        }

        .info-card ul {
          margin: 0;
          padding-left: 1.5rem;
          color: #666;
        }

        .info-card li {
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .frequency-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .frequency-card {
            padding: 1rem;
          }

          .frequency-icon {
            font-size: 1.5rem;
          }

          .frequency-label {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default RecurringSelector;