# 🔍 Verify S3 Bucket Policy for CloudFront

## Current Issue
- CloudFront behavior is matching (`/banner-images/*` → `media-origin`)
- But CloudFront gets an error when accessing S3
- Header shows: `X-Cache: Error from cloudfront`
- Falls back to default behavior (frontend app)

## Root Cause
The S3 bucket policy is likely missing or incorrect. Even though OAC is configured on CloudFront, the S3 bucket must explicitly allow CloudFront to access it.

## Required S3 Bucket Policy

Go to: **S3 Console → `church-app-uploads-stevensills2` → Permissions → Bucket policy**

The policy should look like this:

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

## Key Points

1. **Principal:** Must be `"Service": "cloudfront.amazonaws.com"` (not `"*"`)
2. **Action:** `"s3:GetObject"` (read only)
3. **Resource:** Your bucket ARN with `/*` wildcard
4. **Condition:** Must match your CloudFront distribution ARN exactly

## How to Get the Exact Policy

1. Go to CloudFront Console → Origins tab
2. Click "Edit" on `media-origin`
3. Look for blue banner with "Copy policy" button
4. Click "Copy policy" - this gives you the EXACT policy needed
5. Apply it to S3 bucket

## Verification Steps

1. **Check S3 bucket policy exists:**
   - S3 Console → Bucket → Permissions → Bucket policy
   - Should have a policy (not empty)

2. **Verify policy allows CloudFront:**
   - Look for `"Service": "cloudfront.amazonaws.com"`
   - Look for your distribution ARN in the Condition

3. **Check for syntax errors:**
   - AWS will show validation errors if JSON is invalid
   - Make sure all quotes, brackets, and commas are correct

4. **Test again:**
   - Wait 1-2 minutes after updating policy
   - Test the banner image URL
   - Should now return image instead of HTML

## Common Mistakes

❌ **Wrong Principal:**
```json
"Principal": "*"  // WRONG - this allows public access
```

✅ **Correct Principal:**
```json
"Principal": {
  "Service": "cloudfront.amazonaws.com"  // CORRECT
}
```

❌ **Missing Condition:**
```json
// WRONG - allows ALL CloudFront distributions
```

✅ **Correct with Condition:**
```json
"Condition": {
  "StringEquals": {
    "AWS:SourceArn": "arn:aws:cloudfront::060163370478:distribution/E2SM4EXV57KO8B"
  }
}
```

---

**The `X-Cache: Error from cloudfront` header confirms CloudFront is trying to use media-origin but can't access S3. Fix the bucket policy and it should work!** 🔧

