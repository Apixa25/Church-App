# 🔧 CloudFront Configuration for Prayer Request Images

## The Problem
CloudFront doesn't have a behavior configured for `/prayer-requests/originals/*` and `/prayer-requests/optimized/*` paths, so requests are routing to the wrong origin (probably your frontend app instead of S3).

## Solution: Add CloudFront Behaviors

### Step 1: Go to CloudFront Distribution
1. Open AWS Console → CloudFront
2. Find your distribution: `E2SM4EXV57KO8B` (or search for `d3loytcgioxpml.cloudfront.net`)
3. Click on the distribution ID to open it

### Step 2: Go to Behaviors Tab
1. Click on the **"Behaviors"** tab
2. You should see existing behaviors (like `/profile-pictures/*`, `/banner-images/*`, etc.)

### Step 3: Create New Behavior for Prayer Requests Originals

Click **"Create behavior"** and configure:

**Path pattern:**
```
/prayer-requests/originals/*
```

**Origin and origin groups:**
- Select: `media-origin` (your S3 bucket origin)

**Viewer protocol policy:**
- Select: `Redirect HTTP to HTTPS` (or `HTTPS Only`)

**Allowed HTTP methods:**
- Select: `GET, HEAD, OPTIONS`

**Cache policy:**
- Select: `CachingOptimized` (or your existing cache policy)

**Origin request policy:**
- Select: `CORS-S3Origin` (or your existing origin request policy)

**Response headers policy:**
- Select: `CORS-With-Preflight` (or your existing response headers policy)

**Compress objects automatically:**
- ✅ Yes (recommended)

Click **"Create behavior"**

### Step 4: Create New Behavior for Prayer Requests Optimized

Click **"Create behavior"** again and configure:

**Path pattern:**
```
/prayer-requests/optimized/*
```

**Origin and origin groups:**
- Select: `media-origin` (your S3 bucket origin)

**Viewer protocol policy:**
- Select: `Redirect HTTP to HTTPS` (or `HTTPS Only`)

**Allowed HTTP methods:**
- Select: `GET, HEAD, OPTIONS`

**Cache policy:**
- Select: `CachingOptimized` (or your existing cache policy)

**Origin request policy:**
- Select: `CORS-S3Origin` (or your existing origin request policy)

**Response headers policy:**
- Select: `CORS-With-Preflight` (or your existing response headers policy)

**Compress objects automatically:**
- ✅ Yes (recommended)

Click **"Create behavior"**

### Step 5: Verify Behavior Order

**IMPORTANT:** CloudFront processes behaviors in order (most specific first). Make sure your new behaviors are ordered correctly:

1. `/prayer-requests/originals/*` (most specific)
2. `/prayer-requests/optimized/*` (most specific)
3. `/profile-pictures/*` (if exists)
4. `/banner-images/*` (if exists)
5. `*` (default/catch-all - should be last)

If the order is wrong:
- Select a behavior
- Click **"Move up"** or **"Move down"** to reorder

### Step 6: Wait for Deployment

1. CloudFront will show status: **"Deploying"**
2. Wait 5-15 minutes for deployment to complete
3. Status will change to **"Deployed"**

### Step 7: Test the URLs

After deployment, test these URLs in your browser:

**Original image:**
```
https://d3loytcgioxpml.cloudfront.net/prayer-requests/originals/ee8dc596-9ad6-4d34-b28c-3840f9ddb118.jpg
```

**Optimized image:**
```
https://d3loytcgioxpml.cloudfront.net/prayer-requests/optimized/e8e24a66-c22d-49ac-bcc8-4a7606d1fcae.jpg
```

**Expected result:**
- ✅ Image displays (Content-Type: `image/jpeg`)
- ❌ NOT HTML page (Content-Type: `text/html`)

## Troubleshooting

### If images still don't load:

1. **Check S3 bucket permissions:**
   - Go to S3 → `church-app-uploads-stevensills2` → Permissions
   - Verify bucket policy allows CloudFront access
   - Verify `media-origin` has Origin Access Control (OAC) configured

2. **Check CloudFront origin:**
   - Go to CloudFront → Origins tab
   - Find `media-origin`
   - Verify it points to: `church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com`
   - Verify it has OAC configured

3. **Check behavior order:**
   - More specific paths (`/prayer-requests/originals/*`) must come BEFORE less specific paths (`*`)

4. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

5. **Check CloudFront logs:**
   - Enable CloudFront access logs if needed
   - Check for 403/404 errors

## Quick Reference

**Distribution ID:** `E2SM4EXV57KO8B`  
**CloudFront Domain:** `d3loytcgioxpml.cloudfront.net`  
**S3 Bucket:** `church-app-uploads-stevensills2`  
**S3 Region:** `us-west-2`  
**Origin Name:** `media-origin`

## After Configuration

Once CloudFront is configured, the images should load automatically. The fallback to S3 direct URLs will still work as a backup, but CloudFront should be the primary method.

