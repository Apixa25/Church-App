# 🔍 Check Deployment Health After OAuth Fix

## Current Status
- ✅ Deployment completed successfully
- ⚠️ Warning: 1 health issue
- 📊 Health improved from "Severe" to "Warning"

---

## 🔍 Diagnose the Health Issue

### Step 1: Check Health Tab
1. In Elastic Beanstalk dashboard, click **Health** tab
2. Look for:
   - **Instance health** - Is the instance healthy?
   - **Causes** - What's causing the warning?
   - **Recent events** - Any errors?

### Step 2: Check Logs Tab
1. Click **Logs** tab
2. Click **Request Logs** or **Last 100 Lines**
3. Look for:
   - Application startup errors
   - Database connection issues
   - Missing environment variables
   - CORS errors

### Step 3: Common Issues After Deployment

#### Issue 1: Application Still Starting
- **Symptom**: Health warning but no errors in logs
- **Solution**: Wait 2-3 minutes for application to fully start
- **Check**: Look for "Started ChurchAppApplication" in logs

#### Issue 2: Missing Environment Variable
- **Symptom**: Application fails to start, errors about missing config
- **Solution**: Verify `FRONTEND_URL` is set in environment variables
- **Check**: Configuration → Software → Environment properties

#### Issue 3: Database Connection
- **Symptom**: Database connection errors in logs
- **Solution**: Verify database credentials are correct
- **Check**: Configuration → Software → Environment properties

#### Issue 4: Port Mismatch
- **Symptom**: Health check failing, 502 errors
- **Solution**: Verify `PORT=5000` is set
- **Check**: Configuration → Software → Environment properties

---

## ✅ Verify OAuth Fix is Working

### Step 1: Check Environment Variables
1. Go to **Configuration** → **Software**
2. Verify these are set:
   - ✅ `FRONTEND_URL` = `https://d3loytcgioxpml.cloudfront.net`
   - ✅ `GOOGLE_CLIENT_ID` = (your Google client ID)
   - ✅ `GOOGLE_CLIENT_SECRET` = (your Google client secret)
   - ✅ `GOOGLE_REDIRECT_URI` = `https://api.thegathrd.com/api/oauth2/callback/google`
   - ✅ `CORS_ORIGINS` = (includes CloudFront domain)

### Step 2: Test OAuth Login
1. Wait 2-3 minutes for app to fully start
2. Go to: https://d3loytcgioxpml.cloudfront.net/login
3. Click "Continue with Google"
4. Select your Google account
5. Should redirect back to frontend (not crash!)

---

## 🎯 Quick Health Check Commands

If you have AWS CLI access, you can check health:

```bash
# Check environment health
aws elasticbeanstalk describe-environment-health \
  --environment-name church-app-backend-prod \
  --attribute-names All \
  --region us-west-2

# Get recent events
aws elasticbeanstalk describe-events \
  --environment-name church-app-backend-prod \
  --max-items 10 \
  --region us-west-2
```

---

## 📊 Expected Health States

- **🟢 OK**: Everything working perfectly
- **🟡 Warning**: Minor issue, app still functional
- **🔴 Severe**: Critical issue, app not working
- **⚪ Info**: Normal status updates

**Current**: Warning (likely transient during startup)

---

## ⏱️ Wait Time

After deployment:
- **0-2 minutes**: Application starting (may show warnings)
- **2-5 minutes**: Application fully started (should be OK)
- **5+ minutes**: If still warning, investigate logs

---

## 🔧 If Health Doesn't Improve

1. **Check Logs** for specific errors
2. **Verify Environment Variables** are all set
3. **Check Database Connection** is working
4. **Verify Port Configuration** is correct
5. **Check CORS Configuration** includes CloudFront domain

---

## ✅ Success Indicators

After deployment is complete:
- ✅ Health status: **OK** (or **Warning** that resolves quickly)
- ✅ No errors in logs
- ✅ Application responds to health check: `https://api.thegathrd.com/api/actuator/health`
- ✅ OAuth login works without crashing

---

**The warning is likely transient. Check the Health and Logs tabs to see what the specific issue is!** 🔍

