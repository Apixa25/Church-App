# 🔗 Step-by-Step Guide: Subscribe Backend Endpoint to SNS Topic

## Overview

Now that your MediaConvert queue is configured to publish to SNS, you need to subscribe your backend webhook endpoint to the SNS topic. This allows SNS to send notifications to your backend when MediaConvert jobs complete.

**Your SNS Topic ARN:** `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`  
**Your Backend Endpoint:** `https://api.thegathrd.com/api/media/webhook/mediaconvert`

---

## Step 1: Navigate to Your SNS Topic

1. **Go to AWS SNS Console:** https://console.aws.amazon.com/sns/
2. **Click "Topics"** in the left sidebar
3. **Find your topic:** `mediaconvert-job-completion`
4. **Click on the topic name** to open it

---

## Step 2: Create Subscription

1. You'll see the topic details page
2. Look for the **"Subscriptions"** tab (usually near the top)
3. Click on the **"Subscriptions"** tab
4. You'll see a list of existing subscriptions (probably empty)
5. Click the **"Create subscription"** button (usually top-right, orange/blue)

---

## Step 3: Configure Subscription

### 3.1 Protocol

1. In the **"Protocol"** dropdown, select: **"HTTPS"**
   - This is for HTTP/HTTPS webhook endpoints
   - Your backend endpoint uses HTTPS

### 3.2 Endpoint

1. In the **"Endpoint"** field, enter your backend webhook URL:
   ```
   https://api.thegathrd.com/api/media/webhook/mediaconvert
   ```
   - **Important:** Use your actual backend URL
   - Must be HTTPS (not HTTP)
   - Must be publicly accessible
   - Must match exactly what's in your backend code

### 3.3 Enable Raw Message Delivery (Optional)

- **Leave unchecked** (default is fine)
- Raw message delivery is not needed for this use case

### 3.4 Subscription Filter Policy (Optional)

- **Leave empty** (default)
- We want to receive all notifications

---

## Step 4: Create Subscription

1. **Review your settings:**
   - Protocol: HTTPS ✅
   - Endpoint: `https://api.thegathrd.com/api/media/webhook/mediaconvert` ✅

2. Click **"Create subscription"** button at the bottom

---

## Step 5: Confirm Subscription (CRITICAL!)

**IMPORTANT:** AWS SNS requires you to confirm the subscription before it will send notifications.

### What Happens:

1. **AWS will send a confirmation request** to your endpoint
2. **Your backend will receive it** and log the confirmation URL
3. **You must visit that URL** to confirm the subscription

### How to Confirm:

**Option A: Check Backend Logs (Recommended)**
1. After creating the subscription, check your backend application logs
2. Look for a log message like:
   ```
   SNS Subscription Confirmation received for topic: arn:aws:sns:...
   To confirm subscription, visit: https://sns.us-west-2.amazonaws.com/...
   ```
3. **Copy the confirmation URL** from the logs
4. **Visit that URL** in your browser
5. You should see an XML response confirming the subscription

**Option B: Check SNS Console**
1. Go back to SNS Console → Your topic → Subscriptions tab
2. Find your subscription
3. Check the **"Status"** column
4. If it shows **"Pending confirmation"**:
   - Click on the subscription
   - Look for a confirmation URL or token
   - Visit the confirmation URL

**Option C: Automatic Confirmation (If Implemented)**
- Some implementations auto-confirm subscriptions
- Check if your backend does this automatically
- If not, use Option A or B

---

## Step 6: Verify Subscription Status

1. Go to SNS Console → Your topic → **"Subscriptions"** tab
2. Find your subscription
3. Check the **"Status"** column:
   - ✅ **"Confirmed"** (green) = Ready to receive notifications
   - ⚠️ **"Pending confirmation"** = Need to confirm (see Step 5)
   - ❌ **"Failed"** = Endpoint not accessible (check URL)

---

## ✅ What This Does

Once confirmed:
- ✅ SNS will send all MediaConvert job completion notifications to your backend
- ✅ Your webhook endpoint will receive the notifications
- ✅ The webhook will process them and update the database
- ✅ Thumbnails will appear automatically for new video uploads

---

## 🔍 Troubleshooting

### Subscription Status: "Pending confirmation"

**Problem:** Subscription created but not confirmed

**Solution:**
1. Check backend logs for confirmation URL
2. Visit the confirmation URL in your browser
3. Wait a few minutes and refresh the subscription status

### Subscription Status: "Failed"

**Problem:** SNS cannot reach your endpoint

**Possible Causes:**
- Endpoint URL is incorrect
- Endpoint is not publicly accessible
- Endpoint returns an error
- Security configuration blocks the request

**Solutions:**
1. **Verify endpoint URL:**
   - Must be: `https://api.thegathrd.com/api/media/webhook/mediaconvert`
   - Must be accessible from the internet
   - Test in browser (should return an error, but be reachable)

2. **Check security configuration:**
   - Verify `/api/media/webhook/mediaconvert` is in public endpoints
   - Check firewall/security groups allow HTTPS traffic

3. **Check backend is running:**
   - Verify your backend is deployed and running
   - Check health endpoint: `https://api.thegathrd.com/api/actuator/health`

### Can't Find Confirmation URL

**Solution:**
1. Check backend application logs immediately after creating subscription
2. Look for "SNS Subscription Confirmation" log message
3. The URL will be in the log message

### Endpoint Returns Error

**Problem:** Backend receives request but returns error

**Solution:**
1. Check backend logs for error details
2. Verify webhook service is properly configured
3. Check that MediaController exists and endpoint is correct

---

## 📝 Testing the Setup

Once subscription is confirmed:

1. **Upload a test video** through your app
2. **Check MediaConvert console:**
   - Job should appear and start processing
   - Wait for job to complete (2-5 minutes)

3. **Check backend logs:**
   - Should see: "Processing MediaConvert webhook - Type: Notification"
   - Should see: "MediaConvert job completion notification"
   - Should see: "Found thumbnail URL" (if successful)

4. **Check database:**
   - MediaFile should have `thumbnailUrl` populated
   - Processing status should be `COMPLETED`

5. **Check frontend:**
   - Video should display thumbnail instead of dark play button

---

## 💡 Pro Tips

1. **HTTPS Required:** SNS only sends to HTTPS endpoints (not HTTP)
2. **Public Endpoint:** Your endpoint must be publicly accessible (not behind VPN)
3. **Confirmation Required:** Always confirm subscriptions - they won't work until confirmed
4. **Multiple Environments:** If you have dev/staging/production, create separate subscriptions for each

---

## 🎯 Quick Reference

**SNS Topic ARN:** `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`  
**Backend Endpoint:** `https://api.thegathrd.com/api/media/webhook/mediaconvert`  
**Protocol:** HTTPS  
**Status to Look For:** "Confirmed" (green)

---

## 🔄 Next Steps After Confirmation

1. ✅ Subscription confirmed
2. ✅ MediaConvert queue configured
3. ✅ Backend webhook ready
4. 🎬 **Test with a video upload!**

---

**Once the subscription is confirmed, your setup is complete and thumbnails will appear automatically!** ✅

