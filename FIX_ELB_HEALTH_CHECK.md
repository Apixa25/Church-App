# 🔧 Fix ELB Health Check Configuration

## Problem
Elastic Beanstalk shows **"Severe"** health status because:
- ELB health checker is hitting `/` (returns 404)
- Your app uses `context-path=/api`, so `/` doesn't exist
- ELB thinks the app is unhealthy

## ✅ Solution: Configure Health Check Path

Configure Elastic Beanstalk to use the correct health check endpoint.

---

## 🚀 Step-by-Step Fix

### Step 1: Go to Load Balancer Configuration

1. **AWS Console** → **Elastic Beanstalk**
2. Select your environment: **`Church-app-backend-prod`**
3. Click **"Configuration"** (left sidebar)
4. Scroll down to **"Load balancer"** section
5. Click **"Edit"** button

### Step 2: Configure Health Check

1. Scroll to **"Health check"** section
2. **Health check path:** Change from `/` to `/api/actuator/health`
3. **Health check protocol:** HTTP (should already be set)
4. **Health check port:** Traffic port (should already be set)
5. **Healthy threshold:** 3 (default is fine)
6. **Unhealthy threshold:** 5 (default is fine)
7. **Timeout:** 5 seconds (default is fine)
8. **Interval:** 30 seconds (default is fine)

### Step 3: Apply Changes

1. Click **"Apply"** (bottom right)
2. Wait 2-3 minutes for configuration to update
3. Health status should change from "Severe" to "Ok"

---

## 📊 Expected Results

**Before Fix:**
- Health status: **Severe**
- Health check: `/` → 404 errors
- ELB thinks app is unhealthy

**After Fix:**
- Health status: **Ok** ✅
- Health check: `/api/actuator/health` → 200 OK
- ELB correctly identifies app as healthy

---

## 🔍 Why This Happens

Your Spring Boot app is configured with:
```properties
server.servlet.context-path=/api
```

This means:
- ✅ `/api/actuator/health` → Works (200 OK)
- ❌ `/` → Doesn't exist (404 Not Found)

Elastic Beanstalk's default health check uses `/`, which doesn't work for your app.

---

## ✅ After Fixing

Once you configure the health check path:
1. ELB will check `/api/actuator/health`
2. Health status will show **"Ok"**
3. No more 404 errors in health check logs
4. Environment will be fully healthy

---

**This is a quick fix - just update the health check path in the Load Balancer configuration!** 🎯

