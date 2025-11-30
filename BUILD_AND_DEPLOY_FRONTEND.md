# 🚀 Build and Deploy Frontend to S3/CloudFront

This guide walks you through building the production frontend and deploying it to S3, which will be served via CloudFront.

---

## 📋 Prerequisites

✅ **Completed:**
- [x] S3 bucket created (`thegathrd-app-frontend`)
- [x] CloudFront distribution created and enabled
- [x] SSL certificate validated
- [x] S3 bucket policy configured

⏭️ **Next:**
- [ ] Backend API URL (from Elastic Beanstalk)
- [ ] Frontend environment variables configured
- [ ] Frontend production build
- [ ] Upload to S3
- [ ] CloudFront cache invalidation

---

## 🔧 Step 1: Configure Frontend Environment Variables

### **1.1 Create `.env.production` File**

Create a file `frontend/.env.production` with the following content:

```bash
# Production API URL (update after Elastic Beanstalk is deployed)
REACT_APP_API_URL=https://api.thegathrd.com/api

# Stripe Public Key (use test keys initially, switch to live when ready)
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here
```

**Important:**
- Replace `https://api.thegathrd.com/api` with your actual backend URL once Elastic Beanstalk is deployed
- For now, you can use a placeholder, but the frontend won't work until the backend is live
- Stripe keys: Start with test keys, switch to live keys when ready for production

### **1.2 Environment Variable Notes**

- React requires environment variables to start with `REACT_APP_`
- Variables are embedded at build time (not runtime)
- You must rebuild the app to change environment variables
- Never commit `.env.production` to Git (already in `.gitignore`)

---

## 🏗️ Step 2: Build Frontend for Production

### **2.1 Navigate to Frontend Directory**

```powershell
cd frontend
```

### **2.2 Install Dependencies (if needed)**

```powershell
npm install
```

### **2.3 Build Production Bundle**

```powershell
npm run build
```

**What this does:**
- Creates optimized production build in `frontend/build/` directory
- Minifies JavaScript and CSS
- Optimizes images
- Creates static HTML, CSS, and JS files ready for deployment

**Expected output:**
```
Creating an optimized production build...
Compiled successfully!

File sizes after gzip:
  ...
```

### **2.4 Verify Build Output**

Check that `frontend/build/` directory contains:
- `index.html`
- `static/` folder with JS and CSS files
- Other assets (images, fonts, etc.)

---

## 📤 Step 3: Upload to S3

### **3.1 Upload Build Files to S3**

**Option A: Using AWS Console (Manual)**
1. Go to **S3 Console** → `thegathrd-app-frontend` bucket
2. Click **Upload**
3. Select all files from `frontend/build/` directory
4. Click **Upload**

**Option B: Using AWS CLI (Recommended)**

```powershell
# From project root
aws s3 sync frontend/build/ s3://thegathrd-app-frontend/ --delete --region us-west-2
```

**What `--delete` does:**
- Removes files from S3 that don't exist in the build directory
- Ensures S3 only contains current build files

**Expected output:**
```
upload: frontend/build/index.html to s3://thegathrd-app-frontend/index.html
upload: frontend/build/static/css/main.abc123.css to s3://thegathrd-app-frontend/static/css/main.abc123.css
...
```

### **3.2 Verify Upload**

1. Go to **S3 Console** → `thegathrd-app-frontend` bucket
2. Verify files are present:
   - `index.html` should be in root
   - `static/` folder should contain JS and CSS files

---

## 🔄 Step 4: Invalidate CloudFront Cache

CloudFront caches files, so you need to invalidate the cache after uploading new files.

### **4.1 Create Invalidation**

**Option A: Using AWS Console**
1. Go to **CloudFront Console** → Your distribution (`E2SM4EXV57KO8B`)
2. Go to **Invalidations** tab
3. Click **Create invalidation**
4. Enter paths:
   ```
   /*
   ```
5. Click **Create invalidation**

**Option B: Using AWS CLI**

```powershell
aws cloudfront create-invalidation --distribution-id E2SM4EXV57KO8B --paths "/*" --region us-east-1
```

**Note:** CloudFront API is always in `us-east-1`, even if your distribution is global.

**Expected output:**
```json
{
    "Location": "https://cloudfront.amazonaws.com/...",
    "Invalidation": {
        "Id": "I2ABCDEFGHIJKL",
        "Status": "InProgress",
        ...
    }
}
```

### **4.2 Wait for Invalidation**

- Invalidation typically takes 1-5 minutes
- Check status in CloudFront Console → **Invalidations** tab
- Status will change from "InProgress" to "Completed"

---

## ✅ Step 5: Verify Deployment

### **5.1 Test CloudFront URL**

Open in browser:
```
https://d3loytcgioxpml.cloudfront.net
```

**Expected:**
- Frontend loads correctly
- No console errors
- API calls go to correct backend URL

### **5.2 Test Custom Domain (After DNS is Configured)**

Once DNS is configured in GoDaddy:
- `https://www.thegathrd.com`
- `https://app.thegathrd.com`

---

## 🔄 Step 6: Update Frontend After Backend Deployment

After Elastic Beanstalk is deployed and you have the backend URL:

### **6.1 Update `.env.production`**

```bash
REACT_APP_API_URL=https://api.thegathrd.com/api
```

### **6.2 Rebuild and Redeploy**

```powershell
cd frontend
npm run build
cd ..
aws s3 sync frontend/build/ s3://thegathrd-app-frontend/ --delete --region us-west-2
aws cloudfront create-invalidation --distribution-id E2SM4EXV57KO8B --paths "/*" --region us-east-1
```

---

## 📝 Deployment Script

Create `deploy-frontend.ps1` for easy deployment:

```powershell
# deploy-frontend.ps1
Write-Host "🚀 Building frontend..." -ForegroundColor Cyan
cd frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "📤 Uploading to S3..." -ForegroundColor Cyan
cd ..
aws s3 sync frontend/build/ s3://thegathrd-app-frontend/ --delete --region us-west-2
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Cyan
aws cloudfront create-invalidation --distribution-id E2SM4EXV57KO8B --paths "/*" --region us-east-1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Invalidation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
Write-Host "🌐 CloudFront URL: https://d3loytcgioxpml.cloudfront.net" -ForegroundColor Yellow
```

**Usage:**
```powershell
.\deploy-frontend.ps1
```

---

## 🐛 Troubleshooting

### **Build Fails**
- Check for TypeScript errors: `npm run build` will show errors
- Ensure all dependencies are installed: `npm install`
- Check Node.js version (should be 14+)

### **Upload Fails**
- Verify AWS CLI is configured: `aws configure list`
- Check S3 bucket name is correct
- Verify IAM permissions for S3 access

### **CloudFront Shows Old Content**
- Wait for invalidation to complete (1-5 minutes)
- Check invalidation status in CloudFront Console
- Try hard refresh (Ctrl+F5) in browser

### **Frontend Can't Connect to API**
- Verify `REACT_APP_API_URL` in `.env.production`
- Rebuild frontend after changing environment variables
- Check CORS settings on backend
- Verify backend is deployed and accessible

---

## 📊 File Sizes

After build, typical file sizes:
- `index.html`: ~1-5 KB
- `static/js/main.*.js`: ~200-500 KB (gzipped: ~50-150 KB)
- `static/css/main.*.css`: ~10-50 KB (gzipped: ~5-20 KB)

**Optimization tips:**
- Use code splitting for large components
- Lazy load routes
- Optimize images before adding to project

---

## ✅ Checklist

Before deploying:
- [ ] `.env.production` file created with correct API URL
- [ ] Dependencies installed (`npm install`)
- [ ] Build succeeds without errors
- [ ] `frontend/build/` directory contains files
- [ ] AWS CLI configured and working
- [ ] S3 bucket exists and is accessible
- [ ] CloudFront distribution is enabled

After deploying:
- [ ] Files uploaded to S3 successfully
- [ ] CloudFront invalidation completed
- [ ] Frontend loads at CloudFront URL
- [ ] No console errors in browser
- [ ] API calls work (after backend is deployed)

---

**Last Updated:** [Current Date]
**Version:** 1.0

