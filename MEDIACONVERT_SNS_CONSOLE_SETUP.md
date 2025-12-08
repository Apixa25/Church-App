# 🎬 MediaConvert SNS Configuration - Console Method

## Issue with CLI

The MediaConvert `update-queue` API doesn't support `--notification` parameter directly. Event notifications need to be configured through the **AWS Console** or may require a different approach.

## Solution: Use AWS Console

Since the CLI doesn't support this directly, configure it through the console:

### Step 1: Go to MediaConvert Console

1. Navigate to: https://console.aws.amazon.com/mediaconvert/
2. Make sure you're in region: `us-west-2`
3. Click **"Queues"** in the left sidebar

### Step 2: Edit Default Queue

1. Click on **"Default"** queue name
2. Click **"Edit"** button
3. **Scroll down** to find the notifications section

### Step 3: Configure Event Notifications

The notifications section might be:
- At the bottom of the edit form
- In a separate "Notifications" or "Events" tab
- In an "Advanced" or "Additional settings" section
- Collapsible section (click to expand)

**What to look for:**
- Field labeled "SNS topic" or "Event notification topic"
- Dropdown or text input
- Checkboxes for "Job complete" and "Job error"

**Set:**
- SNS Topic: `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`
- Enable: Job complete ✅
- Enable: Job error ✅ (optional but recommended)

### Step 4: Save

1. Click **"Save queue"** or **"Update queue"**
2. Wait for confirmation

## Alternative: Check if Already Configured

Some MediaConvert setups have notifications configured at the account level or through job templates. Check:

1. **Job Templates:**
   - Go to MediaConvert → Job templates
   - Check if any templates have SNS configured
   - If your app uses a template, configure it there

2. **Account Settings:**
   - Some MediaConvert accounts have default notification settings
   - Check MediaConvert account settings

## Verify Configuration

After configuring in console:

1. Go back to queue details
2. Check if "Event notifications" section shows your SNS topic
3. Or test by uploading a video and checking if webhook receives notification

## If Console Doesn't Show Option

If the console doesn't show event notifications option:

1. **Check MediaConvert API version** - older versions might not support it
2. **Contact AWS Support** - they can help configure it
3. **Use Job Templates** - configure SNS at the job template level instead

---

**The console method is the most reliable way to configure MediaConvert queue notifications!** ✅

