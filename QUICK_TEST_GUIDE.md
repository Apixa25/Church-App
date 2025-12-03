# Quick Testing Guide - Image & Video Optimization 🚀

## ✅ Pre-Flight Check

Your setup is ready:
- ✅ `AWS_ACCOUNT_ID=060163370478` is set
- ✅ CloudFront URL is configured
- ✅ WebP library is installed
- ✅ MediaConvert IAM role should be created

---

## 🖼️ Test 1: Image Optimization (WebP)

### What to Do:
1. **Start Backend** (in a terminal):
   ```powershell
   cd backend
   . .\load-env.ps1
   .\mvnw.cmd spring-boot:run
   ```

2. **Upload a WebP Image** through your app

3. **Watch Backend Logs** - You should see:
   ```
   INFO - Processing image: [filename].webp ([size] bytes)
   INFO - Image processed: [original] bytes -> [optimized] bytes ([X]% reduction, ratio: [X])
   INFO - Image processing completed: [original-url] -> [optimized-url] ([X]% reduction)
   ```

### ✅ Success Indicators:
- No `IOException: Could not read image file` errors
- Log shows "Image processed" with size reduction
- Log shows "Image processing completed" with CloudFront URL

### ❌ If It Fails:
- Check for `IOException` in logs
- Verify WebP library is loaded (check startup logs)
- Check S3 permissions

---

## 🎬 Test 2: Video Optimization (MediaConvert)

### What to Do:
1. **Upload a Video** through your app (MP4, MOV, etc.)

2. **Watch Backend Logs** - You should see:
   ```
   INFO - Starting MediaConvert job for video: [s3-key]
   INFO - MediaConvert job created: [job-id] for video: [s3-key]
   ```

3. **Check AWS MediaConvert Console**:
   - Go to: https://console.aws.amazon.com/mediaconvert/
   - Click "Jobs" in left sidebar
   - Find your job ID
   - Status should be "PROGRESSING" or "COMPLETE"

### ✅ Success Indicators:
- Log shows "MediaConvert job created" with job ID
- No errors about IAM permissions
- Job appears in MediaConvert console
- Job status progresses to "COMPLETE"

### ❌ If It Fails:

**Error: "AWS_ACCOUNT_ID not configured"**
- ✅ Already set in your .env - restart backend

**Error: "AccessDenied: User is not authorized to perform: iam:PassRole"**
- Go to IAM → Users → `church-app-dev`
- Verify `MediaConvertAccess` inline policy exists
- Check policy includes `iam:PassRole` with Account ID `060163370478`

**Error: "The role defined for the function cannot be assumed by MediaConvert"**
- Go to IAM → Roles → `MediaConvert_Default_Role`
- Verify role exists
- Check "Trust relationships" tab shows `mediaconvert.amazonaws.com`

---

## 📊 What to Check After Testing

### Image Optimization:
1. **S3 Bucket**:
   - Original: `posts/originals/[uuid].webp`
   - Optimized: `posts/optimized/[uuid].jpg` ← Should exist!

2. **File Sizes**:
   - Optimized should be 30-70% smaller
   - Check in S3 console or use: `aws s3 ls s3://church-app-uploads-stevensills2/posts/optimized/`

3. **CloudFront URL**:
   - Response should include: `https://d3loytcgioxpml.cloudfront.net/posts/optimized/[uuid].jpg`
   - Not direct S3 URL

### Video Optimization:
1. **MediaConvert Job**:
   - Job ID logged in backend
   - Job appears in MediaConvert console
   - Status eventually becomes "COMPLETE"

2. **S3 Bucket** (after job completes):
   - Original: `posts/originals/[uuid].mp4`
   - Optimized: `posts/optimized/[uuid].mp4` ← Should exist after processing!

3. **Video Properties** (check in S3):
   - Resolution: Should be 854x480 (or scaled)
   - File size: Should be 60-80% smaller

---

## 🔍 Quick Verification Commands

### Check S3 Files:
```powershell
# List optimized images
aws s3 ls s3://church-app-uploads-stevensills2/posts/optimized/ --recursive

# List optimized videos
aws s3 ls s3://church-app-uploads-stevensills2/posts/optimized/ --recursive | Select-String "\.mp4"
```

### Check MediaConvert Jobs:
```powershell
aws mediaconvert list-jobs --max-results 5
```

### Check IAM Permissions:
```powershell
aws iam list-user-policies --user-name church-app-dev
```

---

## 📝 Testing Checklist

- [ ] Backend started successfully
- [ ] WebP image uploaded
- [ ] Image processing logs show success
- [ ] Optimized image exists in S3
- [ ] CloudFront URL generated for image
- [ ] Video uploaded
- [ ] MediaConvert job created (job ID in logs)
- [ ] Job appears in MediaConvert console
- [ ] Job completes successfully
- [ ] Optimized video exists in S3
- [ ] CloudFront URL generated for video

---

## 🎯 Ready to Test!

Start with **Test 1 (Image Optimization)** - it's faster and will verify WebP support is working.

Then move to **Test 2 (Video Optimization)** - this requires MediaConvert IAM setup to be complete.

Let me know what you see in the logs! 🚀

