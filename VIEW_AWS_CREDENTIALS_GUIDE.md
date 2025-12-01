# 🔑 How to View Your AWS Access Keys and Credentials

This guide shows you **all the ways** to view your AWS access keys and server passwords! 🎯

---

## 📋 Quick Summary

**AWS Access Keys:**
- **Access Key ID**: Can be viewed anytime in AWS Console
- **Secret Access Key**: ⚠️ **ONLY visible once** when created - cannot be retrieved again!

**Where credentials might be stored:**
1. ✅ AWS Console (IAM) - **Access Key ID only**
2. ✅ Local AWS CLI configuration file
3. ✅ Elastic Beanstalk Environment Variables
4. ✅ AWS Secrets Manager (if you set it up)

---

## 🔍 Method 1: View in AWS Console (IAM) - **RECOMMENDED**

### **Step 1: Sign in to AWS Console**
1. Go to: **https://console.aws.amazon.com/**
2. Sign in with your AWS account email and password

### **Step 2: Navigate to IAM**
1. In the top search bar, type: **"IAM"**
2. Click on **"IAM"** service

### **Step 3: View Users**
1. Click **"Users"** in the left sidebar
2. Find your user (likely `church-app-deployer` or similar)
3. **Click on the username** to open details

### **Step 4: View Access Keys**
1. Click the **"Security credentials"** tab
2. Scroll down to **"Access keys"** section
3. You'll see:
   - ✅ **Access Key ID** (starts with `AKIA...`) - **This is visible!**
   - ⚠️ **Secret Access Key** - **Shows as "Hidden"** - cannot be viewed again!

### **⚠️ Important Notes:**
- **Access Key ID** can be viewed anytime
- **Secret Access Key** is **NEVER shown again** after creation
- If you lost your secret key, you must **create a new access key pair**

---

## 💻 Method 2: View Local AWS CLI Credentials File

If you've configured AWS CLI on your computer, credentials are stored locally.

### **Windows Location:**
```
C:\Users\Admin\.aws\credentials
```

### **How to View (PowerShell):**
```powershell
# View the credentials file (will show Access Key ID, but Secret Key might be hidden)
Get-Content "$env:USERPROFILE\.aws\credentials"

# Or open in Notepad
notepad "$env:USERPROFILE\.aws\credentials"
```

### **File Format:**
```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region = us-east-1
```

### **⚠️ Security Warning:**
- This file contains **sensitive credentials**
- **Never share this file** or commit it to Git
- Keep it secure on your computer

---

## ☁️ Method 3: View in Elastic Beanstalk Environment Variables

If you've deployed your backend to Elastic Beanstalk, credentials might be stored there.

### **Step 1: Go to Elastic Beanstalk Console**
1. Sign in to **AWS Console**: https://console.aws.amazon.com/
2. Search for **"Elastic Beanstalk"** in the top bar
3. Click on **"Elastic Beanstalk"** service

### **Step 2: Select Your Environment**
1. Click on your environment (e.g., `Church-app-backend-prod`)
2. Click **"Configuration"** tab (left sidebar)

### **Step 3: View Environment Variables**
1. Scroll to **"Software"** section
2. Click **"Edit"** button
3. Scroll to **"Environment properties"**
4. Look for:
   - `AWS_ACCESS_KEY_ID` - **This will show the value!**
   - `AWS_SECRET_ACCESS_KEY` - **This will show the value!** (if you set it)

### **⚠️ Note:**
- Environment variables in Elastic Beanstalk are **visible** to anyone with console access
- They're used by your application at runtime
- **Access Key ID** will be visible
- **Secret Access Key** will be visible (if you added it)

---

## 🗄️ Method 4: View Database Password (RDS)

Your database password is stored in Elastic Beanstalk environment variables.

### **In Elastic Beanstalk:**
1. Follow **Method 3** steps above
2. Look for: `DB_PASSWORD`
3. This is your **PostgreSQL database password**

### **Or Check Your Documentation:**
According to your `ELASTIC_BEANSTALK_ENV_VARS.md`:
```
DB_PASSWORD=Z.jS~w]fvv[W-TyYhB8TlTD_fEG2
```

**⚠️ Security Note:** This password is visible in your environment variables file. Consider rotating it if it's been exposed.

---

## 🔐 Method 5: View AWS Account Password (Root Account)

Your **AWS account password** (for signing into the console) is:
- The password you created when you signed up for AWS
- **Cannot be viewed** - it's encrypted
- If you forgot it, use **"Forgot Password"** on the AWS sign-in page

### **To Reset AWS Account Password:**
1. Go to: **https://console.aws.amazon.com/**
2. Click **"Forgot your password?"**
3. Enter your email
4. Follow the reset instructions

---

## 🆘 What If I Lost My Secret Access Key?

If you lost your **Secret Access Key**, you have two options:

### **Option 1: Create New Access Key (Recommended)**
1. Go to **IAM Console** → **Users** → Your user
2. **"Security credentials"** tab
3. Scroll to **"Access keys"**
4. Click **"Create access key"**
5. **⚠️ Save the new secret key immediately!**
6. Update your applications with the new keys
7. **Delete the old access key** (after updating everything)

### **Option 2: Use IAM Roles (Best Practice)**
Instead of access keys, use **IAM Roles** for:
- EC2 instances
- Elastic Beanstalk applications
- Lambda functions

This is more secure because:
- No keys to manage
- Automatic credential rotation
- Better security

---

## 📝 Quick Reference: Where to Find Each Credential

| Credential Type | Where to Find | Can View Again? |
|----------------|--------------|-----------------|
| **AWS Access Key ID** | IAM Console → Users → Security credentials | ✅ Yes |
| **AWS Secret Access Key** | Only when created | ❌ No (must create new) |
| **AWS Account Password** | Cannot view (encrypted) | 🔄 Reset only |
| **Database Password** | Elastic Beanstalk env vars | ✅ Yes |
| **Local AWS CLI Keys** | `~/.aws/credentials` | ✅ Yes |

---

## 🔒 Security Best Practices

1. **✅ Never share credentials** publicly
2. **✅ Rotate access keys** every 90 days
3. **✅ Use IAM roles** instead of access keys when possible
4. **✅ Enable MFA** on your AWS account
5. **✅ Monitor access** with CloudTrail
6. **✅ Store secrets** in AWS Secrets Manager (not in code)

---

## 🎯 Quick Commands Reference

### **View AWS CLI Configuration:**
```powershell
# Check if AWS CLI is installed
aws --version

# View current configuration
aws configure list

# View credentials file location
echo $env:USERPROFILE\.aws\credentials
```

### **View Credentials File:**
```powershell
# View in PowerShell (be careful - shows secrets!)
Get-Content "$env:USERPROFILE\.aws\credentials"

# Open in Notepad
notepad "$env:USERPROFILE\.aws\credentials"
```

### **Test AWS Access:**
```powershell
# Test if credentials work
aws sts get-caller-identity
```

---

## 📞 Need Help?

If you need to:
- **Create new access keys**: Follow Method 1, Step 4
- **View database password**: Check Elastic Beanstalk env vars (Method 3)
- **Reset AWS account password**: Use "Forgot Password" on AWS sign-in page
- **Set up IAM roles**: See `AWS_SETUP_GUIDE.md`

---

**Last Updated:** [Current Date]
**Status:** Ready to Use ✅

