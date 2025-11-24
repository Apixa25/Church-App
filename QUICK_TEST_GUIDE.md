# Quick Test Guide 🚀

The fastest way to test the data management implementation!

---

## Prerequisites Checklist

- [ ] Backend is running on `http://localhost:8083`
- [ ] Database is connected
- [ ] AWS S3 credentials are configured
- [ ] You have a test image (2-5MB recommended)
- [ ] You have a test video (under 30 seconds, any resolution)

---

## Method 1: Using Test Scripts (Easiest)

### On Mac/Linux:

```bash
./test-media-upload.sh
```

### On Windows (PowerShell):

```powershell
.\test-media-upload.ps1
```

The script will:
1. ✅ Authenticate you (register if needed)
2. ✅ Upload your image
3. ✅ Upload your video
4. ✅ Show you the results

---

## Method 2: Manual Testing with cURL

### Step 1: Get Authentication Token

```bash
# Login (or register first)
curl -X POST http://localhost:8083/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**Save the token from the response!**

### Step 2: Upload Image

```bash
# Replace YOUR_TOKEN with the token from Step 1
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/your/image.jpg"
```

### Step 3: Upload Video

```bash
curl -X POST http://localhost:8083/api/posts/upload-media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/your/video.mp4"
```

---

## Method 3: Using Postman

1. **Create Collection:**
   - POST `http://localhost:8083/api/auth/login`
   - Body: `{"email": "test@example.com", "password": "password123"}`
   - Save token from response

2. **Upload Image:**
   - POST `http://localhost:8083/api/posts/upload-media`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body → form-data → Key: `files` (File type) → Select image

3. **Upload Video:**
   - Same as image, but select video file

---

## What to Look For

### ✅ Success Indicators:

1. **Immediate Response:**
   - Upload completes in 2-3 seconds (not 5-10 seconds)
   - Returns URL immediately

2. **Backend Logs:**
   ```
   INFO - Original file uploaded: https://...
   INFO - Starting async image processing for: ...
   INFO - Image processed: 5000000 bytes -> 800000 bytes (84% reduction)
   ```

3. **S3 Bucket:**
   - `posts/originals/` - Contains original file
   - `posts/optimized/` - Contains compressed file (appears after processing)

4. **File Size Reduction:**
   - Images: 80-90% smaller
   - Videos: 85-95% smaller

### ❌ Common Issues:

**"Processing not happening"**
- Check `media.processing.async.enabled=true` in application.properties
- Check backend logs for errors

**"JavaCV errors"**
- Run `mvn clean install` to ensure dependencies are downloaded
- Check that JavaCV platform dependency is installed

**"Upload fails"**
- Check file size limits (20MB images, 100MB videos)
- Check file type is supported
- Check authentication token is valid

---

## Quick Verification Checklist

After testing, verify:

- [ ] Image uploads successfully
- [ ] Image appears in S3 `originals/` folder
- [ ] Optimized image appears in S3 `optimized/` folder (after processing)
- [ ] Optimized image is much smaller (80-90% reduction)
- [ ] Video uploads successfully
- [ ] Video appears in S3 `originals/` folder
- [ ] Optimized video appears in S3 `optimized/` folder (after processing)
- [ ] Optimized video is 480p and much smaller (85-95% reduction)
- [ ] Backend logs show async processing messages
- [ ] Upload completes quickly (no waiting for compression)

---

## Next Steps

Once testing is successful:

1. ✅ **Phase 1 Complete** - Foundation is working!
2. ⏭️ **Phase 2** - Create MediaFile entity for tracking
3. ⏭️ **Phase 3** - Database integration
4. ⏭️ **Phase 4** - Cleanup service
5. ⏭️ **Phase 5** - Frontend updates

---

**Need Help?** See `TESTING_DATA_MANAGEMENT.md` for detailed testing guide.

