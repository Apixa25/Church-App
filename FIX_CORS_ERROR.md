# 🔧 Fix CORS Error - CloudFront Domain

## Problem
```
Access to XMLHttpRequest at 'https://api.thegathrd.com/api/...' from origin 'https://d3loytcgioxpml.cloudfront.net' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

The backend is not allowing requests from the CloudFront domain.

---

## ✅ Solution: Update CORS_ORIGINS Environment Variable

### Step 1: Go to Elastic Beanstalk
1. AWS Console → **Elastic Beanstalk**
2. Region: **us-west-2**
3. Select environment: **church-app-backend-prod**

### Step 2: Update CORS_ORIGINS
1. Go to **Configuration** → **Software** → **Edit**
2. Find environment variable: `CORS_ORIGINS`
3. **Update the value** to include CloudFront domain:

   **Current (if exists):**
   ```
   https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com
   ```

   **New (add CloudFront domain):**
   ```
   https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com,https://d3loytcgioxpml.cloudfront.net
   ```

   **Or if CORS_ORIGINS doesn't exist yet, add it:**
   ```
   https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com,https://d3loytcgioxpml.cloudfront.net
   ```

4. Click **Apply**
5. Wait 2-5 minutes for environment to update

---

## 🔍 Why This Happened

The CORS configuration was using `*` (allow all origins), but when `allowCredentials` is set to `true`, Spring Security requires **exact origins** to be specified. The backend code has been updated to read from the `CORS_ORIGINS` environment variable, but the CloudFront domain wasn't included.

---

## ✅ After Update

1. **Wait for environment to update** (2-5 minutes)
2. **Test the app:**
   - Go to: https://d3loytcgioxpml.cloudfront.net/login
   - Try to log in
   - CORS errors should be gone!

---

## 📝 Complete CORS_ORIGINS Value

For production, use this complete value:

```
https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com,https://d3loytcgioxpml.cloudfront.net
```

**Important:**
- ✅ No spaces after commas
- ✅ All domains must be HTTPS (except localhost for development)
- ✅ Include all domains where the frontend will be accessed

---

## 🎯 Quick Checklist

- [ ] Go to Elastic Beanstalk → Configuration → Software
- [ ] Find or add `CORS_ORIGINS` environment variable
- [ ] Update value to include `https://d3loytcgioxpml.cloudfront.net`
- [ ] Click Apply
- [ ] Wait 2-5 minutes
- [ ] Test the app - CORS errors should be gone!

---

## 🔄 Code Changes Made

The backend `SecurityConfig.java` has been updated to:
- ✅ Read CORS origins from `cors.allowed-origins` property
- ✅ Parse comma-separated list from environment variable
- ✅ Use exact origins (not `*`) when credentials are allowed
- ✅ Support both development and production origins

---

**After updating the environment variable, the CORS errors will be resolved!** 🎉

