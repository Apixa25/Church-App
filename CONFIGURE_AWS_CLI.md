# ⚙️ Configure AWS CLI - Step by Step

Your AWS CLI is installed! Now let's configure it with your credentials.

---

## ✅ Prerequisites Checklist

Before configuring, make sure you have:

- [x] AWS CLI installed ✅ (You have this!)
- [ ] AWS Account created
- [ ] IAM User created (`church-app-deployer`)
- [ ] Access Key ID (starts with `AKIA...`)
- [ ] Secret Access Key (long string)

---

## 🔑 Step 1: Get Your AWS Credentials

### **If you DON'T have credentials yet:**

Follow these steps to create an IAM user and get credentials:

1. **Go to AWS Console:** https://console.aws.amazon.com/
2. **Sign in** with your AWS account
3. **Search for "IAM"** in the top search bar
4. **Click:** "IAM" service
5. **Click:** "Users" (left sidebar)
6. **Click:** "Create user"
7. **User name:** `church-app-deployer`
8. **Click:** "Next"
9. **Select:** "Attach policies directly"
10. **Search and check these policies:**
    - ✅ `AmazonRDSFullAccess`
    - ✅ `AmazonS3FullAccess`
    - ✅ `CloudFrontFullAccess`
    - ✅ `ElasticBeanstalkFullAccess`
    - ✅ `AWSCertificateManagerFullAccess`
    - ✅ `IAMFullAccess`
    - ✅ `AmazonEC2FullAccess`
    - ✅ `CloudWatchFullAccess`
11. **Click:** "Next" → "Create user"
12. **Click on the user** you just created
13. **Go to:** "Security credentials" tab
14. **Scroll to:** "Access keys" section
15. **Click:** "Create access key"
16. **Select:** "Command Line Interface (CLI)"
17. **Click:** "Next" → "Create access key"
18. **⚠️ IMPORTANT: Save these now!**
    - **Access Key ID:** `AKIA...` (copy this)
    - **Secret Access Key:** `wJalr...` (copy this - you can't see it again!)
    - **Download the CSV file** (recommended)

---

## ⚙️ Step 2: Configure AWS CLI

Once you have your credentials, run:

```powershell
aws configure
```

### **You'll be asked 4 questions:**

**Question 1: AWS Access Key ID**
```
AWS Access Key ID [None]: 
```
**Enter:** Your Access Key ID (starts with `AKIA...`)
**Press:** Enter

**Question 2: AWS Secret Access Key**
```
AWS Secret Access Key [None]: 
```
**Enter:** Your Secret Access Key (long string)
**Press:** Enter

**Question 3: Default region name**
```
Default region name [None]: 
```
**Enter:** `us-east-1`
**Press:** Enter

**Question 4: Default output format**
```
Default output format [None]: 
```
**Enter:** `json`
**Press:** Enter

---

## ✅ Step 3: Verify Configuration

After configuring, test it works:

```powershell
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

**✅ If you see this, you're all set!**

---

## 🧪 Step 4: Test AWS Access

Let's test a few commands to make sure everything works:

### **Test S3 Access:**
```powershell
aws s3 ls
```
Should show your S3 buckets (empty list is fine if you haven't created any).

### **Test IAM Access:**
```powershell
aws iam get-user --user-name church-app-deployer
```
Should return your user information.

### **Test Region Access:**
```powershell
aws ec2 describe-regions --region-names us-east-1
```
Should return region information.

---

## 🎉 Configuration Complete!

Once all tests pass, you're ready to proceed with deployment!

### **What's Next:**
1. ✅ AWS CLI installed
2. ✅ AWS CLI configured
3. ⏭️ Create RDS Database (Step 3 in DEPLOYMENT_STEPS.md)
4. ⏭️ Set up S3 Bucket (Step 4 in DEPLOYMENT_STEPS.md)
5. ⏭️ Continue with deployment!

---

## 🆘 Troubleshooting

### **"Unable to locate credentials"**
- Make sure you ran `aws configure`
- Check your credentials are correct
- Verify access keys are active in IAM console

### **"Access Denied"**
- Check IAM user has correct policies attached
- Verify you're using the right access keys
- Make sure policies are attached to the user

### **"Invalid credentials"**
- Double-check you copied the complete secret key
- Make sure no extra spaces when pasting
- Try running `aws configure` again

---

## 📞 Ready to Continue?

Once configured, let me know and we'll move on to:
- Creating your RDS PostgreSQL database
- Setting up S3 for frontend hosting
- And more!

**You're doing great!** 🚀

