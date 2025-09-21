import React, { useState } from 'react';
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from '@stripe/react-stripe-js';
import { donationApi } from '../services/donationApi';
import { DonationCategory, RecurringFrequency } from '../config/stripe';

interface DonationFormData {
  amount: number;
  category: DonationCategory;
  purpose: string;
  receiptEmail: string;
  isRecurring: boolean;
  frequency: RecurringFrequency;
  notes: string;
}

interface StripeCheckoutProps {
  formData: DonationFormData;
  onSuccess: (donationId: string) => void;
  onError: (error: string) => void;
  onBack: () => void;
}

const StripeCheckout: React.FC<StripeCheckoutProps> = ({
  formData,
  onSuccess,
  onError,
  onBack,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardErrors, setCardErrors] = useState<{
    cardNumber?: string;
    cardExpiry?: string;
    cardCvc?: string;
  }>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded properly. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setCardErrors({});

    try {
      if (formData.isRecurring) {
        // Handle recurring donation
        await handleRecurringDonation();
      } else {
        // Handle one-time donation
        await handleOneTimeDonation();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      onError(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOneTimeDonation = async () => {
    if (!stripe || !elements) return;

    // Create payment intent
    const paymentIntentResponse = await donationApi.createPaymentIntent({
      amount: formData.amount,
      category: formData.category,
      purpose: formData.purpose || undefined,
      receiptEmail: formData.receiptEmail || undefined,
    });

    // Confirm payment
    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      throw new Error('Card element not found');
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(
      paymentIntentResponse.clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Church Donor', // You might want to get this from user profile
            email: formData.receiptEmail || undefined,
          },
        },
      }
    );

    if (error) {
      throw new Error(error.message || 'Payment confirmation failed');
    }

    if (paymentIntent?.status === 'succeeded') {
      // Confirm with backend
      const donation = await donationApi.confirmPayment(paymentIntent.id);
      onSuccess(donation.id);
    }
  };

  const handleRecurringDonation = async () => {
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      throw new Error('Card element not found');
    }

    // Create payment method
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: {
        name: 'Church Donor',
        email: formData.receiptEmail || undefined,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create payment method');
    }

    // Create subscription
    const subscription = await donationApi.createSubscription({
      amount: formData.amount,
      category: formData.category,
      frequency: formData.frequency,
      purpose: formData.purpose || undefined,
      paymentMethodId: paymentMethod.id,
      notes: formData.notes || undefined,
    });

    onSuccess(subscription.id);
  };

  const handleCardElementChange = (elementType: string) => (event: any) => {
    if (event.error) {
      setCardErrors(prev => ({
        ...prev,
        [elementType]: event.error.message,
      }));
    } else {
      setCardErrors(prev => ({
        ...prev,
        [elementType]: undefined,
      }));
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <div className="stripe-checkout">
      <div className="checkout-header">
        <h3>Payment Information</h3>
        <p>Your payment is secure and encrypted</p>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="card-section">
          <div className="form-group">
            <label htmlFor="cardNumber">Card Number</label>
            <div className="card-element-container">
              <CardNumberElement
                id="cardNumber"
                options={cardElementOptions}
                onChange={handleCardElementChange('cardNumber')}
              />
            </div>
            {cardErrors.cardNumber && (
              <div className="error-message">{cardErrors.cardNumber}</div>
            )}
          </div>

          <div className="card-row">
            <div className="form-group">
              <label htmlFor="cardExpiry">Expiry Date</label>
              <div className="card-element-container">
                <CardExpiryElement
                  id="cardExpiry"
                  options={cardElementOptions}
                  onChange={handleCardElementChange('cardExpiry')}
                />
              </div>
              {cardErrors.cardExpiry && (
                <div className="error-message">{cardErrors.cardExpiry}</div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cardCvc">CVC</label>
              <div className="card-element-container">
                <CardCvcElement
                  id="cardCvc"
                  options={cardElementOptions}
                  onChange={handleCardElementChange('cardCvc')}
                />
              </div>
              {cardErrors.cardCvc && (
                <div className="error-message">{cardErrors.cardCvc}</div>
              )}
            </div>
          </div>
        </div>

        <div className="security-info">
          <div className="security-icons">
            🔒 <span>256-bit SSL encryption</span>
          </div>
          <p>Your payment information is secure and will not be stored on our servers.</p>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onBack}
            className="btn btn-secondary"
            disabled={isProcessing}
          >
            Back
          </button>

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? (
              <span className="processing">
                <span className="spinner"></span>
                Processing...
              </span>
            ) : (
              `Complete ${formData.isRecurring ? 'Recurring ' : ''}Donation`
            )}
          </button>
        </div>
      </form>

      <style jsx>{`
        .stripe-checkout {
          max-width: 500px;
          margin: 0 auto;
        }

        .checkout-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .checkout-header h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .checkout-header p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .payment-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .card-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 600;
          color: #333;
          font-size: 0.9rem;
        }

        .card-element-container {
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          transition: border-color 0.2s ease;
        }

        .card-element-container:focus-within {
          border-color: #4682b4;
        }

        .card-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1rem;
        }

        .error-message {
          color: #dc3545;
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }

        .security-info {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }

        .security-icons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #28a745;
          margin-bottom: 0.5rem;
        }

        .security-info p {
          margin: 0;
          font-size: 0.9rem;
          color: #666;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: space-between;
          margin-top: 1rem;
        }

        .btn {
          padding: 1rem 2rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          flex: 1;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5a6268;
        }

        .btn-primary {
          background: #4682b4;
          color: white;
          flex: 2;
        }

        .btn-primary:hover:not(:disabled) {
          background: #3a6d96;
        }

        .btn-large {
          padding: 1.25rem 2rem;
          font-size: 1.1rem;
        }

        .processing {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .card-row {
            grid-template-columns: 1fr;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default StripeCheckout;