# 🎯 EventBridge Visual Builder - Step-by-Step Guide

## Current View

You're on the **"Build"** tab with the visual rule builder. Perfect! Let's configure it step by step.

---

## Step 1: Find MediaConvert Event

1. **In the left sidebar**, look for **"AWS SERVICE EVENTS"**
2. **Click the arrow** to expand it (if not already expanded)
3. **Scroll down** to find **"MediaConvert"** or search for it
4. **Click on "MediaConvert"** to see available event types

---

## Step 2: Select MediaConvert Job State Change Event

1. Under MediaConvert, you should see event types like:
   - **"MediaConvert Job State Change"** ← This is what we need!
2. **Click and drag** "MediaConvert Job State Change" from the left sidebar
3. **Drop it** into the **"Triggering Events"** box on the canvas

---

## Step 3: Configure Event Pattern

After dropping the event, you'll see configuration options:

1. **Event type:** Should show "MediaConvert Job State Change"
2. **Specific state(s):** 
   - ✅ Check **"COMPLETE"** (for successful jobs)
   - ✅ Check **"ERROR"** (for failed jobs - recommended)
3. **Queue:** Leave as "Any queue" (or select "Default" if you want to filter)

---

## Step 4: Add SNS Target

1. **Click the "Targets" tab** at the top (next to "Build")
2. Or **drag from the left sidebar** if targets are available there
3. **Look for "SNS topic"** in the target options
4. **Click "SNS topic"** or drag it to the Targets box
5. **Select your topic:**
   - Topic: `mediaconvert-job-completion`
   - Or paste ARN: `arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`

---

## Step 5: Configure Rule Details

1. **Click "Configure" tab** at the top
2. **Rule name:** `mediaconvert-job-completion`
3. **Description:** (optional) "Capture MediaConvert job state changes and forward to SNS"
4. **Event bus:** Leave as "default"

---

## Step 6: Create Rule

1. **Review** your configuration:
   - ✅ Triggering Events: MediaConvert Job State Change (COMPLETE, ERROR)
   - ✅ Target: SNS topic → `mediaconvert-job-completion`
2. **Click "Create"** button (orange, top-right)

---

## What to Look For

### In the Left Sidebar:
- **AWS SERVICE EVENTS** → Expand → **MediaConvert** → **MediaConvert Job State Change**

### On the Canvas:
- **Triggering Events box** should show: "MediaConvert Job State Change"
- **Targets box** should show: "SNS topic: mediaconvert-job-completion"

### Configuration:
- **States:** COMPLETE, ERROR
- **Target:** SNS topic ARN

---

## Troubleshooting

### Can't Find MediaConvert in AWS SERVICE EVENTS
- **Try:** Scroll down further in the sidebar
- **Try:** Use the search/filter if available
- **Try:** Click "AWS services" and look for MediaConvert alphabetically

### Can't Find SNS in Targets
- **Try:** Click "Targets" tab at the top
- **Try:** Look for "Amazon SNS topic" or just "SNS"
- **Alternative:** After creating the rule, you can add the target separately

### Visual Builder Not Working
- **Try:** Close the hint pop-up (X button)
- **Try:** Click "Reset" and start over
- **Alternative:** Use the JSON editor if available

---

## Quick Checklist

- [ ] Expanded "AWS SERVICE EVENTS" in left sidebar
- [ ] Found "MediaConvert" → "MediaConvert Job State Change"
- [ ] Dragged event to "Triggering Events" box
- [ ] Selected states: COMPLETE and ERROR
- [ ] Added SNS topic as target
- [ ] Named rule: `mediaconvert-job-completion`
- [ ] Clicked "Create"

---

**Once created, all MediaConvert jobs will automatically send notifications to your SNS topic!** ✅

