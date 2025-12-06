# 🧪 Testing & Deployment Workflow

This guide shows you how to **test thoroughly locally** before deploying, and how to **access Elastic Beanstalk logs** to debug production issues.

---

## 🎯 The Problem

- Deployed JAR file might be hanging
- Need to test locally first
- Need to see Elastic Beanstalk logs to debug

---

## ✅ Part 1: Local Testing (Before Deployment)

### **Step 1: Set Up Local Environment**

1. **Add CloudFront URL to local `.env.local` file:**

```powershell
cd backend

# Check if .env.local exists
Test-Path .env.local

# If it doesn't exist, create it or add the CloudFront URL
# Add this line to your .env.local file:
# AWS_CLOUDFRONT_DISTRIBUTION_URL=https://d3loytcgioxpml.cloudfront.net
```

2. **Load environment variables:**

```powershell
. .\load-env.ps1
```

3. **Verify CloudFront URL is loaded:**

```powershell
$env:AWS_CLOUDFRONT_DISTRIBUTION_URL
# Should show: https://d3loytcgioxpml.cloudfront.net
```

### **Step 2: Start Backend Locally**

```powershell
.\mvnw.cmd spring-boot:run
```

**Watch for errors:**
- ✅ Success: `Started ChurchAppApplication in X seconds`
- ❌ Error: Any red error messages (note them down!)

### **Step 3: Test File Upload & CloudFront URL Generation**

#### **Test 1: Generate Presigned Upload URL**

```powershell
# Using PowerShell (or use Postman/curl)
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_JWT_TOKEN"
}

$body = @{
    fileName = "test-video.mp4"
    contentType = "video/mp4"
    fileSize = 10485760  # 10MB
    folder = "posts"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8083/api/posts/generate-upload-url" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

**Expected response:**
```json
{
  "presignedUrl": "https://...",
  "s3Key": "posts/originals/...",
  "fileUrl": "https://d3loytcgioxpml.cloudfront.net/posts/originals/..."
}
```

**Check:** The `fileUrl` should use CloudFront domain if env var is set!

#### **Test 2: Upload a Test File**

1. Use your frontend app (pointing to `http://localhost:8083/api`)
2. Upload a small test video
3. Check the response - URL should be CloudFront URL
4. Try playing the video

#### **Test 3: Check Backend Logs**

Watch the console output for:
- ✅ `Using CloudFront URL: https://d3loytcgioxpml.cloudfront.net/...`
- ❌ `Using direct S3 URL (CloudFront not configured): ...`

### **Step 4: Test Without CloudFront (Fallback)**

Temporarily remove/comment the CloudFront URL in `.env.local`:

```powershell
# In .env.local, comment out or remove:
# AWS_CLOUDFRONT_DISTRIBUTION_URL=https://d3loytcgioxpml.cloudfront.net
```

Restart backend and test again. Should fall back to S3 URLs.

---

## 📋 Part 2: Build & Verify JAR

### **Step 1: Build JAR**

```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

### **Step 2: Verify JAR Contains Changes**

Check the JAR was built recently:

```powershell
Get-Item target\church-app-backend-0.0.1-SNAPSHOT.jar | 
    Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}, LastWriteTime
```

### **Step 3: Test JAR Locally (Optional but Recommended)**

You can test the JAR file locally before deploying:

```powershell
# Set environment variables for JAR test
$env:AWS_CLOUDFRONT_DISTRIBUTION_URL="https://d3loytcgioxpml.cloudfront.net"
$env:AWS_ACCESS_KEY_ID="your-key"
$env:AWS_SECRET_ACCESS_KEY="your-secret"
# ... other required env vars

# Run the JAR
java -jar target\church-app-backend-0.0.1-SNAPSHOT.jar
```

**Note:** This requires all environment variables set. If this is too complex, skip to deployment.

---

## 🔍 Part 3: Access Elastic Beanstalk Logs

**You CAN get logs from Elastic Beanstalk!** Here's how:

### **Method 1: AWS Console (Easiest)**

1. **Go to Elastic Beanstalk Console:**
   - https://console.aws.amazon.com/elasticbeanstalk/

2. **Select your environment** (e.g., `church-app-api-prod`)

3. **Click "Logs" in the left sidebar**

4. **Click "Request Logs"** button

5. **Select log type:**
   - **Last 100 lines** - Quick check
   - **Last 1000 lines** - More detail
   - **Full logs** - Complete log file

6. **Click "Download"** - Downloads a ZIP file with logs

7. **Extract and read:**
   - `var/log/eb-engine.log` - Deployment logs
   - `var/log/web.stdout.log` - Application output
   - `var/log/web.stderr.log` - Application errors
   - `var/log/eb-hooks.log` - Environment hooks

### **Method 2: AWS CLI (Faster for Developers)**

```powershell
# Install AWS CLI if not already installed
# Then run:

# Get recent logs (last 100 lines)
aws elasticbeanstalk request-environment-info `
    --environment-name church-app-api-prod `
    --info-type tail

# Wait a few seconds, then retrieve logs
aws elasticbeanstalk retrieve-environment-info `
    --environment-name church-app-api-prod `
    --info-type tail
```

### **Method 3: CloudWatch Logs (Most Detailed)**

1. **Go to CloudWatch Console:**
   - https://console.aws.amazon.com/cloudwatch/

2. **Click "Log groups" in left sidebar**

3. **Find log group:**
   - `/aws/elasticbeanstalk/church-app-api-prod/var/log/eb-engine.log`
   - `/aws/elasticbeanstalk/church-app-api-prod/var/log/web.stdout.log`
   - `/aws/elasticbeanstalk/church-app-api-prod/var/log/web.stderr.log`

4. **Click on a log stream** to see real-time logs

5. **Filter logs:**
   - Search for "ERROR", "Exception", "Failed"
   - Check recent timestamps

### **What to Look For in Logs**

**Common errors:**
- `BeanCreationException` - Configuration issue
- `Cannot resolve placeholder` - Missing environment variable
- `Connection refused` - Database connection issue
- `Access Denied` - AWS credentials issue
- `ClassNotFoundException` - Missing dependency

**Success indicators:**
- `Started ChurchAppApplication`
- `Tomcat started on port`
- No error messages

---

## 🚀 Part 4: Safe Deployment Process

### **Step 1: Test Locally First**

✅ Complete all tests in Part 1 before proceeding!

### **Step 2: Build JAR**

```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

### **Step 3: Check Environment Variables in Elastic Beanstalk**

1. Go to Elastic Beanstalk → Your environment
2. **Configuration** → **Software** → **Edit**
3. Verify `AWS_CLOUDFRONT_DISTRIBUTION_URL` is set:
   - Value: `https://d3loytcgioxpml.cloudfront.net`
4. **Don't change anything** - just verify it's there

### **Step 4: Deploy JAR**

1. **Go to Elastic Beanstalk** → Your environment
2. **Click "Upload and deploy"**
3. **Select JAR:** `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`
4. **Version label:** `cloudfront-support-v2` (or descriptive name)
5. **Click "Deploy"**

### **Step 5: Monitor Deployment**

1. **Watch Events tab** - Shows real-time progress
2. **Check Health status** - Should go: "Deploying" → "Ok"
3. **If it fails:**
   - Go to **Logs** → **Request Logs** → **Last 1000 lines**
   - Download and check for errors
   - Fix issues and redeploy

### **Step 6: Verify Deployment**

1. **Check health status** - Should be "Ok"
2. **Test API endpoint:**
   ```powershell
   Invoke-RestMethod -Uri "https://api.thegathrd.com/api/actuator/health"
   ```
3. **Upload a test video** through your app
4. **Check video URL** - Should use CloudFront domain

---

## 🐛 Troubleshooting Production Issues

### **Issue: Backend Hanging/Not Starting**

**Check logs:**
1. Go to Elastic Beanstalk → Logs → Request Logs → Last 1000 lines
2. Look for:
   - Startup errors
   - Database connection issues
   - Missing environment variables
   - AWS credential errors

**Common fixes:**
- Verify all environment variables are set
- Check database is accessible
- Verify AWS credentials are correct

### **Issue: CloudFront URLs Not Working**

**Check:**
1. Is `AWS_CLOUDFRONT_DISTRIBUTION_URL` set in Elastic Beanstalk?
2. Check backend logs for CloudFront URL generation
3. Test CloudFront distribution is deployed

### **Issue: Videos Still Slow**

**Check:**
1. Are videos using CloudFront URLs? (check response from upload)
2. Is CloudFront distribution deployed?
3. Check CloudFront metrics for requests

---

## ✅ Pre-Deployment Checklist

Before deploying, verify:

- [ ] Local backend starts without errors
- [ ] File upload works locally
- [ ] CloudFront URLs are generated (if env var set)
- [ ] Fallback to S3 works (if env var not set)
- [ ] JAR builds successfully
- [ ] Environment variables verified in Elastic Beanstalk
- [ ] Previous deployment completed (if any)

---

## 🎯 Quick Reference

### **Test Locally:**
```powershell
cd backend
. .\load-env.ps1
.\mvnw.cmd spring-boot:run
```

### **Build JAR:**
```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

### **Get Elastic Beanstalk Logs:**
1. AWS Console → Elastic Beanstalk → Your environment → Logs → Request Logs
2. Or: CloudWatch → Log groups → Find your environment logs

### **Deploy:**
1. Elastic Beanstalk → Upload and deploy → Select JAR → Deploy
2. Monitor Events tab
3. Check Logs if issues occur

---

**Remember:** Always test locally first! It's much faster than waiting for deployment. 🚀

