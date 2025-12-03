# MediaConvert IAM Setup Guide 🎬

This guide will help you set up the required IAM permissions for AWS MediaConvert video processing.

## Overview

MediaConvert requires:
1. **IAM Role** for MediaConvert service (to read/write S3 files)
2. **IAM Permissions** for your application user (to create MediaConvert jobs)
3. **Environment Variable** for AWS Account ID

---

## Step 1: Create MediaConvert Service Role

MediaConvert needs a service role to access S3 buckets. AWS provides a default role, but you can create a custom one.

### Option A: Use AWS Default Role (Easiest)

1. Go to **AWS Console** → **IAM** → **Roles**
2. Search for `MediaConvert_Default_Role`
3. If it exists, note the ARN (format: `arn:aws:iam::ACCOUNT_ID:role/MediaConvert_Default_Role`)
4. If it doesn't exist, create it:
   - Click **Create role**
   - Select **AWS service** → **MediaConvert**
   - Click **Next**
   - Attach policy: `AmazonS3FullAccess` (or create custom policy for your bucket only)
   - Name: `MediaConvert_Default_Role`
   - Click **Create role**

### Option B: Create Custom Role (Recommended for Production)

1. Go to **AWS Console** → **IAM** → **Roles** → **Create role**
2. Select **AWS service** → **MediaConvert**
3. Click **Next**
4. **Attach permissions policy** - Create a custom policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject"
            ],
            "Resource": [
                "arn:aws:s3:::church-app-uploads-stevensills2/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::church-app-uploads-stevensills2"
            ]
        }
    ]
}
```

5. Name: `MediaConvert_Default_Role` (or custom name)
6. Click **Create role**
7. **Note the Role ARN** (you'll need this)

---

## Step 2: Add IAM Permissions to Your Application User

Your IAM user (`church-app-dev`) needs permissions to:
- Create MediaConvert jobs
- Pass the MediaConvert role to MediaConvert service

### Add Permissions

1. Go to **AWS Console** → **IAM** → **Users** → `church-app-dev`
2. Click **Add permissions** → **Create inline policy**
3. Click **JSON** tab and paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "mediaconvert:CreateJob",
                "mediaconvert:GetJob",
                "mediaconvert:ListJobs",
                "mediaconvert:DescribeEndpoints"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:PassRole"
            ],
            "Resource": "arn:aws:iam::YOUR_ACCOUNT_ID:role/MediaConvert_Default_Role"
        }
    ]
}
```

**⚠️ IMPORTANT:** Replace `YOUR_ACCOUNT_ID` with your actual AWS Account ID!

4. Click **Next** → Name: `MediaConvertAccess` → **Create policy**

---

## Step 3: Set Environment Variables

### Local Development (.env file)

Add to your `.env` file in the `backend` directory:

```bash
AWS_ACCOUNT_ID=123456789012
```

**Or** set the full role ARN directly:

```bash
AWS_MEDIACONVERT_ROLE_ARN=arn:aws:iam::123456789012:role/MediaConvert_Default_Role
```

### Production (Elastic Beanstalk)

1. Go to **Elastic Beanstalk** → Your environment → **Configuration** → **Software**
2. Click **Edit**
3. Add environment property:
   - **Name:** `AWS_ACCOUNT_ID`
   - **Value:** Your AWS Account ID (12 digits, no dashes)

**Or** set the full role ARN:

   - **Name:** `AWS_MEDIACONVERT_ROLE_ARN`
   - **Value:** `arn:aws:iam::123456789012:role/MediaConvert_Default_Role`

4. Click **Apply**

---

## Step 4: Find Your AWS Account ID

If you don't know your AWS Account ID:

1. **Via AWS Console:**
   - Click your username (top right) → Account ID is displayed

2. **Via AWS CLI:**
   ```powershell
   aws sts get-caller-identity --query Account --output text
   ```

3. **Via IAM Role ARN:**
   - If you already have a role, the Account ID is in the ARN:
   - `arn:aws:iam::123456789012:role/...` ← The 12-digit number is your Account ID

---

## Step 5: Verify Setup

### Test Locally

1. Restart your backend with the new environment variable
2. Upload a video file
3. Check backend logs for MediaConvert job creation
4. Look for: `MediaConvert job created: ...`

### Test in Production

1. Deploy to Elastic Beanstalk with `AWS_ACCOUNT_ID` set
2. Upload a video
3. Check CloudWatch logs for MediaConvert job creation

---

## Troubleshooting

### Error: "AccessDenied: User is not authorized to perform: iam:PassRole"

**Solution:** Add `iam:PassRole` permission to your IAM user (Step 2)

### Error: "The role defined for the function cannot be assumed by MediaConvert"

**Solution:** 
- Verify the role ARN is correct
- Ensure the role has `MediaConvert` as a trusted service
- Check that the role has S3 permissions

### Error: "AWS_ACCOUNT_ID not configured"

**Solution:** Set `AWS_ACCOUNT_ID` environment variable in `.env` (local) or Elastic Beanstalk (production)

### MediaConvert Job Fails

**Check:**
1. MediaConvert role has S3 read/write permissions
2. S3 bucket name matches in `application.properties`
3. Video file is accessible in S3

---

## Summary Checklist ✅

- [ ] MediaConvert service role created (`MediaConvert_Default_Role`)
- [ ] IAM user has `mediaconvert:*` permissions
- [ ] IAM user has `iam:PassRole` permission for MediaConvert role
- [ ] `AWS_ACCOUNT_ID` set in `.env` (local) or Elastic Beanstalk (production)
- [ ] Backend restarted with new environment variables
- [ ] Test video upload successful

---

## Next Steps

After setup is complete:
1. Test image optimization (WebP support now added)
2. Test video optimization (MediaConvert)
3. Verify optimized files are served via CloudFront
4. Monitor CloudWatch for MediaConvert job status

🎉 **You're all set!** Your videos will now be optimized automatically!

