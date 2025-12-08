# ⚡ Quick CloudFront Fix for Banner Images

## The Problem
Banner images return HTML (login page) instead of images because CloudFront is routing `/banner-images/*` to the frontend app instead of the S3 media bucket.

## Quick Fix (3 Steps)

### 1. Check media-origin Configuration
**Go to:** CloudFront → Origins tab → Edit `media-origin`

**Must have:**
- ✅ "Origin access control settings (recommended)" selected
- ✅ Shows an OAC ID (like `E1LHBYC7TMI4BS`)

**If missing:**
- Select "Origin access control settings"
- Create new OAC: `media-origin-oac`
- Save changes

### 2. Verify S3 Bucket Policy
**Go to:** S3 → `church-app-uploads-stevensills2` → Permissions → Bucket policy

**Must have:**
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

### 3. Wait for Deployment
- Check CloudFront status: Should be "Deployed" (not "Deploying")
- If deploying, wait 5-15 minutes
- Then test the URL again

## Test URL
```
https://d3loytcgioxpml.cloudfront.net/banner-images/originals/0bfc1879-dad8-4852-b684-7020dc7cab38.jpg
```

**Should return:** Image (Content-Type: `image/jpeg`)  
**Currently returns:** HTML page (Content-Type: `text/html`)

---

**Most likely issue:** `media-origin` doesn't have Origin Access Control configured. Fix that first! 🔧

