# 🚀 AWS Account Setup Guide - Step by Step

This guide will walk you through setting up your AWS account for deploying the Church App.

---

## 📋 Prerequisites Checklist

Before we start, make sure you have:
- [ ] Email address (for AWS account)
- [ ] Credit card (for AWS account - won't be charged initially)
- [ ] Phone number (for verification)
- [ ] About 30 minutes of time

---

## 🔐 STEP 1: Create AWS Account

### **1.1 Sign Up for AWS**

1. **Go to:** https://aws.amazon.com/
2. **Click:** "Create an AWS Account" (top right)
3. **Enter your email address** and choose a password
4. **Account name:** Use something like "Church App" or "The Gathering"

### **1.2 Complete Account Details**

1. **Contact Information:**
   - Full name
   - Company name (optional - can use "The Gathering")
   - Phone number
   - Country/Region

2. **Payment Information:**
   - Credit card details (required, but won't be charged unless you use services)
   - Billing address

3. **Identity Verification:**
   - AWS will call your phone number
   - Enter the PIN code they provide

### **1.3 Select Support Plan**

- **Choose:** "Basic Plan" (Free)
  - This is sufficient for now
  - You can upgrade later if needed

### **1.4 Account Created! ✅**

- You'll receive a confirmation email
- **Important:** Save your AWS account email and password securely

---

## 👤 STEP 2: Create IAM User (Best Practice)

**Why?** Never use your root account for daily operations. Create a separate IAM user.

### **2.1 Access IAM Console**

1. **Sign in to AWS Console:** https://console.aws.amazon.com/
2. **Search for "IAM"** in the top search bar
3. **Click:** "IAM" service

### **2.2 Create IAM User**

1. **Click:** "Users" (left sidebar)
2. **Click:** "Create user" button
3. **User name:** `church-app-deployer`
4. **Click:** "Next"

### **2.3 Set Permissions**

**Option A: Attach Policies Directly (Easier)**

1. **Select:** "Attach policies directly"
2. **Search and select these policies:**
   - ✅ `AmazonRDSFullAccess`
   - ✅ `AmazonS3FullAccess`
   - ✅ `CloudFrontFullAccess`
   - ✅ `ElasticBeanstalkFullAccess`
   - ✅ `AWSCertificateManagerFullAccess`
   - ✅ `IAMFullAccess` (for creating roles)
   - ✅ `AmazonEC2FullAccess` (for security groups)
   - ✅ `CloudWatchFullAccess` (for monitoring)

3. **Click:** "Next"

**Option B: Add to Group (More Organized)**

1. Create a group: "ChurchAppDeployers"
2. Attach all the policies above to the group
3. Add user to the group

### **2.4 Review and Create**

1. **Review** your selections
2. **Click:** "Create user"

### **2.5 Create Access Keys** ⚠️ **CRITICAL STEP**

1. **Click on the user** you just created (`church-app-deployer`)
2. **Go to:** "Security credentials" tab
3. **Scroll to:** "Access keys" section
4. **Click:** "Create access key"
5. **Use case:** Select "Command Line Interface (CLI)"
6. **Check the confirmation box**
7. **Click:** "Next"
8. **Optional:** Add description: "Church App Deployment"
9. **Click:** "Create access key"

### **2.6 Save Your Credentials** 🔒 **DO THIS NOW!**

**You'll see:**
- **Access Key ID:** `AKIA...` (starts with AKIA)
- **Secret Access Key:** `wJalr...` (long string)

**⚠️ IMPORTANT:**
- **Download the CSV file** (recommended)
- **OR copy both values** to a secure location
- **You CANNOT retrieve the secret key again!**
- **Never share these keys publicly!**

**Save them in:**
- Password manager (1Password, LastPass, etc.)
- Encrypted file on your computer
- AWS Secrets Manager (advanced)

---

## 💻 STEP 3: Install AWS CLI

### **3.1 Check if Already Installed**

```bash
aws --version
```

If you see a version number, skip to Step 4.

### **3.2 Install AWS CLI (Windows)**

**Option A: MSI Installer (Recommended)**
1. **Download:** https://awscli.amazonaws.com/AWSCLIV2.msi
2. **Run the installer**
3. **Follow the installation wizard**
4. **Verify:** Open PowerShell and run `aws --version`

**Option B: Using PowerShell**
```powershell
# Download installer
Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -OutFile "$env:TEMP\AWSCLIV2.msi"

# Install
Start-Process msiexec.exe -ArgumentList "/i $env:TEMP\AWSCLIV2.msi /quiet" -Wait

# Verify
aws --version
```

### **3.3 Install AWS CLI (Mac)**

```bash
# Using Homebrew
brew install awscli

# OR download from:
# https://awscli.amazonaws.com/AWSCLIV2.pkg
```

### **3.4 Install AWS CLI (Linux)**

```bash
# Download
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip

# Install
sudo ./aws/install

# Verify
aws --version
```

---

## ⚙️ STEP 4: Configure AWS CLI

### **4.1 Run Configuration**

```bash
aws configure
```

### **4.2 Enter Your Credentials**

You'll be prompted for 4 things:

1. **AWS Access Key ID:**
   ```
   Enter: [Your Access Key ID from Step 2.6]
   Example: AKIAIOSFODNN7EXAMPLE
   ```

2. **AWS Secret Access Key:**
   ```
   Enter: [Your Secret Access Key from Step 2.6]
   Example: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```

3. **Default region name:**
   ```
   Enter: us-east-1
   (This is the region we'll use for all services)
   ```

4. **Default output format:**
   ```
   Enter: json
   (This is the standard format)
   ```

### **4.3 Verify Configuration**

```bash
# Test your credentials
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/church-app-deployer"
}
```

**✅ If you see this, your AWS CLI is configured correctly!**

---

## 🎯 STEP 5: Set Up Billing Alerts (Important!)

### **5.1 Enable Billing Alerts**

1. **Go to:** AWS Console → **Billing** (search in top bar)
2. **Click:** "Billing preferences" (left sidebar)
3. **Enable:**
   - ✅ "Receive Billing Alerts"
   - ✅ "Receive Free Tier Usage Alerts"
4. **Click:** "Save preferences"

### **5.2 Create Budget Alert**

1. **Go to:** AWS Console → **Billing** → **Budgets**
2. **Click:** "Create budget"
3. **Budget type:** "Cost budget"
4. **Budget name:** "Church App Monthly Budget"
5. **Budget amount:** $50 (or your preferred limit)
6. **Period:** Monthly
7. **Configure alerts:**
   - **Alert 1:** 80% of budget ($40)
   - **Alert 2:** 100% of budget ($50)
8. **Email recipients:** Your email
9. **Create budget**

**This will email you if costs approach your limit!**

---

## ✅ STEP 6: Verify Everything Works

### **6.1 Test S3 Access**

```bash
aws s3 ls
```

Should show your S3 buckets (empty list is fine if you haven't created any).

### **6.2 Test IAM Access**

```bash
aws iam get-user --user-name church-app-deployer
```

Should return user information.

### **6.3 Test Region Access**

```bash
aws ec2 describe-regions --region-names us-east-1
```

Should return region information.

---

## 🎉 Setup Complete!

Your AWS account is now ready for deployment!

### **What You Have:**
- ✅ AWS Account created
- ✅ IAM user with proper permissions
- ✅ AWS CLI installed and configured
- ✅ Billing alerts set up

### **What's Next:**
1. **Proceed to:** `DEPLOYMENT_STEPS.md` → Step 3 (Create RDS Database)
2. **Or continue with:** Setting up your first AWS service

---

## 🔒 Security Best Practices

1. **✅ Never use root account** for daily operations
2. **✅ Use IAM users** with minimal required permissions
3. **✅ Enable MFA** (Multi-Factor Authentication) on your root account
4. **✅ Rotate access keys** every 90 days
5. **✅ Use IAM roles** instead of access keys when possible (for EC2/Elastic Beanstalk)
6. **✅ Monitor CloudTrail** for account activity
7. **✅ Set up billing alerts** (already done!)

---

## 🆘 Troubleshooting

### **"Access Denied" Errors**
- Check IAM user has correct policies attached
- Verify access keys are correct
- Ensure you're using the right region

### **AWS CLI Not Found**
- Restart your terminal/PowerShell
- Verify installation: `aws --version`
- Check PATH environment variable

### **Invalid Credentials**
- Double-check access key ID and secret key
- Make sure you copied the complete secret key
- Try re-running `aws configure`

### **Region Issues**
- Always use `us-east-1` for consistency
- Some services may not be available in all regions

---

## 📞 Need Help?

- **AWS Documentation:** https://docs.aws.amazon.com/
- **AWS Support:** https://aws.amazon.com/support/
- **IAM Best Practices:** https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

---

**Last Updated:** [Current Date]
**Status:** Ready for Use

