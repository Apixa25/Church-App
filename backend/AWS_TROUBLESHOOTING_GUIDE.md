# 🐛 AWS Elastic Beanstalk Troubleshooting Guide

This guide helps you diagnose and fix common issues with your Church App backend deployment on AWS Elastic Beanstalk.

---

## 🔍 Issue 1: Database Password Authentication Failure

### **Symptoms:**
- Error in logs: `FATAL: password authentication failed for user "church_user"`
- Application won't start
- NGINX shows "Connection refused" errors (because app isn't running)
- Health checks failing

### **Root Cause:**
The `DB_PASSWORD` environment variable in Elastic Beanstalk doesn't match the actual PostgreSQL database password, or the environment variable isn't set.

### **Solution:**

1. **Check Current Environment Variables:**
   - Go to AWS Console → Elastic Beanstalk → Your Environment
   - Click **Configuration** → **Software** → **Edit**
   - Look for these database-related variables:
     - `DB_HOST`
     - `DB_PORT` (usually `5432` for PostgreSQL)
     - `DB_NAME` (usually `church_app`)
     - `DB_USER` (usually `church_user`)
     - `DB_PASSWORD` ⚠️ **This is the critical one**

2. **Verify Database Password:**
   - Connect to your RDS PostgreSQL database
   - Check what the actual password is for user `church_user`
   - If you don't know the password, you may need to reset it

3. **Update Environment Variable:**
   - In Elastic Beanstalk Configuration → Software → Edit
   - Find `DB_PASSWORD` environment variable
   - Update it to match your actual database password
   - Click **Apply** (this will trigger a deployment)

4. **Verify All Database Variables Are Set:**
   ```
   DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=church_app
   DB_USER=church_user
   DB_PASSWORD=your-actual-password-here
   ```

5. **Monitor Deployment:**
   - Watch the Events tab for deployment progress
   - Check logs after deployment to verify connection succeeds
   - Look for: `Started ChurchAppApplication` (success indicator)

---

## 🔍 Issue 2: NGINX Upload Size Limit Errors

### **Symptoms:**
- Error in logs: `client intended to send too large body: X bytes`
- File uploads fail for files larger than ~1MB
- Profile picture/banner uploads fail

### **Root Cause:**
NGINX default `client_max_body_size` is 1MB, but your Spring Boot app allows up to 500MB.

### **Solution:**

We have **two configuration files** to handle this:

1. **`.ebextensions/02-nginx-upload-size.config`** (legacy approach, still works)
2. **`.platform/nginx/conf.d/upload-size.conf`** (modern approach, recommended)

Both should be included in your JAR deployment. The `.platform` approach is preferred for newer Elastic Beanstalk platform versions.

**To Apply the Fix:**

1. **Rebuild and Redeploy:**
   ```powershell
   cd backend
   .\mvnw.cmd clean package -DskipTests
   ```
   
2. **Deploy the new JAR:**
   - Go to Elastic Beanstalk → Upload and Deploy
   - Select the new JAR file
   - Deploy

3. **Verify Configuration Applied:**
   - After deployment, check logs
   - Try uploading a file larger than 1MB
   - Should no longer see "too large body" errors

**If Still Not Working:**

1. **SSH into your EC2 instance** (if you have access):
   ```bash
   # Check if configuration file exists
   cat /etc/nginx/conf.d/proxy.conf
   
   # Or check .platform directory
   cat /var/proxy/staging/nginx/conf.d/upload-size.conf
   
   # Test NGINX configuration
   sudo nginx -t
   
   # Reload NGINX manually
   sudo service nginx reload
   ```

2. **Check NGINX Error Logs:**
   - In Elastic Beanstalk → Logs
   - Download `/var/log/nginx/error.log`
   - Look for configuration errors

---

## 🔍 Issue 3: Application Not Starting (Connection Refused)

### **Symptoms:**
- NGINX error: `connect() failed (111: Connection refused) while connecting to upstream`
- Upstream: `http://127.0.0.1:5000`
- Health checks failing

### **Root Cause:**
The Spring Boot application isn't running on port 5000. This is usually because:
1. Application failed to start (database connection issue - see Issue 1)
2. Application crashed during startup
3. Wrong port configuration

### **Solution:**

1. **Check Application Logs:**
   - Go to Elastic Beanstalk → Logs
   - Download `/var/log/web.stdout.log`
   - Look for startup errors

2. **Common Causes:**
   - ❌ Database password wrong (see Issue 1)
   - ❌ Missing environment variables
   - ❌ Port mismatch (should be 5000 per `.ebextensions/01-environment.config`)

3. **Verify Port Configuration:**
   - Check `.ebextensions/01-environment.config` sets `PORT=5000`
   - Verify in Elastic Beanstalk Configuration → Software that `PORT=5000` is set
   - Application should listen on port 5000 (not 8083)

4. **Check Application Startup:**
   - Look for `Started ChurchAppApplication` in logs
   - If you see database errors, fix those first (Issue 1)
   - If you see other errors, address those

---

## 📋 Complete Environment Variables Checklist

Make sure these are all set in Elastic Beanstalk → Configuration → Software:

### **Database (Required):**
- ✅ `DB_HOST` - Your RDS endpoint
- ✅ `DB_PORT` - Usually `5432`
- ✅ `DB_NAME` - Usually `church_app`
- ✅ `DB_USER` - Usually `church_user`
- ✅ `DB_PASSWORD` - ⚠️ **Must match your RDS password**

### **Application:**
- ✅ `PORT` - Should be `5000`
- ✅ `SERVER_PORT` - Should be `5000`
- ✅ `SPRING_PROFILES_ACTIVE` - Should be `production`

### **JWT (Required for Authentication):**
- ✅ `JWT_SECRET` - Your secret key (256+ bits)

### **AWS (Required for File Uploads):**
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `AWS_REGION` - Usually `us-west-2`
- ✅ `AWS_S3_BUCKET` - Your S3 bucket name
- ✅ `AWS_CLOUDFRONT_DISTRIBUTION_URL` - Optional but recommended

### **OAuth (Required for Google Login):**
- ✅ `GOOGLE_CLIENT_ID`
- ✅ `GOOGLE_CLIENT_SECRET`
- ✅ `GOOGLE_REDIRECT_URI` - Should be `https://api.thegathrd.com/api/oauth2/callback/google`

### **CORS (Required):**
- ✅ `CORS_ORIGINS` - Your frontend domains
- ✅ `FRONTEND_URL` - Your frontend URL

---

## 🚀 Quick Fix Workflow

When you see errors in production:

1. **Download Logs:**
   - Elastic Beanstalk → Logs → Request Logs → Last 1000 lines
   - Download all logs

2. **Identify the Issue:**
   - Database password? → Fix Issue 1
   - Upload size? → Fix Issue 2
   - Connection refused? → Fix Issue 3

3. **Make Changes:**
   - Update environment variables if needed
   - Update code/configuration if needed
   - Rebuild JAR if code changed

4. **Redeploy:**
   - Upload new JAR
   - Monitor deployment
   - Verify fix worked

5. **Test:**
   - Test the specific feature that was broken
   - Check health endpoint
   - Monitor logs for a few minutes

---

## 📞 Still Having Issues?

If you're still stuck:

1. **Check AWS Documentation:**
   - [Elastic Beanstalk Java Platform](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/java-se-platform.html)
   - [NGINX Configuration](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.html)

2. **Review Your Logs:**
   - Look for the FIRST error (root cause)
   - Fix that first, then check if other errors resolve

3. **Verify Against Industry Standards:**
   - Check if your configuration matches AWS best practices
   - Verify NGINX configuration syntax
   - Ensure environment variables follow naming conventions

---

## ✅ Success Indicators

Your deployment is healthy when:

- ✅ Health status shows "Ok" (green)
- ✅ `/api/actuator/health` returns 200 OK
- ✅ No "Connection refused" errors in NGINX logs
- ✅ No "password authentication failed" errors
- ✅ No "too large body" errors for uploads
- ✅ Application logs show `Started ChurchAppApplication`
- ✅ Database queries succeed (check application logs)

---

**Remember:** Always fix the root cause first (usually database connection), then other issues often resolve themselves! 🎯

