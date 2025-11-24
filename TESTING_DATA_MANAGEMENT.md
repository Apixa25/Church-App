# Testing Data Management Implementation 🧪

This guide will help you test the Facebook/X approach data management system we just implemented.

---

## Prerequisites

1. **Backend running** on port 8083
2. **Database connected** (PostgreSQL)
3. **AWS S3 configured** with proper credentials
4. **Dependencies installed** (Maven should have downloaded Thumbnailator and JavaCV)

---

## Step 1: Verify Dependencies

First, let's make sure all dependencies are installed:

```bash
cd backend
mvn dependency:tree | grep -E "(thumbnailator|javacv)"
```

You should see:
- `net.coobird:thumbnailator:0.4.20`
- `org.bytedeco:javacv-platform:1.5.9`

If not, run:
```bash
mvn clean install
```

---

## Step 2: Test Image Processing

### 2.1 Prepare Test Image

1. Find a large image (preferably 2-5MB, high resolution like 4000x3000)
2. Save it as `test-image.jpg` or `test-image.png`

### 2.2 Test via API

**Using cURL:**

```bash
# Upload image
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/test-image.jpg"
```

**Using Postman:**
1. Create POST request to `http://localhost:8083/api/posts/upload-media`
2. Add header: `Authorization: Bearer YOUR_JWT_TOKEN`
3. Go to Body → form-data
4. Add key: `files` (type: File)
5. Select your test image
6. Send request

**Expected Response:**
```json
[
  "https://your-bucket.s3.us-west-2.amazonaws.com/posts/originals/uuid.jpg"
]
```

### 2.3 Check Logs

Look for these log messages:

```
INFO  - Original file uploaded: https://...
INFO  - Starting async image processing for: https://...
INFO  - Image processed: 5000000 bytes -> 800000 bytes (84% reduction, ratio: 0.16)
INFO  - Image processing completed: ... -> ... (84% reduction)
```

### 2.4 Verify S3

1. Go to AWS S3 Console
2. Navigate to your bucket: `church-app-uploads-stevensills2`
3. Check folders:
   - `posts/originals/` - Should contain original file
   - `posts/optimized/` - Should contain compressed JPEG (appears after processing)

### 2.5 Verify Compression

Compare file sizes:
- Original: Should be in `originals/` folder
- Optimized: Should be in `optimized/` folder (much smaller)

---

## Step 3: Test Video Processing

### 3.1 Prepare Test Video

1. Find or create a video:
   - Resolution: 1080p or 4K (to test downscaling)
   - Duration: Under 30 seconds
   - Format: MP4 or MOV
   - Size: 20-50MB

### 3.2 Test via API

**Using cURL:**

```bash
# Upload video
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/test-video.mp4"
```

**Using Postman:**
1. Same as image upload, but select video file

**Expected Response:**
```json
[
  "https://your-bucket.s3.us-west-2.amazonaws.com/posts/originals/uuid.mp4"
]
```

### 3.3 Check Logs

Look for these log messages:

```
INFO  - Original file uploaded: https://...
INFO  - Starting async video processing for: https://...
INFO  - Video metadata: 1920x1080, 25 seconds, 30.0 fps
INFO  - Video processed: 50000000 bytes -> 6000000 bytes (88% reduction, ratio: 0.12)
INFO  - Video processing completed: ... -> ... (88% reduction)
```

### 3.4 Verify S3

1. Check S3 bucket:
   - `posts/originals/` - Original video
   - `posts/optimized/` - Compressed 480p video (appears after processing)

### 3.5 Verify Video Quality

1. Download optimized video from S3
2. Check properties:
   - Resolution: Should be 854x480 (480p)
   - Codec: H.264
   - Size: Much smaller than original

---

## Step 4: Test Error Cases

### 4.1 Test Video Duration Limit

Upload a video longer than 30 seconds:

```bash
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/long-video.mp4"
```

**Expected:** Processing should fail with error:
```
Video duration (45 seconds) exceeds maximum allowed duration of 30 seconds
```

### 4.2 Test File Size Limits

**Test oversized image:**
```bash
# Try uploading image > 20MB
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/huge-image.jpg"
```

**Expected:** Error: `Image file size exceeds maximum limit of 20MB`

**Test oversized video:**
```bash
# Try uploading video > 100MB
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/huge-video.mp4"
```

**Expected:** Error: `Video file size exceeds maximum limit of 100MB`

### 4.3 Test Invalid File Types

```bash
# Try uploading unsupported file
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/file.exe"
```

**Expected:** Error: `File type not supported`

---

## Step 5: Test Async Processing

### 5.1 Upload Multiple Files

Upload several images/videos at once to test async processing:

```bash
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "files=@/path/to/video1.mp4"
```

**Expected Behavior:**
1. All uploads return immediately with original URLs
2. Processing happens in background
3. Check logs to see processing happening asynchronously
4. Optimized files appear in S3 after processing completes

### 5.2 Monitor Processing Queue

Check application logs for processing queue activity:

```
INFO  - Media processing executor configured: corePoolSize=2, maxPoolSize=4, queueCapacity=100
INFO  - Starting async image processing for: ...
INFO  - Starting async video processing for: ...
```

---

## Step 6: Test from Frontend

### 6.1 Update Frontend (if needed)

Make sure frontend allows larger file sizes:

```typescript
// In MediaUploader.tsx or PostComposer.tsx
maxFileSize={20} // For images (was 10)
// Videos: 100MB
```

### 6.2 Test Image Upload

1. Open your app
2. Go to post composer
3. Select a large image (5-10MB)
4. Upload
5. Check that upload completes quickly (no waiting for compression)
6. Verify image appears in feed

### 6.3 Test Video Upload

1. Select a video (under 30 seconds, any resolution)
2. Upload
3. Check that upload completes quickly
4. Verify video appears in feed (may show original first, then optimized)

---

## Step 7: Performance Testing

### 7.1 Measure Upload Speed

**Before (with client-side compression):**
- Time: 5-10 seconds (compression + upload)

**After (server-side only):**
- Time: 2-3 seconds (upload only)

### 7.2 Measure Processing Time

Check logs for processing duration:
- Images: Should process in < 1 second
- Videos: Should process in 1-3 minutes (depends on length)

### 7.3 Check Storage Savings

Compare file sizes:
- Original image: 5MB → Optimized: 500KB-1MB (80-90% reduction)
- Original video: 50MB → Optimized: 5-8MB (84-90% reduction)

---

## Step 8: Verify Configuration

### 8.1 Check application.properties

Verify these settings are present:

```properties
# Image Processing
media.image.max-width=1920
media.image.max-height=1920
media.image.jpeg-quality=0.85

# Video Processing
media.video.target-width=854
media.video.target-height=480
media.video.bitrate=1000
media.video.max-duration-seconds=30

# Processing Configuration
media.processing.async.enabled=true
media.processing.async.core-pool-size=2
```

### 8.2 Check S3 Bucket Structure

Your S3 bucket should have this structure:

```
church-app-uploads-stevensills2/
├── posts/
│   ├── originals/
│   │   ├── uuid1.jpg
│   │   └── uuid2.mp4
│   └── optimized/
│       ├── uuid3.jpg
│       └── uuid4.mp4
├── chat-media/
│   ├── originals/
│   └── optimized/
└── prayer-requests/
    ├── originals/
    └── optimized/
```

---

## Troubleshooting

### Issue: Processing not happening

**Check:**
1. `media.processing.async.enabled=true` in application.properties
2. Logs show "Starting async processing"
3. No errors in logs

**Solution:**
- Check executor configuration
- Verify services are injected correctly

### Issue: JavaCV errors

**Check:**
1. JavaCV dependency is installed
2. FFmpeg binaries are available (JavaCV platform includes them)

**Solution:**
- Run `mvn clean install` to ensure dependencies are downloaded
- Check that `javacv-platform` is in dependencies

### Issue: Images not compressing

**Check:**
1. Image size is > 2MB or dimensions > 1920x1920
2. Logs show processing started

**Solution:**
- Verify Thumbnailator is working
- Check image format is supported

### Issue: Videos not processing

**Check:**
1. Video duration is < 30 seconds
2. Video format is supported (MP4, WebM, MOV)
3. Logs show processing started

**Solution:**
- Check JavaCV is working
- Verify video codec is readable
- Check FFmpeg is available

---

## Quick Test Checklist

- [ ] Dependencies installed (Thumbnailator, JavaCV)
- [ ] Image upload works
- [ ] Image processing happens asynchronously
- [ ] Optimized image appears in S3
- [ ] Video upload works
- [ ] Video processing happens asynchronously
- [ ] Optimized video appears in S3 (480p)
- [ ] File size limits enforced (20MB images, 100MB videos)
- [ ] Video duration limit enforced (30 seconds)
- [ ] Invalid file types rejected
- [ ] Multiple files can be uploaded simultaneously
- [ ] Processing happens in background (no blocking)

---

## Next Steps After Testing

Once testing is complete:

1. **Create MediaFile entity** - Track processing status
2. **Database migration** - Store media file references
3. **Update database references** - Use optimized URLs
4. **Cleanup service** - Delete originals after 24 hours
5. **Frontend updates** - Remove client-side compression

---

**Happy Testing! 🚀**

