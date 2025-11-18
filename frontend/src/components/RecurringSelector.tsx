import React from 'react';
import { RecurringFrequency, FREQUENCY_LABELS } from '../config/stripe';
import './RecurringSelector.css';

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

    </div>
  );
};

export default RecurringSelector;