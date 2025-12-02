import api from './api';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

// Types
export interface StripeConnectAccount {
  accountId: string;
  onboardingUrl: string;
  expiresAt: number;
}

export interface StripeAccountStatus {
  hasAccount: boolean;
  accountId?: string;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled?: boolean;
  requiresInformation?: boolean;
  currentlyDue?: string[];
  eventuallyDue?: string[];
  pastDue?: string[];
}

export interface StripeAccountBalance {
  available: Array<{
    amount: number;
    currency: string;
  }>;
  pending: Array<{
    amount: number;
    currency: string;
  }>;
}

export interface OnboardingLink {
  onboardingUrl: string;
  expiresAt: number;
}

// API Functions

/**
 * Create a new Stripe Connected Account for an organization
 * This creates the account and returns an onboarding URL
 */
export const createConnectAccount = async (organizationId: string): Promise<StripeConnectAccount> => {
  const response = await api.post(`/stripe-connect/create-account/${organizationId}`);
  return response.data;
};

/**
 * Get the status of an organization's Stripe Connect account
 */
export const getAccountStatus = async (organizationId: string): Promise<StripeAccountStatus> => {
  const response = await api.get(`/stripe-connect/account-status/${organizationId}`);
  return response.data;
};

/**
 * Create a new onboarding link for incomplete accounts
 * Used when the original link expires or user needs to complete more info
 */
export const createOnboardingLink = async (organizationId: string): Promise<OnboardingLink> => {
  const response = await api.post(`/stripe-connect/create-account-link/${organizationId}`);
  return response.data;
};

/**
 * Get the balance of an organization's Stripe Connect account
 * Requires admin access to the organization
 */
export const getAccountBalance = async (organizationId: string): Promise<StripeAccountBalance> => {
  const response = await api.get(`/stripe-connect/account-balance/${organizationId}`);
  return response.data;
};

/**
 * Create a manual payout from the organization's Stripe account to their bank
 * Requires admin access and a verified account
 */
export const createPayout = async (
  organizationId: string,
  amount: number,
  currency: string = 'usd'
): Promise<{ payoutId: string; amount: number; status: string }> => {
  const response = await api.post(`/stripe-connect/create-payout/${organizationId}`, {
    amount,
    currency
  });
  return response.data;
};

/**
 * Disconnect a Stripe Connect account from an organization
 * WARNING: This is permanent and should be used with caution
 */
export const disconnectAccount = async (organizationId: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/stripe-connect/disconnect-account/${organizationId}`);
  return response.data;
};

// Export all functions as default
export default {
  createConnectAccount,
  getAccountStatus,
  createOnboardingLink,
  getAccountBalance,
  createPayout,
  disconnectAccount
};

