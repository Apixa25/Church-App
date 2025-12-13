# 📸 iPhone Image Upload Solution Guide

## The Problem We Solved (December 2024)

iPhone photos were failing to upload as profile pictures and banner images. This guide explains why it happened and how we fixed it using the **industry-standard approach** used by Instagram, X.com, and other major platforms.

---

## 🔍 Understanding the Problem

### The Architecture Before (Broken)

```
┌──────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│   iPhone     │ ──▶ │   Nginx     │ ──▶ │  Spring Boot│ ──▶ │    S3    │
│  (5-10MB     │     │  (1MB MAX!) │     │   Backend   │     │ (Storage)│
│   photos)    │     │   ❌ BLOCKED │     │             │     │          │
└──────────────┘     └─────────────┘     └─────────────┘     └──────────┘
```

**Why it failed:**
- iPhone photos are typically 3-10MB (HEIC format, high resolution)
- AWS Elastic Beanstalk uses Nginx as a reverse proxy
- Nginx has a default `client_max_body_size` of 1MB
- Files larger than 1MB were rejected BEFORE reaching our Spring Boot app

### Error Messages You Might See
- `413 Request Entity Too Large`
- `client intended to send too large body`
- Upload hangs and eventually times out

---

## ✅ The Solution: Presigned URLs (Industry Standard)

### The Architecture After (Fixed)

```
┌──────────────┐     ┌─────────────┐                        ┌──────────┐
│   iPhone     │ ──▶ │  Spring Boot│  (Step 1: Get URL)    │          │
│              │ ◀── │  Backend    │  (tiny JSON request)  │          │
│              │     └─────────────┘                        │    S3    │
│              │                                            │ (Storage)│
│              │ ────────────────────────────────────────▶ │          │
│              │     (Step 2: Upload directly to S3)       │          │
│              │     NO NGINX! NO SIZE LIMIT!              │          │
│              │                                            │          │
│              │ ──▶ ┌─────────────┐  (Step 3: Confirm)    │          │
│              │     │  Spring Boot│  (tiny JSON request)  │          │
└──────────────┘     └─────────────┘                        └──────────┘
```

**Why it works:**
- Step 1: Frontend asks backend for a "presigned URL" (a temporary, secure upload link)
- Step 2: Frontend uploads the file DIRECTLY to S3 (bypasses Nginx entirely!)
- Step 3: Frontend tells backend "upload complete" so it can track the file

This is exactly how Instagram, X.com, Facebook, and other major platforms handle file uploads.

---

## 📁 Files Involved

### Backend (Already Set Up - No Changes Needed)

| File | Purpose |
|------|---------|
| `FileUploadService.java` | `generatePresignedUploadUrl()` - Creates secure S3 upload URLs |
| `FileUploadService.java` | `handleUploadCompletion()` - Processes file after upload |
| `PostController.java` | `/posts/generate-upload-url` - API endpoint for getting presigned URLs |
| `PostController.java` | `/posts/confirm-upload` - API endpoint for confirming uploads |
| `PresignedUploadResponse.java` | DTO with presignedUrl, s3Key, fileUrl |

### Frontend (Where You Make Changes)

| File | Purpose |
|------|---------|
| `services/postApi.ts` | Contains `generatePresignedUploadUrl()`, `uploadFileToS3()`, `confirmUpload()` |
| `services/postApi.ts` | `uploadProfilePicture()` and `uploadBannerImage()` use the presigned approach |

---

## 🛠️ How to Add Image Upload to a New Feature

When you want to add image uploads to something new (like Events), follow this pattern:

### Step 1: Create the Upload Function in Frontend

Add a new function in `frontend/src/services/postApi.ts` (or create a new API file):

```typescript
/**
 * Upload event image using presigned URL (industry-standard approach)
 * 
 * This bypasses Nginx entirely by uploading directly to S3.
 * Works on all devices including iPhone, no file size limits from Nginx!
 */
export const uploadEventImage = async (file: File): Promise<string> => {
  console.log('📸 Uploading event image using presigned URL (bypasses Nginx)');
  console.log(`   File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Type: ${file.type}`);
  
  try {
    // Step 1: Get presigned URL from backend
    console.log('🔑 Step 1: Getting presigned URL from backend...');
    const presignedResponse = await generatePresignedUploadUrl(file, 'events');  // <-- Change folder name!
    console.log('✅ Got presigned URL:', presignedResponse.s3Key);
    
    // Step 2: Upload directly to S3 (bypasses Nginx!)
    console.log('☁️ Step 2: Uploading directly to S3...');
    await uploadFileToS3(file, presignedResponse.presignedUrl);
    console.log('✅ File uploaded to S3 successfully');
    
    // Step 3: Confirm upload completion to backend
    console.log('✔️ Step 3: Confirming upload with backend...');
    const confirmResponse = await confirmUpload({
      s3Key: presignedResponse.s3Key,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size
    });
    
    console.log('🎉 Event image upload complete!', confirmResponse.fileUrl);
    return confirmResponse.fileUrl;
    
  } catch (error: any) {
    console.error('❌ Event image upload failed:', error);
    throw error;
  }
};
```

### Step 2: Use It in Your Component

```typescript
import { uploadEventImage } from '../services/postApi';

// In your component:
const handleImageUpload = async (file: File) => {
  try {
    setUploading(true);
    const imageUrl = await uploadEventImage(file);
    setEventImage(imageUrl);
    console.log('Image uploaded:', imageUrl);
  } catch (error) {
    console.error('Upload failed:', error);
    setError('Failed to upload image. Please try again.');
  } finally {
    setUploading(false);
  }
};
```

### Step 3: That's It! No Backend Changes Needed!

The backend already supports any folder name. Just pass a descriptive folder like:
- `'events'` → Stored in `s3://bucket/events/originals/uuid.jpg`
- `'announcements'` → Stored in `s3://bucket/announcements/originals/uuid.jpg`
- `'resources'` → Stored in `s3://bucket/resources/originals/uuid.jpg`
- `'chat-media'` → Stored in `s3://bucket/chat-media/originals/uuid.jpg`

---

## 🔧 Existing Helper Functions (Already in postApi.ts)

These are the core functions you'll reuse:

### `generatePresignedUploadUrl(file, folder)`
Gets a secure, temporary URL for uploading to S3.

```typescript
const response = await generatePresignedUploadUrl(file, 'events');
// Returns: { presignedUrl, s3Key, fileUrl, expiresInSeconds }
```

### `uploadFileToS3(file, presignedUrl)`
Uploads the file directly to S3 using the presigned URL.

```typescript
await uploadFileToS3(file, presignedResponse.presignedUrl);
// Throws error if upload fails
```

### `confirmUpload(request)`
Tells the backend the upload is complete so it can process/track the file.

```typescript
const result = await confirmUpload({
  s3Key: presignedResponse.s3Key,
  fileName: file.name,
  contentType: file.type,
  fileSize: file.size
});
// Returns: { fileUrl, success }
```

---

## 🚫 The Old Way (DON'T USE)

This is the pattern that was broken:

```typescript
// ❌ OLD WAY - Goes through Nginx, blocked for large files
const formData = new FormData();
formData.append('file', file);
const response = await api.post('/profile/me/upload-banner', formData);
```

**Why it's bad:**
- File goes through Nginx → 1MB limit blocks iPhone photos
- Slower (file has to go through backend before S3)
- Backend has to buffer entire file in memory

---

## ✅ Checklist for New Upload Features

When adding uploads to a new feature:

- [ ] Use the presigned URL pattern (copy from `uploadBannerImage`)
- [ ] Choose a descriptive folder name (e.g., `'events'`, `'resources'`)
- [ ] Add console.log statements for debugging
- [ ] Handle errors gracefully with user-friendly messages
- [ ] Test on iPhone with a large photo (3MB+)
- [ ] Test on desktop/Android for consistency

---

## 🐛 Troubleshooting

### Upload Still Fails with 413 Error
- You're probably still using the old FormData approach
- Check that you're using `generatePresignedUploadUrl` → `uploadFileToS3` → `confirmUpload`

### "Forbidden" Error from S3
- The presigned URL signature doesn't match what you're sending
- Make sure you're only sending `Content-Type` header in `uploadFileToS3`
- Don't add extra headers like `Authorization` or `Cache-Control`

### Upload Hangs on iPhone
- Check browser console for errors
- Make sure you're not accidentally going through the backend
- The upload should go directly to S3 (check Network tab - should see PUT to `s3.amazonaws.com`)

### File Uploads but URL Returns 404
- The S3 key might be wrong
- Check that `confirmUpload` is being called with the correct `s3Key`
- Verify the file exists in S3 at the expected path

---

## 📊 Summary

| Aspect | Old Approach | New Approach (Presigned URLs) |
|--------|--------------|-------------------------------|
| **Path** | Client → Nginx → Backend → S3 | Client → Backend (URL) → S3 directly |
| **Nginx Limit** | ❌ Blocked by 1MB limit | ✅ Bypassed entirely |
| **iPhone Photos** | ❌ Failed | ✅ Works perfectly |
| **Speed** | Slower (double hop) | Faster (direct to S3) |
| **Backend Memory** | High (buffers file) | Low (only handles JSON) |
| **Industry Standard** | No | Yes (Instagram, X, Facebook use this) |

---

## 📅 History

- **December 2024**: Fixed profile picture and banner uploads to use presigned URLs
- Files changed: `frontend/src/services/postApi.ts`
- No backend changes were needed (presigned URL support already existed)

---

## 🔗 Related Files

- `project-vision.md` - Mentions "Nginx in wrong place" as a known issue
- `AWS_TROUBLESHOOTING_GUIDE.md` - General AWS troubleshooting
- `backend/src/main/java/com/churchapp/service/FileUploadService.java` - Presigned URL generation

---

*Created: December 2024 | Last Updated: December 2024*

