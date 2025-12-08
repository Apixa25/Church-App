# 🚀 AWS CLI Commands for Git Bash / MINGW64

## Problem

Git Bash handles quotes differently than PowerShell, causing JSON parsing issues.

## Solution Options

### Option 1: Use JSON File (Recommended) ✅

Create a file `queue-settings.json`:

```json
{
  "EventNotifications": {
    "OnComplete": {
      "SnsTopicArn": "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
    },
    "OnError": {
      "SnsTopicArn": "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
    }
  }
}
```

Then run:
```bash
aws mediaconvert update-queue --name Default --settings file://queue-settings.json --region us-west-2
```

### Option 2: Use the Script

Run the bash script:
```bash
bash configure-queue-gitbash.sh
```

### Option 3: Single Line with Proper Escaping

```bash
aws mediaconvert update-queue --name Default --settings '{"EventNotifications":{"OnComplete":{"SnsTopicArn":"arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"},"OnError":{"SnsTopicArn":"arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"}}}' --region us-west-2
```

**Note:** Use single quotes around the entire JSON, and double quotes inside (no escaping needed).

### Option 4: Use PowerShell Instead

If you have PowerShell available:
```powershell
$settings = '{"EventNotifications":{"OnComplete":{"SnsTopicArn":"arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"},"OnError":{"SnsTopicArn":"arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"}}}'
aws mediaconvert update-queue --name Default --settings $settings --region us-west-2
```

## Verify Configuration

After running, verify it worked:

```bash
aws mediaconvert get-queue --name Default --region us-west-2 --query 'Queue.EventNotifications' --output json
```

You should see:
```json
{
    "OnComplete": {
        "SnsTopicArn": "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
    },
    "OnError": {
        "SnsTopicArn": "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
    }
}
```

## Quick Start (Easiest)

1. Create `queue-settings.json` with the JSON above
2. Run: `aws mediaconvert update-queue --name Default --settings file://queue-settings.json --region us-west-2`
3. Verify: `aws mediaconvert get-queue --name Default --region us-west-2 --query 'Queue.EventNotifications' --output json`

---

**Option 1 (JSON file) is the most reliable for Git Bash!** ✅

