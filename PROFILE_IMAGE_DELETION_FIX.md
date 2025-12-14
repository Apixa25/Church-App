# 🔒 Profile Picture & Banner Image Deletion Fix

## 🚨 Problem Summary

Profile pictures and banner images for users (like Sheena Toohey and Terry Sills) were going missing because they were being incorrectly tracked in the `MediaFile` table and deleted by the automated cleanup service.

### Root Causes Identified

1. **Missing Final Image Check in `handleUploadCompletion`**: The presigned URL upload flow (used by iPhone users) was creating `MediaFile` records for ALL images, including final images that should never be tracked.

2. **Folder Name Mismatch**: The frontend uses `"banners"` folder for banner images, but the cleanup service only checked for `"banner-images"`, so some banner images weren't being protected.

3. **Hardcoded Folder in Controller**: The `confirmUpload` endpoint was hardcoding `"posts"` as the folder instead of extracting it from the S3 key, which caused incorrect folder tracking.

## ✅ Fixes Implemented

### 1. Added Final Image Check in `handleUploadCompletion`
**File**: `backend/src/main/java/com/churchapp/service/FileUploadService.java`

- Added the same final image exclusion logic that exists in `uploadFile` method
- Now checks for `profile-pictures`, `banners`, `banner-images`, `organizations/logos`, and `prayer-requests` folders
- These final images are no longer tracked in the `MediaFile` table

### 2. Fixed Folder Extraction in Controller
**File**: `backend/src/main/java/com/churchapp/controller/PostController.java`

- Added `extractFolderFromS3Key()` helper method
- Now correctly extracts the folder name from the S3 key instead of hardcoding `"posts"`
- Ensures profile pictures and banner images are identified correctly

### 3. Updated Cleanup Service Protection
**File**: `backend/src/main/java/com/churchapp/service/FileCleanupService.java`

- Added `"banners"` folder to the protection list (in addition to `"banner-images"`)
- Added additional safety logging to detect any final images that somehow get tracked
- This is a **double safety check** - even if a record is incorrectly created, the cleanup service won't delete it

### 4. Updated `uploadFile` Method for Consistency
**File**: `backend/src/main/java/com/churchapp/service/FileUploadService.java`

- Added `"banners"` folder check to the existing `uploadFile` method
- Ensures consistency across both upload paths

## 🛡️ Protected Folders (Will Never Be Deleted)

The following folders are now protected from tracking and deletion:

- ✅ `profile-pictures` - User profile pictures
- ✅ `banners` - User banner images (frontend folder name)
- ✅ `banner-images` - User banner images (backend folder name)
- ✅ `organizations/logos` - Organization logos
- ✅ `prayer-requests` - Prayer request images

## 📊 Current Status

### Images in S3
✅ Profile pictures exist in: `s3://church-app-uploads-stevensills2/profile-pictures/originals/`
✅ Banner images exist in:
  - `s3://church-app-uploads-stevensills2/banners/originals/`
  - `s3://church-app-uploads-stevensills2/banner-images/originals/`

### Database Cleanup
⚠️ **Action Required**: Run the cleanup script to remove any incorrectly tracked `MediaFile` records:

```sql
-- See cleanup_incorrect_mediafile_records.sql
DELETE FROM media_file
WHERE folder IN ('profile-pictures', 'banner-images', 'banners', 'organizations/logos', 'prayer-requests');
```

This only removes database tracking records - **it does NOT delete the actual image files in S3**.

## 🔍 Verification Steps

1. **Check S3**: Verify images still exist using AWS CLI:
   ```bash
   aws s3 ls s3://church-app-uploads-stevensills2/profile-pictures/originals/ --recursive
   aws s3 ls s3://church-app-uploads-stevensills2/banners/originals/ --recursive
   aws s3 ls s3://church-app-uploads-stevensills2/banner-images/originals/ --recursive
   ```

2. **Check Database**: Verify no final images are tracked:
   ```sql
   SELECT COUNT(*) FROM media_file 
   WHERE folder IN ('profile-pictures', 'banner-images', 'banners');
   -- Should return 0 after cleanup
   ```

3. **Test New Uploads**: Upload a new profile picture or banner image and verify:
   - Image is saved to S3 ✅
   - No `MediaFile` record is created ✅
   - Image remains accessible ✅

## 🚀 Deployment

1. Deploy the updated code to production
2. Run the cleanup SQL script to remove incorrect `MediaFile` records
3. Monitor logs for the safety check warnings (should not appear)
4. Inform users that the issue is fixed and they can re-upload if needed

## 📝 Code Changes Summary

- **3 files modified**: `PostController.java`, `FileUploadService.java`, `FileCleanupService.java`
- **1 helper method added**: `extractFolderFromS3Key()` in `PostController`
- **1 cleanup script created**: `cleanup_incorrect_mediafile_records.sql`

## 🎯 Impact

- ✅ Profile pictures will never be deleted by cleanup service
- ✅ Banner images will never be deleted by cleanup service  
- ✅ Existing images in S3 are safe (only database records removed)
- ✅ Future uploads will be correctly handled
- ✅ Multiple layers of protection prevent future issues

---

**Date Fixed**: December 12, 2024
**Issue**: Profile pictures and banner images being deleted by automated cleanup
**Status**: ✅ RESOLVED - Code fixes implemented, cleanup script ready

