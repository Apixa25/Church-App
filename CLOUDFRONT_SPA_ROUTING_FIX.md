# 🔧 CloudFront SPA Routing Fix - Static Assets Returning HTML

## 🚨 Problem

The error `Uncaught SyntaxError: Unexpected token '<'` when loading `main.4409730e.js` indicates that CloudFront is returning `index.html` instead of the actual JavaScript file.

**Root Cause:** CloudFront's custom error pages are configured to return `index.html` for ALL 404 errors, including requests for static assets like `/static/js/main.4409730e.js`. This breaks the app because the browser tries to execute HTML as JavaScript.

---

## ✅ Solution: Configure CloudFront Error Pages Correctly

CloudFront needs to:
1. **Return actual files** when they exist (like `/static/js/main.4409730e.js`)
2. **Return `index.html`** only for React Router routes (non-static paths)

---

## 🔧 Step 1: Check Current CloudFront Configuration

1. Go to **AWS CloudFront Console**: https://console.aws.amazon.com/cloudfront/
2. Click on your distribution (the one for `www.thegathrd.com`)
3. Go to the **"Error pages"** tab
4. Check what custom error pages are configured

---

## 🛠️ Step 2: Fix CloudFront Error Pages Configuration

### **Option A: Remove Custom Error Pages (Simplest)**

If you have custom error pages configured that return `index.html` for all 404s:

1. Go to **"Error pages"** tab
2. **Delete any custom error page** that responds to 404 with `index.html`
3. Click **"Save changes"**
4. Wait 5-15 minutes for deployment

**Note:** This will cause React Router routes to return 404s. You'll need Option B instead.

### **Option B: Conditional Error Handling (Recommended)**

The proper solution is to use **Lambda@Edge** or configure CloudFront to:
- Return actual 404s for static assets (files that should exist)
- Return `index.html` only for app routes

However, a simpler approach is to ensure static assets are never 404'd:

1. **Verify files exist in S3:**
   ```powershell
   # Check if static files are in S3
   & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 ls s3://thegathrd-app-frontend/static/js/ --recursive
   ```

2. **If files are missing, rebuild and redeploy:**
   ```powershell
   cd frontend
   npm run build
   & "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 sync build s3://thegathrd-app-frontend --delete
   ```

3. **Configure CloudFront Error Pages:**
   - Go to CloudFront → Your Distribution → **"Error pages"** tab
   - Click **"Create custom error response"**
   - **HTTP error code:** `404`
   - **Customize error response:** `Yes`
   - **Response page path:** `/index.html`
   - **HTTP response code:** `200`
   - **Click "Create custom error response"**
   - **BUT WAIT** - This will break static assets!

4. **Better: Use S3 Website Hosting Error Document:**
   Instead of CloudFront custom error pages, configure S3:
   - Go to S3 → Your bucket → **"Properties"** tab
   - Scroll to **"Static website hosting"**
   - Enable it
   - Set **Error document** to `index.html`
   - But this might conflict with CloudFront OAC...

### **Option C: Lambda@Edge Function (Most Reliable)**

Create a Lambda@Edge function that:
- Returns actual files for `/static/*` paths
- Returns `index.html` for all other paths

**This is the industry-standard solution**, but requires Lambda@Edge setup.

---

## 🚀 Quick Fix: Rebuild and Redeploy

The issue might be that the build files aren't correctly deployed. Let's verify:

### **Step 1: Rebuild Frontend**

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend

# Clean previous build
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue

# Rebuild
npm run build
```

### **Step 2: Verify Build Output**

Check that `build/index.html` references the correct JS files:

```powershell
Get-Content build\index.html | Select-String "main\."
```

You should see something like:
```html
<script src="/static/js/main.4409730e.js"></script>
```

**Important:** The paths should start with `/static/` (absolute paths), not `static/` (relative).

### **Step 3: Deploy to S3**

```powershell
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 sync build s3://thegathrd-app-frontend --delete
```

### **Step 4: Verify Files in S3**

```powershell
# Check if the JS file exists
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 ls s3://thegathrd-app-frontend/static/js/main.4409730e.js
```

### **Step 5: Invalidate CloudFront Cache**

```powershell
# Get your distribution ID first (from CloudFront console)
$DistributionId = "E1234567890ABC"  # Replace with your actual distribution ID

# Invalidate all files
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
```

Or use the console:
1. Go to CloudFront → Your Distribution → **"Invalidations"** tab
2. Click **"Create invalidation"**
3. Enter: `/*`
4. Click **"Create invalidation"**

---

## 🔍 Verify the Fix

1. **Wait 5-15 minutes** for CloudFront deployment
2. **Clear browser cache** (Ctrl + Shift + R)
3. **Open browser DevTools** (F12) → Network tab
4. **Visit:** `https://www.thegathrd.com`
5. **Check:** Request to `/static/js/main.4409730e.js`
   - ✅ Should return JavaScript (Content-Type: `application/javascript`)
   - ❌ Should NOT return HTML (Content-Type: `text/html`)

---

## 🎯 Industry-Standard Solution (For Future)

For a production SPA, the recommended setup is:

1. **CloudFront Distribution** pointing to S3 bucket
2. **Lambda@Edge Function** that:
   - Checks if the requested path matches `/static/*`
   - If yes: Let CloudFront serve normally (returns file or 404)
   - If no: Rewrite to `/index.html` and return 200
3. **S3 Bucket** with:
   - All static assets in `/static/` folder
   - `index.html` at root

This ensures:
- ✅ Static assets are served correctly
- ✅ React Router routes work (return `index.html`)
- ✅ No 404s for app routes
- ✅ Proper HTTP status codes

---

## 📝 Temporary Workaround

If you need an immediate fix:

1. **Disable CloudFront custom error pages** (temporarily)
2. **Verify all static files are in S3**
3. **Redeploy** if files are missing
4. **Invalidate CloudFront cache**

This will cause React Router routes (like `/dashboard`) to return 404s temporarily, but static assets will load correctly.

---

## ✅ Success Checklist

After applying the fix, verify:

- ✅ `https://www.thegathrd.com/static/js/main.4409730e.js` returns JavaScript (check Content-Type)
- ✅ `https://www.thegathrd.com/static/css/main.[hash].css` returns CSS
- ✅ `https://www.thegathrd.com/dashboard` returns `index.html` (for React Router)
- ✅ Browser console shows no "Unexpected token '<'" errors
- ✅ App loads and works correctly

---

## 🆘 If Still Not Working

1. **Check S3 bucket structure:**
   - Files should be at root level: `s3://bucket/static/js/main.4409730e.js`
   - NOT nested: `s3://bucket/build/static/js/main.4409730e.js`

2. **Check CloudFront origin path:**
   - Should be empty (not `/build` or similar)

3. **Check S3 bucket permissions:**
   - CloudFront OAC needs read access
   - Verify OAC is configured correctly

4. **Check build output:**
   - `build/index.html` should have absolute paths: `/static/js/...`
   - Not relative paths: `static/js/...`

