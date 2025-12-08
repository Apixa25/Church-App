# 🔧 CloudFront Banner Image Troubleshooting

## Current Issue
Banner image URL returns HTML (React app) instead of the image:
- URL: `https://d3loytcgioxpml.cloudfront.net/banner-images/originals/0bfc1879-dad8-4852-b684-7020dc7cab38.jpg`
- Response: Status 200, Content-Type: `text/html` (should be `image/jpeg`)
- Result: Shows login page instead of image

## Root Cause
The `/banner-images/*` behavior exists but isn't working because:
1. **Distribution still deploying** - Changes take 5-15 minutes
2. **media-origin missing Origin Access Control** - Can't access S3, falls back to default behavior
3. **S3 bucket policy not configured** - CloudFront can't access the bucket

## Step-by-Step Fix

### Step 1: Verify Distribution Status
1. Go to CloudFront Console → Distribution `E2SM4EXV57KO8B`
2. Check status at top:
   - ✅ **"Deployed"** = Ready to test
   - ⏳ **"Deploying"** = Wait 5-15 minutes
3. If deploying, wait until it shows "Deployed"

### Step 2: Verify media-origin Has Origin Access Control
1. Go to **"Origins"** tab
2. Click **"Edit"** on `media-origin`
3. Check **"Origin access"** section:
   - ✅ **Should show:** An OAC ID (like `E1LHBYC7TMI4BS`)
   - ❌ **Problem if:** Empty or shows "Public"
4. If empty or "Public":
   - Select **"Origin access control settings (recommended)"**
   - Click **"Create control setting"** or select existing
   - Name: `media-origin-oac`
   - Signing: "Sign requests (recommended)"
   - Click **"Create"** then **"Save changes"**

### Step 3: Verify S3 Bucket Policy
1. Go to S3 Console → `church-app-uploads-stevensills2` → **Permissions** → **Bucket policy**
2. Should have policy like this:

```json
{
  "Version": "2008-10-17",
  "Id": "PolicyForCloudFrontPrivateContent",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::church-app-uploads-stevensills2/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::060163370478:distribution/E2SM4EXV57KO8B"
        }
      }
    }
  ]
}
```

3. If missing or wrong, update it

### Step 4: Verify Behavior Configuration
1. Go to **"Behaviors"** tab
2. Find `/banner-images/*` behavior (Precedence 4)
3. Click **"Edit"**
4. Verify:
   - **Path pattern:** `/banner-images/*`
   - **Origin or origin group:** `media-origin`
   - **Viewer protocol policy:** "Redirect HTTP to HTTPS" or "HTTPS only"
   - **Cache policy:** "CachingOptimized" (or "CachingDisabled" for testing)
5. Click **"Save changes"**

### Step 5: Invalidate CloudFront Cache (If Needed)
If behavior is correct but still not working:
1. Go to **"Invalidations"** tab
2. Click **"Create invalidation"**
3. Enter path: `/banner-images/*`
4. Click **"Create invalidation"**
5. Wait 1-2 minutes for completion

### Step 6: Test Again
After all fixes and deployment completes:
```
https://d3loytcgioxpml.cloudfront.net/banner-images/originals/0bfc1879-dad8-4852-b684-7020dc7cab38.jpg
```

**Expected:**
- Status: 200
- Content-Type: `image/jpeg`
- Image displays in browser

## Quick Diagnostic Checklist

- [ ] Distribution status is "Deployed" (not "Deploying")
- [ ] `media-origin` has Origin Access Control configured (shows OAC ID)
- [ ] S3 bucket policy allows CloudFront service principal
- [ ] `/banner-images/*` behavior points to `media-origin`
- [ ] Behavior is above default `*` behavior in precedence
- [ ] CloudFront cache invalidated (if needed)

## Common Issues

### Issue 1: Still Getting HTML
**Cause:** Behavior not matching or media-origin can't access S3
**Fix:** 
- Verify behavior path pattern is `/banner-images/*` (with leading slash)
- Verify media-origin has OAC configured
- Verify S3 bucket policy is correct

### Issue 2: 403 Forbidden
**Cause:** S3 bucket policy not allowing CloudFront
**Fix:** Update S3 bucket policy with CloudFront service principal

### Issue 3: 404 Not Found
**Cause:** File doesn't exist in S3 or wrong path
**Fix:** Verify file exists at: `banner-images/originals/0bfc1879-dad8-4852-b684-7020dc7cab38.jpg`

## Testing Commands

### PowerShell Test:
```powershell
$response = Invoke-WebRequest -Uri "https://d3loytcgioxpml.cloudfront.net/banner-images/originals/0bfc1879-dad8-4852-b684-7020dc7cab38.jpg" -Method Head
Write-Host "Status: $($response.StatusCode)"
Write-Host "Content-Type: $($response.Headers['Content-Type'])"
```

**Expected Output:**
```
Status: 200
Content-Type: image/jpeg
```

**Current Output (Problem):**
```
Status: 200
Content-Type: text/html
```

---

**Once all steps are complete and distribution is deployed, the image should load correctly!** ✅

