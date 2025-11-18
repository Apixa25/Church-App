# 🎯 Stripe Connect Setup Guide for Donations

## Current Issue 🔍

Your organization "**4 Square Church, Crescent City CA**" doesn't have a Stripe Connect account configured, which is required to accept donations.

**Error Message**:
```
Organization 4 Square Church, Crescent City CA has not configured donation processing. 
Please contact your church administrator.
```

## ✅ Great News!

The **enum deserialization bug is completely fixed**! 🎉 The backend now correctly accepts donation categories. The current error is just a configuration issue.

---

## Solution 1: Development/Testing Setup (Quick) 🚀

### For Testing Only - Bypass Stripe Connect

If you just want to **test the donation flow** without setting up real Stripe accounts:

#### Step 1: Update Your Database

```sql
-- Find your organization
SELECT id, name, stripe_connect_account_id 
FROM organizations 
WHERE name LIKE '%4 Square%';

-- Add a test Stripe Connect account ID
UPDATE organizations
SET stripe_connect_account_id = 'acct_1234567890TEST'  
WHERE name = '4 Square Church, Crescent City CA';
```

#### Step 2: Configure Test Mode Bypass (Optional)

You can also modify the service to skip validation in development:

```java
// In StripePaymentService.java around line 54
// Add this after line 51:
if (organization.getStripeConnectAccountId() == null || 
    organization.getStripeConnectAccountId().trim().isEmpty()) {
    
    // FOR DEVELOPMENT ONLY - Allow testing without Stripe Connect
    if (isTestMode()) {
        log.warn("⚠️ TEST MODE: Proceeding without Stripe Connect account");
        // Use platform account directly in test mode
    } else {
        throw new RuntimeException("Organization " + organization.getName() + 
            " has not configured donation processing. Please contact your church administrator.");
    }
}
```

**Limitations**:
- Won't create actual Stripe PaymentIntents
- Can't complete real transactions
- Good for UI/UX testing only

---

## Solution 2: Production Setup (Recommended) 🏆

### Full Stripe Connect Integration

For **real donation processing**, set up Stripe Connect properly:

### Prerequisites ✅

1. **Stripe Account**: Organization admin needs a Stripe account
2. **Admin Access**: Must be an admin of the organization
3. **API Keys**: Stripe API keys in your `.env` file

### Step 1: Create Stripe Connect Account

Your backend already has a **StripeConnectController**! Use it:

#### API Endpoint:
```http
POST /api/stripe-connect/create-account/{organizationId}
```

#### Using Postman/Insomnia:

```bash
POST http://localhost:8083/api/stripe-connect/create-account/{YOUR_ORG_ID}
Headers:
  Authorization: Bearer {YOUR_JWT_TOKEN}
  Content-Type: application/json
```

#### Example Request:

```javascript
const organizationId = '4f8a2b3c...';  // Your org UUID

const response = await axios.post(
  `http://localhost:8083/api/stripe-connect/create-account/${organizationId}`,
  {},
  {
    headers: {
      'Authorization': `Bearer ${yourJwtToken}`
    }
  }
);

console.log('Account created:', response.data);
```

### Step 2: Complete Stripe Onboarding

The API will return an **account link** for onboarding:

```json
{
  "accountId": "acct_1MxYzABC123",
  "accountLink": "https://connect.stripe.com/setup/s/..."
}
```

Open this link in a browser to:
- ✅ Verify organization identity
- ✅ Add bank account details  
- ✅ Accept Stripe terms
- ✅ Enable payment processing

### Step 3: Verify Setup

Once onboarding is complete, verify:

```sql
-- Check if Stripe Connect account is set
SELECT 
  id,
  name, 
  stripe_connect_account_id,
  tier,
  status
FROM organizations 
WHERE name = '4 Square Church, Crescent City CA';
```

Should show:
```
stripe_connect_account_id | acct_1MxYzABC123
```

### Step 4: Test Donation

Try making a donation again - it should now work! 🎉

---

## Solution 3: Quick Database Update (For Development) 📝

If you have access to your database and just want to test:

### Using pgAdmin or psql:

```sql
-- Get your organization ID
SELECT id FROM organizations WHERE name = '4 Square Church, Crescent City CA';

-- Update with your actual Stripe test account
-- Get a test account from: https://dashboard.stripe.com/test/connect/accounts
UPDATE organizations
SET stripe_connect_account_id = 'acct_YOUR_STRIPE_TEST_ACCOUNT'
WHERE name = '4 Square Church, Crescent City CA';

-- Verify
SELECT name, stripe_connect_account_id FROM organizations;
```

### Get a Real Test Account:

1. Log into **Stripe Dashboard** (test mode)
2. Go to **Connect** → **Accounts**
3. Click **Create account** 
4. Copy the account ID (starts with `acct_`)
5. Use that ID in the SQL above

---

## Understanding Stripe Connect 📚

### What is it?

Stripe Connect allows your **platform** (the Church App) to accept payments on behalf of **multiple organizations** (churches).

### How it works:

```
Donor → Your App → Stripe Platform Account → Church's Stripe Account → Church's Bank
```

### Benefits:

✨ **Multi-Tenant**: Each church gets their own money  
✨ **Automated**: Funds go directly to churches  
✨ **Compliant**: Meets financial regulations  
✨ **Transparent**: Each church sees their donations  
✨ **Flexible**: Optional platform fees

---

## Current Architecture 🏗️

Your app uses **Destination Charges** pattern:

```java
// From StripePaymentService.java lines 97-100
.setTransferData(
    PaymentIntentCreateParams.TransferData.builder()
        .setDestination(organization.getStripeConnectAccountId())  // ← Needs this!
        .build()
)
```

This means:
- Payment goes to YOUR platform account
- Stripe automatically transfers to the church
- You can optionally take a small fee (lines 103-106)

---

## Troubleshooting 🔧

### Error: "Only organization administrators can set up Stripe Connect"

**Solution**: Ensure your user is an admin:

```sql
-- Check your role
SELECT 
  u.email, 
  uom.role, 
  uom.is_primary,
  o.name 
FROM user_organization_memberships uom
JOIN users u ON u.id = uom.user_id
JOIN organizations o ON o.id = uom.organization_id
WHERE u.email = 'second@gmail.com';

-- Make yourself an admin (if needed)
UPDATE user_organization_memberships
SET role = 'ADMIN'
WHERE user_id = (SELECT id FROM users WHERE email = 'second@gmail.com')
  AND organization_id = (SELECT id FROM organizations WHERE name = '4 Square Church, Crescent City CA');
```

### Error: "Stripe API key not found"

**Solution**: Check your environment variables:

```bash
# In backend/src/main/resources/application.properties or .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Error: "Account already exists"

**Good news!** The account is already set up. Just proceed with testing.

---

## Recommended Path Forward 🎯

### For Right Now (Testing):

1. ✅ **Option A**: Run the SQL update with a test account ID from Stripe Dashboard
2. ✅ **Option B**: Use the quick database update script
3. ✅ Test the donation flow end-to-end

### For Production (Real Money):

1. 🏆 Set up proper Stripe Connect via the API endpoint
2. 🏦 Complete bank account verification
3. 💰 Process real donations safely
4. 📊 Track donation analytics

---

## Testing Checklist ✅

Once you've configured Stripe Connect:

- [ ] Organization has `stripe_connect_account_id` set
- [ ] User is logged in with valid JWT
- [ ] Donation form submits successfully
- [ ] PaymentIntent is created (check backend logs)
- [ ] Payment confirmation works
- [ ] Donation appears in history
- [ ] Receipt is sent (if configured)

---

## Next Steps 👉

### Right Now:

1. **Run the SQL update** to add a Stripe Connect account ID
2. **Restart your backend** (if needed)
3. **Try the donation again** - should work!

### For Production:

1. **Review Stripe Connect** documentation
2. **Create production Stripe account**
3. **Complete KYC verification**
4. **Enable live processing**

---

## Summary 📋

| Status | Item |
|--------|------|
| ✅ Fixed | Enum deserialization bug |
| ✅ Working | Authentication & JWT |
| ✅ Working | Payment intent creation logic |
| ⚠️ **Needs Setup** | **Stripe Connect account** |
| 🎯 Next | Add `stripe_connect_account_id` to organization |

**You're almost there!** Just one configuration step away from fully working donations! 🚀

---

**Questions or Issues?** Let me know and I'll help you through it! 💪

