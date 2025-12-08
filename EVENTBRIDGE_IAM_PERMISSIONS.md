# 🔐 IAM Permissions Required for EventBridge Configuration

## Current Issue

Your IAM user `church-app-dev` doesn't have permissions to create EventBridge rules.

**Error:**
```
AccessDeniedException: User is not authorized to perform: events:PutRule
```

## Required IAM Permissions

To configure EventBridge via CLI, your IAM user/role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "events:PutRule",
        "events:PutTargets",
        "events:DescribeRule",
        "events:ListTargetsByRule",
        "events:RemoveTargets",
        "events:DeleteRule"
      ],
      "Resource": [
        "arn:aws:events:us-west-2:060163370478:rule/mediaconvert-job-completion",
        "arn:aws:events:us-west-2:060163370478:rule/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
    }
  ]
}
```

## Solutions

### Option 1: Add Permissions to IAM User (Recommended)

1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click "Users" → `church-app-dev`
3. Click "Add permissions" → "Create inline policy"
4. Use the JSON policy above
5. Save

### Option 2: Use Admin/Root Account

If you have admin access, use those credentials temporarily:
```bash
aws configure --profile admin
# Then run the commands with --profile admin
```

### Option 3: Use AWS Console (Easiest)

Since permissions are an issue, configure EventBridge through the console:
- See: `CONFIGURE_EVENTBRIDGE_FOR_MEDIACONVERT.md`

## Commands to Run (After Permissions Added)

Once permissions are added, run:

```bash
# Create rule
aws events put-rule \
  --name mediaconvert-job-completion \
  --event-pattern file://eventbridge-rule-pattern.json \
  --description "Capture MediaConvert job state changes" \
  --region us-west-2

# Add SNS target
aws events put-targets \
  --rule mediaconvert-job-completion \
  --targets "Id=1,Arn=arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion" \
  --region us-west-2

# Verify
aws events describe-rule --name mediaconvert-job-completion --region us-west-2
```

---

**The console method is easiest if you don't want to modify IAM permissions!** ✅

