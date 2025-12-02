# 🚨 CRITICAL: Separate Production from Local Development

## 🔍 **The Problem**

Your production website (`https://www.thegathrd.com`) is connecting to your **local development server** (`http://localhost:8083`) instead of the AWS backend (`https://api.thegathrd.com/api`).

**Why this is happening:**
- The frontend build has `localhost:8083` **hardcoded** in the JavaScript bundle
- This happens when `REACT_APP_API_URL` isn't set during the build process
- Even though you're on `www.thegathrd.com`, the frontend code is trying to connect to `localhost:8083`
- If your local dev server is running, it might actually work, which makes it confusing!

---

## ✅ **The Solution**

We need to:
1. ✅ Create `.env.production` with the correct production API URL
2. ✅ Rebuild the frontend with production environment variables
3. ✅ Redeploy to S3
4. ✅ Invalidate CloudFront cache

---

## 🔧 **Step-by-Step Fix**

### **Step 1: Create Production Environment File**

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
@"REACT_APP_API_URL=https://api.thegathrd.com/api"@ | Out-File -FilePath .env.production -Encoding utf8 -NoNewline
```

**Verify it was created:**
```powershell
Get-Content .env.production
```

**Should show:**
```
REACT_APP_API_URL=https://api.thegathrd.com/api
```

---

### **Step 2: Rebuild Frontend with Production URL**

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
npm run build
```

**This will:**
- ✅ Read `.env.production` automatically
- ✅ Embed `https://api.thegathrd.com/api` into the JavaScript bundle
- ✅ Replace all `localhost:8083` references with production URL

**Expected output:**
```
Creating an optimized production build...
Compiled successfully!
```

---

### **Step 3: Verify Build Has Production URL**

**Before deploying, check the build:**
```powershell
# Should find NO localhost references (or very few in comments)
Select-String -Path "build\static\js\*.js" -Pattern "localhost:8083" -SimpleMatch

# Should find production URL
Select-String -Path "build\static\js\*.js" -Pattern "api.thegathrd.com" -SimpleMatch
```

**Expected:**
- ❌ No (or minimal) matches for `localhost:8083`
- ✅ Multiple matches for `api.thegathrd.com`

---

### **Step 4: Deploy to S3**

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 sync build s3://thegathrd-app-frontend --delete
```

---

### **Step 5: Invalidate CloudFront Cache** ⚠️ **CRITICAL!**

1. Go to: https://console.aws.amazon.com/cloudfront/
2. Find your distribution (for `www.thegathrd.com`)
3. Click **"Invalidations"** tab
4. Click **"Create invalidation"**
5. Enter: `/*`
6. Click **"Create invalidation"**
7. **Wait 1-2 minutes** until status shows "Completed"

---

### **Step 6: Clear Browser Cache**

**Important:** Clear your browser cache to ensure you get the new version:

1. **Hard refresh:** `Ctrl + Shift + R` (or `Ctrl + F5`)
2. **Or clear cache:**
   - Chrome: Settings → Privacy → Clear browsing data → Cached images and files
   - Or open in Incognito/Private mode to test

---

### **Step 7: Verify It's Fixed**

1. **Open:** `https://www.thegathrd.com`
2. **Open Developer Console:** Press `F12`
3. **Check Console Output:**
   - ✅ Should see: `🔌 WebSocket Service initialized with URL: https://api.thegathrd.com/api/ws`
   - ❌ Should NOT see: `http://localhost:8083/api/ws`
4. **Check Network Tab:**
   - ✅ All API calls should go to: `https://api.thegathrd.com/api/...`
   - ❌ Should NOT see: `http://localhost:8083/api/...`
5. **Try logging in:**
   - ✅ Should connect to AWS backend
   - ✅ Google login should work
   - ✅ Should see AWS backend data, not local data

---

## 🔐 **Important: Keep Environments Separate**

### **Production (`www.thegathrd.com`):**
- ✅ Should ONLY connect to: `https://api.thegathrd.com/api`
- ✅ Should NEVER connect to localhost
- ✅ Uses AWS backend database

### **Local Development (`localhost:3000`):**
- ✅ Can connect to: `http://localhost:8083/api`
- ✅ Uses local backend database
- ✅ For development/testing only

### **How to Ensure Separation:**

1. **Always build production with `.env.production`:**
   - File must exist before running `npm run build`
   - Must contain: `REACT_APP_API_URL=https://api.thegathrd.com/api`

2. **Development uses different environment:**
   - `.env.development` or `.env.local` for local development
   - Or just rely on the fallback to `localhost:8083` in development

3. **Never deploy development builds:**
   - Only deploy builds created with `.env.production`
   - Always verify the build before deploying

---

## 🎯 **Quick Reference Commands**

```powershell
# 1. Create production env file
cd C:\Users\Admin\Church-App\Church-App\frontend
@"REACT_APP_API_URL=https://api.thegathrd.com/api"@ | Out-File -FilePath .env.production -Encoding utf8 -NoNewline

# 2. Rebuild
npm run build

# 3. Verify build
Select-String -Path "build\static\js\*.js" -Pattern "api.thegathrd.com" -SimpleMatch

# 4. Deploy
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 sync build s3://thegathrd-app-frontend --delete

# 5. Invalidate CloudFront (manual step - do in AWS Console)
```

---

## 🚨 **Why This Happened**

The frontend was built **without** the production environment variable set. When React builds, it embeds environment variables directly into the JavaScript bundle at build time. If `REACT_APP_API_URL` wasn't set, it used the fallback value `http://localhost:8083/api`, which got hardcoded into every API call.

**Key Point:** Environment variables are embedded at BUILD TIME, not runtime. You must set them before building!

---

## ✅ **After This Fix**

- ✅ `www.thegathrd.com` will ONLY connect to AWS backend
- ✅ No more confusion between local and production data
- ✅ Google login will work properly
- ✅ All API calls will go to production URL
- ✅ Local development remains separate and unaffected

---

**This is a critical fix! Please complete all steps in order.** 🚀

