# ✅ Apply S3 Bucket Policy for CloudFront

## The Policy (Copy This Exactly)

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

## Steps to Apply

### Step 1: Go to S3 Bucket
1. Navigate to: https://console.aws.amazon.com/s3/
2. Click on bucket: `church-app-uploads-stevensills2`
3. Click **"Permissions"** tab
4. Scroll down to **"Bucket policy"**
5. Click **"Edit"**

### Step 2: Replace Policy
1. **Delete** the entire existing policy (if any)
2. **Paste** the policy above (exactly as shown)
3. Click **"Save changes"**

### Step 3: Verify
- Should see: "Bucket policy updated successfully"
- No error messages
- Policy shows in the bucket policy editor

### Step 4: Wait & Test
1. Wait 1-2 minutes for policy to propagate
2. Test the banner image URL:
   ```
   https://d3loytcgioxpml.cloudfront.net/banner-images/originals/0bfc1879-dad8-4852-b684-7020dc7cab38.jpg
   ```

## Expected Result

**Before (Current):**
- Status: 200
- Content-Type: `text/html`
- Shows: Login page
- Header: `X-Cache: Error from cloudfront`

**After (Fixed):**
- Status: 200
- Content-Type: `image/jpeg`
- Shows: Banner image
- Header: `X-Cache: Hit from cloudfront` or `X-Cache: Miss from cloudfront`

---

**This policy allows CloudFront (via OAC) to access your private S3 bucket. Once applied, banner images should load!** ✅

