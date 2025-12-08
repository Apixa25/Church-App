# 🎬 Step-by-Step Guide: Configure MediaConvert Queue with SNS

## Overview

Now that you have your SNS topic ARN, you need to configure your MediaConvert queue to publish job completion notifications to it. This is how MediaConvert will notify your backend when video processing jobs complete.

**Your SNS Topic ARN:** `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`

---

## Step 1: Navigate to AWS MediaConvert Console

1. **Open your web browser** and go to: https://console.aws.amazon.com/mediaconvert/
2. **Sign in** to your AWS account if prompted
3. Make sure you're in the **correct AWS region** (`us-west-2`)

   **To check/change region:**
   - Look at the top-right corner of the AWS console
   - Click the region dropdown
   - Select `us-west-2` (US West - Oregon)

---

## Step 2: Access Queues Section

1. In the **left sidebar**, look for **"Queues"**
2. Click on **"Queues"**
3. You'll see a list of your MediaConvert queues

---

## Step 3: Select Your Queue

1. **Find your queue** in the list
   - If you only have one queue, click on it
   - If you have multiple queues, identify which one your app uses
   - Common names: `Default`, `Production`, or a custom name

2. **Click on the queue name** to open it

---

## Step 4: Edit Queue Settings

1. Once you're viewing the queue details, look for the **"Edit"** button
2. Click **"Edit"** (usually top-right or in the queue details section)
3. You'll see the queue configuration form

---

## Step 5: Configure Event Notifications

1. **Scroll down** through the queue settings
2. Look for the **"Event notifications"** section
   - This might be near the bottom of the form
   - It may be collapsed - click to expand it

3. In the **"Event notifications"** section, you'll see:
   - **SNS topic** dropdown or input field

4. **Select or enter your SNS topic:**
   - **Option A (If dropdown):** Select `mediaconvert-job-completion` from the dropdown
   - **Option B (If text field):** Paste your Topic ARN:
     ```
     arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion
     ```

5. **Event types to notify:**
   - Make sure **"Job complete"** is selected/checked
   - You may also see options for "Job error" - you can enable this too for error handling

---

## Step 6: Save Changes

1. **Scroll to the bottom** of the form
2. Click **"Save"** or **"Update queue"** button
3. AWS will update the queue configuration (usually takes a few seconds)

---

## Step 7: Verify Configuration

1. After saving, you should see a **success message**
2. Go back to the queue details page
3. Check the **"Event notifications"** section
4. You should see your SNS topic ARN listed:
   ```
   arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion
   ```

---

## ✅ What This Does

Once configured:
- ✅ Every MediaConvert job submitted to this queue will send completion notifications to your SNS topic
- ✅ When a job completes (successfully or with error), MediaConvert will publish an event to SNS
- ✅ Your backend webhook will receive the notification via SNS
- ✅ The webhook will extract the thumbnail URL and update the database

---

## 🔍 Troubleshooting

### Can't Find "Event notifications" Section
- **Try:** Scroll down further - it might be near the bottom
- **Try:** Look for "Notifications" or "SNS" in the settings
- **Note:** Some MediaConvert console versions may have this in a different location

### SNS Topic Not Appearing in Dropdown
- **Solution:** Use the text field and paste the full ARN:
  ```
  arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion
  ```
- **Check:** Make sure the SNS topic exists and is in the same region

### Multiple Queues
- **Question:** Which queue does your app use?
- **Answer:** Check your MediaConvert configuration in the backend
- **Tip:** You can configure SNS for all queues, or just the one your app uses

---

## 📝 Next Steps

After configuring the MediaConvert queue:

1. **Subscribe your backend endpoint** to the SNS topic
   - See: `SUBSCRIBE_BACKEND_TO_SNS.md`
   - Endpoint: `https://api.thegathrd.com/api/media/webhook/mediaconvert`

2. **Test the setup:**
   - Upload a test video
   - Check MediaConvert console for job status
   - Check backend logs for webhook notifications

---

## 💡 Pro Tips

1. **Queue vs Job Level:** SNS is configured at the **queue level**, not individual job level
   - All jobs in this queue will send notifications
   - This is the industry-standard approach

2. **Multiple Queues:** If you have multiple queues (dev, staging, production):
   - Configure SNS for each queue, OR
   - Use the same SNS topic for all (simpler)

3. **Error Notifications:** Consider enabling error notifications too:
   - Helps with debugging
   - Your webhook can handle both success and error cases

---

## 🎯 Quick Reference

**SNS Topic ARN:** `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`  
**Configuration Level:** Queue (not individual jobs)  
**Event Type:** Job complete (and optionally Job error)  
**Region:** `us-west-2`

---

**Once the queue is configured, all MediaConvert jobs will send completion notifications to your SNS topic!** ✅

