# 🌐 Frontend Deployment Guide

This guide explains how to properly build and deploy the frontend to production with the correct environment variables.

---

## 🚨 **CRITICAL: Environment Variable Issue**

**The Problem:** If the frontend is built without setting `REACT_APP_API_URL`, it defaults to `http://localhost:8083/api`, which gets hardcoded into the JavaScript bundle. This causes production sites to try connecting to your local development server!

**The Solution:** Always set `REACT_APP_API_URL` before building for production.

---

## 📋 Table of Contents

1. [Quick Fix - Rebuild & Deploy](#-quick-fix---rebuild--deploy)
2. [Understanding Environment Variables](#-understanding-environment-variables)
3. [Production Build Process](#-production-build-process)
4. [Verifying the Build](#-verifying-the-build)
5. [Deployment Steps](#-deployment-steps)

---

## 🚀 Quick Fix - Rebuild & Deploy

### **Step 1: Set Production Environment Variable**

Create or verify `.env.production` file exists in `frontend/` directory:

```powershell
cd frontend
```

The file `frontend/.env.production` should contain:
```bash
REACT_APP_API_URL=https://api.thegathrd.com/api
```

### **Step 2: Build for Production**

```powershell
npm run build
```

This will:
- ✅ Use `.env.production` automatically
- ✅ Build optimized production bundle
- ✅ Embed the correct API URL: `https://api.thegathrd.com/api`

### **Step 3: Deploy the Build**

Upload the contents of `frontend/build/` to your production server:
- **AWS S3 bucket** (for CloudFront)
- **Web server** (if using traditional hosting)

### **Step 4: Invalidate CloudFront Cache** (if using CloudFront)

After deploying, invalidate the CloudFront cache so users get the new version:
1. Go to AWS CloudFront console
2. Select your distribution
3. Click "Invalidations" tab
4. Create invalidation for: `/*`
5. Wait for invalidation to complete (1-2 minutes)

---

## 💡 Understanding Environment Variables

### **How React Environment Variables Work**

React (Create React App) uses environment variables prefixed with `REACT_APP_`:
- **`.env.local`** - Local development (gitignored, never committed)
- **`.env.production`** - Production builds (gitignored, never committed)
- **`.env.development`** - Development builds (gitignored)

### **Important Notes:**

1. **Environment variables are embedded at BUILD time**, not runtime
   - Once the bundle is built, the API URL is hardcoded
   - You must rebuild to change it

2. **Files are automatically loaded:**
   - `npm start` → Uses `.env.development` or `.env.local`
   - `npm run build` → Uses `.env.production`

3. **Only variables starting with `REACT_APP_` are exposed** to your code

---

## 🔧 Production Build Process

### **Complete Build Command**

```powershell
cd frontend

# Clean previous builds (optional but recommended)
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue

# Build with production environment variables
npm run build
```

### **What Happens During Build:**

1. React Scripts reads `.env.production`
2. Sets `REACT_APP_API_URL=https://api.thegathrd.com/api`
3. Compiles TypeScript/React code
4. Replaces `process.env.REACT_APP_API_URL` with actual value
5. Minifies and optimizes the bundle
6. Outputs to `frontend/build/` directory

### **Expected Output:**

```
Creating an optimized production build...
Compiled successfully!

File sizes after gzip:

  build/static/js/main.[hash].js       ~450 KB
  build/static/css/main.[hash].css     ~70 KB

The build folder is ready to be deployed.
```

---

## ✅ Verifying the Build

### **Method 1: Check Built Files**

Before deploying, verify the API URL is correct:

```powershell
# Search for localhost in the built JavaScript (should find nothing)
Select-String -Path "frontend\build\static\js\*.js" -Pattern "localhost:8083" -SimpleMatch

# Search for production API URL (should find matches)
Select-String -Path "frontend\build\static\js\*.js" -Pattern "api.thegathrd.com" -SimpleMatch
```

### **Method 2: Check Environment Variable**

Open the built JavaScript file and search for the API URL:
- ✅ Should see: `https://api.thegathrd.com/api`
- ❌ Should NOT see: `http://localhost:8083/api`

### **Method 3: Test Locally Before Deploying**

You can test the production build locally:

```powershell
cd frontend
npm install -g serve
serve -s build
```

Then visit `http://localhost:3000` and check the browser console:
- ✅ API calls should go to: `https://api.thegathrd.com/api`
- ❌ Should NOT try: `http://localhost:8083/api`

---

## 📤 Deployment Steps

### **Option A: AWS S3 + CloudFront**

1. **Build the frontend:**
   ```powershell
   cd frontend
   npm run build
   ```

2. **Upload to S3:**
   - Go to AWS S3 Console
   - Navigate to your frontend bucket
   - Upload all contents of `frontend/build/` folder
   - Set appropriate permissions (public read for static assets)

3. **Invalidate CloudFront Cache:**
   - Go to CloudFront Console
   - Select your distribution
   - Create invalidation for `/*`
   - Wait for completion

4. **Verify:**
   - Visit `https://www.thegathrd.com`
   - Open browser console
   - Check network tab - API calls should go to `https://api.thegathrd.com/api`

### **Option B: Traditional Web Server**

1. **Build the frontend:**
   ```powershell
   cd frontend
   npm run build
   ```

2. **Upload files:**
   - Use FTP, SSH, or your deployment method
   - Upload contents of `frontend/build/` to your web root

3. **Verify:**
   - Visit your production URL
   - Open browser console
   - Check network tab - API calls should go to production API

---

## 🔍 Troubleshooting

### **Problem: Still seeing localhost:8083 after deployment**

**Causes:**
1. ✅ Built without `.env.production` file
2. ✅ CloudFront cache not invalidated
3. ✅ Browser cache - hard refresh (Ctrl+Shift+R)

**Fix:**
1. Verify `.env.production` exists with correct URL
2. Rebuild: `npm run build`
3. Redeploy build folder
4. Invalidate CloudFront cache
5. Hard refresh browser (Ctrl+Shift+R or Ctrl+F5)

### **Problem: Environment variable not being used**

**Check:**
1. ✅ File is named exactly `.env.production` (not `.env.prod`)
2. ✅ Variable name is exactly `REACT_APP_API_URL` (case-sensitive)
3. ✅ No quotes around the value: `REACT_APP_API_URL=https://api.thegathrd.com/api` (correct)
   - NOT: `REACT_APP_API_URL="https://api.thegathrd.com/api"` (wrong)

### **Problem: Mixed HTTPS/HTTP errors**

If you see: `SecurityError: An insecure SockJS connection may not be initiated from a page loaded over HTTPS`

**Cause:** Frontend is HTTPS but trying to connect to HTTP API URL

**Fix:** Make sure `REACT_APP_API_URL` uses `https://` not `http://`

---

## 📝 Environment Variable Reference

### **Production:**
```bash
REACT_APP_API_URL=https://api.thegathrd.com/api
```

### **Local Development:**
```bash
REACT_APP_API_URL=http://localhost:8083/api
```

### **Where These Are Used:**

The API URL is used in:
- `frontend/src/services/api.ts`
- `frontend/src/services/prayerApi.ts`
- `frontend/src/services/websocketService.ts`
- `frontend/src/services/adminApi.ts`
- All other API service files

---

## ✅ Quick Checklist

Before deploying frontend, verify:

- [ ] `.env.production` file exists in `frontend/` directory
- [ ] `.env.production` contains: `REACT_APP_API_URL=https://api.thegathrd.com/api`
- [ ] Built using: `npm run build`
- [ ] Verified built files contain production URL (not localhost)
- [ ] Uploaded contents of `frontend/build/` folder
- [ ] Invalidated CloudFront cache (if using CloudFront)
- [ ] Tested in browser - API calls go to production URL

---

## 🎯 Summary

**The Key Point:** React environment variables are embedded at BUILD time. If you built without setting `REACT_APP_API_URL`, the default `http://localhost:8083/api` gets hardcoded into the bundle.

**The Fix:**
1. Create `frontend/.env.production` with production URL
2. Rebuild: `npm run build`
3. Redeploy the `build/` folder
4. Invalidate CloudFront cache

**The Prevention:** Always set `REACT_APP_API_URL` in `.env.production` before building for production!

---

**Happy deploying!** 🚀

