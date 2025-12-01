# 🚨 Deployment Troubleshooting Guide

## Current Issue: Deployment Hanging/Timeout

The deployment is timing out with "Unsuccessful command execution" errors. This usually means:
1. **Application failing to start** (most common)
2. **Database connection issues**
3. **Missing environment variables**
4. **Health check failing**

---

## 🔍 Step 1: Check Environment Variables

The app needs these critical environment variables in Elastic Beanstalk:

### **Required Variables:**
1. `DB_URL` - Database connection string
2. `DB_HOST` - Database host
3. `DB_PORT` - Database port (usually 5432)
4. `DB_NAME` - Database name
5. `DB_USER` - Database username
6. `DB_PASSWORD` - Database password
7. `PORT` - Should be `5000` (Elastic Beanstalk default)
8. `AWS_ACCESS_KEY_ID` - For S3 access
9. `AWS_SECRET_ACCESS_KEY` - For S3 access
10. `AWS_S3_BUCKET` - S3 bucket name

### **How to Check:**
1. Go to **Elastic Beanstalk Console** → Your environment
2. **Configuration** → **Software** → **Edit**
3. Scroll to **"Environment properties"**
4. Verify all required variables are set

---

## 🔍 Step 2: Try to Access Logs (Alternative Methods)

### **Method 1: EC2 Instance Logs**
1. Go to **EC2 Console**
2. Find your Elastic Beanstalk instance (should be named like `awseb-e-...`)
3. Select instance → **Actions** → **Monitor and troubleshoot** → **Get system log**
4. This shows system-level logs (might help if app isn't starting)

### **Method 2: CloudWatch Logs**
1. Go to **CloudWatch Console**
2. **Log groups** → Look for `/aws/elasticbeanstalk/church-app-api-prod/var/log/eb-engine.log`
3. Check for application startup errors

### **Method 3: SSH/EC2 Instance Connect**
1. Go to **EC2 Console** → Select your instance
2. **Connect** → **EC2 Instance Connect** (or Session Manager)
3. Run: `sudo tail -f /var/log/eb-engine.log`
4. Or: `sudo tail -f /var/log/web.stdout.log`

---

## 🔍 Step 3: Check Health Check Configuration

1. Go to **Elastic Beanstalk Console** → Your environment
2. **Configuration** → **Load balancer** → **Edit**
3. Check **Health check path**: Should be `/api/actuator/health`
4. Check **Health check interval**: Should be reasonable (30-60 seconds)

---

## 🔍 Step 4: Try Minimal Deployment

If the full deployment keeps failing, try deploying just the JAR without any configuration:

1. **Use the clean JAR**: `backend/deploy-clean.jar`
2. **Deploy via Console** (not ZIP with config files)
3. **Set environment variables manually** in EB Console

---

## 🔍 Step 5: Check Database Connection

The app might be failing to connect to the database:

1. **Verify RDS Security Group:**
   - Go to **RDS Console** → Your database
   - **Connectivity & security** → **VPC security groups**
   - Make sure it allows connections from Elastic Beanstalk security group

2. **Test Database Connection:**
   - Try connecting from your local machine using the same credentials
   - Verify the database is accessible

---

## 🔍 Step 6: Check Application Startup Code

The new presigned URL code should be fine, but let's verify:

1. **Check for compilation errors:**
   ```bash
   cd backend
   .\mvnw.cmd clean compile
   ```

2. **Check for missing dependencies:**
   - The new code uses `S3Presigner` which should already be in `pom.xml`
   - Verify all imports are correct

---

## 🚀 Quick Fix: Try Rolling Back

If nothing works, try rolling back to the previous working version:

1. Go to **Elastic Beanstalk Console** → Your environment
2. **Application versions** (left sidebar)
3. Find the last working version
4. **Deploy** that version

---

## 📝 What to Check in Logs (If You Can Access Them)

Look for these error patterns:

1. **Database connection errors:**
   - `Connection refused`
   - `Timeout waiting for connection`
   - `Authentication failed`

2. **Application startup errors:**
   - `Failed to start application`
   - `Bean creation error`
   - `ClassNotFoundException`

3. **Port binding errors:**
   - `Address already in use`
   - `Port 5000 already in use`

4. **Missing environment variables:**
   - `Required property 'X' not found`
   - `Cannot resolve placeholder`

---

## 🎯 Most Likely Causes (In Order)

1. **Missing or incorrect database credentials** (most common)
2. **Application failing to start** (check logs for specific error)
3. **Health check failing** (app starts but health endpoint fails)
4. **Port configuration issue** (app on wrong port)
5. **Missing AWS credentials** (S3 access fails)

---

## 💡 Next Steps

1. **First:** Check environment variables in EB Console
2. **Second:** Try to access logs via EC2 Instance Connect
3. **Third:** Verify database security group allows EB connections
4. **Fourth:** Try deploying the clean JAR file (`deploy-clean.jar`)

Let me know what you find in the logs or environment variables, and we can fix the specific issue!

