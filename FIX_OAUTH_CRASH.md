# 🔧 Fix OAuth Login Crash

## Problem
After selecting a Google account, the page crashes/goes dead. This happens because the backend is redirecting to `localhost:3000` instead of the production frontend URL.

---

## ✅ Solution: Add FRONTEND_URL Environment Variable

### Step 1: Go to Elastic Beanstalk
1. AWS Console → **Elastic Beanstalk**
2. Region: **us-west-2**
3. Select environment: **church-app-backend-prod**

### Step 2: Add FRONTEND_URL Environment Variable
1. Go to **Configuration** → **Software** → **Edit**
2. Click **Add environment variable**
3. Configure:
   - **Name**: `FRONTEND_URL`
   - **Value**: `https://d3loytcgioxpml.cloudfront.net`
4. Click **Apply**
5. Wait 2-5 minutes for environment to update

### Step 3: Deploy Updated Backend JAR
1. Go to **Elastic Beanstalk** → **church-app-backend-prod**
2. Click **Upload and Deploy**
3. Upload the new JAR file:
   - Location: `backend/target/church-app-backend-0.0.1-SNAPSHOT.jar`
4. Click **Deploy**
5. Wait 5-10 minutes for deployment

---

## 🔍 What Was Fixed

### Before:
- OAuth success handler was hardcoded to redirect to `http://localhost:3000`
- This caused the page to crash in production

### After:
- OAuth success handler now uses `FRONTEND_URL` environment variable
- Defaults to `localhost:3000` for development
- Uses CloudFront URL in production: `https://d3loytcgioxpml.cloudfront.net`
- All URL parameters are properly URL-encoded

---

## 📝 Code Changes

1. **AuthController.java**:
   - Added `@Value("${frontend.url:http://localhost:3000}")` to inject frontend URL
   - Updated `handleOAuth2Success()` to use `frontendUrl` instead of hardcoded localhost
   - Updated `handleOAuth2Failure()` to use `frontendUrl`
   - Added URL encoding for all parameters

2. **application.properties**:
   - Added `frontend.url=${FRONTEND_URL:http://localhost:3000}`

3. **application-production.properties**:
   - Added `frontend.url=${FRONTEND_URL:https://d3loytcgioxpml.cloudfront.net}`

---

## ✅ After Deployment

1. **Wait for environment to update** (2-5 minutes)
2. **Wait for JAR deployment** (5-10 minutes)
3. **Test OAuth login:**
   - Go to: https://d3loytcgioxpml.cloudfront.net/login
   - Click "Continue with Google"
   - Select your Google account
   - Should redirect back to frontend with authentication token
   - Should NOT crash!

---

## 🎯 Quick Checklist

- [ ] Added `FRONTEND_URL` environment variable to Elastic Beanstalk
- [ ] Set value to: `https://d3loytcgioxpml.cloudfront.net`
- [ ] Saved configuration (waited 2-5 minutes)
- [ ] Deployed new JAR file to Elastic Beanstalk
- [ ] Waited for deployment to complete (5-10 minutes)
- [ ] Tested OAuth login - should work now!

---

## 🔄 OAuth Flow (After Fix)

1. User clicks "Continue with Google"
2. Redirects to: `https://api.thegathrd.com/api/oauth2/authorization/google`
3. User selects Google account
4. Google redirects to: `https://api.thegathrd.com/api/oauth2/callback/google`
5. Backend processes OAuth and redirects to: `https://d3loytcgioxpml.cloudfront.net/auth/callback?token=...`
6. Frontend `AuthCallback` component handles the callback
7. User is logged in and redirected to dashboard ✅

---

**After adding the environment variable and deploying, OAuth login should work perfectly!** 🎉

