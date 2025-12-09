# 🔧 Fix iPhone Video Upload "Forbidden" Error

## Problem
iPhone users get "Upload failed - failed to upload file to S3 - forbidden" when uploading videos.

## Root Cause
S3 presigned URLs are **very strict** about headers. If the client sends headers that weren't included in the presigned URL signature, S3 rejects the request with "forbidden".

**iPhone Safari specific issues:**
1. iPhone videos are `video/quicktime` (MOV format) - this is fine, backend accepts it
2. Safari may send additional headers that aren't in the presigned URL signature
3. CORS preflight might be failing

## Solution 1: Fix Presigned URL Generation (Backend)

The presigned URL must include ALL headers that the client will send. Currently, we only include `Content-Type` and `Content-Length`, but Safari might send additional headers.

**Update `FileUploadService.java` - `generatePresignedUploadUrl` method:**

```java
// Build PutObjectRequest with Cache-Control for videos (iOS Safari requirement)
boolean isVideo = contentType != null && contentType.startsWith("video/");

PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
        .bucket(bucketName)
        .key(s3Key)
        .contentType(contentType)
        .contentLength(fileSize);

// Add Cache-Control header for videos to support Range requests
if (isVideo) {
    requestBuilder.cacheControl("public, max-age=31536000, must-revalidate");
    log.info("Added Cache-Control header for presigned video upload: {}", s3Key);
}

PutObjectRequest putObjectRequest = requestBuilder.build();

// Generate presigned PUT URL (valid for 1 hour)
// IMPORTANT: Don't include additional headers in presigned URL that client won't send
// The presigned URL signature must match EXACTLY what the client sends
PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
        .signatureDuration(Duration.ofHours(1))
        .putObjectRequest(putObjectRequest)
        .build();
```

## Solution 2: Fix Frontend Upload (Remove Extra Headers)

The frontend should ONLY send headers that are in the presigned URL signature.

**Update `postApi.ts` - `uploadFileToS3` function:**

```typescript
export const uploadFileToS3 = async (
  file: File,
  presignedUrl: string
): Promise<void> => {
  // CRITICAL: Only send Content-Type header (matches presigned URL signature)
  // Do NOT send any other headers - S3 will reject if headers don't match signature
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream'
    },
    // Don't include credentials or other headers
    credentials: 'omit'
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('S3 upload error:', response.status, response.statusText, errorText);
    throw new Error(`Failed to upload file to S3: ${response.statusText}`);
  }
};
```

## Solution 3: Verify S3 CORS Configuration

**✅ Your current CORS config is correct!**

**IMPORTANT:** AWS S3 does NOT allow `OPTIONS` in AllowedMethods - S3 automatically handles OPTIONS requests for CORS preflight. You cannot add it manually.

**Your current CORS config (keep as-is):**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:8083",
      "https://www.thegathrd.com",
      "https://app.thegathrd.com",
      "https://d3loytcgioxpml.cloudfront.net"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**This is correct:**
- ✅ `PUT` method is allowed (for uploads)
- ✅ `AllowedHeaders: ["*"]` allows all headers (needed for presigned URLs)
- ✅ Frontend domains are in AllowedOrigins
- ✅ S3 automatically handles OPTIONS preflight (you don't need to add it)

**If you're still getting CORS errors:**
- Make sure your frontend domain is in AllowedOrigins
- Check browser console for specific CORS error messages
- Verify the presigned URL is being used correctly

## Solution 4: Handle iPhone Video Format

iPhone videos are `video/quicktime` (MOV). The backend already accepts this, but ensure the frontend handles it correctly:

**The backend already accepts `video/quicktime` in `FileUploadService.java` line 426:**
```java
if (contentType.equals("video/mp4") || contentType.equals("video/webm") ||
    contentType.equals("video/quicktime")) { // MOV files
    return true;
}
```

## Testing Steps

1. **Test on iPhone:**
   - Record a video using iPhone camera
   - Try to upload it in the app
   - Check browser console for errors
   - Should upload successfully

2. **Check S3 CORS:**
   - Go to S3 Console → Bucket → Permissions → CORS
   - Verify PUT and OPTIONS are allowed
   - Verify frontend domains are in AllowedOrigins

3. **Check presigned URL:**
   - Generate a presigned URL for a video
   - Check the URL - should include Content-Type parameter
   - Try uploading with only Content-Type header

## Common Issues

1. **"Forbidden" error:**
   - Headers in upload don't match presigned URL signature
   - Solution: Only send Content-Type header

2. **CORS preflight fails:**
   - OPTIONS request returns error
   - Solution: Add OPTIONS to AllowedMethods in CORS

3. **Content-Type mismatch:**
   - Presigned URL has different Content-Type than upload
   - Solution: Use exact same Content-Type in both

## Expected Result

After fixes:
- ✅ iPhone videos upload successfully
- ✅ No "forbidden" errors
- ✅ Videos appear in posts
- ✅ Videos play on all devices

