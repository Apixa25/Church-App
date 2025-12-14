-- ===================================================
-- Cleanup Script: Remove Incorrectly Tracked MediaFile Records
-- ===================================================
-- 
-- PROBLEM: Profile pictures and banner images were being tracked in the MediaFile table
-- when they shouldn't have been. These are final images that should never be processed
-- or deleted by the cleanup service.
--
-- FIX: The code has been updated to prevent tracking these images going forward.
-- This script removes any existing incorrectly tracked records.
--
-- FOLDERS THAT SHOULD NEVER BE TRACKED:
-- - profile-pictures: User profile pictures (final, never compressed)
-- - banner-images: User banner images (final, never compressed)
-- - banners: User banner images (alternative folder name, final, never compressed)
-- - organizations/logos: Organization logos (final, never compressed)
-- - prayer-requests: Prayer request images (final, never compressed)
--
-- ===================================================

-- Step 1: See how many incorrectly tracked records exist
SELECT 
    folder,
    COUNT(*) as count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM media_files
WHERE folder IN ('profile-pictures', 'banner-images', 'banners', 'organizations/logos', 'prayer-requests')
GROUP BY folder;

-- Step 2: Delete incorrectly tracked MediaFile records for final images
-- These should never have been tracked in the first place
DELETE FROM media_files
WHERE folder IN ('profile-pictures', 'banner-images', 'banners', 'organizations/logos', 'prayer-requests');

-- Step 3: Verify deletion (should return 0 rows)
SELECT COUNT(*) as remaining_incorrect_records
FROM media_files
WHERE folder IN ('profile-pictures', 'banner-images', 'banners', 'organizations/logos', 'prayer-requests');

-- ===================================================
-- NOTE: This only removes database tracking records.
-- The actual image files in S3 are NOT deleted by this script.
-- The images will continue to exist and be accessible.
-- ===================================================

