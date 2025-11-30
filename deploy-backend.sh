#!/bin/bash

# Church App Backend Deployment Script
# This script builds and deploys the backend to AWS Elastic Beanstalk

set -e  # Exit on error

echo "🚀 Starting Church App Backend Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# Navigate to backend directory
cd backend

echo -e "${GREEN}📦 Building application...${NC}"
# Build the application
mvn clean package -DskipTests

# Check if build was successful
if [ ! -f "target/church-app-backend-0.0.1-SNAPSHOT.jar" ]; then
    echo -e "${RED}❌ Build failed! JAR file not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo -e "${YELLOW}⚠️  EB CLI not found. Installing...${NC}"
    pip install awsebcli
fi

# Initialize EB if not already done
if [ ! -d ".elasticbeanstalk" ]; then
    echo -e "${GREEN}🔧 Initializing Elastic Beanstalk...${NC}"
    eb init church-app-backend --platform "Java 17 running on 64bit Amazon Linux 2023" --region us-east-1
fi

# Create environment if it doesn't exist
echo -e "${GREEN}🌍 Checking Elastic Beanstalk environment...${NC}"
if ! eb list | grep -q "church-app-api-prod"; then
    echo -e "${GREEN}📝 Creating new environment...${NC}"
    eb create church-app-api-prod \
        --instance-type t3.small \
        --envvars SPRING_PROFILES_ACTIVE=production \
        --platform "Java 17 running on 64bit Amazon Linux 2023" \
        --region us-east-1
else
    echo -e "${GREEN}🔄 Deploying to existing environment...${NC}"
    eb deploy church-app-api-prod
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your API should be available at: $(eb status | grep CNAME | awk '{print $2}')${NC}"

cd ..

