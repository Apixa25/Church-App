# 🎬 Configure Default Queue with SNS - Quick Guide

## Current Status

✅ You're on the MediaConvert Queues page  
✅ "Default" queue is visible and active  
✅ Queue is selected (highlighted in blue)

## Next Steps to Configure SNS

### Step 1: Open the Default Queue

1. **Click on the "Default" queue name** (the clickable link in the Name column)
   - This will open the queue details page

### Step 2: Edit Queue Settings

1. Once you're on the queue details page, look for the **"Edit"** button
   - Usually located at the top-right of the page
   - May be next to other action buttons

2. **Click "Edit"** to open the queue configuration form

### Step 3: Find Event Notifications Section

1. **Scroll down** through the queue settings form
2. Look for a section called:
   - **"Event notifications"** OR
   - **"Notifications"** OR
   - **"SNS topic"**

3. This section might be:
   - Near the bottom of the form
   - In a collapsible section (click to expand)
   - In a separate tab

### Step 4: Configure SNS Topic

1. In the **"Event notifications"** section, you'll see:
   - A dropdown or text field for SNS topic
   - Options for event types

2. **Set the SNS topic:**
   - **If dropdown:** Select `mediaconvert-job-completion`
   - **If text field:** Paste your Topic ARN:
     ```
     arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion
     ```

3. **Enable event types:**
   - ✅ Check/enable **"Job complete"** (required)
   - ✅ Optionally enable **"Job error"** (recommended for debugging)

### Step 5: Save Changes

1. **Scroll to the bottom** of the form
2. Click **"Save"** or **"Update queue"** button
3. Wait for confirmation message

### Step 6: Verify Configuration

1. Go back to the queue details page
2. Check the **"Event notifications"** section
3. You should see your SNS topic ARN listed:
   ```
   arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion
   ```

## What to Look For

When editing the queue, the SNS configuration might be in different locations depending on the MediaConvert console version:

**Common Locations:**
- Bottom of the general settings form
- Separate "Notifications" or "Events" tab
- Advanced settings section
- Collapsible "Event notifications" section

**What You're Looking For:**
- Field labeled "SNS topic" or "Event notification topic"
- Dropdown or text input for topic selection
- Checkboxes for "Job complete" and "Job error"

## Troubleshooting

### Can't Find "Event notifications" Section

**Try these:**
1. Scroll all the way to the bottom of the edit form
2. Look for tabs at the top (General, Notifications, etc.)
3. Check for collapsible sections (click arrows to expand)
4. Look for "Advanced" or "Additional settings"

### SNS Topic Not in Dropdown

**Solution:**
- Use the text field option and paste the full ARN:
  ```
  arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion
  ```

### Queue Settings Don't Save

**Check:**
- Make sure you have proper permissions in AWS
- Verify the SNS topic exists and is in the same region
- Try refreshing the page and editing again

## After Configuration

Once the queue is configured:

1. ✅ All jobs submitted to "Default" queue will send notifications to SNS
2. ✅ Next step: Subscribe your backend endpoint to the SNS topic
3. ✅ See: `SUBSCRIBE_BACKEND_TO_SNS.md` for next steps

## Quick Reference

**Queue Name:** Default  
**SNS Topic ARN:** `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`  
**Event Type:** Job complete (and optionally Job error)

---

**Click on "Default" queue name to get started!** ✅

