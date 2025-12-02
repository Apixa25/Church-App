# 🚀 Deploy Frontend NOW - Complete Reference Guide

**Quick reference for deploying the frontend to AWS S3 + CloudFront**

---

## 📋 Important Configuration Details

### **AWS CLI Location:**
```
C:\Program Files\Amazon\AWSCLIV2\aws.exe
```

### **S3 Bucket Name:**
```
thegathrd-app-frontend
```

### **Build Directory:**
```
C:\Users\Admin\Church-App\Church-App\frontend\build\
```

### **Production API URL:**
```
https://api.thegathrd.com/api
```

---

## 🎯 Quick Deployment (3 Methods)

### **Method 1: AWS CLI Direct Command** ⚡ **FASTEST**

This is the method we used successfully today!

**Prerequisites:**
- AWS CLI installed at: `C:\Program Files\Amazon\AWSCLIV2\aws.exe`
- AWS credentials configured
- Build completed: `npm run build` in `frontend/` directory

**Deployment Command:**

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 sync build s3://thegathrd-app-frontend --delete
```

**What this does:**
- ✅ Uploads all files from `frontend/build/` to S3
- ✅ Deletes old files in S3 that aren't in the new build
- ✅ Only uploads changed files (smart sync)
- ✅ No ACL flag needed (bucket uses bucket policy)

**Expected output:**
```
upload: build\index.html to s3://thegathrd-app-frontend/index.html
upload: build\static\css\main.[hash].css to s3://thegathrd-app-frontend/static/css/...
upload: build\static\js\main.[hash].js to s3://thegathrd-app-frontend/static/js/...
...
```

---

### **Method 2: PowerShell Deployment Script** 🛠️ **MOST USER-FRIENDLY**

Use the automated script we created!

**Script Location:**
```
C:\Users\Admin\Church-App\Church-App\frontend\deploy-to-s3.ps1
```

**Usage:**

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
.\deploy-to-s3.ps1 -BucketName "thegathrd-app-frontend"
```

**What this does:**
- ✅ Checks if build directory exists
- ✅ Verifies AWS CLI is available
- ✅ Verifies bucket is accessible
- ✅ Syncs files to S3
- ✅ Provides clear success/failure messages

---

### **Method 3: Manual Upload via AWS Console** 🖱️ **BACKUP METHOD**

Use this if AWS CLI isn't working.

**Step 1: Find Your S3 Bucket**

1. Go to: https://console.aws.amazon.com/s3/
2. Find bucket: `thegathrd-app-frontend`

**Step 2: Upload Files**

1. **Open the bucket**
2. **Delete all existing files** (or move to backup folder)
3. **Upload ALL contents** of `frontend/build/` folder
   - Select all files and folders
   - **Important:** Upload the CONTENTS, not the `build` folder itself
4. Files should include:
   - `index.html`
   - `asset-manifest.json`
   - `static/` folder (CSS, JS files)
   - `manifest.json`
   - `robots.txt`
   - Other static assets

**Note:** Modern S3 buckets use bucket policies instead of ACLs, so you don't need to set public-read ACL manually.

---

## 🔄 Step-by-Step Complete Deployment Process

### **Step 1: Verify Build Environment**

Make sure `.env.production` exists with correct API URL:

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
Get-Content .env.production
```

**Should show:**
```
REACT_APP_API_URL=https://api.thegathrd.com/api
```

If missing or incorrect, create it:

```powershell
@"REACT_APP_API_URL=https://api.thegathrd.com/api"@ | Out-File -FilePath .env.production -Encoding utf8
```

---

### **Step 2: Build Frontend for Production**

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
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

**Time:** Usually 1-2 minutes

---

### **Step 3: Verify Build Contains Production URL** (Optional but Recommended)

Before deploying, verify the build has the correct API URL:

```powershell
# Check that localhost is NOT in the built files
Select-String -Path "build\static\js\*.js" -Pattern "localhost:8083" -SimpleMatch

# Check that production URL IS in the built files
Select-String -Path "build\static\js\*.js" -Pattern "api.thegathrd.com" -SimpleMatch
```

**Expected results:**
- ❌ No matches (or very few) for "localhost:8083"
- ✅ Multiple matches for "api.thegathrd.com"

---

### **Step 4: Deploy to S3**

Choose one of the three methods above:

- **Method 1:** AWS CLI direct command (fastest)
- **Method 2:** PowerShell script (most user-friendly)
- **Method 3:** Manual upload (backup)

---

### **Step 5: Invalidate CloudFront Cache** ⚠️ **CRITICAL!**

**This step is REQUIRED!** Without it, users will still see the old cached version.

**What invalidation does:**
- Tells CloudFront to delete cached copies of your files
- Forces CloudFront to fetch fresh files from S3
- Users get the new version within 1-2 minutes

**Steps:**

1. Go to: https://console.aws.amazon.com/cloudfront/
2. **Find your distribution** (likely for `www.thegathrd.com`)
3. Click on it
4. Go to **"Invalidations"** tab
5. Click **"Create invalidation"**
6. Enter path: `/*` (invalidates all files)
7. Click **"Create invalidation"**
8. **Wait 1-2 minutes** for status to show "Completed"

**Alternative: Use AWS CLI to invalidate:**

```powershell
# First, get your CloudFront distribution ID
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" cloudfront list-distributions --query "DistributionList.Items[?contains(Aliases.Items, 'www.thegathrd.com')].Id" --output text

# Then create invalidation (replace DISTRIBUTION_ID with actual ID)
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

---

### **Step 6: Test Deployment** ✅

1. **Hard refresh browser:** `Ctrl + Shift + R` (or `Ctrl + F5`)
2. **Open Developer Console:** Press `F12`
3. **Check console output:**
   - ✅ Should see: `🔌 WebSocket Service initialized with URL: https://api.thegathrd.com/api/ws`
   - ❌ Should NOT see: `http://localhost:8083/api`
4. **Check Network tab:**
   - ✅ API calls should go to: `https://api.thegathrd.com/api/...`
   - ❌ Should NOT see: `http://localhost:8083/api/...`
5. **Test Google login** - should work now!
6. **Verify functionality:**
   - Login works
   - API calls succeed
   - WebSocket connects
   - No console errors

---

## ✅ Verification Checklist

After deployment, you should see:

- ✅ Console shows: `🔌 WebSocket Service initialized with URL: https://api.thegathrd.com/api/ws`
- ✅ Google login redirects correctly
- ✅ API calls go to production URL (`https://api.thegathrd.com/api`)
- ✅ No `localhost:8083` references in console
- ✅ No CORS errors
- ✅ No WebSocket security errors
- ✅ Everything works as expected!

---

## 🔍 Troubleshooting

### **Problem: AWS CLI not found**

**Solution:** Use the full path:

```powershell
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 ls
```

### **Problem: Bucket access denied**

**Check:**
1. AWS credentials configured: `aws configure`
2. IAM permissions include S3 access
3. Bucket name is correct: `thegathrd-app-frontend`

### **Problem: Still seeing localhost:8083 after deployment**

**Possible causes:**
1. **Build wasn't updated** - Check `.env.production` exists and rebuild
2. **CloudFront cache not invalidated** - Must invalidate after each deployment!
3. **Browser cache** - Hard refresh: `Ctrl + Shift + R`
4. **Wrong files deployed** - Verify build directory has correct files

### **Problem: Files uploaded but bucket uses ACLs**

If you get `AccessControlListNotSupported` error:

**Solution:** Remove `--acl public-read` flag:

```powershell
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 sync build s3://thegathrd-app-frontend --delete
```

Modern S3 buckets use bucket policies instead of ACLs.

---

## 📝 Quick Command Reference

### **List S3 Buckets:**
```powershell
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 ls
```

### **List Files in Frontend Bucket:**
```powershell
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 ls s3://thegathrd-app-frontend/ --recursive
```

### **Deploy Frontend:**
```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 sync build s3://thegathrd-app-frontend --delete
```

### **Verify AWS CLI:**
```powershell
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" --version
```

---

## 🎯 Complete One-Liner Deployment

For quick reference, here's everything in one command sequence:

```powershell
# Navigate to frontend directory
cd C:\Users\Admin\Church-App\Church-App\frontend

# Deploy to S3
& "C:\Program Files\Amazon\AWSCLIV2\aws.exe" s3 sync build s3://thegathrd-app-frontend --delete

# Then invalidate CloudFront cache manually via console (see Step 5 above)
```

---

## 📚 Related Files

- **Build Script:** `frontend/build-production.ps1`
- **Deployment Script:** `frontend/deploy-to-s3.ps1`
- **Environment Config:** `frontend/.env.production`
- **Detailed Guide:** `FRONTEND_DEPLOYMENT_GUIDE.md`

---

**Last Updated:** Deployment successful on current session using AWS CLI method! ✅

**Remember:** Always invalidate CloudFront cache after deploying! 🚀
