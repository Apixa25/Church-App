# ✅ Correct MediaConvert Queue Configuration Command

## Issue Found

1. ❌ Parameter should be `--notification`, not `--settings`
2. ⚠️ MediaConvert requires a specific endpoint URL (account-specific)
3. ⚠️ You may need additional IAM permissions

## Solution: Get MediaConvert Endpoint First

MediaConvert uses account-specific endpoints. You need to get yours first:

```bash
aws mediaconvert describe-endpoints --region us-west-2
```

This will return something like:
```json
{
    "Endpoints": [
        {
            "Url": "https://abcd1234.mediaconvert.us-west-2.amazonaws.com"
        }
    ]
}
```

## Correct Command

Once you have the endpoint URL, use:

```bash
aws mediaconvert update-queue \
  --name Default \
  --notification '{"SnsTopic": "arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"}' \
  --endpoint-url "https://YOUR_ENDPOINT.mediaconvert.us-west-2.amazonaws.com" \
  --region us-west-2
```

Replace `YOUR_ENDPOINT` with the endpoint from the `describe-endpoints` command.

## Alternative: Use AWS Console

If CLI permissions are an issue, you can configure this in the AWS Console:

1. Go to MediaConvert Console
2. Queues → Default → Edit
3. Look for "Event notifications" or "Notifications" section
4. Set SNS topic there

## IAM Permissions Needed

Your IAM user needs:
- `mediaconvert:DescribeEndpoints`
- `mediaconvert:UpdateQueue`
- `mediaconvert:GetQueue` (for verification)

---

**Try getting the endpoint first, then use the correct command!** ✅

