# ☁️ Set Up S3 for Frontend Hosting - Step by Step

Let's set up S3 to host your React frontend! This is exciting - we're getting close to deployment! 🚀

---

## 📋 What We're Creating

- **S3 Bucket:** To store your frontend files
- **Static Website Hosting:** Enabled for SPA routing
- **Bucket Policy:** For CloudFront access (we'll set up CloudFront next)
- **Region:** `us-west-2` (to match your database)

---

## 🚀 Step 1: Create S3 Bucket

### **1.1 Navigate to S3 Console**

1. **Go to:** https://console.aws.amazon.com/
2. **Search:** "S3" in the top search bar
3. **Click:** "S3" service
4. **Click:** "Create bucket" (orange button)

### **1.2 General Configuration**

**Bucket name:**
```
thegathrd-app-frontend
```
⚠️ **Note:** S3 bucket names must be globally unique. If this name is taken, try:
- `thegathrd-app-frontend-[your-initials]`
- `thegathrd-frontend-[random-number]`
- `thegathrd-app-[your-name]`

**AWS Region:**
```
us-west-2 (Oregon)
```
✅ **Important:** Use `us-west-2` to match your database region!

**Object Ownership:**
- ✅ **ACLs disabled (recommended)**
- This is the default and recommended setting

### **1.3 Block Public Access Settings**

**For CloudFront (recommended approach):**
- ✅ **Keep "Block all public access" ENABLED**
- We'll use CloudFront Origin Access Control (OAC) to access the bucket
- This is more secure than public access

**OR for simpler setup (if not using CloudFront initially):**
- ❌ **Uncheck "Block all public access"**
- ⚠️ **Only do this if you're not using CloudFront**

**For now, let's keep it blocked** - we'll set up CloudFront next!

### **1.4 Bucket Versioning**

- ✅ **Enable versioning**
- This helps with rollbacks and recovery

### **1.5 Default Encryption**

- ✅ **Enable encryption**
- **Encryption type:** Amazon S3 managed keys (SSE-S3)
- This is free and sufficient for most use cases

### **1.6 Advanced Settings**

**Object Lock:**
- ❌ **Disable** (not needed for frontend hosting)

**Click:** "Create bucket"

---

## ✅ Step 2: Configure Static Website Hosting

### **2.1 Enable Static Website Hosting**

1. **Click on your bucket:** `thegathrd-app-frontend`
2. **Go to:** "Properties" tab
3. **Scroll to:** "Static website hosting" section
4. **Click:** "Edit"

### **2.2 Configure Hosting**

**Static website hosting:**
- ✅ **Enable**

**Hosting type:**
- ✅ **Host a static website**

**Index document:**
```
index.html
```

**Error document:**
```
index.html
```
⚠️ **Important:** Use `index.html` for both! This allows React Router to handle client-side routing.

**Click:** "Save changes"

---

## 🔒 Step 3: Configure Bucket Policy (For CloudFront)

**We'll do this after creating CloudFront distribution** (next step), but here's what we'll need:

The bucket policy will allow CloudFront to access the bucket using Origin Access Control (OAC).

**For now, you can skip this step** - we'll configure it when we set up CloudFront.

---

## 📝 Step 4: Save Your Bucket Information

**Bucket name:** `thegathrd-app-frontend`  
**Region:** `us-west-2`  
**Website endpoint:** (will be shown in Properties → Static website hosting)

---

## ✅ Step 5: Verify Bucket is Ready

1. ✅ Bucket created
2. ✅ Static website hosting enabled
3. ✅ Index document: `index.html`
4. ✅ Error document: `index.html`
5. ✅ Encryption enabled
6. ✅ Versioning enabled

---

## 🎯 What's Next?

After S3 is set up:
1. ⏭️ **Set up CloudFront distribution** (for CDN and SSL)
2. ⏭️ **Build and upload frontend** to S3
3. ⏭️ **Configure DNS** to point to CloudFront

---

## 💰 Cost Information

**S3 Storage:**
- First 5 GB: Free
- After that: ~$0.023 per GB/month
- For a typical React app: ~$0.10-0.50/month

**S3 Requests:**
- GET requests: $0.0004 per 1,000 requests
- Very affordable for most traffic

**Total estimated cost:** ~$0.50-2/month for typical usage

---

## 🆘 Troubleshooting

### **Bucket name already exists**
- S3 bucket names are globally unique
- Try adding your initials or a number
- Example: `thegathrd-app-frontend-ss`

### **Can't enable static website hosting**
- Make sure you're in the "Properties" tab
- Check that you selected "Host a static website"

### **Region not available**
- Make sure you're using `us-west-2`
- Some regions may have different names in the console

---

## 📞 Ready to Continue?

Once your S3 bucket is created and configured, let me know and we'll:
1. Set up CloudFront distribution
2. Configure the bucket policy
3. Build and deploy your frontend!

**You're doing amazing!** 🎉

---

**Last Updated:** [Current Date]
**Status:** Ready for Setup

