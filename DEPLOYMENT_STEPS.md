# 🚀 Step-by-Step Deployment Guide - Version 1.0

This is your **actionable step-by-step guide** to deploy the Church App to AWS. Follow these steps in order.

---

## ✅ **STEP 1: Initial Setup (COMPLETED)**

- [x] Created deployment branch
- [x] Created deployment documentation
- [x] Created production configuration files
- [x] Created Docker and deployment scripts

**Next:** Proceed to Step 2

---

## 📋 **STEP 2: AWS Account & IAM Setup**

### **2.1 Create AWS Account** (if needed)
1. Go to https://aws.amazon.com/
2. Sign up or sign in
3. Complete account verification

### **2.2 Create IAM User for Deployment**
1. Go to **IAM Console** → **Users** → **Create User**
2. Username: `church-app-deployer`
3. **Attach Policies:**
   - `AmazonRDSFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `ElasticBeanstalkFullAccess`
   - `AWSCertificateManagerFullAccess`
   - `AmazonRoute53FullAccess` (optional, if using Route 53)
   - `IAMFullAccess` (for creating roles)
4. **Create Access Key:**
   - Go to **Security credentials** tab
   - **Create access key** → **Command Line Interface (CLI)**
   - **Download** or **copy** Access Key ID and Secret Access Key
   - ⚠️ **SAVE THESE SECURELY - You won't see the secret again!**

### **2.3 Configure AWS CLI** (Local Machine)
```bash
# Install AWS CLI if not installed
# Windows: Download from https://aws.amazon.com/cli/
# Mac: brew install awscli
# Linux: sudo apt-get install awscli

# Configure credentials
aws configure
# Enter:
# - AWS Access Key ID: [from step 2.2]
# - AWS Secret Access Key: [from step 2.2]
# - Default region: us-east-1
# - Default output format: json
```

**✅ Checkpoint:** Run `aws sts get-caller-identity` to verify credentials

---

## 🗄️ **STEP 3: Create RDS PostgreSQL Database**

### **3.1 Create RDS Instance**
1. Go to **RDS Console** → **Databases** → **Create database**
2. **Configuration:**
   - **Engine:** PostgreSQL
   - **Version:** PostgreSQL 15.x (latest)
   - **Template:** Free tier (or Production for paid)
   - **DB instance identifier:** `church-app-db`
   - **Master username:** `church_user`
   - **Master password:** [Generate strong password - save it!]
   - **DB instance class:** `db.t3.micro` (free tier) or `db.t3.small`
   - **Storage:** 20 GB, General Purpose (SSD)
   - **Storage autoscaling:** Enable (max 100 GB)
3. **Connectivity:**
   - **VPC:** Default VPC
   - **Public access:** Yes (for initial setup)
   - **VPC security group:** Create new: `church-app-db-sg`
   - **Availability Zone:** No preference
   - **Database port:** 5432
4. **Database authentication:** Password authentication
5. **Additional configuration:**
   - **Initial database name:** `church_app`
   - **Backup retention:** 7 days
   - **Enable automated backups:** Yes
   - **Backup window:** No preference
   - **Enable encryption:** Yes (recommended)
6. **Create database** (takes 5-10 minutes)

### **3.2 Configure Security Group**
1. Go to **EC2 Console** → **Security Groups**
2. Find `church-app-db-sg`
3. **Edit inbound rules:**
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Your IP address (for initial access)
   - **Description:** Allow PostgreSQL from my IP
4. **Save rules**

### **3.3 Get Database Endpoint**
1. In RDS Console, click on your database
2. Copy the **Endpoint** (e.g., `church-app-db.xxxxx.us-east-1.rds.amazonaws.com`)
3. **Save these details:**
   ```
   DB_HOST=church-app-db.xxxxx.us-east-1.rds.amazonaws.com
   DB_PORT=5432
   DB_NAME=church_app
   DB_USER=church_user
   DB_PASSWORD=[your password from step 3.1]
   ```

**✅ Checkpoint:** Test connection (optional):
```bash
psql -h [DB_HOST] -U church_user -d church_app
# Enter password when prompted
```

---

## ☁️ **STEP 4: Set Up S3 for Frontend Hosting**

### **4.1 Create S3 Bucket**
1. Go to **S3 Console** → **Create bucket**
2. **Configuration:**
   - **Bucket name:** `thegathrd-app-frontend` (must be globally unique)
   - **AWS Region:** `us-east-1`
   - **Object Ownership:** ACLs disabled (recommended)
   - **Block Public Access:** 
     - ✅ Uncheck "Block all public access" (we'll use CloudFront)
     - Or keep blocked and use Origin Access Control
   - **Bucket Versioning:** Enable
   - **Encryption:** Enable (SSE-S3)
3. **Create bucket**

### **4.2 Configure Bucket for Static Website**
1. Go to bucket → **Properties** tab
2. Scroll to **Static website hosting**
3. **Edit:**
   - **Enable:** Static website hosting
   - **Hosting type:** Host a static website
   - **Index document:** `index.html`
   - **Error document:** `index.html` (for SPA routing)
4. **Save changes**

### **4.3 Set Up Bucket Policy** (for CloudFront - do after Step 5)
We'll configure this after creating CloudFront distribution.

**✅ Checkpoint:** Bucket created and configured

---

## 🌐 **STEP 5: Set Up CloudFront Distribution**

### **5.1 Request SSL Certificate**
1. Go to **Certificate Manager** → **Request certificate**
2. **Configuration:**
   - **Certificate type:** Public certificate
   - **Domain name:**
     - `*.thegathrd.com` (wildcard)
     - `thegathrd.com` (root domain)
   - **Validation method:** DNS validation
3. **Request certificate**
4. **Validate certificate:**
   - Click on certificate → **Create record in Route 53** (if using Route 53)
   - OR manually add CNAME records to GoDaddy DNS:
     - Go to GoDaddy DNS management
     - Add CNAME records as shown in Certificate Manager
   - Wait for validation (5-30 minutes)

### **5.2 Create CloudFront Distribution**
1. Go to **CloudFront Console** → **Create distribution**
2. **Origin settings:**
   - **Origin domain:** Select your S3 bucket (`thegathrd-app-frontend.s3.us-east-1.amazonaws.com`)
   - **Origin access:** Origin access control settings (recommended)
   - **Origin access control:** Create new control
     - Name: `thegathrd-s3-oac`
     - Signing behavior: Sign requests
     - Origin type: S3
   - **Origin path:** (leave empty)
3. **Default cache behavior:**
   - **Viewer protocol policy:** Redirect HTTP to HTTPS
   - **Allowed HTTP methods:** GET, HEAD, OPTIONS
   - **Cache policy:** CachingOptimized
   - **Origin request policy:** None (or CORS-CustomOrigin)
4. **Distribution settings:**
   - **Price class:** Use all edge locations
   - **Alternate domain names (CNAMEs):**
     - `www.thegathrd.com`
     - `app.thegathrd.com`
     - `thegathrd.com`
   - **SSL certificate:** Select your certificate from Step 5.1
   - **Default root object:** `index.html`
   - **Custom error responses:**
     - HTTP 403 → 200 → `/index.html` (for SPA routing)
     - HTTP 404 → 200 → `/index.html`
5. **Create distribution** (takes 10-15 minutes to deploy)

### **5.3 Update S3 Bucket Policy**
1. Go to S3 bucket → **Permissions** → **Bucket policy**
2. **Edit policy:**
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
             "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
           }
         }
       }
     ]
   }
   ```
3. Replace `YOUR_ACCOUNT_ID` and `YOUR_DISTRIBUTION_ID` with actual values
4. **Save changes**

**✅ Checkpoint:** CloudFront distribution created and deploying

---

## 🚀 **STEP 6: Set Up Elastic Beanstalk for Backend**

### **6.1 Install EB CLI** (if not installed)
```bash
# Windows (PowerShell)
pip install awsebcli

# Mac/Linux
pip3 install awsebcli

# Verify installation
eb --version
```

### **6.2 Initialize Elastic Beanstalk**
```bash
cd backend
eb init
# Select:
# - Region: us-east-1
# - Application name: church-app-backend
# - Platform: Java
# - Platform version: Java 17 running on 64bit Amazon Linux 2023
# - SSH: Yes (for troubleshooting)
```

### **6.3 Create Environment**
```bash
# Create production environment
eb create church-app-api-prod \
  --instance-type t3.small \
  --platform "Java 17 running on 64bit Amazon Linux 2023" \
  --region us-east-1 \
  --envvars SPRING_PROFILES_ACTIVE=production
```

**Note:** This will take 5-10 minutes. You can also create via AWS Console.

### **6.4 Configure Environment Variables**
1. Go to **Elastic Beanstalk Console** → Your environment
2. **Configuration** → **Software** → **Edit**
3. **Environment properties** → **Add environment property** for each:
   ```
   DB_URL=jdbc:postgresql://[YOUR_RDS_ENDPOINT]:5432/church_app
   DB_HOST=[YOUR_RDS_ENDPOINT]
   DB_PORT=5432
   DB_NAME=church_app
   DB_USER=church_user
   DB_PASSWORD=[YOUR_DB_PASSWORD]
   JWT_SECRET=[GENERATE_STRONG_SECRET]
   GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
   GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_SECRET]
   AWS_ACCESS_KEY_ID=[YOUR_AWS_ACCESS_KEY]
   AWS_SECRET_ACCESS_KEY=[YOUR_AWS_SECRET_KEY]
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=[YOUR_S3_BUCKET_NAME]
   CORS_ORIGINS=https://www.thegathrd.com,https://app.thegathrd.com
   # ... add all other variables from ENVIRONMENT_VARIABLES.md
   ```
4. **Apply** changes

### **6.5 Configure Security Group**
1. Go to **EC2 Console** → **Security Groups**
2. Find security group for Elastic Beanstalk environment
3. **Edit inbound rules:**
   - **Type:** HTTP, Port: 80, Source: 0.0.0.0/0
   - **Type:** HTTPS, Port: 443, Source: 0.0.0.0/0
4. **Save rules**

### **6.6 Request SSL Certificate for API**
1. Go to **Certificate Manager** → **Request certificate**
2. **Domain:** `api.thegathrd.com`
3. **Validation:** DNS validation
4. **Add CNAME to GoDaddy DNS**

### **6.7 Configure Load Balancer HTTPS**
1. In Elastic Beanstalk → **Configuration** → **Load balancer**
2. **Edit:**
   - **Listeners:** Add HTTPS listener
   - **Port:** 443
   - **Protocol:** HTTPS
   - **SSL certificate:** Select your `api.thegathrd.com` certificate
3. **Apply** changes

**✅ Checkpoint:** Elastic Beanstalk environment created and configured

---

## 🗄️ **STEP 7: Database Migration**

### **7.1 Update Security Group**
1. Go to RDS security group (`church-app-db-sg`)
2. **Edit inbound rules:**
   - **Add rule:**
     - **Type:** PostgreSQL
     - **Port:** 5432
     - **Source:** Elastic Beanstalk security group (select from dropdown)
   - **Save rules**

### **7.2 Run Flyway Migrations**
```bash
cd backend

# Set environment variables (or use Elastic Beanstalk environment)
export DB_URL=jdbc:postgresql://[YOUR_RDS_ENDPOINT]:5432/church_app
export DB_USER=church_user
export DB_PASSWORD=[YOUR_DB_PASSWORD]

# Run migrations
mvn flyway:migrate -Dflyway.url=$DB_URL -Dflyway.user=$DB_USER -Dflyway.password=$DB_PASSWORD

# Verify migrations
mvn flyway:info -Dflyway.url=$DB_URL -Dflyway.user=$DB_USER -Dflyway.password=$DB_PASSWORD
```

**✅ Checkpoint:** Database schema created and migrations complete

---

## 🌍 **STEP 8: Configure GoDaddy DNS**

### **8.1 Get CloudFront Distribution Domain**
1. Go to **CloudFront Console**
2. Copy your distribution's **Domain name** (e.g., `d1234abcd.cloudfront.net`)

### **8.2 Get Elastic Beanstalk CNAME**
1. Go to **Elastic Beanstalk Console**
2. Copy your environment's **CNAME** (e.g., `church-app-api-prod.us-east-1.elasticbeanstalk.com`)

### **8.3 Configure DNS in GoDaddy**
1. Log into **GoDaddy** → **My Products** → **DNS**
2. **Add/Edit Records:**

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | @ | [CloudFront IP] | 600 |
   | CNAME | www | [CloudFront Domain] | 600 |
   | CNAME | app | [CloudFront Domain] | 600 |
   | CNAME | api | [Elastic Beanstalk CNAME] | 600 |

   **Note:** For A record, you may need to use CloudFront distribution domain or use Route 53 alias.

3. **Save** changes
4. **Wait for propagation** (5-60 minutes)

**✅ Checkpoint:** DNS configured and propagating

---

## 🔨 **STEP 9: Build and Deploy Backend**

### **9.1 Build Backend**
```bash
cd backend
mvn clean package -DskipTests
```

### **9.2 Deploy to Elastic Beanstalk**
```bash
# Using EB CLI
eb deploy church-app-api-prod

# OR upload manually via AWS Console:
# 1. Go to Elastic Beanstalk → Your environment
# 2. Upload and deploy → Upload your JAR file
```

### **9.3 Verify Deployment**
```bash
# Check health
curl https://api.thegathrd.com/api/actuator/health

# Or visit in browser:
# https://api.thegathrd.com/api/actuator/health
```

**✅ Checkpoint:** Backend deployed and responding

---

## 🎨 **STEP 10: Build and Deploy Frontend**

### **10.1 Create Production Environment File**
```bash
cd frontend
cp .env.production.example .env.production
# Edit .env.production with your values
```

### **10.2 Build Frontend**
```bash
npm install
npm run build
```

### **10.3 Deploy to S3**
```bash
# Using AWS CLI
aws s3 sync build/ s3://thegathrd-app-frontend/ --delete --region us-east-1

# Or use the deployment script
./deploy-frontend.sh  # Linux/Mac
# OR
.\deploy-frontend.ps1  # Windows PowerShell
```

### **10.4 Invalidate CloudFront Cache**
```bash
# Get your distribution ID from CloudFront Console
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**✅ Checkpoint:** Frontend deployed and accessible

---

## ✅ **STEP 11: Final Testing & Verification**

### **11.1 Test Frontend**
- [ ] Visit `https://www.thegathrd.com`
- [ ] Verify page loads
- [ ] Check browser console for errors

### **11.2 Test API**
- [ ] Visit `https://api.thegathrd.com/api/actuator/health`
- [ ] Should return: `{"status":"UP"}`

### **11.3 Test Authentication**
- [ ] Try to register/login
- [ ] Verify API calls work
- [ ] Check CORS headers

### **11.4 Test Features**
- [ ] User registration
- [ ] Profile update
- [ ] File upload (S3)
- [ ] Real-time features (WebSocket)

**✅ Checkpoint:** All tests passing

---

## 📊 **STEP 12: Monitoring & Maintenance**

### **12.1 Set Up CloudWatch Alarms**
1. Go to **CloudWatch Console**
2. **Alarms** → **Create alarm**
3. Monitor:
   - RDS CPU utilization
   - RDS storage space
   - Elastic Beanstalk health
   - Application errors

### **12.2 Set Up Backups**
- RDS automated backups: Already enabled
- S3 versioning: Already enabled
- Consider setting up additional backup strategy

### **12.3 Monitor Costs**
- Set up **AWS Budgets** to track spending
- Set alerts at $50, $100, etc.

---

## 🎉 **DEPLOYMENT COMPLETE!**

Your Church App should now be live at:
- **Frontend:** https://www.thegathrd.com
- **API:** https://api.thegathrd.com

---

## 🆘 **Troubleshooting**

### **Backend not responding?**
- Check Elastic Beanstalk logs
- Verify environment variables
- Check security groups
- Verify database connectivity

### **Frontend not loading?**
- Check CloudFront distribution status
- Verify S3 bucket contents
- Check DNS propagation
- Clear browser cache

### **Database connection issues?**
- Verify security group rules
- Check RDS endpoint
- Verify credentials
- Test connection from EC2 instance

---

## 📝 **Next Steps**

1. ✅ Monitor application for first 24 hours
2. ✅ Set up automated backups
3. ✅ Configure monitoring alerts
4. ✅ Document any custom configurations
5. ✅ Plan for scaling (if needed)

---

**Last Updated:** [Current Date]
**Status:** Ready for Implementation

