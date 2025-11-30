# 🌐 Set Up CloudFront Distribution - Step by Step

CloudFront will provide CDN, SSL, and custom domain support for your frontend! This is the final piece before deployment! 🚀

---

## 📋 What We're Creating

- **CloudFront Distribution:** CDN for your S3 bucket
- **SSL Certificate:** For HTTPS (via AWS Certificate Manager)
- **Custom Domain:** www.thegathrd.com
- **Origin Access Control:** Secure access to S3 bucket

---

## 🔐 Step 1: Request SSL Certificate (Do This First!)

### **1.1 Go to Certificate Manager**

1. **Go to:** AWS Console
2. **Search:** "Certificate Manager" or "ACM"
3. **Click:** "Certificate Manager" service
4. **Make sure you're in:** `us-east-1` region (CloudFront requires certificates in us-east-1)
5. **Click:** "Request certificate"

### **1.2 Request Public Certificate**

**Certificate type:**
- ✅ **Request a public certificate**

**Domain names:**
- **Fully qualified domain name:**
  - `*.thegathrd.com` (wildcard - covers all subdomains)
  - `thegathrd.com` (root domain)
- **Add both domains**

**Validation method:**
- ✅ **DNS validation** (recommended)

**Tags:** (optional - skip for now)

**Click:** "Request"

### **1.3 Validate Certificate**

1. **Click on your certificate** in the list
2. **You'll see:** "Create record in Route 53" buttons OR manual DNS validation records
3. **If using GoDaddy DNS:**
   - Copy the CNAME records shown
   - Add them to GoDaddy DNS management
   - Wait for validation (5-30 minutes)

**Example CNAME records you'll need to add:**
```
Type: CNAME
Name: [shown in ACM]
Value: [shown in ACM]
```

**⚠️ Important:** Certificate must be validated before you can use it in CloudFront!

---

## ☁️ Step 2: Create CloudFront Distribution

### **2.1 Navigate to CloudFront**

1. **Go to:** AWS Console
2. **Search:** "CloudFront"
3. **Click:** "CloudFront" service
4. **Click:** "Create distribution"

### **2.2 Origin Settings**

**Origin domain:**
- **Click the dropdown** and select your S3 bucket
- Should show: `thegathrd-app-frontend.s3.us-west-2.amazonaws.com`
- ✅ **DO NOT** select the website endpoint (the one with "website" in the name)

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

**Origin shield:**
- ❌ **Disable** (optional, costs extra)

### **2.3 Default Cache Behavior**

**Viewer protocol policy:**
- ✅ **Redirect HTTP to HTTPS**

**Allowed HTTP methods:**
- ✅ **GET, HEAD, OPTIONS**
- (This is sufficient for static websites)

**Cache policy:**
- **CachingOptimized** (recommended)

**Origin request policy:**
- **None** (or CORS-CustomOrigin if you have CORS issues)

**Response headers policy:**
- **None** (or create custom if needed)

**Compress objects automatically:**
- ✅ **Yes** (saves bandwidth)

### **2.4 Distribution Settings**

**Price class:**
- **Use all edge locations (best performance)** (recommended)
- OR **Use only North America and Europe** (cheaper)

**Alternate domain names (CNAMEs):**
- Add:
  - `www.thegathrd.com`
  - `app.thegathrd.com`
  - `thegathrd.com`

**Custom SSL certificate:**
- **Select:** Your certificate from Step 1 (must be validated!)
- If not validated yet, you can add it later

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

**Web Application Firewall (WAF):**
- ❌ **Do not enable** (optional, costs extra)

### **2.5 Create Distribution**

1. **Review** all settings
2. **Click:** "Create distribution"
3. **Wait:** 5-15 minutes for distribution to deploy

---

## 🔒 Step 3: Update S3 Bucket Policy

After CloudFront distribution is created:

1. **Go to:** S3 Console → Your bucket
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
- It's the 12-digit number

**Click:** "Save changes"

---

## ✅ Step 4: Save Your CloudFront Information

**Distribution ID:** `E...` (starts with E)  
**Distribution domain:** `d1234abcd.cloudfront.net` (example)  
**Status:** Deploying (wait until "Enabled")

---

## 🎯 What's Next?

After CloudFront is set up:
1. ⏭️ **Get SSL certificate validated** (if not done)
2. ⏭️ **Update S3 bucket policy** (Step 3 above)
3. ⏭️ **Build and deploy frontend** to S3
4. ⏭️ **Configure DNS** in GoDaddy
5. ⏭️ **Deploy!** 🎉

---

## 💰 Cost Information

**CloudFront:**
- First 1 TB data transfer: Free (for first 12 months)
- After that: ~$0.085 per GB
- HTTPS requests: Included
- **Estimated cost:** ~$5-15/month for typical traffic

**Total with S3:** ~$5-17/month

---

## 🆘 Troubleshooting

### **Certificate not showing in CloudFront**
- Make sure certificate is in `us-east-1` region
- Make sure certificate is validated (status: "Issued")
- Wait a few minutes after validation

### **Distribution taking too long**
- Normal! CloudFront distributions take 5-15 minutes to deploy
- Check status in CloudFront console

### **S3 bucket policy error**
- Make sure Distribution ID is correct
- Make sure Account ID is correct
- Check that Origin Access Control is created

---

## 📞 Ready to Continue?

Once CloudFront is set up:
1. ✅ SSL certificate requested and validated
2. ✅ CloudFront distribution created
3. ✅ S3 bucket policy updated
4. ⏭️ Build and deploy frontend!

**You're almost there!** 🚀

---

**Last Updated:** [Current Date]
**Status:** Ready for Setup

