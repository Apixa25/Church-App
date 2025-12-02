import axios from 'axios';
import { DonationCategory, RecurringFrequency } from '../config/stripe';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

// Types for API requests and responses
export interface PaymentIntentRequest {
  amount: number;
  category: DonationCategory;
  purpose?: string;
  receiptEmail?: string;
  organizationId?: string; // Organization ID for context-aware donations (Church or Family)
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
  organizationId?: string; // Organization ID for context-aware donations (Church or Family)
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

// Analytics Types
export interface DonationAnalytics {
  totalDonations: number;
  totalAmount: number;
  averageDonation: number;
  donorCount: number;
  recurringDonations: number;
  recurringAmount: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrends: MonthlyTrend[];
  topDonors: TopDonor[];
  recentDonations: DonationResponse[];
  periodComparison: PeriodComparison;
}

export interface CategoryBreakdown {
  category: DonationCategory;
  categoryDisplayName: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  year: number;
  totalAmount: number;
  donationCount: number;
  newDonors: number;
  recurringAmount: number;
}

export interface TopDonor {
  userId: string;
  donorName: string;
  totalAmount: number;
  donationCount: number;
  averageDonation: number;
  lastDonationDate: string;
  isRecurringDonor: boolean;
}

export interface PeriodComparison {
  currentPeriod: PeriodStats;
  previousPeriod: PeriodStats;
  growth: GrowthMetrics;
}

export interface PeriodStats {
  totalAmount: number;
  donationCount: number;
  donorCount: number;
  averageDonation: number;
}

export interface GrowthMetrics {
  amountGrowth: number;
  countGrowth: number;
  donorGrowth: number;
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

  /**
   * Get donation analytics for admin dashboard
   */
  getAnalytics: async (
    dateRange: '7d' | '30d' | '90d' | '1y' = '30d',
    startDate?: string,
    endDate?: string
  ): Promise<DonationAnalytics> => {
    const params: any = { dateRange };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get(
      `${API_BASE_URL}/admin/donations/analytics`,
      {
        ...createAuthenticatedRequest(),
        params,
      }
    );
    return response.data;
  },

  /**
   * Get all donors for management
   */
  getDonors: async (
    page: number = 0,
    size: number = 20,
    sortBy: string = 'totalAmount',
    sortDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{
    content: TopDonor[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
  }> => {
    const response = await axios.get(
      `${API_BASE_URL}/admin/donations/donors`,
      {
        ...createAuthenticatedRequest(),
        params: { page, size, sortBy, sortDirection },
      }
    );
    return response.data;
  },

  /**
   * Export donation data
   */
  exportDonations: async (
    format: 'csv' | 'xlsx' = 'csv',
    dateRange: '7d' | '30d' | '90d' | '1y' = '30d',
    startDate?: string,
    endDate?: string
  ): Promise<Blob> => {
    const params: any = { format, dateRange };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const response = await axios.get(
      `${API_BASE_URL}/admin/donations/export`,
      {
        ...createAuthenticatedRequest(),
        params,
        responseType: 'blob',
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