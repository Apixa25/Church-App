# ⚡ Quick CloudFront Check (5 Minutes)

## The Problem
Banner images redirect to login page = CloudFront routing to **frontend** instead of **media-origin**.

## 🎯 Most Likely Fix: Behavior Precedence

### Step 1: Check Behaviors Tab
1. Go to: https://console.aws.amazon.com/cloudfront/
2. Click: Distribution `E2SM4EXV57KO8B`
3. Click: **"Behaviors"** tab

### Step 2: Verify Behavior Order
**Look at the "Precedence" column:**

```
✅ CORRECT ORDER:
   Precedence 0: /banner-images/*
   Precedence 1: /profile-pictures/*
   Precedence 2: /posts/*
   Precedence 3: /thumbnails/*
   Precedence 10: Default (*)  ← Must be LAST
```

**❌ WRONG ORDER:**
```
   Precedence 0: Default (*)  ← This catches everything first!
   Precedence 1: /banner-images/*
```

### Step 3: Fix Precedence (If Wrong)
1. Select the `Default (*)` behavior
2. Click **"Move down"** until it's at the bottom
3. OR select media behaviors and click **"Move up"** until they're at the top
4. Click **"Save changes"**

### Step 4: Verify Each Media Behavior
For `/banner-images/*` behavior:
- **Origin:** Must be `media-origin` (NOT `thegathrd-app-frontend`)
- **Path pattern:** `/banner-images/*`
- **Precedence:** Lower number than `Default (*)`

### Step 5: Wait for Deployment
- CloudFront shows "Deploying..." → Wait 5-15 minutes
- Once "Deployed" → Test again

---

## 🔍 Alternative: Missing Behavior

If `/banner-images/*` behavior doesn't exist:

1. Click **"Create behavior"**
2. **Path pattern:** `/banner-images/*`
3. **Origin:** Select `media-origin`
4. **Viewer protocol policy:** "Redirect HTTP to HTTPS"
5. **Allowed HTTP methods:** "GET, HEAD"
6. **Cache policy:** "CachingOptimized"
7. Click **"Create behavior"**
8. **IMPORTANT:** Use "Move up" to ensure it's above `Default (*)`

---

## ✅ Quick Test After Fix

1. Wait for CloudFront to show "Deployed"
2. Open incognito browser
3. Try: `https://d3loytcgioxpml.cloudfront.net/banner-images/originals/0bfc1879-dad8-4852-b684-7020dc7cab38.jpg`
4. Should see image (not login page)

---

**99% of the time, it's the behavior precedence!** 🎯

