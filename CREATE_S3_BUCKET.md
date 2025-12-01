# 🪣 Create S3 Bucket for File Uploads

## ✅ Progress Update

Great news! Your AWS credentials are working! 🎉 The error has changed from "Access Key does not exist" to "Bucket does not exist", which means the credentials are correct.

Now you just need to **create the S3 bucket** that the application is trying to use.

---

## 📋 Step-by-Step: Create S3 Bucket

### **Step 1: Go to S3 Console**
1. Open **AWS Console** (https://console.aws.amazon.com/)
2. Search for **"S3"** in the top search bar
3. Click **"S3"** service

### **Step 2: Create Bucket**
1. Click **"Create bucket"** button (top right)
2. **Bucket name:** `thegathrd-app-uploads`
   - ⚠️ **Important:** Bucket names must be globally unique across all AWS accounts
   - If `thegathrd-app-uploads` is taken, try: `thegathrd-app-uploads-[your-account-id]` or `thegathrd-app-uploads-[random-number]`
3. **AWS Region:** `us-west-2` (Oregon)
   - ⚠️ **Must match** your `AWS_REGION` environment variable!

### **Step 3: Configure Bucket Settings**

#### **Object Ownership**
- Choose: **"ACLs disabled (recommended)"** or **"Bucket owner enforced"**

#### **Block Public Access settings**
- For file uploads, you typically want to **uncheck** "Block all public access"
- OR keep it blocked and use presigned URLs (which your app already supports)
- **Recommended:** Keep public access blocked for security

#### **Bucket Versioning**
- **Enable versioning:** Optional (can help with recovery)
- For now, you can leave it disabled

#### **Default encryption**
- **Enable:** Yes (recommended)
- **Encryption type:** Amazon S3 managed keys (SSE-S3) or AWS KMS
- **SSE-S3** is simpler and free

#### **Object Lock**
- Leave **disabled** for now

### **Step 4: Create Bucket**
1. Scroll to bottom
2. Click **"Create bucket"**

---

## 🔧 Update Elastic Beanstalk (If Bucket Name Changed)

If you had to use a different bucket name (because `thegathrd-app-uploads` was taken), update your Elastic Beanstalk environment variable:

1. Go to **Elastic Beanstalk Console** → Your environment
2. Click **"Configuration"** → **"Software"** → **"Edit"**
3. Find `AWS_S3_BUCKET` environment variable
4. Update the value to your actual bucket name
5. Click **"Apply"**

---

## ✅ Verify Bucket Creation

1. Go back to **S3 Console**
2. You should see your new bucket in the list
3. Click on the bucket name to verify it's empty (or check its contents)

---

## 🛡️ Bucket Permissions (Important!)

Make sure your IAM user has permissions to access this bucket:

1. Go to **IAM Console** → **Users** → Your user
2. Check that the user has `AmazonS3FullAccess` policy attached
3. OR create a custom policy with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::thegathrd-app-uploads",
                "arn:aws:s3:::thegathrd-app-uploads/*"
            ]
        }
    ]
}
```

---

## 🧪 Test After Creation

Once the bucket is created:

1. Wait a few seconds for AWS to fully provision it
2. Try uploading a banner image again in your app
3. The 400 error should be resolved! 🎉

---

## 📝 Current Configuration

Based on your setup, the app expects:
- **Bucket name:** `thegathrd-app-uploads`
- **Region:** `us-west-2`
- **Environment variable:** `AWS_S3_BUCKET=thegathrd-app-uploads`

Make sure these all match! ✅

---

**Need help?** Let me know once you've created the bucket and we can test the upload! 🚀

