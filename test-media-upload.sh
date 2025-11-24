#!/bin/bash

# Quick Test Script for Media Upload
# This script helps you test the data management implementation

BASE_URL="http://localhost:8083/api"
EMAIL="test@example.com"
PASSWORD="password123"

echo "🧪 Testing Media Upload Implementation"
echo "======================================"
echo ""

# Step 1: Register or Login
echo "Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

# Check if login failed, try registration
if echo "$LOGIN_RESPONSE" | grep -q "error\|Invalid"; then
  echo "Login failed, trying to register..."
  REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Test User\", \"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
  
  if echo "$REGISTER_RESPONSE" | grep -q "error"; then
    echo "❌ Registration failed. Please check your backend is running."
    exit 1
  fi
  
  # Try login again
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
fi

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Authenticated successfully"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Test Image Upload
echo "Step 2: Testing Image Upload..."
echo "Please provide path to a test image (or press Enter to skip):"
read IMAGE_PATH

if [ -n "$IMAGE_PATH" ] && [ -f "$IMAGE_PATH" ]; then
  echo "Uploading image: $IMAGE_PATH"
  IMAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/posts/upload-media" \
    -H "Authorization: Bearer $TOKEN" \
    -F "files=@$IMAGE_PATH")
  
  echo "Response: $IMAGE_RESPONSE"
  echo "✅ Image upload completed"
  echo "Check your S3 bucket for:"
  echo "  - posts/originals/ (original file)"
  echo "  - posts/optimized/ (compressed file - appears after processing)"
  echo ""
else
  echo "⏭️  Skipping image upload"
  echo ""
fi

# Step 3: Test Video Upload
echo "Step 3: Testing Video Upload..."
echo "Please provide path to a test video (or press Enter to skip):"
read VIDEO_PATH

if [ -n "$VIDEO_PATH" ] && [ -f "$VIDEO_PATH" ]; then
  echo "Uploading video: $VIDEO_PATH"
  VIDEO_RESPONSE=$(curl -s -X POST "$BASE_URL/posts/upload-media" \
    -H "Authorization: Bearer $TOKEN" \
    -F "files=@$VIDEO_PATH")
  
  echo "Response: $VIDEO_RESPONSE"
  echo "✅ Video upload completed"
  echo "Check your S3 bucket for:"
  echo "  - posts/originals/ (original file)"
  echo "  - posts/optimized/ (480p compressed file - appears after processing)"
  echo ""
else
  echo "⏭️  Skipping video upload"
  echo ""
fi

echo "======================================"
echo "✅ Testing complete!"
echo ""
echo "Next steps:"
echo "1. Check backend logs for processing messages"
echo "2. Check S3 bucket for optimized files"
echo "3. Compare file sizes (should see 80-90% reduction)"
echo ""
echo "For detailed testing, see: TESTING_DATA_MANAGEMENT.md"

