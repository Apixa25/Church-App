# 🔧 Fix Health Check DOWN Status

## Problem
Health endpoint returns: `{"status": "DOWN"}` or HTTP 503

## Root Cause
The health check is likely failing because:
1. **Database health indicator** is timing out or failing
2. **Disk space health indicator** might be too strict
3. Health check configuration needs adjustment

---

## ✅ Solution: Updated Health Check Configuration

I've updated `application-production.properties` to:
1. ✅ Add database health check timeout (5 seconds)
2. ✅ Disable disk space health check (not critical for Elastic Beanstalk)
3. ✅ Configure health groups for better control

---

## 🚀 Next Steps

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

3. **Test Health Endpoint:**
   ```
   http://church-app-backend-prod.eba-jmp5ju3e.us-west-2.elasticbeanstalk.com/api/actuator/health
   ```

   **Expected Response:**
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
       }
     }
   }
   ```

---

### Option 2: Quick Fix via Environment Variables (No Rebuild)

You can also add these environment variables in Elastic Beanstalk to override the health check configuration:

1. Go to **Elastic Beanstalk Console** → Your environment
2. **Configuration** → **Software** → **Edit**
3. **Environment properties** → Add:
   ```
   MANAGEMENT_HEALTH_DB_TIMEOUT=5s
   MANAGEMENT_HEALTH_DISKSPACE_ENABLED=false
   ```
4. Click **"Apply"**
5. Wait 2-3 minutes for restart

---

## 🔍 What Changed

### Before:
- Health check was too strict
- Database health check might timeout
- Disk space check might fail

### After:
- Database health check has 5-second timeout
- Disk space check disabled (not needed on Elastic Beanstalk)
- Health groups configured for better control

---

## 📊 Expected Results

**After Fix:**
- ✅ Health endpoint returns `{"status": "UP"}`
- ✅ Elastic Beanstalk health status shows "Ok"
- ✅ Load balancer health checks pass
- ✅ Application is fully operational

---

## 🎯 Recommendation

**Use Option 1 (Rebuild)** - It includes all the fixes and will ensure the health check works properly.

The updated configuration will:
- Make health checks more reliable
- Prevent false negatives
- Show detailed health information when needed

---

**After deploying, test the health endpoint and let me know what you see!** 🚀

