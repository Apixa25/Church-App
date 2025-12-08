#!/bin/bash
# Configure MediaConvert Queue with SNS Topic
# For Git Bash / MINGW64

echo ""
echo "🎬 Configuring MediaConvert Queue with SNS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

QUEUE_NAME="Default"
SNS_TOPIC_ARN="arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
REGION="us-west-2"

echo "Queue: $QUEUE_NAME"
echo "SNS Topic: $SNS_TOPIC_ARN"
echo "Region: $REGION"
echo ""

# Create settings JSON file
SETTINGS_FILE=$(mktemp)
cat > "$SETTINGS_FILE" <<EOF
{
  "EventNotifications": {
    "OnComplete": {
      "SnsTopicArn": "$SNS_TOPIC_ARN"
    },
    "OnError": {
      "SnsTopicArn": "$SNS_TOPIC_ARN"
    }
  }
}
EOF

echo "Updating queue..."
echo ""

# Run the command with file input
aws mediaconvert update-queue \
  --name "$QUEUE_NAME" \
  --settings "file://$SETTINGS_FILE" \
  --region "$REGION"

EXIT_CODE=$?

# Clean up temp file
rm -f "$SETTINGS_FILE"

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS! Queue configured!"
  echo ""
  echo "Verifying configuration..."
  aws mediaconvert get-queue --name "$QUEUE_NAME" --region "$REGION" --query 'Queue.EventNotifications' --output json
  echo ""
  echo "🎉 MediaConvert queue is now configured!"
  echo ""
  echo "Next step: Subscribe your backend endpoint to SNS"
  echo "  See: SUBSCRIBE_BACKEND_TO_SNS.md"
else
  echo ""
  echo "❌ Error configuring queue"
  echo "Exit code: $EXIT_CODE"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check AWS credentials: aws configure list"
  echo "  2. Verify SNS topic exists"
  echo "  3. Check MediaConvert permissions"
fi

echo ""

