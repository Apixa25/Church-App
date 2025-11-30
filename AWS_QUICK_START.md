# 🚀 AWS Setup Quick Start - Let's Get You Started!

This is a simplified guide to get your AWS account ready for deployment.

---

## 🎯 What We're Doing (In Order)

1. ✅ Create AWS Account (if you don't have one)
2. ✅ Create IAM User (for secure access)
3. ✅ Install AWS CLI (command line tool)
4. ✅ Configure AWS CLI (connect it to your account)
5. ✅ Test Everything (make sure it works)

---

## 📝 STEP 1: Do You Have an AWS Account?

### **If YES → Skip to Step 2**
### **If NO → Follow These Steps:**

1. **Go to:** https://aws.amazon.com/
2. **Click:** "Create an AWS Account" (top right)
3. **Fill out the form:**
   - Email address
   - Password
   - Account name: "The Gathering" or "Church App"
4. **Complete verification:**
   - Enter contact info
   - Add credit card (won't be charged unless you use services)
   - Verify phone number (they'll call you)
5. **Choose:** "Basic Plan" (Free support)
6. **Done!** ✅

**⏱️ Time:** 5-10 minutes

---

## 👤 STEP 2: Create IAM User

**Why?** We don't use the root account for security. We create a separate user.

### **2.1 Go to IAM Console**

1. **Sign in:** https://console.aws.amazon.com/
2. **Search:** "IAM" (in top search bar)
3. **Click:** "IAM" service

### **2.2 Create User**

1. **Click:** "Users" (left sidebar)
2. **Click:** "Create user" (blue button)
3. **User name:** Type `church-app-deployer`
4. **Click:** "Next"

### **2.3 Add Permissions**

1. **Select:** "Attach policies directly"
2. **Search and check these boxes:**
   - ✅ `AmazonRDSFullAccess`
   - ✅ `AmazonS3FullAccess`
   - ✅ `CloudFrontFullAccess`
   - ✅ `ElasticBeanstalkFullAccess`
   - ✅ `AWSCertificateManagerFullAccess`
   - ✅ `IAMFullAccess`
   - ✅ `AmazonEC2FullAccess`
   - ✅ `CloudWatchFullAccess`

3. **Click:** "Next"
4. **Click:** "Create user"

### **2.4 Get Your Access Keys** 🔑 **IMPORTANT!**

1. **Click on:** `church-app-deployer` (the user you just created)
2. **Click:** "Security credentials" tab
3. **Scroll to:** "Access keys" section
4. **Click:** "Create access key"
5. **Select:** "Command Line Interface (CLI)"
6. **Check the box** and click "Next"
7. **Optional:** Add description: "Church App Deployment"
8. **Click:** "Create access key"

### **2.5 SAVE THESE NOW!** ⚠️

You'll see:
- **Access Key ID:** `AKIA...` (starts with AKIA)
- **Secret Access Key:** `wJalr...` (long string)

**DO THIS:**
1. **Click:** "Download .csv file" (SAVE IT!)
2. **OR copy both values** to a secure place
3. **You CANNOT get the secret key again!**

**Save location ideas:**
- Password manager (1Password, LastPass)
- Encrypted file
- Write it down and keep it safe

**⏱️ Time:** 5 minutes

---

## 💻 STEP 3: Install AWS CLI

### **3.1 Download for Windows**

**Easy Way:**
1. **Go to:** https://awscli.amazonaws.com/AWSCLIV2.msi
2. **Download** the file
3. **Run** the installer
4. **Follow** the installation wizard
5. **Done!**

**⏱️ Time:** 2-3 minutes

### **3.2 Verify Installation**

**Open a NEW PowerShell window** (important - close and reopen)

```powershell
aws --version
```

**You should see:** `aws-cli/2.x.x` (some version number)

**✅ If you see a version, you're good!**

**❌ If you see an error, try:**
- Restart your computer
- Or use the manual installation method below

---

## ⚙️ STEP 4: Configure AWS CLI

### **4.1 Run Configuration Command**

```powershell
aws configure
```

### **4.2 Enter Your Information**

You'll be asked 4 questions:

**Question 1: AWS Access Key ID**
```
Enter: [Paste your Access Key ID from Step 2.5]
Example: AKIAIOSFODNN7EXAMPLE
Press Enter
```

**Question 2: AWS Secret Access Key**
```
Enter: [Paste your Secret Access Key from Step 2.5]
Example: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Press Enter
```

**Question 3: Default region name**
```
Enter: us-east-1
Press Enter
```

**Question 4: Default output format**
```
Enter: json
Press Enter
```

**✅ Done!**

### **4.3 Test It Works**

```powershell
aws sts get-caller-identity
```

**You should see something like:**
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/church-app-deployer"
}
```

**✅ If you see this, everything is working!**

**❌ If you see an error:**
- Double-check your access keys
- Make sure you copied the complete secret key
- Try running `aws configure` again

**⏱️ Time:** 2 minutes

---

## 🎉 You're All Set!

### **What You Just Did:**
- ✅ Created AWS account (or verified you have one)
- ✅ Created IAM user with proper permissions
- ✅ Installed AWS CLI
- ✅ Configured AWS CLI with your credentials

### **What's Next:**
1. **Set up billing alerts** (optional but recommended)
2. **Proceed to:** `DEPLOYMENT_STEPS.md` → Step 3 (Create RDS Database)

---

## 💰 Quick Billing Alert Setup (Recommended)

**Why?** So you know if costs are getting high.

1. **Go to:** AWS Console → Search "Billing"
2. **Click:** "Billing preferences"
3. **Enable:** "Receive Billing Alerts"
4. **Click:** "Save preferences"
5. **Go to:** "Budgets" → "Create budget"
6. **Set:** $50/month limit
7. **Add alerts:** Email yourself at 80% and 100%

**⏱️ Time:** 2 minutes

---

## 🆘 Need Help?

### **Common Issues:**

**"AWS CLI not found"**
- Restart PowerShell/terminal
- Restart computer if needed
- Reinstall AWS CLI

**"Invalid credentials"**
- Check you copied the complete secret key
- Make sure no extra spaces
- Try `aws configure` again

**"Access denied"**
- Check IAM user has policies attached
- Verify you're using the right access keys

---

## 📞 Ready to Continue?

Once you've completed these steps, let me know and we'll move on to:
- **Step 3:** Creating your RDS PostgreSQL database
- **Step 4:** Setting up S3 for frontend hosting
- And more!

**You've got this!** 🚀

