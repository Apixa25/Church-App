// Stripe Configuration
export const STRIPE_CONFIG = {
  // This should be your Stripe publishable key
  publicKey: process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_your-stripe-public-key',

  // Stripe options
  options: {
    // Specify the locale for Stripe Elements
    locale: 'en' as const,
    // Appearance customization
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'Ideal Sans, system-ui, sans-serif',
        spacingUnit: '2px',
        borderRadius: '4px',
      },
    },
  },
};

// Donation categories matching backend enum
export enum DonationCategory {
  TITHES = 'tithes',
  OFFERINGS = 'offerings',
  MISSIONS = 'missions'
}

// Recurring frequency options matching backend enum
export enum RecurringFrequency {
  WEEKLY = 'week',
  MONTHLY = 'month',
  QUARTERLY = 'quarter',
  YEARLY = 'year'
}

// Preset donation amounts
export const DONATION_PRESETS = [
  { amount: 25, label: '$25' },
  { amount: 50, label: '$50' },
  { amount: 100, label: '$100' },
  { amount: 250, label: '$250' },
  { amount: 500, label: '$500' },
];

// Category display names
export const CATEGORY_LABELS = {
  [DonationCategory.TITHES]: 'Tithes',
  [DonationCategory.OFFERINGS]: 'Offerings',
  [DonationCategory.MISSIONS]: 'Missions',
};

// Frequency display names
export const FREQUENCY_LABELS = {
  [RecurringFrequency.WEEKLY]: 'Weekly',
  [RecurringFrequency.MONTHLY]: 'Monthly',
  [RecurringFrequency.QUARTERLY]: 'Quarterly',
  [RecurringFrequency.YEARLY]: 'Yearly',
};