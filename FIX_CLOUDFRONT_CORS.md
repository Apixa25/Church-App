# 🔧 Fix CloudFront CORS for localhost

## The Problem

Images from CloudFront are blocked by CORS when accessing from `localhost:3000`:

```
Access to image at 'https://d3loytcgioxpml.cloudfront.net/organizations/logos/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

## Why This Happens

1. **S3 has CORS configured** ✅ (we already have this)
2. **CloudFront doesn't forward CORS headers by default** ❌

CloudFront needs to:
1. Forward the `Origin` request header to S3
2. Return the CORS response headers from S3

## The Fix

### Option 1: AWS Console (Easiest)

1. Go to **CloudFront Console** → Your Distribution (`d3loytcgioxpml`)
2. Go to **Behaviors** tab
3. Edit the default behavior (or the behavior for your images)
4. Under **Cache key and origin requests**:
   - For **Origin request policy**: Select `CORS-S3Origin` (AWS managed)
   - For **Response headers policy**: Select `CORS-with-preflight-and-SecurityHeadersPolicy` (AWS managed)
5. Save changes
6. Wait 5-10 minutes for deployment

### Option 2: AWS CLI

```bash
# Get your distribution ID
aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,DomainName]" --output table

# Update the distribution with CORS policies
# Replace YOUR_DISTRIBUTION_ID with your actual ID (e.g., E1234567890)
aws cloudfront get-distribution-config --id YOUR_DISTRIBUTION_ID > dist-config.json

# Then edit dist-config.json to add:
# "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf" (CORS-S3Origin)
# "ResponseHeadersPolicyId": "eaab4381-ed33-4a86-88ca-d9558dc6cd63" (CORS-with-preflight-and-SecurityHeadersPolicy)

# Apply the update
aws cloudfront update-distribution --id YOUR_DISTRIBUTION_ID --if-match ETAG_FROM_GET --distribution-config file://dist-config.json
```

### Option 3: Create Custom Response Headers Policy

If you want more control:

```bash
aws cloudfront create-response-headers-policy --response-headers-policy-config '{
  "Name": "ChurchApp-CORS-Policy",
  "CorsConfig": {
    "AccessControlAllowOrigins": {
      "Quantity": 4,
      "Items": [
        "http://localhost:3000",
        "http://localhost:8083",
        "https://www.thegathrd.com",
        "https://app.thegathrd.com"
      ]
    },
    "AccessControlAllowHeaders": {
      "Quantity": 1,
      "Items": ["*"]
    },
    "AccessControlAllowMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"]
    },
    "AccessControlAllowCredentials": false,
    "AccessControlMaxAgeSec": 3600,
    "OriginOverride": true
  }
}'
```

## Quick Temporary Workaround (Development Only)

While waiting for CloudFront fix, you can:

1. **Use S3 URLs directly** (bypass CloudFront) - not recommended for production
2. **Disable crossOrigin on images** - already done in Dashboard.tsx for localhost

The Dashboard.tsx already has this workaround:
```typescript
// Only use crossOrigin in production - localhost has CORS issues with CloudFront
{...(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? {} 
  : { crossOrigin: 'anonymous' })}
```

## Verification

After applying the fix, check:

1. Network tab → Image request → Response Headers should include:
   - `access-control-allow-origin: http://localhost:3000`
   - `access-control-allow-methods: GET, HEAD`

2. Console should no longer show CORS errors for CloudFront images

## AWS Managed Policy IDs Reference

| Policy Name | ID |
|-------------|-----|
| CORS-S3Origin | 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf |
| CORS-with-preflight-and-SecurityHeadersPolicy | eaab4381-ed33-4a86-88ca-d9558dc6cd63 |
| SimpleCORS | 60669652-455b-4ae9-85a4-c4c02393f86c |

---

**Priority**: Medium - Images still load (fallback works), but browser shows errors

