# 🔧 Fix S3 Banner Image 403 Forbidden Error

## Problem
Banner images are getting `403 Forbidden` errors when trying to load from S3:
```
GET https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/banner-images/originals/... 403 (Forbidden)
```

## Solution: Update S3 Bucket Policy

The S3 bucket needs a policy that allows public read access for banner images (and other media files).

### Step 1: Go to AWS S3 Console

1. Navigate to: https://console.aws.amazon.com/s3/
2. Click on your bucket: `church-app-uploads-stevensills2`
3. Click on the **"Permissions"** tab
4. Scroll down to **"Bucket policy"**

### Step 2: Add/Update Bucket Policy

Add this policy (or merge with existing policy):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::church-app-uploads-stevensills2/banner-images/*",
        "arn:aws:s3:::church-app-uploads-stevensills2/profile-pictures/*",
        "arn:aws:s3:::church-app-uploads-stevensills2/posts/*",
        "arn:aws:s3:::church-app-uploads-stevensills2/organization-logos/*",
        "arn:aws:s3:::church-app-uploads-stevensills2/thumbnails/*"
      ]
    }
  ]
}
```

### Step 3: Block Public Access Settings

**IMPORTANT:** You also need to allow public access:

1. In the same **"Permissions"** tab
2. Click **"Edit"** under **"Block public access (bucket settings)"**
3. **Uncheck** the following (if checked):
   - ✅ Block public access to buckets and objects granted through new access control lists (ACLs)
   - ✅ Block public access to buckets and objects granted through any access control lists (ACLs)
4. Click **"Save changes"**
5. Type `confirm` when prompted

### Step 4: Verify

After updating the policy:

1. Try loading a banner image in your app
2. Check browser console - should no longer see 403 errors
3. Images should load successfully

## Security Note

This policy allows **public read access** to specific folders. This is safe because:
- ✅ Only `GetObject` (read) is allowed, not `PutObject` (write)
- ✅ Only specific folders are public, not the entire bucket
- ✅ Users can view images but cannot modify or delete them

## Alternative: Use CloudFront

If you prefer not to make S3 public, you can:
1. Keep S3 private
2. Use CloudFront distribution with Origin Access Control (OAC)
3. CloudFront will serve files with signed URLs or public access

This is more complex but provides better security and performance.

---

**After fixing, banner images should load without 403 errors!** ✅

