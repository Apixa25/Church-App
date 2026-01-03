# Deployment Quick Reference

## Frontend Deployment

### S3 Bucket
```
s3://thegathrd-app-frontend
```

### CloudFront Distribution
```
Distribution ID: E2SM4EXV57KO8B
Domain: d3loytcgioxpml.cloudfront.net
Aliases: thegathrd.com, www.thegathrd.com, app.thegathrd.com
```

### Deploy Commands
```bash
# 1. Build the frontend
cd frontend
npm run build

# 2. Upload to S3
aws s3 sync build s3://thegathrd-app-frontend --delete --region us-west-2

# 3. Invalidate CloudFront cache (REQUIRED for changes to appear)
aws cloudfront create-invalidation --distribution-id E2SM4EXV57KO8B --paths "/*" --region us-west-2
```

### Check Invalidation Status
```bash
aws cloudfront get-invalidation --distribution-id E2SM4EXV57KO8B --id <INVALIDATION_ID> --region us-west-2
```

---

## Backend Deployment (JAR)

### Elastic Beanstalk Environment
```
Application: church-app-backend
Environment: Church-app-backend-prod
Region: us-west-2
```

### S3 Bucket for JAR Storage
```
s3://church-app-uploads-stevensills2/deployments/
```

### Deploy Commands
```bash
# 1. Build the JAR
cd backend
./mvnw clean package -DskipTests

# 2. Upload JAR to S3
aws s3 cp target/church-app-backend-0.0.1-SNAPSHOT.jar s3://church-app-uploads-stevensills2/deployments/ --region us-west-2

# 3. Create new application version
aws elasticbeanstalk create-application-version \
  --application-name church-app-backend \
  --version-label "v-$(date +%Y%m%d-%H%M%S)" \
  --source-bundle S3Bucket=church-app-uploads-stevensills2,S3Key=deployments/church-app-backend-0.0.1-SNAPSHOT.jar \
  --region us-west-2

# 4. Update environment to new version
aws elasticbeanstalk update-environment \
  --application-name church-app-backend \
  --environment-name Church-app-backend-prod \
  --version-label "v-$(date +%Y%m%d-%H%M%S)" \
  --region us-west-2
```

### Check Deployment Status
```bash
aws elasticbeanstalk describe-environments \
  --application-name church-app-backend \
  --environment-name Church-app-backend-prod \
  --query "Environments[0].[Status,Health,VersionLabel]" \
  --region us-west-2
```

---

## Quick Summary

| Component | Deploy To | Cache Invalidation |
|-----------|-----------|-------------------|
| Frontend  | `s3://thegathrd-app-frontend` | CloudFront `E2SM4EXV57KO8B` |
| Backend   | Elastic Beanstalk via S3 | N/A |

---

## Common Issues

1. **Frontend changes not appearing**: Did you invalidate CloudFront? It caches aggressively.
2. **Backend not starting**: Check Elastic Beanstalk logs in AWS Console or via `eb logs`.
3. **Wrong S3 bucket**: Frontend goes to `thegathrd-app-frontend`, NOT `church-app-uploads-stevensills2` (that's for media/uploads).
