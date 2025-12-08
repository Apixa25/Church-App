# 🚀 AWS SNS Setup Guide for MediaConvert Job Completion

## Overview

This guide explains how to set up AWS SNS (Simple Notification Service) to receive MediaConvert job completion notifications. This is the **industry-standard approach** used by X.com, Instagram, and other major platforms.

## Architecture

```
MediaConvert Job → SNS Topic → Backend Webhook Endpoint → Update Database
```

## Step-by-Step Setup

### Step 1: Create SNS Topic

1. Go to AWS SNS Console: https://console.aws.amazon.com/sns/
2. Click **"Topics"** in the left sidebar
3. Click **"Create topic"**
4. Choose **"Standard"** topic type
5. Configure:
   - **Name:** `mediaconvert-job-completion`
   - **Display name:** (optional) `MediaConvert Jobs`
6. Click **"Create topic"**
7. **Copy the Topic ARN** (you'll need this)

### Step 2: Configure MediaConvert Queue with SNS

MediaConvert sends notifications at the **queue level**, not the job level.

1. Go to AWS MediaConvert Console: https://console.aws.amazon.com/mediaconvert/
2. Click **"Queues"** in the left sidebar
3. Select your queue (or create a new one)
4. Click **"Edit"**
5. Scroll to **"Event notifications"** section
6. Under **"SNS topic"**, select your SNS topic: `mediaconvert-job-completion`
7. Click **"Save"**

**Important:** All jobs submitted to this queue will now send completion notifications to your SNS topic.

### Step 3: Subscribe Backend Endpoint to SNS Topic

1. Go back to SNS Console → Your topic
2. Click **"Create subscription"**
3. Configure:
   - **Protocol:** HTTPS
   - **Endpoint:** `https://api.thegathrd.com/api/media/webhook/mediaconvert`
     - (Replace with your actual backend URL)
4. Click **"Create subscription"**
5. **IMPORTANT:** AWS will send a subscription confirmation message
6. Your backend will receive it and log the confirmation URL
7. **Manually visit the confirmation URL** to activate the subscription

### Step 4: Configure Environment Variable (Optional)

You can set the SNS topic ARN as an environment variable for reference:

```bash
AWS_SNS_MEDIACONVERT_TOPIC_ARN=arn:aws:sns:us-west-2:ACCOUNT_ID:mediaconvert-job-completion
```

This is optional - the webhook service doesn't require it, but it's good for documentation.

### Step 5: Test the Setup

1. Upload a test video through your app
2. Check MediaConvert console - job should be processing
3. Wait for job to complete (usually 2-5 minutes)
4. Check backend logs - you should see webhook notification received
5. Verify MediaFile is updated with thumbnail URL

## Verification

### Check SNS Subscription Status

1. Go to SNS Console → Your topic → **"Subscriptions"** tab
2. Status should be **"Confirmed"** (green)
3. If it shows **"Pending confirmation"**, visit the confirmation URL

### Check Backend Logs

Look for:
```
Processing MediaConvert webhook - Type: Notification
MediaConvert job completion notification - Job ID: xxx, Status: COMPLETE
Found thumbnail URL: https://...
MediaConvert job completed successfully for MediaFile: xxx
```

### Test Webhook Endpoint

You can test the endpoint manually (for debugging):

```bash
curl -X POST https://api.thegathrd.com/api/media/webhook/mediaconvert \
  -H "Content-Type: application/json" \
  -H "x-amz-sns-message-type: Notification" \
  -d '{"Message": "{\"detail\":{\"jobId\":\"test\",\"status\":\"COMPLETE\"}}"}'
```

## Troubleshooting

### Subscription Not Confirmed

- Check backend logs for confirmation URL
- Visit the URL manually to confirm subscription
- Wait a few minutes and check subscription status again

### Webhook Not Receiving Notifications

1. Check MediaConvert queue has SNS topic configured
2. Verify subscription is confirmed in SNS console
3. Check backend endpoint is publicly accessible
4. Verify security config allows `/api/media/webhook/mediaconvert`

### Thumbnail URL Not Extracted

- Check job output in MediaConvert console
- Verify output contains `_thumbnail` in filename
- Check backend logs for extraction errors

## Security Notes

- ✅ Webhook endpoint verifies SNS message signatures (AWS handles this)
- ✅ Endpoint is public but only accepts SNS notifications
- ✅ SNS provides guaranteed delivery and retry logic
- ✅ Industry-standard approach used by major platforms

---

**Once set up, thumbnails will appear automatically for all new video uploads!** 🎉

