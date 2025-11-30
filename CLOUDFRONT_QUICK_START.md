# 🌐 CloudFront Distribution - Quick Start Guide

Your SSL certificate is validated! Now let's create the CloudFront distribution to serve your frontend with HTTPS and CDN! 🚀

---

## ✅ Prerequisites (All Done!)

- ✅ S3 bucket created: `thegathrd-app-frontend`
- ✅ SSL certificate validated: `a662a418-f25d-4c11-8389-31447daefda2`
- ✅ Static website hosting enabled on S3

---

## 🚀 Step 1: Create CloudFront Distribution

### **1.1 Navigate to CloudFront**

1. **Go to:** AWS Console
2. **Search:** "CloudFront"
3. **Click:** "CloudFront" service
4. **Click:** "Create distribution" (orange button)

### **1.2 Origin Settings**

**Origin domain:**
- **Click the dropdown** and select: `thegathrd-app-frontend.s3.us-west-2.amazonaws.com`
- ⚠️ **Important:** Select the S3 bucket endpoint, NOT the website endpoint
- Should show: `thegathrd-app-frontend.s3.us-west-2.amazonaws.com`

**Name:**
- Auto-filled (you can change if needed)

**Origin access:**
- ✅ **Origin access control settings (recommended)**
- **Click:** "Create control setting"

**Origin access control settings:**
- **Name:** `thegathrd-s3-oac`
- **Signing behavior:** Sign requests (recommended)
- **Origin type:** S3
- **Click:** "Create"

**Origin path:**
- Leave empty

### **1.3 Default Cache Behavior**

**Viewer protocol policy:**
- ✅ **Redirect HTTP to HTTPS**

**Allowed HTTP methods:**
- ✅ **GET, HEAD, OPTIONS**

**Cache policy:**
- **CachingOptimized** (recommended)

**Origin request policy:**
- **None** (or CORS-CustomOrigin if needed later)

**Compress objects automatically:**
- ✅ **Yes**

### **1.4 Distribution Settings**

**Price class:**
- **Use all edge locations (best performance)** (recommended)

**Alternate domain names (CNAMEs):**
- Add these (one per line):
  ```
  www.thegathrd.com
  app.thegathrd.com
  thegathrd.com
  ```

**Custom SSL certificate:**
- **Select:** `*.thegathrd.com` (your validated certificate)
- Should show: `a662a418-f25d-4c11-8389-31447daefda2`

**Default root object:**
```
index.html
```

**Custom error responses:**
- **Click:** "Create custom error response"
- **HTTP error code:** `403`
- **Response page path:** `/index.html`
- **HTTP response code:** `200`
- **Click:** "Create"
- **Repeat for:** `404` error code

**Comment:**
- `Church App Frontend CDN` (optional)

### **1.5 Create Distribution**

1. **Review** all settings
2. **Click:** "Create distribution"
3. **Wait:** 5-15 minutes for deployment

---

## 🔒 Step 2: Update S3 Bucket Policy

**After CloudFront distribution is created:**

1. **Go to:** S3 Console → `thegathrd-app-frontend` bucket
2. **Go to:** "Permissions" tab
3. **Scroll to:** "Bucket policy"
4. **Click:** "Edit"

**Add this policy** (replace `YOUR_DISTRIBUTION_ID` and `YOUR_ACCOUNT_ID`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::thegathrd-app-frontend/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

**To find your Distribution ID:**
- Go to CloudFront Console
- Click on your distribution
- Copy the Distribution ID (starts with `E`)

**To find your Account ID:**
- Top right of AWS Console (next to your username)
- It's the 12-digit number: `060163370478`

**Example (with your account ID):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontAccess",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::thegathrd-app-frontend/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::060163370478:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

**Click:** "Save changes"

---

## ✅ Step 3: Save Your CloudFront Information

After distribution is created, save:
- **Distribution ID:** `E...` (starts with E)
- **Distribution domain:** `d1234abcd.cloudfront.net` (example)
- **Status:** Deploying → Enabled (wait until "Enabled")

---

## 🎯 What's Next?

After CloudFront is set up:
1. ✅ **Build frontend** for production
2. ✅ **Upload to S3**
3. ✅ **Invalidate CloudFront cache**
4. ✅ **Configure DNS** in GoDaddy
5. ✅ **Deploy!** 🎉

---

## ⏱️ Timeline

- **CloudFront creation:** 5-15 minutes
- **Status:** "Deploying" → "Enabled"
- **Once enabled:** Ready to use!

---

## 🆘 Troubleshooting

### **Certificate not showing**
- Make sure you're looking at the right certificate
- Certificate must be in `us-east-1` region
- Should show status "Issued"

### **Distribution taking long**
- Normal! Takes 5-15 minutes
- Check status in CloudFront console

### **S3 bucket policy error**
- Make sure Distribution ID is correct (starts with `E`)
- Make sure Account ID is correct: `060163370478`
- Check Origin Access Control is created

---

**Ready to create your CloudFront distribution!** 🚀

---

**Last Updated:** [Current Date]
**Status:** Ready to Create

