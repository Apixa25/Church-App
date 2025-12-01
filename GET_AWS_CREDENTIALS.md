# 🔑 How to Get AWS Access Keys for S3 File Uploads

## ⚠️ Important: You Need IAM Access Keys, Not Database Credentials

The image you showed is for **database connection** (RDS). For file uploads to work, you need **AWS IAM Access Keys** which are different credentials.

---

## 📋 Step-by-Step Guide to Get AWS Access Keys

### **Step 1: Go to IAM Console**
1. Open **AWS Console** (https://console.aws.amazon.com/)
2. Search for **"IAM"** in the top search bar
3. Click **"IAM"** service

### **Step 2: Navigate to Users**
1. In the left sidebar, click **"Users"**
2. Look for a user that has S3 permissions (or create a new one)

### **Step 3: Create or View Access Keys**
1. Click on the **user name** (e.g., `church-app-deployer` or similar)
2. Click the **"Security credentials"** tab
3. Scroll down to **"Access keys"** section
4. Click **"Create access key"** button

### **Step 4: Configure Access Key**
1. Choose **"Application running outside AWS"** (for Elastic Beanstalk)
2. Check the confirmation box
3. Click **"Next"**
4. Optionally add a description tag
5. Click **"Create access key"**

### **Step 5: Save Your Credentials** ⚠️ **CRITICAL**
You'll see:
- **Access key ID**: `AKIA...` (starts with AKIA)
- **Secret access key**: `wJalrXUtnFEMI/K7MDENG...` (long string)

⚠️ **IMPORTANT:** 
- **Download the CSV file** or **copy both values immediately**
- You **WON'T be able to see the secret key again** after closing this page!
- Save these securely

---

## 🔐 What You Need for Elastic Beanstalk

Once you have the access keys, add these to your Elastic Beanstalk environment:

```
AWS_ACCESS_KEY_ID=AKIA... (your actual access key)
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG... (your actual secret key)
AWS_REGION=us-west-2
AWS_S3_BUCKET=thegathrd-app-uploads
```

---

## 🛡️ Required IAM Permissions

The IAM user needs these permissions:
- **Policy:** `AmazonS3FullAccess` 
  - OR create a custom policy with read/write access to your specific bucket

---

## 📍 Where to Add These in Elastic Beanstalk

1. Go to **Elastic Beanstalk Console**
2. Select your environment (`Church-app-backend-prod`)
3. Click **"Configuration"** tab
4. Scroll to **"Software"** section
5. Click **"Edit"**
6. Scroll to **"Environment properties"**
7. Add the 4 variables above
8. Click **"Apply"** (takes 2-3 minutes to restart)

---

## ✅ After Adding Credentials

1. Wait for environment restart (2-3 minutes)
2. Try uploading a banner image again
3. The 400 error should be resolved!

---

## 🆘 If You Don't Have an IAM User Yet

### Create a New IAM User:
1. Go to **IAM Console** → **Users** → **Create user**
2. Username: `church-app-s3-user`
3. **Attach policies:** `AmazonS3FullAccess`
4. Click **"Create user"**
5. Then follow Steps 3-5 above to create access keys

---

**Need help?** Let me know if you get stuck at any step! 🚀

