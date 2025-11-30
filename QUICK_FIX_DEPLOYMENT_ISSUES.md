# 🚨 Quick Fix for Deployment Issues

## Current Problems

1. ❌ **Database Connection Timeout** - RDS security group blocking Elastic Beanstalk
2. ⚠️ **Port Mismatch** - App on 8083, Elastic Beanstalk expects 5000

---

## 🔒 Fix 1: Database Security Group (CRITICAL - Do This First!)

### Step 1: Find Elastic Beanstalk Security Group

1. Go to **EC2 Console** → **Security Groups**
2. Search for groups containing "elasticbeanstalk" or "awseb"
3. Look for name like: `awseb-e-fdxub8xm5s-stack-AWSEBSecurityGroup-xxxxx`
4. **Copy the Security Group ID** (e.g., `sg-abc123def456`)

### Step 2: Update RDS Security Group

1. Go to **RDS Console** → Your database (`church-app-db`)
2. Under **"Connectivity & security"**, click **"VPC security groups"** link
3. Click on the security group (e.g., `sg-xxxxx`)
4. Click **"Edit inbound rules"**
5. Click **"Add rule"**
6. Configure:
   - **Type:** PostgreSQL
   - **Port:** 5432
   - **Source:** Select **"Custom"** → **"Security group"**
   - **Security group:** Select the Elastic Beanstalk security group you found in Step 1
   - **Description:** "Allow Elastic Beanstalk to access database"
7. Click **"Save rules"**

### Step 3: Verify

- Wait 1-2 minutes for changes to propagate
- The database connection should work after restart

---

## 🔧 Fix 2: Port Configuration

I've updated `application.properties` to use the `PORT` environment variable. Now add it to Elastic Beanstalk:

### Step 1: Add PORT Environment Variable

1. Go to **Elastic Beanstalk Console** → Your environment
2. **Configuration** → **Software** → **Edit**
3. **Environment properties** → **Add environment property**:
   - **Name:** `PORT`
   - **Value:** `5000`
4. Click **"Apply"**

### Step 2: Restart Environment

1. **Actions** → **Restart app server(s)**
2. Wait 2-3 minutes for restart

---

## ✅ After Both Fixes

1. **Database connection** should work
2. **Application** should start on port 5000
3. **Health checks** should pass
4. **Status** should show "Ok"

---

## 🧪 Test

After fixes, test:
```
http://Church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com/api/actuator/health
```

Expected: `{"status":"UP"}`

---

**Priority:** Fix database security group FIRST - that's the main blocker!

