# 🚨 Fix Port Mismatch Issue (URGENT)

## ✅ What I Fixed

1. **SQL Query Bug** - Fixed ambiguous column reference in `ConstraintChecker.java`
2. **Port Configuration** - Updated `.ebextensions/01-environment.config` to include `PORT: 5000`

---

## 🎯 Quick Fix: Add PORT Environment Variable (FASTEST - Do This Now!)

You can fix the port issue **immediately** without rebuilding:

### Step 1: Add PORT Environment Variable

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select your environment: **`Church-app-backend-prod`**
3. Click **"Configuration"** (left sidebar)
4. Scroll down to **"Software"** → Click **"Edit"**
5. Scroll to **"Environment properties"**
6. Click **"Add environment property"**:
   - **Name:** `PORT`
   - **Value:** `5000`
7. Click **"Apply"** (bottom right)
8. Wait 2-3 minutes for the configuration to update

### Step 2: Verify

After the configuration update:
1. Go to **"Logs"** → **"Request logs"** → **"Last 100 lines"**
2. Look for: `Tomcat started on port 5000` ✅
3. Check Nginx errors - should see no more "Connection refused" errors

---

## 🔄 Alternative: Rebuild JAR (If You Want to Include SQL Fix)

If you want to include the SQL fix in the deployment:

### Step 1: Rebuild JAR

```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

### Step 2: Upload to Elastic Beanstalk

1. Go to **Elastic Beanstalk Console** → Your environment
2. Click **"Upload and deploy"**
3. Upload the new JAR from: `backend/target/church-app-backend-0.0.1-SNAPSHOT.jar`
4. Wait for deployment (5-10 minutes)

**Note:** The `.ebextensions/01-environment.config` file will automatically set `PORT=5000` on deployment.

---

## 📊 Current Status

✅ **Database Connection:** WORKING! (Security group fixed)
✅ **Application Startup:** WORKING! (App starts successfully)
❌ **Port Configuration:** NEEDS FIX (App on 8083, Nginx expects 5000)
⚠️ **SQL Query:** FIXED (Will be included in next build)

---

## 🎯 Recommended Action

**Use Option 1 (Add PORT environment variable)** - It's faster and will fix the issue immediately!

After adding `PORT=5000`, your application will:
- Start on port 5000 ✅
- Nginx will connect successfully ✅
- Health checks will pass ✅
- Your API will be accessible! 🎉

---

## 🔍 What the Logs Show

**Before Fix:**
```
Tomcat started on port 8083 (http) with context path '/api'
connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://127.0.0.1:5000/"
```

**After Fix (Expected):**
```
Tomcat started on port 5000 (http) with context path '/api'
[No more connection refused errors]
```

---

**Next Steps:**
1. Add `PORT=5000` environment variable in Elastic Beanstalk Console
2. Wait for configuration update
3. Check logs to verify port 5000
4. Test your API endpoint! 🚀

