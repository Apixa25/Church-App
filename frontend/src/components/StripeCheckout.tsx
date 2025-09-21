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

    </div>
  );
};

export default StripeCheckout;