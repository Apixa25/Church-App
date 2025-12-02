# ☁️ CloudFront Cache Invalidation - Quick Steps

## 🚨 **IMPORTANT: Do This Now!**

After deploying the new frontend build, you **MUST** invalidate the CloudFront cache. Otherwise, users will still see the old version with localhost!

---

## 📝 **Step-by-Step Instructions**

### **Step 1: Go to CloudFront Console**

1. Open your browser
2. Go to: **https://console.aws.amazon.com/cloudfront/**

### **Step 2: Find Your Distribution**

1. Look for the distribution serving `www.thegathrd.com`
2. You'll see it in the list with domain names like:
   - `d3loytcgioxpml.cloudfront.net`
   - Or `www.thegathrd.com` in the aliases

### **Step 3: Create Invalidation**

1. **Click on your distribution** (the one for www.thegathrd.com)
2. Go to the **"Invalidations"** tab (at the top)
3. Click **"Create invalidation"** button
4. In the **"Object paths"** field, enter: `/*`
   - This invalidates ALL files in the distribution
5. Click **"Create invalidation"**

### **Step 4: Wait for Completion**

- Status will show **"In Progress"**
- Usually takes **1-2 minutes**
- Wait until status shows **"Completed"**
- You'll see a green checkmark ✅

### **Step 5: Clear Browser Cache & Test**

1. **Hard refresh your browser:**
   - Press `Ctrl + Shift + R` (Windows/Linux)
   - Or `Ctrl + F5`
   - Or open in **Incognito/Private mode**

2. **Go to:** `https://www.thegathrd.com`

3. **Open Developer Console:** Press `F12`

4. **Check the console output:**
   - ✅ Should see: `🔌 WebSocket Service initialized with URL: https://api.thegathrd.com/api/ws`
   - ❌ Should NOT see: `http://localhost:8083/api/ws`

5. **Check Network tab:**
   - ✅ All API calls should go to: `https://api.thegathrd.com/api/...`
   - ❌ Should NOT see: `http://localhost:8083/api/...`

---

## ✅ **Success Indicators**

After invalidation and cache clear, you should see:

- ✅ Console shows production API URL
- ✅ No localhost references
- ✅ Google login works
- ✅ API calls go to AWS backend
- ✅ Data comes from AWS, not local server

---

## 🎯 **Quick Summary**

**What invalidation does:**
- Tells CloudFront to delete cached copies of your files
- Forces CloudFront to fetch fresh files from S3
- Users get the new version within 1-2 minutes

**Why it's critical:**
- Without invalidation, users see old cached version
- Old version still has localhost hardcoded
- New version has production URL embedded

---

**Time to complete:** ~2-3 minutes total

**Ready?** Go invalidate that cache! 🚀

