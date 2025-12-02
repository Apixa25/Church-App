# 🚀 Frontend Fix - Step-by-Step Guide

## ✅ Step 1: Verify Environment File

The `.env.production` file already exists! Let's verify it's correct:

**File location:** `frontend/.env.production`

**Should contain:**
```
REACT_APP_API_URL=https://api.thegathrd.com/api
```

✅ **If this matches, proceed to Step 2!**

---

## 🔨 Step 2: Build Frontend for Production

**Run this command:**

```powershell
cd frontend
npm run build
```

**Expected output:**
```
Creating an optimized production build...
Compiled successfully!

File sizes after gzip:

  build/static/js/main.[hash].js       ~450 KB
  build/static/css/main.[hash].css     ~70 KB

The build folder is ready to be deployed.
```

**What this does:**
- ✅ Uses `.env.production` automatically
- ✅ Embeds `https://api.thegathrd.com/api` into the bundle
- ✅ Creates optimized production files in `frontend/build/`

**Time:** Usually 1-2 minutes

---

## 🔍 Step 3: Verify Build Contains Production URL

**Before deploying, let's verify the build has the correct URL:**

```powershell
# Check that localhost is NOT in the built files
Select-String -Path "build\static\js\*.js" -Pattern "localhost:8083" -SimpleMatch

# Check that production URL IS in the built files
Select-String -Path "build\static\js\*.js" -Pattern "api.thegathrd.com" -SimpleMatch
```

**Expected results:**
- ❌ No matches for "localhost:8083" (or very few - just in comments)
- ✅ Multiple matches for "api.thegathrd.com"

---

## 📤 Step 4: Deploy Frontend Build

### **Option A: AWS S3 + CloudFront (Your Setup)**

1. **Go to AWS S3 Console:**
   - Navigate to: https://console.aws.amazon.com/s3/
   - Find your frontend bucket (likely named something like `thegathrd-frontend` or similar)

2. **Upload Build Files:**
   - Select all contents of `frontend/build/` folder
   - **Important:** Upload the CONTENTS of the build folder, not the folder itself
   - Files should include:
     - `index.html`
     - `static/` folder
     - `manifest.json`
     - `robots.txt`
     - etc.

3. **Set Permissions (if needed):**
   - Make sure files are publicly readable
   - Set proper MIME types for HTML/CSS/JS files

### **Option B: If Using Different Hosting**

Upload the contents of `frontend/build/` to your web server using your usual method (FTP, SSH, etc.)

---

## 🗑️ Step 5: Invalidate CloudFront Cache

**This is CRITICAL!** Without this, users will still see the old version.

1. **Go to CloudFront Console:**
   - Navigate to: https://console.aws.amazon.com/cloudfront/
   - Find your distribution (likely for `www.thegathrd.com`)

2. **Create Invalidation:**
   - Click on your distribution
   - Go to **"Invalidations"** tab
   - Click **"Create invalidation"**
   - Enter path: `/*`
   - Click **"Create invalidation"**

3. **Wait for Completion:**
   - Status will show "In Progress"
   - Usually takes 1-2 minutes
   - Wait until status shows "Completed"

---

## ✅ Step 6: Verify It's Fixed

1. **Hard refresh your browser:**
   - Press `Ctrl + Shift + R` (Windows/Linux)
   - Or `Cmd + Shift + R` (Mac)

2. **Open Developer Console (F12):**
   - Go to **Network** tab
   - Filter by **Fetch/XHR**
   - Trigger an API call (login, load a page, etc.)

3. **Check the requests:**
   - ✅ Should see: `https://api.thegathrd.com/api/...`
   - ❌ Should NOT see: `http://localhost:8083/api/...`

4. **Or run this in console:**
   ```javascript
   console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:8083/api');
   ```

---

## 🎯 Quick Command Summary

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Build for production
npm run build

# 3. Verify build (optional but recommended)
Select-String -Path "build\static\js\*.js" -Pattern "api.thegathrd.com" -SimpleMatch

# 4. Upload contents of frontend/build/ to your S3 bucket
# 5. Invalidate CloudFront cache: /*
# 6. Hard refresh browser: Ctrl+Shift+R
```

---

## ⚡ What to Expect

**Before fix:**
- ❌ Console shows: `🔌 WebSocket Service initialized with URL: http://localhost:8083/api/ws`
- ❌ API calls fail with 404 or connection errors
- ❌ Security errors about HTTPS/HTTP mixing

**After fix:**
- ✅ Console shows: `🔌 WebSocket Service initialized with URL: https://api.thegathrd.com/api/ws`
- ✅ API calls succeed
- ✅ No security errors
- ✅ App works normally!

---

## 🆘 Troubleshooting

### **Build Still Shows localhost:**
- Check `.env.production` file exists and has correct content
- Delete `frontend/build/` folder and rebuild
- Check for typos in the API URL

### **CloudFront Still Shows Old Version:**
- Wait for invalidation to complete (check status)
- Hard refresh browser (Ctrl+Shift+R)
- Try incognito/private window
- Check CloudFront invalidation status is "Completed"

### **API Calls Still Fail:**
- Verify backend is running (check health endpoint)
- Check browser console for actual error messages
- Verify CORS is configured correctly on backend

---

**Ready to go!** 🚀

Start with Step 2 (Build) and work through each step!

