# 🔑 Stripe API Keys Setup Guide

## Current Issue 🚨

Your Stripe Connect endpoints aren't working because the **Stripe API keys aren't configured**. The error you're seeing:

```
No mapping for GET /api/stripe-connect/account-status/...
```

This happens because Spring Boot can't initialize the `StripeConnectController` without valid Stripe credentials.

---

## Quick Solution (Get Your Keys) 🚀

### Step 1: Get Your Stripe Test Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/
2. **Sign in** or **Create a free account** (takes 2 minutes)
3. **Make sure you're in TEST mode** (toggle in top right)
4. **Click "Developers"** in the left sidebar
5. **Click "API keys"**
6. **Copy your keys**:
   - **Publishable key**: Starts with `pk_test_...`
   - **Secret key**: Click "Reveal test key", starts with `sk_test_...`

### Step 2: Configure Your Backend

**Choose ONE of these methods:**

#### Method A: Environment Variables (Recommended)

**For Windows PowerShell**:
```powershell
# In your terminal before running the app:
$env:STRIPE_SECRET_KEY="sk_test_YOUR_KEY_HERE"
$env:STRIPE_PUBLIC_KEY="pk_test_YOUR_KEY_HERE"

# Then run your backend
cd backend
./mvnw spring-boot:run
```

**For IntelliJ/IDE Run Configuration**:
1. Edit your run configuration
2. Add environment variables:
   ```
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
   ```

#### Method B: Direct in application.properties

Edit `backend/src/main/resources/application.properties`:

```properties
# Stripe Configuration
stripe.public.key=pk_test_51YOUR_ACTUAL_KEY_HERE
stripe.secret.key=sk_test_51YOUR_ACTUAL_KEY_HERE
stripe.webhook.secret=whsec_test_YOUR_WEBHOOK_SECRET_HERE
```

⚠️ **Warning**: Don't commit real keys to Git!

#### Method C: .env File (if you have spring-dotenv)

Create `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_KEY_HERE
```

### Step 3: Configure Your Frontend

Edit `frontend/.env` or `frontend/.env.local`:

```env
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

---

## Testing the Fix 🧪

### 1. Restart Your Backend

After adding the keys:
```bash
# Stop your backend (Ctrl+C)
# Start again
cd backend
./mvnw spring-boot:run
```

### 2. Look for Success Message

You should see in your backend logs:
```
✅ Stripe Connect Controller initialized with API key
```

Instead of:
```
⚠️ Stripe Connect Controller initialized WITHOUT API key
```

### 3. Test the Donations Button

1. Go to Admin Dashboard → Organizations
2. Click **💳 Donations** on any organization
3. Should now load without errors! ✅

---

## Example Stripe Keys (Format)

```
Publishable Key (Frontend):
pk_test_51Abc123Def456Ghi789Jkl012Mno345Pqr678Stu901Vwx234Yz

Secret Key (Backend):
sk_test_51Abc123Def456Ghi789Jkl012Mno345Pqr678Stu901Vwx234Yz

Webhook Secret (Backend - optional for now):
whsec_test_abc123def456ghi789jkl012mno345pqr678stu901vwx234y
```

---

## Full Setup Example (Windows)

```powershell
# 1. Set environment variables
$env:STRIPE_SECRET_KEY="sk_test_51PASTE_YOUR_KEY_HERE"
$env:STRIPE_PUBLIC_KEY="pk_test_51PASTE_YOUR_KEY_HERE"

# 2. Navigate to backend
cd backend

# 3. Start backend
./mvnw spring-boot:run

# In another terminal:
# 4. Navigate to frontend
cd frontend

# 5. Create .env.local if it doesn't exist
echo "REACT_APP_STRIPE_PUBLIC_KEY=pk_test_51PASTE_YOUR_KEY_HERE" > .env.local

# 6. Start frontend
npm start
```

---

## Troubleshooting 🔧

### Still seeing "No mapping" error?

**Check:**
1. ✅ Backend restarted after adding keys?
2. ✅ Keys don't have spaces or newlines?
3. ✅ Using TEST keys (not LIVE keys)?
4. ✅ Copied the full key including `sk_test_` or `pk_test_`?

### Check if keys are loaded:

Look at backend startup logs:
```
✅ Good: "Stripe Connect Controller initialized with API key"
❌ Bad: "Stripe Connect Controller initialized WITHOUT API key"
```

### Keys not being read?

**Verify environment variables**:
```powershell
# Windows PowerShell
echo $env:STRIPE_SECRET_KEY

# Should show your key, not empty
```

### Frontend can't connect?

**Check `.env.local` file**:
```bash
# In frontend directory
cat .env.local

# Should show:
# REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...
```

### Still not working?

**Try the direct application.properties method:**
1. Edit `backend/src/main/resources/application.properties`
2. Replace the placeholder values directly
3. Restart backend
4. Should work! ✅

---

## Security Best Practices 🔒

### DO ✅:
- ✅ Use environment variables in production
- ✅ Use TEST keys for development
- ✅ Keep SECRET keys secret (never commit)
- ✅ Use `.env.local` (git-ignored by default)
- ✅ Rotate keys if exposed

### DON'T ❌:
- ❌ Commit keys to Git
- ❌ Share SECRET keys publicly
- ❌ Use LIVE keys for testing
- ❌ Hardcode keys in source code
- ❌ Expose keys in client-side code

---

## For Production 🚀

When you're ready for production:

1. **Get your LIVE keys** from Stripe Dashboard
2. **Switch to LIVE mode** (toggle in Stripe Dashboard)
3. **Copy your LIVE keys** (start with `pk_live_` and `sk_live_`)
4. **Set on your production server**:
   ```bash
   # On Render/Heroku/AWS:
   STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   STRIPE_PUBLIC_KEY=pk_live_YOUR_LIVE_KEY
   ```
5. **Enable Stripe Connect** (if not already)
6. **Test with real money** (small amounts!)

---

## Summary 📝

### What You Need:

| Key Type | Starts With | Where to Use | Required? |
|----------|-------------|--------------|-----------|
| **Secret Key** | `sk_test_` | Backend (server) | ✅ Yes |
| **Publishable Key** | `pk_test_` | Frontend (browser) | ✅ Yes |
| **Webhook Secret** | `whsec_test_` | Backend webhooks | ⚠️ Optional |

### Quick Commands:

```powershell
# Windows - Set env vars and run
$env:STRIPE_SECRET_KEY="sk_test_YOUR_KEY"
$env:STRIPE_PUBLIC_KEY="pk_test_YOUR_KEY"
cd backend
./mvnw spring-boot:run
```

### Success Checklist:

- [ ] Stripe account created
- [ ] Test keys copied from dashboard
- [ ] Backend environment variable set
- [ ] Frontend .env.local created
- [ ] Backend restarted
- [ ] See "✅ Stripe Connect Controller initialized" in logs
- [ ] No more "No mapping" errors
- [ ] Donations button loads successfully

---

## Next Steps After Keys are Set 🎯

Once your keys are configured:

1. ✅ **Test the UI** - Click Donations button
2. ✅ **Enable Stripe Connect** - Follow instructions in modal
3. ✅ **Create test account** - Use the "Setup Donations" button
4. ✅ **Test donations** - Use test card `4242 4242 4242 4242`

---

**You're almost there!** Just add those Stripe keys and everything will work! 🚀

Need help getting your keys? Let me know! 💪

