# 🧪 Local Testing Checklist - Pre-Deployment

This checklist ensures all changes work correctly before deploying to AWS.

---

## ✅ Prerequisites

- [ ] Backend running on `http://localhost:8083`
- [ ] Frontend running on `http://localhost:3000`
- [ ] Database connected and working
- [ ] Google OAuth working (✅ Already confirmed!)

---

## 🔧 Step 1: Verify Environment Variables

### **Check `.env.local` file:**

```powershell
cd backend
Get-Content .env.local | Select-String -Pattern "CLOUDFRONT|GOOGLE|AWS"
```

**Required variables:**
- [ ] `AWS_CLOUDFRONT_DISTRIBUTION_URL=https://d3loytcgioxpml.cloudfront.net`
- [ ] `GOOGLE_CLIENT_ID=your-client-id`
- [ ] `GOOGLE_CLIENT_SECRET=your-client-secret`
- [ ] `AWS_ACCESS_KEY_ID=your-key`
- [ ] `AWS_SECRET_ACCESS_KEY=your-secret`
- [ ] `AWS_S3_BUCKET=church-app-uploads-stevensills2`

---

## 🎬 Step 2: Test CloudFront URL Generation

### **Test 2.1: Upload a Test Image**

1. **Through your app:**
   - Go to `http://localhost:3000`
   - Create a new post
   - Upload an image
   - Check the response URL

2. **Expected result:**
   - ✅ URL should be: `https://d3loytcgioxpml.cloudfront.net/posts/originals/...`
   - ❌ Should NOT be: `https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/...`

3. **Check backend logs:**
   - Look for: `Using CloudFront URL: https://d3loytcgioxpml.cloudfront.net/...`
   - Should NOT see: `Using direct S3 URL`

### **Test 2.2: Upload a Test Video**

1. **Through your app:**
   - Create a new post
   - Upload a small test video (under 75MB)
   - Check the response URL

2. **Expected result:**
   - ✅ URL should use CloudFront domain
   - ✅ Video should be accessible

3. **Test video playback:**
   - Click on the video to play it
   - Should play smoothly (if CloudFront is working)
   - Check browser Network tab - should see requests to CloudFront domain

---

## 🎥 Step 3: Test Video Player Improvements

### **Test 3.1: Video Buffering**

1. **Upload a video** (or use existing one)
2. **Play the video**
3. **Check for:**
   - ✅ "Buffering..." indicator when needed
   - ✅ Smooth playback
   - ✅ No stuttering
   - ✅ Fast initial load

### **Test 3.2: Video Controls**

1. **Test play/pause**
2. **Test volume control**
3. **Test seeking** (scrub through video)
4. **All should work smoothly**

---

## 📤 Step 4: Test File Upload Endpoints

### **Test 4.1: Generate Presigned URL**

```powershell
# Test presigned URL generation
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

$response = Invoke-RestMethod -Uri "http://localhost:8083/api/posts/generate-upload-url" `
    -Method POST `
    -Headers $headers `
    -Body $body

Write-Host "Presigned URL: $($response.presignedUrl)"
Write-Host "S3 Key: $($response.s3Key)"
Write-Host "File URL: $($response.fileUrl)"
```

**Expected:**
- ✅ `fileUrl` should use CloudFront domain
- ✅ All fields populated

### **Test 4.2: Direct File Upload**

1. **Use your frontend** to upload a file
2. **Check the response** - should have CloudFront URL
3. **Verify file is accessible** at that URL

---

## 🔍 Step 5: Check Backend Logs

### **What to look for:**

1. **CloudFront URL generation:**
   ```
   Using CloudFront URL: https://d3loytcgioxpml.cloudfront.net/...
   ```

2. **No errors:**
   - ❌ No `BeanCreationException`
   - ❌ No `Cannot resolve placeholder`
   - ❌ No `Access Denied` errors
   - ❌ No `Connection refused`

3. **Successful operations:**
   - ✅ File uploads completing
   - ✅ URLs being generated
   - ✅ No exceptions

---

## 🧪 Step 6: Test Fallback Behavior

### **Test 6.1: Without CloudFront URL**

1. **Temporarily remove CloudFront URL:**
   ```powershell
   # In .env.local, comment out:
   # AWS_CLOUDFRONT_DISTRIBUTION_URL=https://d3loytcgioxpml.cloudfront.net
   ```

2. **Restart backend:**
   ```powershell
   # Stop backend (Ctrl+C)
   . .\load-env.ps1
   .\mvnw.cmd spring-boot:run
   ```

3. **Upload a file:**
   - Should fall back to S3 URL
   - Should still work (just slower)

4. **Restore CloudFront URL:**
   - Uncomment the line
   - Restart backend
   - Should use CloudFront again

---

## ✅ Step 7: Final Verification

### **Checklist before deploying:**

- [ ] Backend starts without errors
- [ ] Google OAuth works
- [ ] File uploads work
- [ ] CloudFront URLs are generated
- [ ] Videos play smoothly
- [ ] No errors in backend logs
- [ ] All environment variables set correctly

---

## 🚀 Step 8: Build JAR (When Ready)

Once all tests pass:

```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

**Verify JAR:**
```powershell
Get-Item target\church-app-backend-0.0.1-SNAPSHOT.jar | 
    Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}, LastWriteTime
```

---

## 📝 Test Results Template

**Date:** ___________

**Environment Variables:**
- [ ] CloudFront URL set
- [ ] Google OAuth configured
- [ ] AWS credentials set

**File Upload:**
- [ ] Image upload works
- [ ] Video upload works
- [ ] CloudFront URLs generated

**Video Playback:**
- [ ] Videos play smoothly
- [ ] Buffering works correctly
- [ ] Controls work

**Backend:**
- [ ] No errors in logs
- [ ] All endpoints working
- [ ] OAuth working

**Ready to Deploy:** [ ] Yes [ ] No

---

**Let's start testing!** 🎯

