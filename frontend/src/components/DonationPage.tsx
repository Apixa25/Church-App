import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG, DonationCategory, RecurringFrequency } from '../config/stripe';
import AmountSelector from './AmountSelector';
import CategorySelector from './CategorySelector';
import RecurringSelector from './RecurringSelector';
import StripeCheckout from './StripeCheckout';
import DonationSummary from './DonationSummary';
import './DonationPage.css';

// Initialize Stripe
const stripePromise = loadStripe(STRIPE_CONFIG.publicKey);

interface DonationFormData {
  amount: number;
  category: DonationCategory;
  purpose: string;
  receiptEmail: string;
  isRecurring: boolean;
  frequency: RecurringFrequency;
  notes: string;
}

const DonationPage: React.FC = () => {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [formData, setFormData] = useState<DonationFormData>({
    amount: 0,
    category: DonationCategory.TITHES,
    purpose: '',
    receiptEmail: '',
    isRecurring: false,
    frequency: RecurringFrequency.MONTHLY,
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = (data: DonationFormData) => {
    setFormData(data);
    setStep('payment');
    setError(null);
  };

  const handlePaymentSuccess = (donationId: string) => {
    setStep('success');
    // You might want to redirect or show a success message
    console.log('Donation successful:', donationId);
  };

  const handlePaymentError = (error: string) => {
    setError(error);
  };

  const handleBackToForm = () => {
    setStep('form');
    setError(null);
  };

  const handleStartOver = () => {
    setStep('form');
    setFormData({
      amount: 0,
      category: DonationCategory.TITHES,
      purpose: '',
      receiptEmail: '',
      isRecurring: false,
      frequency: RecurringFrequency.MONTHLY,
      notes: '',
    });
    setError(null);
  };

  return (
    <div className="donation-page">
      <div className="donation-container">
        <header className="donation-header">
          <h1>Make a Donation</h1>
          <p>Your generosity makes a difference in our community</p>
        </header>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-close">×</button>
          </div>
        )}

        {step === 'form' && (
          <DonationForm
            initialData={formData}
            onSubmit={handleFormSubmit}
            isLoading={isLoading}
          />
        )}

        {step === 'payment' && (
          <Elements stripe={stripePromise} options={STRIPE_CONFIG.options}>
            <div className="payment-section">
              <DonationSummary
                amount={formData.amount}
                category={formData.category}
                purpose={formData.purpose}
                isRecurring={formData.isRecurring}
                frequency={formData.frequency}
              />

              <StripeCheckout
                formData={formData}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onBack={handleBackToForm}
              />
            </div>
          </Elements>
        )}

        {step === 'success' && (
          <DonationSuccess
            amount={formData.amount}
            category={formData.category}
            isRecurring={formData.isRecurring}
            onStartOver={handleStartOver}
          />
        )}
      </div>
    </div>
  );
};

// Donation Form Component
interface DonationFormProps {
  initialData: DonationFormData;
  onSubmit: (data: DonationFormData) => void;
  isLoading: boolean;
}

const DonationForm: React.FC<DonationFormProps> = ({ initialData, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<DonationFormData>(initialData);
  const [errors, setErrors] = useState<Partial<DonationFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<DonationFormData> = {};

    if (!formData.amount || formData.amount < 1) {
      newErrors.amount = 1; // Using number for amount error
    }

    if (!formData.category) {
      newErrors.category = DonationCategory.TITHES; // Default value for error
    }

    if (formData.receiptEmail && !/\S+@\S+\.\S+/.test(formData.receiptEmail)) {
      newErrors.receiptEmail = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const updateFormData = (updates: Partial<DonationFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  return (
    <form onSubmit={handleSubmit} className="donation-form">
      <div className="form-section">
        <h3>Donation Amount</h3>
        <AmountSelector
          amount={formData.amount}
          onChange={(amount) => updateFormData({ amount })}
          error={errors.amount ? 'Please enter an amount of $1 or more' : undefined}
        />
      </div>

      <div className="form-section">
        <h3>Donation Category</h3>
        <CategorySelector
          category={formData.category}
          onChange={(category) => updateFormData({ category })}
        />
      </div>

      <div className="form-section">
        <h3>Recurring Donation</h3>
        <RecurringSelector
          isRecurring={formData.isRecurring}
          frequency={formData.frequency}
          onRecurringChange={(isRecurring) => updateFormData({ isRecurring })}
          onFrequencyChange={(frequency) => updateFormData({ frequency })}
        />
      </div>

      <div className="form-section">
        <h3>Additional Information</h3>

        <div className="form-group">
          <label htmlFor="purpose">Purpose (Optional)</label>
          <input
            type="text"
            id="purpose"
            value={formData.purpose}
            onChange={(e) => updateFormData({ purpose: e.target.value })}
            placeholder="Special purpose for this donation"
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label htmlFor="receiptEmail">Receipt Email (Optional)</label>
          <input
            type="email"
            id="receiptEmail"
            value={formData.receiptEmail}
            onChange={(e) => updateFormData({ receiptEmail: e.target.value })}
            placeholder="Different email for receipt"
            className={errors.receiptEmail ? 'error' : ''}
          />
          {errors.receiptEmail && (
            <span className="error-text">{errors.receiptEmail}</span>
          )}
        </div>

        {formData.isRecurring && (
          <div className="form-group">
            <label htmlFor="notes">Notes (Optional)</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateFormData({ notes: e.target.value })}
              placeholder="Any additional notes about this recurring donation"
              maxLength={1000}
              rows={3}
            />
          </div>
        )}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary btn-large"
          disabled={isLoading || !formData.amount}
        >
          {isLoading ? 'Processing...' : 'Continue to Payment'}
        </button>
      </div>
    </form>
  );
};

// Success Component
interface DonationSuccessProps {
  amount: number;
  category: DonationCategory;
  isRecurring: boolean;
  onStartOver: () => void;
}

const DonationSuccess: React.FC<DonationSuccessProps> = ({
  amount,
  category,
  isRecurring,
  onStartOver,
}) => {
  return (
    <div className="donation-success">
      <div className="success-icon">✅</div>
      <h2>Thank You for Your Generous Donation!</h2>

      <div className="success-details">
        <p>
          Your {isRecurring ? 'recurring ' : ''}donation of{' '}
          <strong>${amount.toFixed(2)}</strong> for{' '}
          <strong>{category}</strong> has been processed successfully.
        </p>

        {isRecurring && (
          <p>
            Your recurring donation has been set up and you will be charged automatically
            according to your selected frequency. You can manage your recurring donations
            from your profile page.
          </p>
        )}

        <p>
          A receipt has been sent to your email address and is also available
          for download from your donation history.
        </p>
      </div>

      <div className="success-actions">
        <button onClick={onStartOver} className="btn btn-secondary">
          Make Another Donation
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="btn btn-primary"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default DonationPage;