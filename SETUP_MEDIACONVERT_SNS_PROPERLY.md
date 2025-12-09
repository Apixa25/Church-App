# 🎯 Setting Up MediaConvert Notifications (Industry Standard)

This guide sets up the **industry-standard** approach for MediaConvert job notifications using **EventBridge + SNS**. This is how Twitter/X, Instagram, and TikTok handle video processing.

## Why This Matters

| Approach | At 1M Users | Latency | Cost |
|----------|-------------|---------|------|
| ❌ Polling | Thousands of API calls/min | Up to 30 sec | High |
| ✅ EventBridge + SNS | Only when jobs complete | <1 second | Minimal |

---

## 📋 Prerequisites

- Your backend is deployed to Elastic Beanstalk
- Your backend URL (e.g., `https://your-eb-environment.us-west-2.elasticbeanstalk.com`)
- AWS Console access with admin permissions

---

## Step 1: Create SNS Topic

1. Go to **AWS Console** → **SNS** → **Topics**
2. Click **Create topic**
3. Choose **Standard** (not FIFO)
4. Name: `mediaconvert-job-notifications`
5. Click **Create topic**
6. **Copy the Topic ARN** (you'll need this later)
   - Example: `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-notifications`

---

## Step 2: Create HTTPS Subscription

1. In the SNS Topic you just created, click **Create subscription**
2. Protocol: **HTTPS**
3. Endpoint: `https://YOUR-EB-ENVIRONMENT.us-west-2.elasticbeanstalk.com/api/media/webhook/mediaconvert`
   - Replace `YOUR-EB-ENVIRONMENT` with your actual Elastic Beanstalk URL
4. Click **Create subscription**

⚠️ **IMPORTANT:** The subscription will show "Pending confirmation". Your backend automatically confirms it when it receives the confirmation request. Check your backend logs for:
```
🔔 Processing SNS webhook - Type: SubscriptionConfirmation
✅ SNS subscription confirmed successfully
```

---

## Step 3: Create EventBridge Rule

1. Go to **AWS Console** → **EventBridge** → **Rules**
2. Click **Create rule**
3. Name: `mediaconvert-job-state-change`
4. Event bus: **default**
5. Rule type: **Rule with an event pattern**
6. Click **Next**

### Event Pattern

Choose **Custom pattern** and paste:

```json
{
  "source": ["aws.mediaconvert"],
  "detail-type": ["MediaConvert Job State Change"],
  "detail": {
    "status": ["COMPLETE", "ERROR"]
  }
}
```

7. Click **Next**

### Target

1. Target type: **AWS service**
2. Select a target: **SNS topic**
3. Topic: Select `mediaconvert-job-notifications`
4. Click **Next** → **Next** → **Create rule**

---

## Step 4: Add Environment Variable (Optional)

Add the SNS Topic ARN to your Elastic Beanstalk environment:

1. Go to **Elastic Beanstalk** → Your Environment → **Configuration**
2. Edit **Software** → **Environment properties**
3. Add: `AWS_SNS_MEDIACONVERT_TOPIC_ARN` = `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-notifications`

---

## Step 5: Test It!

1. Upload a video through your app
2. Watch the backend logs:
   ```
   🔔 Received MediaConvert webhook - Type: Notification
   ✅ MediaConvert webhook processed successfully
   ```
3. The video should be playable on iPhone within seconds!

---

## 🔧 Troubleshooting

### Subscription stuck in "Pending confirmation"?

1. Check that your backend is running and accessible
2. Check backend logs for the confirmation request
3. Make sure the webhook endpoint is publicly accessible (not behind VPN)
4. Verify the endpoint URL is correct

### Events not reaching SNS?

1. Go to **EventBridge** → **Rules** → Your rule
2. Check **Monitoring** tab for invocation metrics
3. Make sure the rule is **Enabled**

### Backend not processing webhooks?

Check that the webhook endpoint is permitted in SecurityConfig:
```java
.requestMatchers("/media/webhook/mediaconvert").permitAll()
```

---

## 🎉 That's It!

Once configured, your video processing flow is:

```
1. User uploads video → S3
2. Backend starts MediaConvert job
3. MediaConvert processes video → MP4
4. EventBridge captures job completion
5. SNS sends webhook to your backend
6. Backend updates database with optimized URL
7. iPhone user can watch video! 🎬
```

**Zero polling. Real-time updates. Scales to millions of users.** 🚀

---

## Fallback Option (NOT Recommended for Production)

If you absolutely need a quick fix while setting up SNS, you can enable polling:

1. Add environment variable: `MEDIACONVERT_POLLING_ENABLED=true`
2. This polls every 30 seconds - **NOT SCALABLE**
3. Disable once SNS is working: `MEDIACONVERT_POLLING_ENABLED=false`

