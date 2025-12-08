# 📋 Step-by-Step Guide: Create SNS Topic for MediaConvert

## Overview

This guide will walk you through creating an SNS (Simple Notification Service) topic that will receive notifications when MediaConvert jobs complete. This is the industry-standard approach used by X.com, Instagram, and other major platforms.

---

## Step 1: Navigate to AWS SNS Console

1. **Open your web browser** and go to: https://console.aws.amazon.com/sns/
2. **Sign in** to your AWS account if prompted
3. Make sure you're in the **correct AWS region** (should match your MediaConvert region, typically `us-west-2`)

   **To check/change region:**
   - Look at the top-right corner of the AWS console
   - Click the region dropdown (e.g., "US West (Oregon)")
   - Select `us-west-2` or your MediaConvert region

---

## Step 2: Access Topics Section

1. In the **left sidebar**, look for **"Topics"**
2. Click on **"Topics"**
3. You'll see a list of existing topics (if any) or an empty list

---

## Step 3: Create New Topic

1. Click the **"Create topic"** button (usually orange/blue, top-right)
2. You'll see a form to configure your topic

---

## Step 4: Configure Topic Settings

### 4.1 Choose Topic Type

- **Select:** "Standard" (default)
  - Standard topics support high throughput and are perfect for this use case
  - FIFO topics are not needed here

### 4.2 Configure Topic Details

Fill in the following fields:

**Name:**
- Enter: `mediaconvert-job-completion`
- This is the internal name AWS uses
- Must be unique within your AWS account
- Can contain letters, numbers, hyphens, and underscores
- No spaces allowed

**Display name:** (Optional)
- Enter: `MediaConvert Job Completion`
- This is a friendly name shown in the console
- Can contain spaces
- This is optional but recommended for clarity

### 4.3 Encryption (Optional but Recommended)

**Encryption:**
- **Option 1 (Recommended for Production):** Enable encryption
  - Check "Enable encryption"
  - Choose "AWS managed key" (default)
  - This encrypts messages at rest

- **Option 2 (Simpler for Testing):** Leave encryption disabled
  - You can enable it later if needed

### 4.4 Access Policy (Default is Fine)

- Leave the default access policy for now
- You can customize it later if needed
- The default allows the topic owner to publish and subscribe

### 4.5 Tags (Optional)

- You can add tags for organization (e.g., `Environment: Production`, `Service: MediaConvert`)
- This is optional and can be skipped

---

## Step 5: Create the Topic

1. **Scroll down** to review your settings
2. Click the **"Create topic"** button at the bottom
3. AWS will create the topic (usually takes 1-2 seconds)

---

## Step 6: Copy the Topic ARN

**IMPORTANT:** You'll need the Topic ARN for the next steps!

1. After creation, you'll be taken to the **topic details page**
2. Look for the **"Topic ARN"** field (near the top)
3. It will look like:
   ```
   arn:aws:sns:us-west-2:123456789012:mediaconvert-job-completion
   ```
4. **Copy this ARN** - you'll need it for:
   - Configuring MediaConvert queue
   - Environment variable (optional)
   - Documentation

**To copy:**
- Click the **copy icon** next to the ARN, or
- Select the entire ARN text and copy it (Ctrl+C / Cmd+C)

---

## Step 7: Verify Topic Creation

1. You should see your topic in the **Topics list**
2. The status should show as **"Active"** (green)
3. Note the **subscription count** (will be 0 until you subscribe your backend)

---

## ✅ What You Should Have Now

- ✅ SNS topic created: `mediaconvert-job-completion`
- ✅ Topic ARN copied (looks like: `arn:aws:sns:us-west-2:ACCOUNT_ID:mediaconvert-job-completion`)
- ✅ Topic is active and ready to receive notifications

---

## 📝 Next Steps

Now that you have the SNS topic created, you need to:

1. **Configure MediaConvert Queue** to publish to this SNS topic
   - See: `CONFIGURE_MEDIACONVERT_QUEUE.md` (if created)
   - Or follow the MediaConvert setup guide

2. **Subscribe your backend endpoint** to this SNS topic
   - Endpoint: `https://api.thegathrd.com/api/media/webhook/mediaconvert`
   - See: `SUBSCRIBE_BACKEND_TO_SNS.md` (if created)

---

## 🔍 Troubleshooting

### Topic Not Appearing in List
- **Refresh the page** (F5)
- Check you're in the **correct region**
- Check you're in the **correct AWS account**

### Can't Find "Create topic" Button
- Make sure you have **SNS permissions** in your AWS account
- Check you're logged into the **correct AWS account**
- Try refreshing the page

### Topic ARN Format
- Should start with: `arn:aws:sns:`
- Format: `arn:aws:sns:REGION:ACCOUNT_ID:TOPIC_NAME`
- Example: `arn:aws:sns:us-west-2:123456789012:mediaconvert-job-completion`

---

## 💡 Pro Tips

1. **Region Matters:** Make sure your SNS topic is in the **same region** as your MediaConvert queue
2. **Name Convention:** Use descriptive names like `mediaconvert-job-completion` for easy identification
3. **Documentation:** Save the Topic ARN somewhere safe (you'll need it later)
4. **Testing:** You can test the topic by publishing a test message (optional, for verification)

---

## 🎯 Quick Reference

**Topic Name:** `mediaconvert-job-completion`  
**Type:** Standard  
**Region:** `us-west-2` (or your MediaConvert region)  
**Topic ARN Format:** `arn:aws:sns:REGION:ACCOUNT_ID:mediaconvert-job-completion`

---

**Once you have the Topic ARN, you're ready to configure MediaConvert to publish to it!** ✅

