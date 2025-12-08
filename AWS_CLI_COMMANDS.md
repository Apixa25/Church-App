# 🚀 AWS CLI Commands for MediaConvert SNS Configuration

## Quick Command (Copy & Paste)

Run this command in PowerShell or Command Prompt:

```powershell
aws mediaconvert update-queue --name Default --settings '{"EventNotifications":{"OnComplete":{"SnsTopicArn":"arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"},"OnError":{"SnsTopicArn":"arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"}}}' --region us-west-2
```

## Or Use the Script

Run the PowerShell script:

```powershell
.\configure-queue.ps1
```

## Verify Configuration

After running, verify it worked:

```powershell
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

## Prerequisites

1. **AWS CLI installed:**
   ```powershell
   aws --version
   ```
   If not installed: https://aws.amazon.com/cli/

2. **AWS credentials configured:**
   ```powershell
   aws configure list
   ```
   If not configured: `aws configure`

3. **Proper permissions:**
   - MediaConvert: `mediaconvert:UpdateQueue`
   - SNS: `sns:GetTopicAttributes` (for verification)

## Troubleshooting

### "AWS CLI not found"
- Install AWS CLI: https://aws.amazon.com/cli/
- Restart your terminal after installation

### "Unable to locate credentials"
- Run: `aws configure`
- Enter your AWS Access Key ID and Secret Access Key

### "Access Denied"
- Check your IAM user/role has MediaConvert permissions
- Required: `mediaconvert:UpdateQueue`, `mediaconvert:GetQueue`

### "Topic not found"
- Verify SNS topic exists: `aws sns get-topic-attributes --topic-arn arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion`
- Make sure topic is in the same region (us-west-2)

---

**Once configured, all MediaConvert jobs will send completion notifications to SNS!** ✅

