# 🚀 Church App Version 1.0 - AWS Deployment Plan

## 📋 Overview

This document provides a step-by-step guide to deploy the Church App to production using AWS infrastructure. The domain `www.thegathrd.com` is registered with GoDaddy and will be configured to point to our AWS services.

---

## 🏗️ Architecture Overview

### **Infrastructure Components:**

1. **Backend API**: AWS Elastic Beanstalk (or EC2) - Java Spring Boot
2. **Database**: AWS RDS PostgreSQL
3. **File Storage**: AWS S3 (already configured)
4. **Frontend**: AWS S3 + CloudFront CDN (recommended) OR Netlify/Vercel
5. **Domain**: GoDaddy DNS → AWS Route 53 (optional) or direct DNS configuration
6. **SSL**: AWS Certificate Manager (ACM) for HTTPS

### **Domain Structure:**
- **Frontend**: `www.thegathrd.com` or `app.thegathrd.com`
- **API**: `api.thegathrd.com`

---

## 📝 Step-by-Step Deployment Plan

### **Phase 1: Preparation & Branch Setup** ✅
- [x] Create deployment branch
- [ ] Review and document all environment variables
- [ ] Create production configuration files
- [ ] Set up AWS account and IAM users

### **Phase 2: AWS Infrastructure Setup**
- [ ] Create RDS PostgreSQL database
- [ ] Set up S3 bucket for frontend hosting
- [ ] Configure CloudFront distribution
- [ ] Set up Elastic Beanstalk environment (or EC2)
- [ ] Configure IAM roles and permissions
- [ ] Set up AWS Certificate Manager for SSL

### **Phase 3: Backend Configuration**
- [ ] Create production application.properties
- [ ] Create Dockerfile for containerized deployment
- [ ] Set up environment variables in Elastic Beanstalk
- [ ] Configure database connection
- [ ] Test backend deployment

### **Phase 4: Frontend Configuration**
- [ ] Create production build configuration
- [ ] Update API URLs for production
- [ ] Configure environment variables
- [ ] Build and test production bundle
- [ ] Deploy to S3 + CloudFront

### **Phase 5: Database Migration**
- [ ] Create production database
- [ ] Run Flyway migrations
- [ ] Verify database schema
- [ ] Set up automated backups

### **Phase 6: Domain & DNS Configuration**
- [ ] Configure GoDaddy DNS records
- [ ] Point domain to CloudFront (frontend)
- [ ] Point api subdomain to Elastic Beanstalk
- [ ] Verify SSL certificates
- [ ] Test domain connectivity

### **Phase 7: Security & Monitoring**
- [ ] Configure security groups
- [ ] Set up CloudWatch monitoring
- [ ] Configure application logging
- [ ] Set up health checks
- [ ] Configure backup schedules

### **Phase 8: Testing & Validation**
- [ ] Run smoke tests
- [ ] Test authentication flow
- [ ] Test file uploads
- [ ] Test real-time features
- [ ] Test payment processing (test mode)
- [ ] Performance testing

### **Phase 9: Go-Live Checklist**
- [ ] All environment variables configured
- [ ] Database migrations complete
- [ ] SSL certificates active
- [ ] Domain DNS configured
- [ ] Monitoring active
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

## 🔧 Detailed Implementation Steps

### **Step 1: Create Deployment Branch**

```bash
git checkout main
git pull origin main
git checkout -b deployment
git push -u origin deployment
```

### **Step 2: AWS Account Setup**

1. **Create AWS Account** (if not already done)
2. **Create IAM User for Deployment:**
   - Go to IAM Console
   - Create user: `church-app-deployer`
   - Attach policies:
     - `AmazonRDSFullAccess`
     - `AmazonS3FullAccess`
     - `CloudFrontFullAccess`
     - `ElasticBeanstalkFullAccess`
     - `AWSCertificateManagerFullAccess`
     - `AmazonRoute53FullAccess`
   - Generate access keys
   - Save credentials securely

### **Step 3: RDS Database Setup**

1. **Create RDS PostgreSQL Instance:**
   - Engine: PostgreSQL 15.x
   - Template: Production (or Dev/Test for initial setup)
   - Instance class: db.t3.micro (start small, scale up)
   - Storage: 20GB (auto-scaling enabled)
   - Master username: `church_user`
   - Master password: [Generate strong password]
   - VPC: Default or create new
   - Public access: Yes (initially, restrict later)
   - Security group: Create new (allow port 5432 from your IP)
   - Database name: `church_app`
   - Backup retention: 7 days
   - Enable automated backups

2. **Save Connection Details:**
   - Endpoint: `your-db-instance.region.rds.amazonaws.com`
   - Port: `5432`
   - Database: `church_app`
   - Username: `church_user`
   - Password: [saved securely]

### **Step 4: S3 Frontend Hosting Setup**

1. **Create S3 Bucket:**
   - Bucket name: `thegathrd-app-frontend` (must be globally unique)
   - Region: `us-east-1` (for CloudFront)
   - Block public access: Uncheck (we'll use CloudFront)
   - Versioning: Enable
   - Encryption: Enable

2. **Configure Bucket for Static Website:**
   - Properties → Static website hosting → Enable
   - Index document: `index.html`
   - Error document: `index.html` (for SPA routing)

3. **Bucket Policy** (for CloudFront access):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowCloudFrontAccess",
         "Effect": "Allow",
         "Principal": {
           "Service": "cloudfront.amazonaws.com"
         },
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::thegathrd-app-frontend/*",
         "Condition": {
           "StringEquals": {
             "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
           }
         }
       }
     ]
   }
   ```

### **Step 5: CloudFront Distribution Setup**

1. **Create CloudFront Distribution:**
   - Origin domain: Select your S3 bucket
   - Origin access: Origin access control (recommended)
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD, OPTIONS
   - Cache policy: CachingOptimized
   - Price class: Use all edge locations
   - Alternate domain names (CNAMEs): `www.thegathrd.com`, `app.thegathrd.com`
   - SSL certificate: Request or import from ACM

2. **Request SSL Certificate in ACM:**
   - Go to Certificate Manager
   - Request public certificate
   - Domain: `*.thegathrd.com` and `thegathrd.com`
   - Validation: DNS validation
   - Add DNS records to GoDaddy

### **Step 6: Elastic Beanstalk Setup**

1. **Create Application:**
   - Application name: `church-app-backend`
   - Platform: Java
   - Platform version: Java 17 running on 64bit Amazon Linux 2023
   - Application code: Upload JAR or connect to GitHub

2. **Create Environment:**
   - Environment name: `church-app-api-prod`
   - Domain: `api.thegathrd.com` (optional)
   - Environment type: Load balanced
   - Load balancer: Application Load Balancer
   - Instance type: t3.small (start small)
   - Capacity: 1-4 instances (auto-scaling)

3. **Configure Environment Variables:**
   - Add all required environment variables (see ENVIRONMENT_VARIABLES.md)

4. **Configure Security:**
   - Security group: Allow HTTP (80) and HTTPS (443)
   - SSL certificate: Request in ACM for `api.thegathrd.com`

### **Step 7: GoDaddy DNS Configuration**

1. **Log into GoDaddy DNS Management**
2. **Add DNS Records:**

   ```
   Type    Name    Value                                    TTL
   A       @       [CloudFront Distribution IP]             600
   CNAME   www     [CloudFront Distribution Domain]        600
   CNAME   app     [CloudFront Distribution Domain]         600
   CNAME   api     [Elastic Beanstalk CNAME]                600
   ```

3. **For SSL Certificate Validation:**
   - Add CNAME records as specified by ACM
   - Wait for validation (can take 30 minutes)

---

## 🔐 Environment Variables Reference

See `ENVIRONMENT_VARIABLES.md` for complete list.

### **Critical Variables:**
- `DB_URL`: RDS endpoint
- `JWT_SECRET`: Strong 256-bit secret
- `GOOGLE_CLIENT_ID`: Production OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Production OAuth secret
- `AWS_ACCESS_KEY_ID`: IAM user access key
- `AWS_SECRET_ACCESS_KEY`: IAM user secret key
- `STRIPE_SECRET_KEY`: Live Stripe key (when ready)
- `CORS_ORIGINS`: `https://www.thegathrd.com,https://app.thegathrd.com`

---

## 📊 Cost Estimation (Monthly)

### **AWS Services (Estimated):**
- RDS db.t3.micro: ~$15/month
- Elastic Beanstalk t3.small: ~$15/month
- S3 Storage (10GB): ~$0.25/month
- CloudFront (100GB transfer): ~$10/month
- Data Transfer: ~$5/month
- **Total: ~$45-50/month** (can scale down initially)

### **Alternative (Lower Cost):**
- Use EC2 t3.micro instead of Elastic Beanstalk: ~$7/month
- **Total: ~$37-42/month**

---

## 🚨 Important Notes

1. **Start Small**: Begin with smaller instance sizes, scale up as needed
2. **Security**: Always use IAM roles, never hardcode credentials
3. **Backups**: Enable automated RDS backups from day one
4. **Monitoring**: Set up CloudWatch alarms for critical metrics
5. **Cost Optimization**: Use reserved instances after 1-2 months if stable
6. **Testing**: Test in staging environment before production

---

## 📞 Next Steps

1. ✅ Create deployment branch
2. ⏭️ Set up AWS infrastructure
3. ⏭️ Configure production settings
4. ⏭️ Deploy and test

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Status**: In Progress

