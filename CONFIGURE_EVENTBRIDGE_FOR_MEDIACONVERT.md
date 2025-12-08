# 🎯 Configure EventBridge for MediaConvert Job Notifications

## The Real Solution! 🎉

**MediaConvert doesn't have event notifications in the queue settings.** Instead, you use **Amazon EventBridge** (formerly CloudWatch Events) to capture MediaConvert job state changes and forward them to your SNS topic.

This is actually the **modern, industry-standard approach** - EventBridge is AWS's event-driven service that captures events from all AWS services.

## Architecture

```
MediaConvert Job → EventBridge Rule → SNS Topic → Backend Webhook
```

---

## Step-by-Step Setup

### Step 1: Navigate to EventBridge Console

1. Go to: https://console.aws.amazon.com/events/
2. Make sure you're in region: `us-west-2`
3. Click **"Rules"** in the left sidebar

### Step 2: Create EventBridge Rule

1. Click **"Create rule"** button (top-right)
2. **Rule name:** `mediaconvert-job-completion`
3. **Description:** (optional) "Capture MediaConvert job state changes and send to SNS"

### Step 3: Define Event Pattern

1. **Event source:** Select **"AWS services"**
2. **AWS service:** Select **"MediaConvert"** from dropdown
3. **Event type:** Select **"MediaConvert Job State Change"**
4. **Specific state(s):** 
   - ✅ Check **"COMPLETE"** (for successful jobs)
   - ✅ Check **"ERROR"** (for failed jobs - recommended for debugging)

**Alternative - Custom Pattern:**
If you want more control, select "Custom pattern" and use:
```json
{
  "source": ["aws.mediaconvert"],
  "detail-type": ["MediaConvert Job State Change"],
  "detail": {
    "status": ["COMPLETE", "ERROR"]
  }
}
```

### Step 4: Select Target (SNS Topic)

1. Click **"Next"** to go to "Select target(s)" step
2. **Target types:** Select **"AWS service"**
3. **Select a target:** Choose **"SNS topic"**
4. **Topic:** Select `mediaconvert-job-completion` from dropdown
   - Or paste ARN: `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`

### Step 5: Configure Additional Settings (Optional)

1. Click **"Next"**
2. **Configure target input:** Leave as default (entire event)
3. **Retry policy:** Default is fine
4. **Dead-letter queue:** Optional (for failed deliveries)

### Step 6: Create Rule

1. Review your settings
2. Click **"Create rule"**
3. You should see a success message

---

## ✅ What This Does

Once configured:
- ✅ EventBridge captures ALL MediaConvert job state changes
- ✅ Filters for COMPLETE and ERROR states
- ✅ Forwards events to your SNS topic
- ✅ Your backend webhook receives the notifications
- ✅ Thumbnails are extracted and stored automatically

---

## Verify Configuration

### Check EventBridge Rule

1. Go to EventBridge Console → Rules
2. Find your rule: `mediaconvert-job-completion`
3. Status should be **"Enabled"** (green)
4. Click on the rule to see details:
   - Event pattern should show MediaConvert job state changes
   - Target should show your SNS topic

### Test the Flow

1. Upload a test video through your app
2. Check MediaConvert console - job should process
3. Wait for job to complete (2-5 minutes)
4. Check backend logs for webhook notification
5. Verify thumbnail appears in frontend

---

## Event Format

EventBridge will send events to SNS in this format:
```json
{
  "source": "aws.mediaconvert",
  "detail-type": "MediaConvert Job State Change",
  "detail": {
    "jobId": "1234567890-abc",
    "status": "COMPLETE",
    "outputGroupDetails": [
      {
        "outputDetails": [
          {
            "outputFileUri": "s3://bucket/path/file_thumbnail.jpg"
          }
        ]
      }
    ]
  }
}
```

Your `MediaConvertWebhookService` is already set up to parse this format! ✅

---

## Troubleshooting

### Rule Not Triggering

- **Check rule is enabled:** EventBridge Console → Rules → Your rule → Status
- **Verify event pattern:** Make sure it matches MediaConvert events
- **Check job status:** Verify jobs are actually completing in MediaConvert console

### Events Not Reaching SNS

- **Check SNS topic exists:** SNS Console → Topics
- **Verify target:** EventBridge rule → Targets tab → Should show SNS topic
- **Check permissions:** EventBridge needs permission to publish to SNS (usually automatic)

### Webhook Not Receiving Notifications

- **Check SNS subscription:** SNS Console → Topic → Subscriptions → Should be "Confirmed"
- **Verify endpoint URL:** Must be `https://api.thegathrd.com/api/media/webhook/mediaconvert`
- **Check backend logs:** Look for webhook processing messages

---

## 💡 Why EventBridge?

- ✅ **Modern approach:** EventBridge is AWS's event-driven service
- ✅ **More flexible:** Can route to multiple targets (SNS, SQS, Lambda, etc.)
- ✅ **Better filtering:** Can filter by job status, queue, etc.
- ✅ **Industry standard:** Used by major platforms
- ✅ **Works with all MediaConvert jobs:** No queue-specific configuration needed

---

## 🎯 Quick Reference

**EventBridge Rule Name:** `mediaconvert-job-completion`  
**Event Source:** AWS services → MediaConvert  
**Event Type:** MediaConvert Job State Change  
**States:** COMPLETE, ERROR  
**Target:** SNS topic → `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`

---

**This is the correct, modern way to configure MediaConvert notifications!** ✅

Once EventBridge is configured, all MediaConvert jobs will automatically send completion notifications to your SNS topic, and your backend webhook will process them.

