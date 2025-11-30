#!/bin/bash

# Church App Frontend Deployment Script
# This script builds and deploys the frontend to AWS S3 + CloudFront

set -e  # Exit on error

echo "🚀 Starting Church App Frontend Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
S3_BUCKET="thegathrd-app-frontend"
CLOUDFRONT_DISTRIBUTION_ID=""  # Set this after creating CloudFront distribution
REGION="us-east-1"

# Check if we're on deployment branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "deployment" ]; then
    echo -e "${YELLOW}⚠️  Warning: Not on deployment branch. Current branch: $CURRENT_BRANCH${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Navigate to frontend directory
cd frontend

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found. Creating from template...${NC}"
    cat > .env.production << EOF
REACT_APP_API_URL=https://api.thegathrd.com/api
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_your_key_here
NODE_ENV=production
GENERATE_SOURCEMAP=false
EOF
    echo -e "${YELLOW}⚠️  Please update .env.production with your production values!${NC}"
    read -p "Press enter to continue after updating..."
fi

echo -e "${GREEN}📦 Installing dependencies...${NC}"
npm install

echo -e "${GREEN}🔨 Building production bundle...${NC}"
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo -e "${RED}❌ Build failed! Build directory not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install: https://aws.amazon.com/cli/${NC}"
    exit 1
fi

# Sync to S3
echo -e "${GREEN}☁️  Uploading to S3...${NC}"
aws s3 sync build/ s3://$S3_BUCKET/ --delete --region $REGION

# Invalidate CloudFront cache if distribution ID is set
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo -e "${GREEN}🔄 Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*"
    echo -e "${GREEN}✅ Cache invalidation initiated. It may take a few minutes to complete.${NC}"
else
    echo -e "${YELLOW}⚠️  CloudFront distribution ID not set. Skipping cache invalidation.${NC}"
    echo -e "${YELLOW}   Set CLOUDFRONT_DISTRIBUTION_ID in this script after creating distribution.${NC}"
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your frontend should be available at: https://www.thegathrd.com${NC}"

cd ..

