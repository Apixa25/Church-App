# ⚙️ Configure CloudFront Distribution - Final Steps

Your CloudFront distribution is created! Now let's configure it properly. 🚀

---

## 📋 Distribution Information

- **Distribution ID:** `E2SM4EXV57KO8B`
- **Domain:** `d3loytcgioxpml.cloudfront.net`
- **Status:** Deploying (5-15 minutes)
- **Account ID:** `060163370478`

---

## ⚙️ Step 1: Configure Distribution Settings

### **1.1 Click "Edit" Button**

In the "Settings" section, click the blue **"Edit"** button (top right of Settings card).

### **1.2 Configure Settings**

**Default root object:**
- Enter: `index.html`

**Alternate domain names (CNAMEs):**
- Click **"Add domain"** button
- Add these domains (one at a time or all at once):
  - `www.thegathrd.com`
  - `app.thegathrd.com`
  - `thegathrd.com`

**Custom SSL certificate:**
- **Select:** `*.thegathrd.com` (your validated certificate)
- Should show: `a662a418-f25d-4c11-8389-31447daefda2`

**Click:** "Save changes" at the bottom

---

## 🔧 Step 2: Configure Custom Error Responses

### **2.1 Go to Error Pages Tab**

1. **Click:** "Error pages" tab (in the navigation tabs)
2. **Click:** "Create custom error response"

### **2.2 Add Error Response for 403**

**HTTP error code:**
- Select: `403: Forbidden`

**Response page path:**
- Enter: `/index.html`

**HTTP response code:**
- Select: `200: OK`

**Error caching minimum TTL:**
- `10` (seconds)

**Click:** "Create custom error response"

### **2.3 Add Error Response for 404**

**Repeat the same process:**
- **HTTP error code:** `404: Not Found`
- **Response page path:** `/index.html`
- **HTTP response code:** `200: OK`
- **Error caching minimum TTL:** `10`

**Click:** "Create custom error response"

---

## 🔒 Step 3: Update S3 Bucket Policy

### **3.1 Go to S3 Console**

1. **Go to:** S3 Console
2. **Click on:** `thegathrd-app-frontend` bucket
3. **Go to:** "Permissions" tab
4. **Scroll to:** "Bucket policy"
5. **Click:** "Edit"

### **3.2 Add Bucket Policy**

**Paste this policy** (replace `E2SM4EXV57KO8B` with your Distribution ID if different):

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
          "AWS:SourceArn": "arn:aws:cloudfront::060163370478:distribution/E2SM4EXV57KO8B"
        }
      }
    }
  ]
}
```

**Click:** "Save changes"

---

## ✅ Step 4: Verify Configuration

### **Check These Settings:**

1. ✅ **Default root object:** `index.html`
2. ✅ **Alternate domain names:** `www.thegathrd.com`, `app.thegathrd.com`, `thegathrd.com`
3. ✅ **SSL certificate:** `*.thegathrd.com` selected
4. ✅ **Custom error responses:** 403 → 200 → `/index.html`, 404 → 200 → `/index.html`
5. ✅ **S3 bucket policy:** Updated with CloudFront ARN

---

## ⏳ Step 5: Wait for Deployment

**Status:** Currently "Deploying"

**Timeline:**
- **5-15 minutes** for distribution to be fully deployed
- Status will change from "Deploying" to "Enabled"

**You can check status:**
- Refresh the page
- Look at "Last modified" - should show "Enabled" when done

---

## 🎯 What's Next?

After distribution is enabled:
1. ✅ **Build frontend** for production
2. ✅ **Upload to S3**
3. ✅ **Invalidate CloudFront cache**
4. ✅ **Configure DNS** in GoDaddy
5. ✅ **Deploy!** 🎉

---

## 📝 Quick Reference

**Distribution ID:** `E2SM4EXV57KO8B`  
**Distribution Domain:** `d3loytcgioxpml.cloudfront.net`  
**Account ID:** `060163370478`  
**S3 Bucket:** `thegathrd-app-frontend`

---

**Once configured, we're ready to deploy!** 🚀

---

**Last Updated:** [Current Date]
**Status:** Configuration in Progress

