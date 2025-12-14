# 🚀 Deployment Guide: Profile Image Deletion Fix

## 📋 Overview

This guide walks you through deploying the fix that prevents profile pictures and banner images from being deleted by the automated cleanup service.

## ⚠️ Important: About Restoring Missing Images

**The fix prevents FUTURE deletions but does NOT automatically restore already-deleted images.**

However, **the images likely still exist in S3!** The issue was that:
1. Images were incorrectly tracked in the `MediaFile` table
2. The cleanup service deleted them thinking they were "processed originals"
3. But the actual files may still be in S3 (just not linked in the database)

### What You Need to Do:

1. **Check if images still exist in S3** (they probably do!)
2. **Run the database cleanup script** to remove incorrect `MediaFile` records
3. **Deploy the code fix** to prevent future deletions
4. **Users may need to re-upload** if their database URLs point to deleted files

## 🎯 Deployment Steps

### Step 1: Build New JAR File

```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

This creates: `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`

**Expected output:**
```
✅ JAR file built successfully!
Location: backend\target\church-app-backend-0.0.1-SNAPSHOT.jar
Size: ~50-70 MB
```

---

### Step 2: Clean Up Database (Remove Incorrect MediaFile Records)

The fix prevents future tracking, but we need to clean up any existing incorrect records.

#### Option A: Using PowerShell Script (Recommended)

```powershell
cd backend

# Set database password (you can also set other env vars)
$env:DB_PASSWORD = "Z.jS~w]fvv[W-TyYhB8TlTD_fEG2"
$env:DB_HOST = "your-production-db-host"  # Replace with actual host
$env:DB_PORT = "5432"  # Usually 5432 for production
$env:DB_NAME = "church_app"
$env:DB_USER = "church_user"

# Run cleanup script
.\run-db-cleanup.ps1
```

#### Option B: Using psql Directly

```powershell
# Set password
$env:PGPASSWORD = "Z.jS~w]fvv[W-TyYhB8TlTD_fEG2"

# Connect and run SQL
psql -h your-db-host -p 5432 -U church_user -d church_app -f cleanup_incorrect_mediafile_records.sql
```

#### Option C: Using Database Client (pgAdmin, DBeaver, etc.)

Open `backend/cleanup_incorrect_mediafile_records.sql` in your database client and run it.

**What this does:**
- ✅ Removes `MediaFile` records for `profile-pictures`, `banners`, `banner-images`, etc.
- ✅ **Does NOT delete actual image files in S3** (only removes database tracking)
- ✅ Prevents these images from being deleted by future cleanup runs

---

### Step 3: Deploy JAR to Elastic Beanstalk

#### Option A: Using AWS Console (Easiest)

1. **Go to AWS Console** → Elastic Beanstalk
2. **Select your environment** (e.g., `church-app-api-prod`)
3. **Click "Upload and deploy"**
4. **Choose file**: `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`
5. **Version label**: `profile-image-deletion-fix-2024-12-12` (or any descriptive name)
6. **Description**: "Fix: Prevent profile pictures and banner images from being deleted by cleanup service"
7. **Click "Deploy"**
8. **Wait 5-10 minutes** for deployment to complete

#### Option B: Using AWS CLI Script

```powershell
cd backend
.\deploy-with-aws-cli.ps1 `
    -VersionLabel "profile-image-deletion-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')" `
    -ApplicationName "church-app-backend" `
    -EnvironmentName "church-app-api-prod" `
    -Region "us-west-2"
```

---

### Step 4: Verify Deployment

1. **Check Elastic Beanstalk Health**
   - Go to AWS Console → Elastic Beanstalk → Your Environment
   - Verify health status is "Ok" (green)

2. **Check Application Logs**
   - Go to "Logs" → "Request logs" or "Error logs"
   - Look for startup messages confirming the new version is running

3. **Test Upload**
   - Upload a new profile picture
   - Verify it works and doesn't create a `MediaFile` record

---

## 🔍 Frontend: No Changes Needed

✅ **Frontend does NOT need to be rebuilt or redeployed!**

All changes are backend-only. The frontend will continue to work exactly as before.

---

## ✅ What Gets Fixed

After deployment, the following will be protected from deletion:

- ✅ `profile-pictures/*` - User profile pictures
- ✅ `banners/*` - User banner images (frontend folder)
- ✅ `banner-images/*` - User banner images (backend folder)
- ✅ `organizations/logos/*` - Organization logos
- ✅ `prayer-requests/*` - Prayer request images

These folders will:
- ❌ **Never** be tracked in `MediaFile` table
- ❌ **Never** be processed/compressed
- ❌ **Never** be deleted by cleanup service

---

## 📊 Verification Checklist

After deployment, verify:

- [ ] JAR file built successfully
- [ ] Database cleanup script ran successfully (removed incorrect `MediaFile` records)
- [ ] JAR deployed to Elastic Beanstalk
- [ ] Environment health is "Ok"
- [ ] New profile picture upload works correctly
- [ ] No `MediaFile` records created for profile pictures
- [ ] Existing profile pictures are still accessible (if they exist in S3)

---

## 🆘 Troubleshooting

### Database Connection Issues

If you can't connect to the database:

1. **Check environment variables** are set correctly
2. **Verify database host** is accessible (check AWS RDS console)
3. **Check security groups** allow your IP address
4. **Verify credentials** are correct

### Deployment Issues

If deployment fails:

1. **Check Elastic Beanstalk logs** for errors
2. **Verify JAR file** was built correctly (check file size ~50-70 MB)
3. **Check AWS permissions** (you need Elastic Beanstalk deploy permissions)
4. **Wait for deployment** to complete (can take 5-10 minutes)

### Images Still Missing After Fix

If images are still missing after the fix:

1. **Check if files exist in S3**:
   ```powershell
   aws s3 ls s3://church-app-uploads-stevensills2/profile-pictures/originals/ --recursive
   ```

2. **If files exist in S3 but not showing**:
   - The database URLs might point to wrong locations
   - Users may need to re-upload their images
   - Or we can write a script to re-link existing S3 files to user records

3. **If files don't exist in S3**:
   - They were actually deleted (unlikely, but possible)
   - Users will need to re-upload

---

## 📝 Files Changed

- ✅ `backend/src/main/java/com/churchapp/controller/PostController.java`
- ✅ `backend/src/main/java/com/churchapp/service/FileUploadService.java`
- ✅ `backend/src/main/java/com/churchapp/service/FileCleanupService.java`

## 📝 Files Created

- ✅ `backend/cleanup_incorrect_mediafile_records.sql` - SQL cleanup script
- ✅ `backend/run-db-cleanup.ps1` - PowerShell script to run cleanup
- ✅ `PROFILE_IMAGE_DELETION_FIX.md` - Technical documentation
- ✅ `DEPLOYMENT_GUIDE_PROFILE_IMAGE_FIX.md` - This deployment guide

---

## 🎉 Summary

**Deployment Steps:**
1. ✅ Build JAR: `.\mvnw.cmd clean package -DskipTests`
2. ✅ Clean database: Run `run-db-cleanup.ps1` or SQL script
3. ✅ Deploy JAR: Upload to Elastic Beanstalk (Console or CLI)
4. ✅ Verify: Check health status and test upload

**Time Required:** ~15-20 minutes (mostly waiting for deployment)

**Frontend Changes:** None required ✅

---

**Date:** December 12, 2024
**Issue:** Profile pictures and banner images being deleted
**Status:** Fix ready for deployment 🚀

