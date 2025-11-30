# 🔍 Troubleshooting Elastic Beanstalk Deployment

## Current Issue
- ✅ Deployment completed (v1.0.1 running)
- ⚠️ Health: Warning - 100% of requests failing with HTTP 5xx

---

## Step 1: Check Application Logs

1. In Elastic Beanstalk console, click **"Logs"** tab
2. Click **"Request logs"** → **"Last 100 lines"**
3. Look for:
   - Error messages
   - Stack traces
   - Database connection errors
   - Startup failures

---

## Step 2: Check Recent Events

1. Click **"Events"** tab
2. Look for recent errors or warnings
3. Check for:
   - Application startup failures
   - Health check failures
   - Configuration errors

---

## Step 3: Common Issues & Fixes

### **Issue 1: Database Connection Failed**
**Symptoms:**
- "Connection refused" errors
- "Database does not exist" errors
- Timeout errors

**Fix:**
- Verify RDS security group allows Elastic Beanstalk security group
- Check database endpoint in environment variables
- Verify database credentials

### **Issue 2: Missing Environment Variables**
**Symptoms:**
- Null pointer exceptions
- Configuration errors

**Fix:**
- Verify all required environment variables are set
- Check `ELASTIC_BEANSTALK_ENV_VARS.md` for required variables

### **Issue 3: Health Check Endpoint Not Found**
**Symptoms:**
- 404 errors on `/api/actuator/health`
- Health check failing

**Fix:**
- Verify health check URL is correct: `/api/actuator/health`
- Check if Actuator is enabled in application.properties

### **Issue 4: Port Configuration**
**Symptoms:**
- Application not listening on correct port

**Fix:**
- Elastic Beanstalk uses port 5000 or 8080
- Check if application is configured correctly

---

## Step 4: Check Health Endpoint Directly

Try accessing the health endpoint:
```
http://Church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com/api/actuator/health
```

---

## Quick Fixes

1. **Restart Environment:**
   - Actions → Restart app server(s)

2. **Check Environment Variables:**
   - Configuration → Software → Environment properties
   - Verify all required variables are present

3. **Check Database Security Group:**
   - RDS → Your database → VPC security groups
   - Ensure Elastic Beanstalk security group is allowed

---

**Next:** Check the logs and share what errors you see!

