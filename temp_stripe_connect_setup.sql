-- TEMPORARY SOLUTION FOR TESTING DONATIONS
-- This adds a test Stripe Connect account ID to your organization
-- WARNING: This is for TESTING only. For production, use Option 2 (full Stripe Connect setup)

-- Update your organization with a test account ID
-- Replace 'YOUR_ORG_ID' with your actual organization UUID
UPDATE organizations
SET stripe_connect_account_id = 'acct_test_for_development'
WHERE name = '4 Square Church, Crescent City CA';

-- To find your organization ID first, run:
SELECT id, name, stripe_connect_account_id FROM organizations;

-- Note: Using a fake test account ID will let you test the flow, but actual
-- Stripe API calls will fail. To fully test, you need a real Stripe test account.

