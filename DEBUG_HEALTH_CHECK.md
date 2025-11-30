# 🔍 Debug Health Check - Status DOWN

## Problem
Health endpoint returns: `{"status": "DOWN"}`

## Quick Fix: Enable Health Details

I've updated `application-production.properties` to show health details. This will help us see **which component is failing**.

### Option 1: Rebuild and Deploy (Recommended)

1. **Rebuild JAR:**
   ```powershell
   cd backend
   .\mvnw.cmd clean package -DskipTests
   ```

2. **Upload to Elastic Beanstalk:**
   - Go to Elastic Beanstalk Console
   - Click "Upload and deploy"
   - Upload the new JAR file
   - Wait for deployment (5-10 minutes)

3. **Check Health Endpoint Again:**
   ```
   http://church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com/api/actuator/health
   ```

   **Expected Response (with details):**
   ```json
   {
     "status": "UP",
     "components": {
       "db": {
         "status": "UP",
         "details": {
           "database": "PostgreSQL",
           "validationQuery": "isValid()"
         }
       },
       "diskSpace": {
         "status": "UP",
         "details": {
           "total": 1234567890,
           "free": 987654321,
           "threshold": 10485760
         }
       }
     }
   }
   ```

   **If DOWN, you'll see which component failed:**
   ```json
   {
     "status": "DOWN",
     "components": {
       "db": {
         "status": "DOWN",
         "details": {
           "error": "Connection refused"
         }
       }
     }
   }
   ```

---

## Option 2: Check Logs (Faster - No Rebuild)

Check Elastic Beanstalk logs to see what's causing the health check to fail:

1. **Go to Elastic Beanstalk Console** → Your environment
2. **Logs** → **Request logs** → **Last 100 lines**
3. Look for:
   - Health check errors
   - Database connection issues
   - Disk space warnings
   - Any exceptions during health check

---

## Common Causes of DOWN Status

### 1. **Database Connection Issues**
- **Symptom:** `db.status: DOWN`
- **Fix:** Check database security group, credentials, endpoint

### 2. **Disk Space**
- **Symptom:** `diskSpace.status: DOWN`
- **Fix:** Usually not an issue on Elastic Beanstalk, but check if disk is full

### 3. **Missing Health Indicator**
- **Symptom:** Component shows as DOWN
- **Fix:** Check if required service is running

### 4. **Custom Health Indicator Failing**
- **Symptom:** Custom component shows DOWN
- **Fix:** Check custom health indicator code

---

## Quick Test: Check Logs First

Before rebuilding, let's check the logs to see what's failing:

1. **Elastic Beanstalk Console** → **Logs**
2. **Request logs** → **Last 100 lines**
3. Look for health check related errors

**Share the log output** and I can help identify the exact issue!

---

## After Fixing

Once health check shows UP, you can:
1. ✅ Test other API endpoints
2. ✅ Deploy frontend
3. ✅ Configure custom domain
4. ✅ Set up monitoring

---

**Next Step:** Check the logs first (Option 2) - it's faster than rebuilding! 🔍

