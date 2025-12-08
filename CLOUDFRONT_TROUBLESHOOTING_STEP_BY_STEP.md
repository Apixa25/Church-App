# 🔍 CloudFront Troubleshooting: Step-by-Step

## Problem
Banner images still redirect to login page via CloudFront URL.

## Root Cause
CloudFront is routing media requests to the **frontend origin** instead of the **media-origin**.

---

## ✅ Step-by-Step Verification

### Step 1: Verify Bucket Policy Was Applied

1. Go to: https://console.aws.amazon.com/s3/
2. Click: `church-app-uploads-stevensills2`
3. Click: **"Permissions"** tab
4. Scroll to: **"Bucket policy"**
5. **Check:** Does it show the policy with `cloudfront.amazonaws.com`?

**Expected:** Policy should be visible and saved.

**If missing:** Apply the policy from `APPLY_S3_BUCKET_POLICY.md`

---

### Step 2: Verify CloudFront Behaviors Exist

1. Go to: https://console.aws.amazon.com/cloudfront/
2. Click your distribution: `E2SM4EXV57KO8B`
3. Click: **"Behaviors"** tab
4. **Check:** Do you see behaviors for:
   - `/banner-images/*`
   - `/profile-pictures/*`
   - `/posts/*`
   - `/thumbnails/*`
   - `/organization-logos/*`

**Expected:** Each media path should have its own behavior.

**If missing:** Create behaviors (see Step 3).

---

### Step 3: Verify Behavior Configuration

For each media behavior (e.g., `/banner-images/*`):

1. Click **"Edit"** on the behavior
2. **Check these settings:**
   - **Path pattern:** `/banner-images/*` (or appropriate path)
   - **Origin:** Should be `media-origin` (NOT `thegathrd-app-frontend`)
   - **Viewer protocol policy:** "Redirect HTTP to HTTPS" or "HTTPS only"
   - **Allowed HTTP methods:** "GET, HEAD" (or "GET, HEAD, OPTIONS")
   - **Cache policy:** "CachingOptimized" or "CachingDisabled" (for testing)

**Expected:** Origin should be `media-origin` for all media behaviors.

**If wrong:** Change origin to `media-origin` and save.

---

### Step 4: Verify Behavior Precedence (CRITICAL!)

**This is often the problem!**

1. In the **"Behaviors"** tab, look at the **"Precedence"** column
2. **Check:** Media behaviors (e.g., `/banner-images/*`) should have **LOWER precedence numbers** than `Default (*)`
3. **Example:**
   - `/banner-images/*` → Precedence: **0** ✅
   - `/profile-pictures/*` → Precedence: **1** ✅
   - `Default (*)` → Precedence: **10** ✅

**Expected:** Media behaviors have precedence 0-4, Default has precedence 10+.

**If wrong:** Use "Move up" / "Move down" buttons to reorder. Media behaviors must be **above** Default.

---

### Step 5: Verify CloudFront Deployment Status

1. In CloudFront console, look at the top of the distribution page
2. **Check:** "Last modified" status
3. **Expected:** Should show **"Deployed"** (green)

**If "Deploying...":** Wait 5-15 minutes for deployment to complete.

**If "Deployed":** Proceed to Step 6.

---

### Step 6: Test with Browser Developer Tools

1. Open browser developer tools (F12)
2. Go to **"Network"** tab
3. Try to load the banner image:
   ```
   https://d3loytcgioxpml.cloudfront.net/banner-images/originals/0bfc1879-dad8-4852-b684-7020dc7cab38.jpg
   ```
4. **Check the request:**
   - **Status:** Should be `200 OK` (not `302` or `403`)
   - **Content-Type:** Should be `image/jpeg` (not `text/html`)
   - **Response Headers:** Look for `X-Cache` header
     - `X-Cache: Hit from cloudfront` ✅
     - `X-Cache: Miss from cloudfront` ✅
     - `X-Cache: Error from cloudfront` ❌ (means origin issue)

**If still getting `text/html`:** CloudFront is still routing to frontend. Check behaviors again.

---

### Step 7: Verify Origin Access Control (OAC)

1. Go to CloudFront → Your Distribution → **"Origins"** tab
2. Find: `media-origin`
3. **Check:** "Origin access" column
4. **Expected:** Should show an OAC ID (e.g., `E1LHBYC7TMI4BS`)

**If shows "-" or "Public":** OAC is not configured. Edit origin and set OAC.

---

## 🎯 Most Common Issues

### Issue 1: Behavior Precedence Wrong
**Symptom:** Login page appears
**Fix:** Move media behaviors above `Default (*)` behavior

### Issue 2: Wrong Origin Selected
**Symptom:** Login page appears
**Fix:** Ensure media behaviors use `media-origin`, not `thegathrd-app-frontend`

### Issue 3: Bucket Policy Not Applied
**Symptom:** `X-Cache: Error from cloudfront`
**Fix:** Apply the bucket policy from CloudFront

### Issue 4: CloudFront Still Deploying
**Symptom:** Changes not taking effect
**Fix:** Wait for deployment to complete (5-15 minutes)

---

## 🚀 Quick Fix Checklist

- [ ] Bucket policy applied (with `cloudfront.amazonaws.com`)
- [ ] Behaviors exist for all media paths
- [ ] Behaviors use `media-origin` (not frontend)
- [ ] Media behaviors have lower precedence than `Default (*)`
- [ ] CloudFront shows "Deployed" status
- [ ] OAC configured on `media-origin`

---

**Once all checkboxes are ✅, the banner images should load!**

