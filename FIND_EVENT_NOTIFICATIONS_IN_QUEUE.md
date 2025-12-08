# 🔍 Finding Event Notifications in MediaConvert Queue

## Current View

You're on the "Edit Default" queue page. I can see:
- ✅ Queue information section (Description, Status, Concurrent jobs)
- ✅ Tags section
- ❓ Event notifications section (not visible yet)

## Where to Find Event Notifications

The "Event notifications" section might be in one of these locations:

### Option 1: Scroll Down (Most Likely)

1. **Scroll down** on the current page
2. Look below the "Tags" section
3. The "Event notifications" section should be there
4. It might be collapsed - look for a section header you can expand

### Option 2: Check for Tabs

1. Look at the **top of the "Edit Default" page**
2. Check if there are **tabs** like:
   - "General" or "Queue information"
   - "Notifications" or "Events"
   - "Advanced" or "Settings"
3. Click on the **"Notifications"** or **"Events"** tab if present

### Option 3: Advanced Settings

1. Look for a section called:
   - "Advanced settings"
   - "Additional settings"
   - "Event configuration"
2. This might be collapsible - click to expand

### Option 4: Different Console Version

Some MediaConvert console versions have notifications configured differently:

1. **Check the queue details page** (not edit page)
   - Go back to the queue list
   - Click on "Default" queue
   - Look for "Event notifications" or "Notifications" section
   - There might be an "Edit" button specifically for notifications

## What the Event Notifications Section Should Look Like

When you find it, you should see:

- **SNS topic** field:
  - Dropdown menu OR
  - Text input field
- **Event types** checkboxes:
  - ☐ Job complete
  - ☐ Job error
  - ☐ Job progress (optional)

## If You Can't Find It

### Alternative: Configure via AWS CLI

If the console doesn't show the option, you can configure it via AWS CLI:

```bash
aws mediaconvert update-queue \
  --name Default \
  --settings '{
    "EventNotifications": {
      "OnComplete": {
        "SnsTopicArn": "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
      },
      "OnError": {
        "SnsTopicArn": "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
      }
    }
  }' \
  --region us-west-2
```

### Check MediaConvert API Version

Some older MediaConvert queues might not support event notifications. If that's the case:
- You may need to create a new queue with notifications enabled
- Or update your MediaConvert API version

## Quick Actions to Try

1. **Scroll down** - Most likely location
2. **Look for tabs** at the top of the edit form
3. **Check for collapsible sections** - Click arrows to expand
4. **Go back to queue details** - Check if notifications are configured there

## What to Do Next

Once you find the Event notifications section:

1. **Set SNS topic:**
   - Paste: `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`
   - Or select from dropdown if available

2. **Enable events:**
   - ✅ Check "Job complete"
   - ✅ Optionally check "Job error"

3. **Save the queue**

---

**Try scrolling down first - that's the most common location!** 📜

