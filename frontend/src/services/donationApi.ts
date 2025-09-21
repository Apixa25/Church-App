import axios from 'axios';
import { DonationCategory, RecurringFrequency } from '../config/stripe';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8083/api';

// Types for API requests and responses
export interface PaymentIntentRequest {
  amount: number;
  category: DonationCategory;
  purpose?: string;
  receiptEmail?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  publicKey: string;
  estimatedFee: number;
  netAmount: number;
}

export interface SubscriptionRequest {
  amount: number;
  category: DonationCategory;
  frequency: RecurringFrequency;
  purpose?: string;
  paymentMethodId: string;
  notes?: string;
}

export interface DonationResponse {
  id: string;
  amount: number;
  transactionId: string;
  category: DonationCategory;
  categoryDisplayName: string;
  purpose?: string;
  isRecurring: boolean;
  currency: string;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  feeAmount?: number;
  netAmount?: number;
  receiptEmail?: string;
  receiptSent: boolean;
  receiptSentAt?: string;
  timestamp: string;
  createdAt: string;
  subscriptionId?: string;
  subscriptionFrequency?: string;
  userId: string;
  donorName: string;
}

export interface SubscriptionResponse {
  id: string;
  stripeSubscriptionId: string;
  amount: number;
  frequency: RecurringFrequency;
  frequencyDisplayName: string;
  category: DonationCategory;
  categoryDisplayName: string;
  purpose?: string;
  status: string;
  statusDisplayName: string;
  currency: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  nextPaymentDate?: string;
  startedAt?: string;
  endedAt?: string;
  canceledAt?: string;
  createdAt: string;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  failureCount: number;
  lastFailureReason?: string;
  lastFailureDate?: string;
  totalDonationsCount: number;
  totalDonationsAmount: number;
  userId: string;
  donorName: string;
}

// Get JWT token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Create axios instance with auth headers
const createAuthenticatedRequest = () => {
  const token = getAuthToken();
  return {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  };
};

// Donation API functions
export const donationApi = {
  /**
   * Create payment intent for one-time donation
   */
  createPaymentIntent: async (request: PaymentIntentRequest): Promise<PaymentIntentResponse> => {
    const response = await axios.post(
      `${API_BASE_URL}/donations/create-payment-intent`,
      request,
      createAuthenticatedRequest()
    );
    return response.data;
  },

  /**
   * Confirm payment and create donation record
   */
  confirmPayment: async (paymentIntentId: string): Promise<DonationResponse> => {
    const response = await axios.post(
      `${API_BASE_URL}/donations/confirm-payment`,
      null,
      {
        ...createAuthenticatedRequest(),
        params: { paymentIntentId },
      }
    );
    return response.data;
  },

  /**
   * Get donation history with pagination
   */
  getDonationHistory: async (page: number = 0, size: number = 20): Promise<{
    content: DonationResponse[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  }> => {
    const response = await axios.get(
      `${API_BASE_URL}/donations/history`,
      {
        ...createAuthenticatedRequest(),
        params: { page, size },
      }
    );
    return response.data;
  },

  /**
   * Create recurring donation subscription
   */
  createSubscription: async (request: SubscriptionRequest): Promise<SubscriptionResponse> => {
    const response = await axios.post(
      `${API_BASE_URL}/donations/subscriptions`,
      request,
      createAuthenticatedRequest()
    );
    return response.data;
  },

  /**
   * Get user's active subscriptions
   */
  getSubscriptions: async (): Promise<SubscriptionResponse[]> => {
    const response = await axios.get(
      `${API_BASE_URL}/donations/subscriptions`,
      createAuthenticatedRequest()
    );
    return response.data;
  },

  /**
   * Cancel a subscription
   */
  cancelSubscription: async (subscriptionId: string): Promise<SubscriptionResponse> => {
    const response = await axios.put(
      `${API_BASE_URL}/donations/subscriptions/${subscriptionId}/cancel`,
      null,
      createAuthenticatedRequest()
    );
    return response.data;
  },

  /**
   * Update subscription payment method
   */
  updateSubscriptionPaymentMethod: async (
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<SubscriptionResponse> => {
    const response = await axios.put(
      `${API_BASE_URL}/donations/subscriptions/${subscriptionId}/payment-method`,
      null,
      {
        ...createAuthenticatedRequest(),
        params: { paymentMethodId },
      }
    );
    return response.data;
  },

  /**
   * Download receipt PDF
   */
  downloadReceipt: async (donationId: string): Promise<Blob> => {
    const response = await axios.get(
      `${API_BASE_URL}/donations/receipt/${donationId}`,
      {
        ...createAuthenticatedRequest(),
        responseType: 'blob',
      }
    );
    return response.data;
  },

  /**
   * Resend receipt email
   */
  resendReceipt: async (donationId: string, email?: string): Promise<string> => {
    const response = await axios.post(
      `${API_BASE_URL}/donations/receipt/${donationId}/resend`,
      null,
      {
        ...createAuthenticatedRequest(),
        params: email ? { email } : {},
      }
    );
    return response.data;
  },
};

// Helper functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

export const downloadReceiptFile = async (donationId: string, filename: string) => {
  try {
    const blob = await donationApi.downloadReceipt(donationId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading receipt:', error);
    throw error;
  }
};