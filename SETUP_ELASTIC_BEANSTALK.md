# 🚀 Set Up Elastic Beanstalk for Backend

This guide walks you through creating an Elastic Beanstalk environment for your Spring Boot backend.

---

## 📋 Prerequisites

✅ **Completed:**
- [x] AWS account configured
- [x] AWS CLI installed and configured
- [x] RDS database created
- [x] Database migrations ready

⏭️ **What You'll Need:**
- Database endpoint and credentials
- Environment variables from `ENVIRONMENT_VARIABLES.md`
- Your Spring Boot JAR file (we'll build it)

---

## 🎯 Step 1: Create Elastic Beanstalk Application

### **1.1 Navigate to Elastic Beanstalk**

1. Go to **AWS Console**
2. Search for **"Elastic Beanstalk"** in the search bar
3. Click **Elastic Beanstalk**

### **1.2 Create Application**

1. Click **"Create application"** button (orange button, top right)
2. Fill in the form:

   **Application name:**
   ```
   church-app-backend
   ```

   **Description (optional):**
   ```
   Church App Backend API - Spring Boot Application
   ```

   **Application tags (optional):**
   - Skip for now, or add tags like:
     - Key: `Environment`, Value: `Production`
     - Key: `Project`, Value: `Church-App`

3. Click **"Next"**

---

## 🌱 Step 2: Create Environment

### **2.1 Environment Configuration**

**Environment name:**
```
church-app-api-prod
```

**Domain (optional):**
- Leave default (AWS will generate one)
- We'll use custom domain later: `api.thegathrd.com`

**Platform:**
- Select **"Java"**
- **Platform version:** Select **"Java 17 running on 64bit Amazon Linux 2023"**
  - (This matches your Spring Boot Java version)

**Application code:**
- Select **"Upload your code"**
- Choose **"Local file"**
- Click **"Choose file"** and select your JAR file
  - **Note:** We'll build the JAR file first (see Step 3)
  - For now, you can skip this and upload later, or use a sample file

### **2.2 Configure Service Access**

**Service role:**
- Select **"Create and use new service role"**
- AWS will create a role with necessary permissions

**EC2 key pair:**
- Select **"Create new key pair"** or use existing
- **Note:** This is for SSH access if needed for troubleshooting
- You can skip this if you don't need SSH access

**EC2 instance profile:**
- Select **"Create and use new instance profile"**
- This allows your app to access other AWS services (S3, etc.)

### **2.3 Set Up Networking, Database, and Tags**

**VPC:**
- Select **"Default VPC"** (or your custom VPC if you have one)
- **Note:** Make sure your RDS database is in the same VPC or accessible

**Database:**
- **Don't create a database here** (we already have RDS)
- Select **"No database"**

**Tags:**
- Skip for now (optional)

### **2.4 Configure Instance Traffic and Scaling**

**Capacity:**
- **Environment type:** Select **"Load balanced"**
  - This provides high availability and auto-scaling
- **Instance type:** Select **"t3.small"**
  - 2 vCPU, 2 GB RAM - good for starting
  - Can upgrade later if needed
- **Capacity:** 
  - **Min instances:** 1
  - **Max instances:** 4 (auto-scales based on load)

**Load balancer:**
- **Load balancer type:** **Application Load Balancer** (recommended)
- **Listener:** 
  - Port 80 (HTTP) - enabled by default
  - We'll add HTTPS (port 443) later after SSL certificate

**Rolling updates and deployments:**
- **Deployment policy:** **Rolling** (zero-downtime updates)
- **Batch size:** 1 (updates one instance at a time)

### **2.5 Configure Updates, Health, and Platform

**Health reporting:**
- **Health check URL:** `/api/actuator/health`
  - This is your Spring Boot Actuator health endpoint
- **Health check grace period:** 300 seconds (5 minutes)

**Platform:**
- Platform version: Already selected (Java 17)
- **Managed platform updates:** **Enabled** (auto-updates platform)

### **2.6 Review and Launch

1. **Review** all settings
2. Click **"Create environment"**

**⏱️ This will take 5-10 minutes!**

AWS will:
- Create EC2 instances
- Set up load balancer
- Configure security groups
- Install Java runtime
- Deploy your application (if you uploaded a JAR)

---

## ⚙️ Step 3: Configure Environment Variables

**After environment is created:**

### **3.1 Navigate to Configuration**

1. In Elastic Beanstalk console, click on your environment: `church-app-api-prod`
2. Click **"Configuration"** tab (left sidebar)
3. Scroll down to **"Software"** section
4. Click **"Edit"**

### **3.2 Add Environment Properties**

Click **"Add environment property"** for each variable:

**Database Configuration:**
```
DB_URL=jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app
DB_HOST=church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=church_app
DB_USER=church_user
DB_PASSWORD=Z.jS~w]fvv[W-TyYhB8TlTD_fEG2
```

**JWT Configuration:**
```
JWT_SECRET=[GENERATE_STRONG_SECRET_HERE]
```
**Note:** Generate a strong secret (32+ characters). You can use:
```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Spring Profile:**
```
SPRING_PROFILES_ACTIVE=production
```

**AWS Configuration:**
```
AWS_REGION=us-west-2
AWS_S3_BUCKET=thegathrd-app-uploads
AWS_ACCESS_KEY_ID=[YOUR_AWS_ACCESS_KEY]
AWS_SECRET_ACCESS_KEY=[YOUR_AWS_SECRET_KEY]
```

**CORS Configuration:**
```
CORS_ORIGINS=https://www.thegathrd.com,https://app.thegathrd.com,https://thegathrd.com
```

**Google OAuth (if you have credentials):**
```
GOOGLE_CLIENT_ID=[YOUR_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[YOUR_GOOGLE_CLIENT_SECRET]
```

**Stripe (if you have keys):**
```
STRIPE_PUBLIC_KEY=[YOUR_STRIPE_PUBLIC_KEY]
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=[YOUR_WEBHOOK_SECRET]
```

**Email/SMTP (if configured):**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=[YOUR_EMAIL]
SMTP_PASSWORD=[YOUR_APP_PASSWORD]
```

**Church Information:**
```
CHURCH_NAME=The Gathering Community
CHURCH_ADDRESS=[YOUR_ADDRESS]
CHURCH_PHONE=[YOUR_PHONE]
CHURCH_EMAIL=info@thegathrd.com
CHURCH_WEBSITE=www.thegathrd.com
CHURCH_TAX_ID=[YOUR_TAX_ID]
```

### **3.3 Apply Changes**

1. Click **"Apply"** at the bottom
2. Wait for configuration update (2-3 minutes)
3. Environment will restart with new variables

---

## 🔒 Step 4: Configure Security Groups

### **4.1 Allow Database Access**

1. Go to **RDS Console** → Your database
2. Click on **"VPC security groups"** link
3. Click on the security group (e.g., `sg-xxxxx`)
4. Click **"Edit inbound rules"**
5. **Add rule:**
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Select **"Custom"** → Choose the Elastic Beanstalk security group
     - Look for security group with name like `awseb-e-xxxxx-stack-AWSEBSecurityGroup-xxxxx`
   - **Description:** "Allow Elastic Beanstalk to access database"
6. Click **"Save rules"**

### **4.2 Verify Load Balancer Security Group**

1. Go to **EC2 Console** → **Security Groups**
2. Find the Elastic Beanstalk load balancer security group
3. **Inbound rules should have:**
   - HTTP (port 80) from 0.0.0.0/0
   - HTTPS (port 443) - we'll add this after SSL certificate

---

## 📦 Step 5: Build and Deploy Application

### **5.1 Build JAR File**

```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

**Expected output:**
```
[INFO] Building jar: ...\backend\target\church-app-0.0.1-SNAPSHOT.jar
[INFO] BUILD SUCCESS
```

### **5.2 Deploy to Elastic Beanstalk**

**Option A: Via AWS Console**
1. Go to Elastic Beanstalk → Your environment
2. Click **"Upload and deploy"**
3. Click **"Choose file"**
4. Select: `backend\target\church-app-0.0.1-SNAPSHOT.jar`
5. Enter **Version label:** `v1.0.0` (or any version name)
6. Click **"Deploy"**

**Option B: Via AWS CLI (if EB CLI is installed)**
```powershell
cd backend
eb deploy
```

**⏱️ Deployment takes 5-10 minutes**

---

## ✅ Step 6: Verify Deployment

### **6.1 Check Environment Health**

1. In Elastic Beanstalk console, check **"Health"** status
2. Should show **"Ok"** (green) after deployment completes

### **6.2 Test Health Endpoint**

Your environment URL will be something like:
```
http://church-app-api-prod.us-west-2.elasticbeanstalk.com
```

Test health endpoint:
```
http://church-app-api-prod.us-west-2.elasticbeanstalk.com/api/actuator/health
```

**Expected response:**
```json
{
  "status": "UP"
}
```

### **6.3 Check Logs**

1. In Elastic Beanstalk → **"Logs"** tab
2. Click **"Request logs"** → **"Last 100 lines"**
3. Check for any errors or startup issues

---

## 🔐 Step 7: Set Up SSL Certificate (Optional - Can Do Later)

### **7.1 Request Certificate**

1. Go to **Certificate Manager** (us-east-1 region)
2. Click **"Request certificate"**
3. **Domain name:** `api.thegathrd.com`
4. **Validation method:** DNS validation
5. Click **"Request"**

### **7.2 Validate Certificate**

1. Copy the CNAME record from Certificate Manager
2. Add to GoDaddy DNS (same process as frontend certificate)
3. Wait for validation (5-30 minutes)

### **7.3 Configure HTTPS on Load Balancer**

1. In Elastic Beanstalk → **Configuration** → **Load balancer**
2. Click **"Edit"**
3. **Listeners:** Click **"Add listener"**
   - **Port:** 443
   - **Protocol:** HTTPS
   - **SSL certificate:** Select `api.thegathrd.com`
4. Click **"Apply"**

---

## 🌐 Step 8: Configure Custom Domain (After SSL)

1. In Elastic Beanstalk → **Configuration** → **Load balancer**
2. Note the **Load balancer DNS name**
3. In GoDaddy DNS, add **A record** or **CNAME:**
   - **Type:** CNAME
   - **Name:** `api`
   - **Value:** `[your-load-balancer-dns-name]`
   - **TTL:** 3600

---

## 📊 What You've Created

✅ **Elastic Beanstalk Application:** `church-app-backend`
✅ **Environment:** `church-app-api-prod`
✅ **Platform:** Java 17 on Amazon Linux 2023
✅ **Instance Type:** t3.small
✅ **Load Balancer:** Application Load Balancer
✅ **Auto-scaling:** 1-4 instances
✅ **Health Checks:** Configured
✅ **Environment Variables:** Configured
✅ **Database Access:** Security group configured

---

## 🎯 Next Steps

After Elastic Beanstalk is set up:

1. ✅ **Deploy backend** (upload JAR file)
2. ✅ **Test API endpoints**
3. ✅ **Update frontend** with API URL: `https://api.thegathrd.com/api`
4. ✅ **Build and deploy frontend**
5. ✅ **Configure DNS** in GoDaddy

---

## 🐛 Troubleshooting

### **Environment Health is "Severe"**
- Check **Logs** tab for errors
- Verify environment variables are correct
- Check database security group allows EB access

### **Application Won't Start**
- Check application logs
- Verify JAR file is correct
- Check database connection string

### **Can't Connect to Database**
- Verify RDS security group allows Elastic Beanstalk security group
- Check database endpoint is correct
- Verify database credentials

### **502 Bad Gateway**
- Application might be starting (wait 2-3 minutes)
- Check health endpoint is correct: `/api/actuator/health`
- Check application logs for errors

---

**Ready to create your Elastic Beanstalk environment?** Let's do it! 🚀

