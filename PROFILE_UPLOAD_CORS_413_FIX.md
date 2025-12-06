# 🔧 Profile Picture & Banner Upload Issues - CORS & 413 Fix

## 🚨 Issues Identified

### **Issue 1: CORS Error** ❌
```
Access to XMLHttpRequest at 'https://api.thegathrd.com/api/profile/me/upload-banner' 
from origin 'https://www.thegathrd.com' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root Cause:**
- Backend CORS configuration exists but isn't allowing `https://www.thegathrd.com`
- The `CORS_ORIGINS` environment variable may not be properly configured in Elastic Beanstalk
- Or the origin isn't in the allowed list

### **Issue 2: 413 Content Too Large** ❌
```
POST https://api.thegathrd.com/api/profile/me/upload-banner 
net::ERR_FAILED 413 (Content Too Large)
```

**Root Cause:**
- The 413 error happens **before** the request reaches Spring Boot
- This means NGINX or the load balancer is rejecting the request
- Current limits:
  - Spring Boot: 150MB (`spring.servlet.multipart.max-file-size=150MB`)
  - NGINX: 150MB (configured in `.ebextensions/02-nginx-upload-size.config`)
  - Image limit: 20MB (`media.upload.image.max-size=20971520`)

## ✅ Solutions

### **Solution 1: Fix CORS Configuration**

#### **Step 1: Verify CORS_ORIGINS Environment Variable in Elastic Beanstalk**

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select your environment (e.g., `church-app-api-prod`)
3. Go to **Configuration** → **Software** → **Environment Properties**
4. Find or add: **`CORS_ORIGINS`**
5. **Value should be** (comma-separated, NO spaces after commas):
   ```
   https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com
   ```

6. Click **Apply**
7. Wait for environment update (2-5 minutes)

#### **Step 2: Verify CORS Configuration in SecurityConfig**

The backend code already has CORS configured in `SecurityConfig.java`:
- ✅ Reads from `CORS_ORIGINS` environment variable
- ✅ Allows credentials
- ✅ Allows all HTTP methods
- ✅ Default fallback includes production origins

**If the environment variable isn't set**, it will use the fallback from `application-production.properties`:
```properties
cors.allowed-origins=${CORS_ORIGINS:https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com}
```

**But the issue is:** If the environment variable is set but empty or malformed, CORS will fail.

#### **Step 3: Check Current Environment Variable**

You can check what's currently set by:
1. Looking at Elastic Beanstalk logs
2. Or temporarily adding a logging statement to see what origins are being used

### **Solution 2: Fix 413 Content Too Large Error**

#### **Problem Analysis:**

The 413 error happens at the **network/proxy level**, not in Spring Boot. This means:

1. **NGINX** might not be configured correctly
2. **Elastic Beanstalk Load Balancer** might have a limit
3. **Application Load Balancer (ALB)** has a default limit

#### **Current Configuration:**

✅ **Spring Boot** (`application.properties`):
```properties
spring.servlet.multipart.max-file-size=150MB
spring.servlet.multipart.max-request-size=150MB
```

✅ **NGINX** (`.ebextensions/02-nginx-upload-size.config`):
```
client_max_body_size 150M;
```

❌ **Issue:** The `.ebextensions` file might not be deployed or NGINX config isn't being applied.

#### **Fix Options:**

**Option A: Verify NGINX Configuration is Applied** ✅ **RECOMMENDED**

1. **Check if the `.ebextensions` file is in the JAR:**
   ```powershell
   cd backend
   .\mvnw.cmd clean package -DskipTests
   # Verify .ebextensions folder is in target/classes/
   ```

2. **Verify the file structure:**
   ```
   backend/
   ├── .ebextensions/
   │   └── 02-nginx-upload-size.config  ✅ Should exist
   └── src/
   ```

3. **After deploying, check NGINX config on the server:**
   - SSH into Elastic Beanstalk instance (if possible)
   - Or check Elastic Beanstalk logs for NGINX errors

**Option B: Add Application Load Balancer Configuration** 

If using ALB, you might need to increase ALB timeout, but ALB doesn't have a body size limit - it's usually NGINX or the backend.

**Option C: Verify File Size**

Check what size file is being uploaded:
- Banner images should be reasonable (ideally < 5MB)
- If file is > 150MB, that's the problem
- If file is < 150MB but still getting 413, it's a config issue

### **Solution 3: Add Client-Side File Size Validation** 🛡️

Add file size check **before** upload to give users a better error message:

**Location:** `frontend/src/components/ProfileEdit.tsx`

Add validation before upload:
```typescript
const MAX_BANNER_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PROFILE_PIC_SIZE = 20 * 1024 * 1024; // 20MB

if (bannerImageFile && bannerImageFile.size > MAX_BANNER_SIZE) {
  setError(`Banner image is too large. Maximum size is ${MAX_BANNER_SIZE / 1024 / 1024}MB.`);
  return;
}
```

## 🧪 Testing Steps

### **After Fixing CORS:**

1. **Check browser console** - CORS errors should be gone
2. **Check Network tab** - Look for OPTIONS preflight request
3. **Verify response headers** include:
   - `Access-Control-Allow-Origin: https://www.thegathrd.com`
   - `Access-Control-Allow-Credentials: true`

### **After Fixing 413:**

1. **Try uploading a small image** (< 1MB) - should work
2. **Try uploading a medium image** (5-10MB) - should work
3. **Try uploading a large image** (15-20MB) - should work
4. **If 413 still happens**, check:
   - NGINX logs in Elastic Beanstalk
   - Spring Boot logs for actual error
   - File size being uploaded

## 📋 Action Items

### **Immediate Actions:**

1. ✅ **Verify `CORS_ORIGINS` environment variable** in Elastic Beanstalk
   - Should include: `https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com`
   - **NO spaces after commas!**

2. ✅ **Verify `.ebextensions/02-nginx-upload-size.config` is in JAR**
   - Check if file exists in backend directory
   - Rebuild JAR if needed
   - Redeploy if NGINX config isn't being applied

3. ✅ **Check current file size limits**
   - Image limit: 20MB (code level)
   - Spring Boot limit: 150MB
   - NGINX limit: 150MB (should be)

### **If Issues Persist:**

1. **Check Elastic Beanstalk logs:**
   - Go to Elastic Beanstalk Console → Your Environment → Logs
   - Request logs might show the actual error

2. **Check NGINX configuration:**
   - The `.ebextensions` file should configure NGINX
   - If it's not working, might need to SSH in and check manually

3. **Consider increasing limits temporarily:**
   - If banner images need to be larger, increase the limits
   - But first, optimize images client-side (compress before upload)

## 🔍 Debugging Commands

### **Check CORS Headers:**
```bash
curl -H "Origin: https://www.thegathrd.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.thegathrd.com/api/profile/me/upload-banner \
     -v
```

Should return:
```
Access-Control-Allow-Origin: https://www.thegathrd.com
Access-Control-Allow-Credentials: true
```

### **Check Upload Endpoint:**
```bash
# Test with a small file
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@small-image.jpg" \
     https://api.thegathrd.com/api/profile/me/upload-banner \
     -v
```

## 📝 Summary

**Two main issues:**
1. **CORS** - Environment variable needs to be set correctly
2. **413 Error** - NGINX configuration might not be applied

**Priority fixes:**
1. ✅ Set `CORS_ORIGINS` in Elastic Beanstalk environment variables
2. ✅ Verify `.ebextensions` file is in JAR and being deployed
3. ✅ Rebuild and redeploy backend if NGINX config isn't applied
4. ✅ Add client-side file size validation for better UX

---

**Last Updated:** 2025-12-06  
**Status:** Needs production environment variable verification and potential NGINX config fix
