# 🗄️ Create RDS PostgreSQL Database - Step by Step

Now that AWS CLI is configured, let's create your production database!

---

## 📋 What We're Creating

- **Service:** AWS RDS (Relational Database Service)
- **Engine:** PostgreSQL 15.x
- **Purpose:** Host your Church App database
- **Estimated Cost:** ~$15/month (db.t3.micro) or free tier eligible

---

## 🚀 Step 1: Create RDS Database via AWS Console

### **1.1 Navigate to RDS**

1. **Go to:** https://console.aws.amazon.com/
2. **Search:** "RDS" in the top search bar
3. **Click:** "RDS" service
4. **Click:** "Databases" (left sidebar)
5. **Click:** "Create database" (orange button)

### **1.2 Choose Database Configuration**

**Database creation method:**
- ✅ Select: **"Standard create"**

**Engine options:**
- **Engine type:** PostgreSQL
- **Version:** PostgreSQL 15.x (or latest available)
- **Template:** 
  - **Free tier** (if eligible) OR
  - **Production** (if you want more resources)

### **1.3 Settings**

**DB instance identifier:**
```
church-app-db
```

**Master username:**
```
church_user
```

**Master password:**
- **⚠️ IMPORTANT:** Create a STRONG password!
- **Requirements:**
  - At least 16 characters
  - Mix of uppercase, lowercase, numbers, symbols
  - **SAVE THIS PASSWORD SECURELY!** You'll need it later.

**Example password generator:**
```powershell
# PowerShell password generator
-join ((65..90) + (97..122) + (48..57) + (33..47) | Get-Random -Count 20 | % {[char]$_})
```

### **1.4 Instance Configuration**

**DB instance class:**
- **Free tier:** `db.t3.micro` (if eligible)
- **Production:** `db.t3.small` (recommended for production)
- **Note:** Start small, you can scale up later

**Storage:**
- **Storage type:** General Purpose SSD (gp3)
- **Allocated storage:** 20 GB
- **Storage autoscaling:** ✅ Enable
- **Maximum storage threshold:** 100 GB

### **1.5 Connectivity**

**VPC:**
- Select: **Default VPC** (or create new if preferred)

**Subnet group:**
- **Default** (auto-created)

**Public access:**
- ✅ **Yes** (for initial setup - we'll restrict later)

**VPC security group:**
- **Create new:** `church-app-db-sg`
- **Or select existing** if you have one

**Availability Zone:**
- **No preference** (let AWS choose)

**Database port:**
```
5432
```
(This is the default PostgreSQL port)

### **1.6 Database Authentication**

- ✅ **Password authentication**

### **1.7 Additional Configuration**

**Initial database name:**
```
church_app
```

**DB parameter group:**
- **Default** (or create custom if needed)

**Backup:**
- ✅ **Enable automated backups**
- **Backup retention period:** 7 days
- **Backup window:** No preference (or choose low-traffic time)

**Encryption:**
- ✅ **Enable encryption** (recommended for production)
- **Encryption key:** Default (AWS managed key)

**Performance Insights:**
- ✅ **Enable Performance Insights** (optional, helps with monitoring)
- **Retention:** 7 days (free tier)

**Enhanced monitoring:**
- ❌ **Disable** (optional, costs extra)

### **1.8 Maintenance**

**Auto minor version upgrade:**
- ✅ **Enable**

**Maintenance window:**
- **No preference** (or choose low-traffic time)

### **1.9 Create Database**

1. **Review** all your settings
2. **Click:** "Create database" (orange button)
3. **Wait:** 5-10 minutes for database to be created

---

## ✅ Step 2: Get Database Endpoint

Once the database is created:

1. **Go to:** RDS Console → **Databases**
2. **Click on:** `church-app-db`
3. **Find:** "Connectivity & security" tab
4. **Copy the Endpoint:**
   ```
   church-app-db.xxxxx.us-east-1.rds.amazonaws.com
   ```
5. **Save this endpoint!** You'll need it for configuration.

---

## 🔒 Step 3: Configure Security Group

### **3.1 Update Security Group Rules**

1. **Go to:** EC2 Console → **Security Groups**
2. **Find:** `church-app-db-sg` (or the security group you created)
3. **Click:** "Edit inbound rules"
4. **Add rule:**
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** 
     - **My IP** (for initial testing)
     - **OR** Elastic Beanstalk security group (after creating EB)
   - **Description:** "Allow PostgreSQL from my IP"
5. **Click:** "Save rules"

**⚠️ Important:** For production, you'll want to restrict this to only allow connections from your Elastic Beanstalk environment.

---

## 📝 Step 4: Save Your Database Information

Create a secure file (don't commit to Git!) with:

```bash
# RDS Database Configuration
DB_HOST=church-app-db.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=church_app
DB_USER=church_user
DB_PASSWORD=[YOUR_STRONG_PASSWORD]
DB_URL=jdbc:postgresql://church-app-db.xxxxx.us-east-1.rds.amazonaws.com:5432/church_app
```

**Save this in:**
- Password manager
- Encrypted file
- AWS Secrets Manager (recommended for production)

---

## 🧪 Step 5: Test Connection (Optional)

If you have PostgreSQL client installed:

```bash
psql -h [YOUR_DB_ENDPOINT] -U church_user -d church_app
```

Or test from your local machine:

```powershell
# Test connectivity (if you have psql installed)
psql -h church-app-db.xxxxx.us-east-1.rds.amazonaws.com -U church_user -d church_app
```

**Note:** You may need to install PostgreSQL client tools first.

---

## ✅ Step 6: Verify Database Status

1. **Go to:** RDS Console → **Databases**
2. **Check:** Database status should be **"Available"**
3. **Note:** It may take 5-10 minutes to become available

---

## 🎯 What's Next?

Once your database is created:

1. ✅ **Database created** ← You are here
2. ⏭️ **Set up S3 for frontend hosting**
3. ⏭️ **Set up CloudFront distribution**
4. ⏭️ **Set up Elastic Beanstalk for backend**
5. ⏭️ **Run database migrations**
6. ⏭️ **Deploy your application!**

---

## 💰 Cost Information

**Free Tier (if eligible):**
- 750 hours/month of db.t2.micro or db.t3.micro
- 20 GB storage
- 20 GB backup storage

**Production (db.t3.small):**
- ~$15/month for instance
- ~$2/month for 20 GB storage
- ~$2/month for backups
- **Total: ~$19/month**

**You can start with free tier and upgrade later!**

---

## 🆘 Troubleshooting

### **Database creation fails**
- Check you have proper IAM permissions
- Verify you're in the right region (us-east-1)
- Check service quotas (you may have limits)

### **Can't connect to database**
- Verify security group allows your IP
- Check database endpoint is correct
- Verify username and password
- Check database status is "Available"

### **Connection timeout**
- Security group may not allow your IP
- Database may still be creating (wait 10 minutes)
- Check VPC and subnet configuration

---

## 📞 Ready to Continue?

Once your database is created and you have the endpoint, let me know and we'll:
1. Set up S3 for frontend hosting
2. Configure CloudFront
3. Set up Elastic Beanstalk
4. Run database migrations
5. Deploy your app!

**You're making great progress!** 🚀

