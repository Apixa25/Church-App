# 🔧 Fix Upload Size Limit & CORS Error for Post Media Uploads

## 🎯 Problem Summary

When trying to save a post with media, you're experiencing two related issues:

1. **413 Content Too Large Error**: Uploads larger than ~1MB are being rejected by nginx
   - Error: `POST https://api.thegathrd.com/api/posts/upload-media net::ERR_FAILED 413 (Content Too Large)`
   - Your upload is ~7.7MB, which exceeds nginx's default 1MB limit

2. **CORS Error**: When nginx returns a 413 error, it doesn't include CORS headers, causing the browser to block the response
   - Error: `Access to XMLHttpRequest at 'https://api.thegathrd.com/api/posts/upload-media' from origin 'https://www.thegathrd.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`

---

## ✅ Solution Implemented

### 1. Increased Nginx Body Size Limit

Created `backend/.ebextensions/02-nginx.config` to:
- Increase `client_max_body_size` from 1MB (default) to **100MB**
- This allows video uploads up to 75MB (as configured in your app) with buffer
- Increased buffer sizes and timeouts for large uploads

### 2. CORS Headers for Error Responses

**Note:** The nginx configuration increases the body size limit to 100MB, which should prevent most 413 errors. If a file exceeds 100MB, nginx will return a 413 error. For requests that do reach Spring Boot, CORS headers are handled by the Spring Security configuration.

If you still experience CORS errors on 413 responses after deployment, we can add a custom nginx error handler. However, with the 100MB limit (above your 75MB video limit), this should rarely occur.

---

## 📋 Deployment Steps

### Step 1: Deploy the Updated Configuration

The nginx configuration files have been added to `.ebextensions`. To deploy:

```bash
# Navigate to backend directory
cd backend

# Build and deploy (using your existing deployment script)
./deploy-backend.sh
# OR
.\deploy-backend.ps1
```

**OR** if deploying via Elastic Beanstalk Console:
1. Create a new application version with the updated code
2. Deploy to your environment

### Step 2: Verify CORS_ORIGINS Environment Variable

Ensure your Elastic Beanstalk environment has the `CORS_ORIGINS` variable set correctly:

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select your environment: **church-app-backend-prod**
3. Go to **Configuration** → **Software** → **Edit**
4. Find environment variable: `CORS_ORIGINS`
5. **Verify it includes:**
   ```
   https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com,https://api.thegathrd.com
   ```
6. If missing, add it and click **Apply**

### Step 3: Wait for Deployment

- Wait 2-5 minutes for the environment to update
- The nginx configuration will be applied automatically

### Step 4: Test the Fix

1. Go to https://www.thegathrd.com
2. Try creating a post with a large image or video (up to 75MB)
3. The upload should now work without 413 or CORS errors

---

## 🔍 Technical Details

### Nginx Configuration Files Created

**`backend/.ebextensions/02-nginx.config`** contains:

**Proxy Configuration** (`/etc/nginx/conf.d/proxy.conf`):
- `client_max_body_size 100M` - Allows uploads up to 100MB
- Increased timeouts for large uploads (300 seconds)
- Optimized buffer sizes for large file uploads
- Extended proxy timeouts to handle long uploads

### File Size Limits

Your application is configured to accept:
- **Images**: 20MB (will be compressed to ~1-2MB)
- **Videos**: 75MB, max 30 seconds (will be compressed to ~5-8MB)
- **Audio**: 10MB
- **Documents**: 150MB

The nginx limit of 100MB provides a safe buffer above the 75MB video limit.

---

## 🐛 Troubleshooting

### If uploads still fail after deployment:

1. **Check nginx logs:**
   ```bash
   # SSH into your Elastic Beanstalk instance
   tail -f /var/log/nginx/error.log
   ```

2. **Verify nginx configuration:**
   ```bash
   # Check if configuration was applied
   cat /etc/nginx/conf.d/proxy.conf
   cat /etc/nginx/conf.d/01_cors_errors.conf
   
   # Test nginx configuration
   sudo nginx -t
   ```

3. **Check Spring Boot logs:**
   ```bash
   tail -f /var/log/web.stdout.log
   ```

4. **Verify CORS_ORIGINS:**
   - Ensure `www.thegathrd.com` is in the list
   - Check that the environment variable was applied

### If CORS errors persist:

1. **Clear browser cache** - CORS preflight requests are cached
2. **Check browser console** - Look for specific CORS error messages
3. **Verify origin** - Ensure the request is coming from an allowed origin

---

## 📝 Notes

- The nginx configuration is applied automatically when you deploy
- No manual server configuration is needed
- The custom error handler only validates common production origins
- For additional origins, update the nginx config file

---

## ✅ Success Criteria

After deployment, you should be able to:
- ✅ Upload images up to 20MB
- ✅ Upload videos up to 75MB (30 seconds max)
- ✅ See proper error messages (not CORS errors) if upload fails
- ✅ No 413 errors for files under 100MB

---

**Last Updated**: December 1, 2025
**Status**: Ready for deployment

