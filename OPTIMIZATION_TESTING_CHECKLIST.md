# Image & Video Optimization Testing Checklist 🧪

## Pre-Testing Setup ✅

Before testing, ensure:
- [x] WebP library added (`com.twelvemonkeys.imageio:imageio-webp:3.12.0`)
- [x] MediaConvert IAM role created (`MediaConvert_Default_Role`)
- [x] IAM user permissions added (`MediaConvertAccess` policy)
- [x] `AWS_ACCOUNT_ID` set in `.env` file
- [x] Backend JAR built successfully

---

## Test 1: Image Optimization (WebP) 🖼️

### Steps:
1. **Start Backend** (if not running):
   ```powershell
   cd backend
   . .\load-env.ps1
   .\mvnw.cmd spring-boot:run
   ```

2. **Upload a WebP Image**:
   - Use your frontend to upload a WebP image file
   - Or use Postman/curl to POST to `/api/posts/upload-presigned-url`

3. **Check Backend Logs** for:
   ```
   ✅ "Processing image: [filename].webp ([size] bytes)"
   ✅ "Image processed: [original] bytes -> [optimized] bytes ([X]% reduction, ratio: [X])"
   ✅ "Uploaded optimized image to S3: posts/optimized/[uuid].jpg"
   ```

4. **Verify in S3**:
   - Check `church-app-uploads-stevensills2/posts/originals/` - original file
   - Check `church-app-uploads-stevensills2/posts/optimized/` - optimized JPEG file
   - Compare file sizes (should see 30-70% reduction)

5. **Check CloudFront URL**:
   - The response should include a CloudFront URL
   - Format: `https://d3loytcgioxpml.cloudfront.net/posts/optimized/[uuid].jpg`

### Expected Results:
- ✅ WebP image is read successfully (no IOException)
- ✅ Optimized JPEG is created (max 1920x1920, 85% quality)
- ✅ File size is reduced
- ✅ CloudFront URL is generated

### If It Fails:
- Check logs for `IOException: Could not read image file`
- Verify WebP library is in classpath
- Check S3 permissions

---

## Test 2: Image Optimization (Other Formats) 🖼️

### Test JPEG, PNG, GIF:
1. Upload each format
2. Verify optimization works
3. Check file size reduction

### Expected Results:
- ✅ All formats are optimized
- ✅ All converted to JPEG (optimized)
- ✅ File sizes reduced

---

## Test 3: Video Optimization (MediaConvert) 🎬

### Prerequisites:
- ✅ MediaConvert role exists
- ✅ IAM user has `MediaConvertAccess` policy
- ✅ `AWS_ACCOUNT_ID` is set

### Steps:
1. **Upload a Video File**:
   - Use your frontend to upload a video (MP4, MOV, etc.)
   - File should be under 75MB

2. **Check Backend Logs** for:
   ```
   ✅ "Starting MediaConvert job for video: [s3-key]"
   ✅ "MediaConvert job created: [job-id] for video: [s3-key]"
   ```

3. **Check MediaConvert Console**:
   - Go to AWS Console → MediaConvert → Jobs
   - Find your job ID
   - Status should be "PROGRESSING" or "COMPLETE"

4. **Wait for Processing** (can take 1-5 minutes):
   - Check job status periodically
   - When complete, status will be "COMPLETE"

5. **Verify Optimized Video in S3**:
   - Check `church-app-uploads-stevensills2/posts/originals/` - original video
   - Check `church-app-uploads-stevensills2/posts/optimized/` - optimized video
   - Optimized video should be:
     - Resolution: 854x480 (or scaled proportionally)
     - Bitrate: ~1000 kbps
     - File size: 60-80% smaller than original

6. **Check CloudFront URL**:
   - Response should include CloudFront URL for optimized video
   - Format: `https://d3loytcgioxpml.cloudfront.net/posts/optimized/[uuid].mp4`

### Expected Results:
- ✅ MediaConvert job is created successfully
- ✅ Job processes without errors
- ✅ Optimized video is created in S3
- ✅ CloudFront URL is generated
- ✅ Video plays smoothly in app

### If It Fails:
- **Error: "AWS_ACCOUNT_ID not configured"**
  - Check `.env` file has `AWS_ACCOUNT_ID=060163370478`
  - Restart backend

- **Error: "AccessDenied: User is not authorized to perform: iam:PassRole"**
  - Verify `MediaConvertAccess` policy is attached to `church-app-dev` user
  - Check the policy includes `iam:PassRole` with correct Account ID

- **Error: "The role defined for the function cannot be assumed by MediaConvert"**
  - Verify `MediaConvert_Default_Role` exists
  - Check role has MediaConvert as trusted service
  - Verify role has S3 permissions

---

## Test 4: Verify CloudFront URLs 🌐

### Check Generated URLs:
1. After upload, check the response URL
2. Should be CloudFront URL (not direct S3)
3. Format: `https://d3loytcgioxpml.cloudfront.net/...`

### Test URL Access:
1. Open URL in browser
2. Image/video should load quickly
3. Check browser DevTools → Network tab
4. Should see fast load times (CloudFront edge caching)

---

## Test 5: End-to-End User Experience 👤

### Test in App:
1. **Upload Image**:
   - Upload a large WebP image
   - Verify it displays correctly
   - Check load time (should be fast via CloudFront)

2. **Upload Video**:
   - Upload a video
   - Wait for processing (check MediaConvert status)
   - Verify video plays smoothly
   - Check load time (should be fast via CloudFront)

3. **Check Feed**:
   - View posts with optimized media
   - Verify images load quickly
   - Verify videos play smoothly

---

## Success Criteria ✅

### Image Optimization:
- [ ] WebP images are processed successfully
- [ ] Optimized JPEG files are created (30-70% size reduction)
- [ ] CloudFront URLs are generated
- [ ] Images load quickly in app

### Video Optimization:
- [ ] MediaConvert jobs are created successfully
- [ ] Jobs complete without errors
- [ ] Optimized videos are created (60-80% size reduction)
- [ ] CloudFront URLs are generated
- [ ] Videos play smoothly in app

### Overall:
- [ ] No errors in backend logs
- [ ] All optimized files in S3
- [ ] CloudFront serving all media
- [ ] User experience is smooth

---

## Troubleshooting Commands 🔧

### Check Backend Logs:
```powershell
# If running in terminal, logs will show in real-time
# Look for:
# - "Processing image: ..."
# - "MediaConvert job created: ..."
# - Any ERROR messages
```

### Check S3 Files:
```powershell
aws s3 ls s3://church-app-uploads-stevensills2/posts/originals/ --recursive
aws s3 ls s3://church-app-uploads-stevensills2/posts/optimized/ --recursive
```

### Check MediaConvert Jobs:
```powershell
aws mediaconvert list-jobs --max-results 10
```

### Check IAM Permissions:
```powershell
aws iam list-user-policies --user-name church-app-dev
aws iam get-user-policy --user-name church-app-dev --policy-name MediaConvertAccess
```

---

## Ready to Test! 🚀

Let's start with Test 1 (Image Optimization) and work through each test systematically.

