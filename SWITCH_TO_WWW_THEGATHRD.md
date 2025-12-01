# 🌐 Switch to Custom Domain: www.thegathrd.com

## 🎉 Great News!

OAuth is working! Now let's switch from CloudFront URL (`d3loytcgioxpml.cloudfront.net`) to your custom domain `www.thegathrd.com`.

---

## 📋 Step-by-Step Guide

### **Step 1: Verify/Configure CloudFront Distribution** ⚙️

#### 1.1 Check Current CloudFront Configuration
1. **Go to:** AWS Console → **CloudFront**
2. **Select distribution:** `E2SM4EXV57KO8B`
3. **Click:** "General" tab
4. **Check:** "Alternate domain names (CNAMEs)"
   - ✅ If `www.thegathrd.com` is listed → Skip to Step 2
   - ❌ If not listed → Continue to 1.2

#### 1.2 Add Custom Domain to CloudFront
1. **Click:** "Edit" button (top right)
2. **Scroll to:** "Alternate domain names (CNAMEs)"
3. **Click:** "Add item"
4. **Enter:** `www.thegathrd.com`
5. **Scroll to:** "Custom SSL certificate"
6. **Select:** `*.thegathrd.com` (your validated certificate)
7. **Click:** "Save changes"
8. **Wait:** 5-15 minutes for distribution to update

---

### **Step 2: Update Environment Variables in Elastic Beanstalk** 🔧

#### 2.1 Update FRONTEND_URL
1. **Go to:** AWS Console → **Elastic Beanstalk**
2. **Select:** `church-app-backend-prod`
3. **Click:** **Configuration** → **Software** → **Edit**
4. **Find:** `FRONTEND_URL`
5. **Change from:** `https://d3loytcgioxpml.cloudfront.net` (or `https://d3loytcgioxpml.cloudfront.net/`)
6. **Change to:** `https://www.thegathrd.com` (no trailing slash!)
7. **Click:** **Apply**
8. **Wait:** 2-5 minutes for environment to update

#### 2.2 Update CORS_ORIGINS (Optional - Keep CloudFront for now)
1. **In same page:** Find `CORS_ORIGINS`
2. **Current value:** `https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com`
3. **Verify:** `https://www.thegathrd.com` is already included ✅
4. **Optional:** Remove `https://d3loytcgioxpml.cloudfront.net` if you want (but keeping it won't hurt)
5. **Click:** **Apply**

---

### **Step 3: Update Google OAuth Settings** 🔐

#### 3.1 Go to Google Cloud Console
1. **Go to:** https://console.cloud.google.com/
2. **Select your project**
3. **Navigate:** **APIs & Services** → **Credentials**
4. **Click on your OAuth 2.0 Client ID**

#### 3.2 Update Authorized JavaScript Origins
1. **Find:** "Authorized JavaScript origins"
2. **Verify:** `https://www.thegathrd.com` is listed
   - ✅ If listed → Skip
   - ❌ If not listed → Click "Add URI" → Enter `https://www.thegathrd.com` → Save

#### 3.3 Verify Authorized Redirect URIs
1. **Find:** "Authorized redirect URIs"
2. **Verify:** `https://api.thegathrd.com/api/oauth2/callback/google` is listed ✅
3. **Should already be correct!**

---

### **Step 4: Update DNS Records in GoDaddy** 🌐

#### 4.1 Add CNAME Record for www
1. **Go to:** GoDaddy.com → **My Products**
2. **Find:** `thegathrd.com` → **DNS** → **Manage DNS**
3. **Click:** **Add** (or **Edit** if record exists)
4. **Type:** `CNAME`
5. **Name:** `www`
6. **Value:** `d3loytcgioxpml.cloudfront.net` (your CloudFront distribution domain)
7. **TTL:** `600` (or default)
8. **Click:** **Save**

#### 4.2 Verify DNS Propagation
1. **Wait:** 5-30 minutes for DNS to propagate
2. **Test:** Open PowerShell and run:
   ```powershell
   nslookup www.thegathrd.com
   ```
3. **Expected:** Should resolve to CloudFront distribution

---

### **Step 5: Update Frontend Configuration** (If Needed) 📝

The frontend uses `REACT_APP_API_URL` environment variable, which should already be set to `https://api.thegathrd.com/api` ✅

**No changes needed** unless you want to update any hardcoded references.

---

### **Step 6: Test Everything** ✅

#### 6.1 Test Custom Domain Access
1. **Wait:** 15-30 minutes after DNS update
2. **Open:** `https://www.thegathrd.com`
3. **Expected:** Should load your app (same as CloudFront URL)

#### 6.2 Test OAuth Login
1. **Go to:** `https://www.thegathrd.com/login`
2. **Click:** "Continue with Google"
3. **Select:** Your Google account
4. **Expected:** Should redirect to `https://www.thegathrd.com/auth/callback?token=...`
5. **Result:** Should log you in successfully! 🎉

#### 6.3 Test API Calls
1. **After login:** Check browser console (F12)
2. **Look for:** Any CORS errors
3. **Expected:** All API calls should work (they go to `api.thegathrd.com`)

---

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] `https://www.thegathrd.com` loads the app
- [ ] OAuth login works with `www.thegathrd.com`
- [ ] No CORS errors in browser console
- [ ] All API calls work correctly
- [ ] Dashboard loads after login

---

## ⚠️ Important Notes

1. **DNS Propagation:** Can take 5-30 minutes (sometimes up to 48 hours)
2. **CloudFront Update:** Takes 5-15 minutes after adding custom domain
3. **Elastic Beanstalk Update:** Takes 2-5 minutes after changing environment variables
4. **Keep CloudFront URL:** You can keep using `d3loytcgioxpml.cloudfront.net` as backup until DNS propagates

---

## 🎯 Quick Summary

1. ✅ **CloudFront:** Add `www.thegathrd.com` to alternate domain names
2. ✅ **Elastic Beanstalk:** Update `FRONTEND_URL` to `https://www.thegathrd.com`
3. ✅ **Google OAuth:** Verify `https://www.thegathrd.com` is in authorized origins
4. ✅ **GoDaddy DNS:** Add CNAME `www` → `d3loytcgioxpml.cloudfront.net`
5. ✅ **Test:** Try `https://www.thegathrd.com/login` and test OAuth

---

## 🚀 Ready to Start?

Let's begin with **Step 1** - checking/updating CloudFront! 🎉
