#!/bin/bash
# Configure EventBridge for MediaConvert Job Notifications
# Run this with an IAM user/role that has EventBridge permissions

echo ""
echo "🎯 Configuring EventBridge for MediaConvert"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RULE_NAME="mediaconvert-job-completion"
SNS_TOPIC_ARN="arn:aws:sns:us-west-2:060163370478:mediaconvert-job-completion"
REGION="us-west-2"

echo "Rule Name: $RULE_NAME"
echo "SNS Topic: $SNS_TOPIC_ARN"
echo "Region: $REGION"
echo ""

# Step 1: Create EventBridge Rule
echo "Step 1: Creating EventBridge rule..."
aws events put-rule \
  --name "$RULE_NAME" \
  --event-pattern file://eventbridge-rule-pattern.json \
  --description "Capture MediaConvert job state changes (COMPLETE and ERROR) and forward to SNS" \
  --region "$REGION"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Error creating rule"
  echo "Check IAM permissions - need events:PutRule"
  exit 1
fi

echo "✅ Rule created!"
echo ""

# Step 2: Add SNS Topic as Target
echo "Step 2: Adding SNS topic as target..."
aws events put-targets \
  --rule "$RULE_NAME" \
  --targets "Id=1,Arn=$SNS_TOPIC_ARN" \
  --region "$REGION"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Error adding target"
  echo "Check IAM permissions - need events:PutTargets"
  exit 1
fi

echo "✅ Target added!"
echo ""

# Step 3: Verify Configuration
echo "Step 3: Verifying configuration..."
echo ""
echo "Rule Details:"
aws events describe-rule \
  --name "$RULE_NAME" \
  --region "$REGION" \
  --query '{Name:Name,State:State,EventPattern:EventPattern}' \
  --output json

echo ""
echo "Targets:"
aws events list-targets-by-rule \
  --rule "$RULE_NAME" \
  --region "$REGION" \
  --query 'Targets[*].{Id:Id,Arn:Arn}' \
  --output json

echo ""
echo "🎉 SUCCESS! EventBridge is configured!"
echo ""
echo "What this does:"
echo "  ✅ Captures ALL MediaConvert job state changes"
echo "  ✅ Filters for COMPLETE and ERROR states"
echo "  ✅ Forwards events to your SNS topic"
echo ""
echo "Next step: Subscribe your backend endpoint to SNS"
echo "  See: SUBSCRIBE_BACKEND_TO_SNS.md"
echo ""

