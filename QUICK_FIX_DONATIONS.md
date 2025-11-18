# 🚀 Quick Fix: Enable Donations (5 Minutes)

## Current Status ✅

✅ **Enum Bug FIXED!** - The deserialization error is completely resolved  
⚠️ **Needs Setup** - Organization needs Stripe Connect account ID

---

## Fastest Solution (Right Now) 💨

### Option A: Use pgAdmin or Database Tool

1. **Connect to your database**:
   - Host: `localhost`
   - Port: `5433`
   - Database: `church_app`
   - User: `church_user`
   - Password: `church_password`

2. **Run this SQL**:

```sql
-- Update your organization with a test Stripe Connect ID
UPDATE organizations
SET stripe_connect_account_id = 'acct_test_1234567890'
WHERE name = '4 Square Church, Crescent City CA';

-- Verify it worked
SELECT name, stripe_connect_account_id, tier, status
FROM organizations
WHERE name LIKE '%4 Square%';
```

3. **Try your donation again** - should work now! 🎉

---

### Option B: Command Line (Windows PowerShell)

```powershell
# Connect to PostgreSQL
psql -h localhost -p 5433 -U church_user -d church_app

# Password: church_password

# Run the update
UPDATE organizations SET stripe_connect_account_id = 'acct_test_1234567890' WHERE name = '4 Square Church, Crescent City CA';

# Verify
SELECT name, stripe_connect_account_id FROM organizations;

# Exit
\q
```

---

### Option C: Create a Quick API Endpoint (Development Only)

If you don't have database access, add this temporary endpoint:

```java
// In DonationController.java (TEMPORARY - REMOVE AFTER TESTING)
@PostMapping("/admin/setup-test-stripe/{organizationId}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<?> setupTestStripe(@PathVariable UUID organizationId) {
    Organization org = organizationRepository.findById(organizationId)
        .orElseThrow(() -> new RuntimeException("Organization not found"));
    
    // FOR TESTING ONLY!
    org.setStripeConnectAccountId("acct_test_1234567890");
    organizationRepository.save(org);
    
    return ResponseEntity.ok(Map.of(
        "success", true,
        "message", "Test Stripe account configured",
        "organizationId", organizationId,
        "stripeAccountId", "acct_test_1234567890"
    ));
}
```

Then call it:
```bash
POST http://localhost:8083/api/donations/admin/setup-test-stripe/{YOUR_ORG_ID}
```

---

## ⚠️ Important Notes

### This is a TEST setup:

- ✅ Will allow your donation flow to proceed
- ✅ Will bypass the "not configured" error
- ❌ Won't create real Stripe charges (fake account ID)
- ❌ Not for production use

### For Real Donations:

You need to set up **actual Stripe Connect** (see `STRIPE_CONNECT_SETUP_GUIDE.md`)

---

## What Happens Next? 🎬

After updating the database:

1. ✅ Donation request passes organization check
2. ✅ Backend attempts to create Stripe PaymentIntent
3. ⚠️ Stripe API will reject it (invalid account ID)
4. 💡 But you'll see the flow working!

### To fully test payments:

1. Get a **real Stripe test account**:
   - Go to https://dashboard.stripe.com/test/connect/accounts
   - Create a test Express account
   - Copy the account ID (starts with `acct_`)
   - Use that instead of `acct_test_1234567890`

2. Make sure your `.env` has Stripe test keys:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. Try the donation again - will create a real test charge! ✅

---

## Summary 📋

**What we fixed**:
- ✅ Enum deserialization (OFFERINGS vs offerings)
- ✅ RecurringFrequency deserialization (WEEKLY vs week)

**What needs setup**:
- ⚠️ Stripe Connect account configuration

**Fastest path**:
1. Run the SQL update above
2. Test your donation flow
3. Set up real Stripe Connect when ready

---

**You're 99% there!** Just one SQL command away from testing donations! 🚀💪

