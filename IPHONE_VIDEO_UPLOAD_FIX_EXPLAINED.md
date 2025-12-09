# 🔧 iPhone Video Upload "Forbidden" Fix - Explained

## The Real Problem

The issue is **NOT** CORS configuration. The problem is that the **presigned URL signature doesn't match what the client sends**.

### What Happened

1. **Backend generates presigned URL** with `Cache-Control` header included in the signature
2. **Frontend uploads file** but does NOT send `Cache-Control` header
3. **S3 compares** the presigned URL signature with the actual request
4. **Signature mismatch** → S3 rejects with "forbidden"

### Why This Affects iPhone More

Safari on iPhone is stricter about header matching than Chrome/Android. It's more likely to trigger this signature mismatch error.

## The Fix

### ✅ Backend Fix (Applied)

**Removed `Cache-Control` from presigned URL signature** because:
- The frontend doesn't send `Cache-Control` header
- Including it in the signature causes a mismatch
- S3 rejects mismatched signatures with "forbidden"

**Code change in `FileUploadService.java`:**
- Removed `cacheControl()` from the presigned URL PutObjectRequest
- Only includes `Content-Type` and `Content-Length` (what the client actually sends)

### ✅ Frontend Fix (Already Applied)

**Updated `uploadFileToS3` to:**
- Only send `Content-Type` header (matches presigned URL signature)
- Set `credentials: 'omit'` to avoid extra headers
- Better error logging for debugging

## About CORS and OPTIONS

**You CANNOT add OPTIONS to S3 CORS AllowedMethods:**
- AWS S3 automatically handles OPTIONS requests for CORS preflight
- You don't need to (and can't) add it manually
- Your current CORS config is correct as-is

## Testing

After deploying the backend fix:

1. **Test on iPhone:**
   - Record a video using iPhone camera
   - Upload it in the app
   - Should work without "forbidden" errors

2. **Check browser console:**
   - Should see successful upload
   - No CORS errors
   - No signature mismatch errors

## Expected Result

✅ iPhone videos upload successfully  
✅ No "forbidden" errors  
✅ Videos appear in posts  
✅ Works on all devices

