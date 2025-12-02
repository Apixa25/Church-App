# 🚀 Complete Development Workflow Guide

This guide walks you through the **complete development cycle**: local development → testing → building JAR → uploading → deploying to production.

---

## 📋 Table of Contents

1. [Local Development Setup](#-part-1-local-development-setup)
2. [Build JAR File](#-part-2-build-jar-file)
3. [Upload & Deploy](#-part-3-upload--deploy-to-elastic-beanstalk)
4. [Verify Deployment](#-part-4-verify-deployment)
5. [Quick Reference](#-quick-reference-commands)

---

## 🔧 Part 1: Local Development Setup

### ✅ Git Safety - You're Protected!

**Good news:** Your `.gitignore` already excludes `.env` files:
- `backend/.env` ✅
- `.env` ✅
- `.env.*` ✅

**This means:**
- ✅ `.env` files will **NEVER** be committed to Git
- ✅ Your credentials stay local
- ✅ No risk of accidentally committing secrets
- ✅ You can test freely without worrying about Git

---

### 📝 Step 1: Create `.env` File

1. **Copy the example file:**
   ```powershell
   cd backend
   Copy-Item .env.example .env
   ```

2. **Edit `.env` file** with your actual values from Elastic Beanstalk:
   - Open `backend/.env` in your editor
   - Replace all `your-*-here` placeholders with actual values
   - Use the values from your Elastic Beanstalk environment variables

**⚠️ Important:** The `.env` file is already in `.gitignore` - it will **never** be committed!

---

### 🚀 Step 2: Load Environment Variables and Run

```powershell
cd backend

# Load environment variables from .env file
. .\load-env.ps1

# Run the application locally
.\mvnw.cmd spring-boot:run
```

**Expected output:**
- Application starts on `http://localhost:8083/api`
- You'll see the **exact error** immediately if something fails
- No 30-minute wait!

---

### 🔍 Step 3: Watch for Errors

When the app starts, look for:

#### ✅ **Success Indicators:**
- `Started ChurchAppApplication in X seconds`
- `Tomcat started on port 8083`
- No errors about `S3Presigner` or bean creation

#### ❌ **Error Indicators:**
- `BeanCreationException: Error creating bean with name 's3Presigner'`
- `Cannot resolve placeholder 'aws.access-key-id'`
- `Connection refused` (database)
- Any red error messages

---

### 🧪 Step 4: Test Locally

Once the app starts successfully, test your changes:

#### **Test API Endpoints:**

```bash
# Example: Test health endpoint
GET http://localhost:8083/api/actuator/health

# Example: Test presigned URL generation
POST http://localhost:8083/api/posts/generate-upload-url
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "fileName": "test-video.mp4",
  "contentType": "video/mp4",
  "fileSize": 52428800,
  "folder": "posts"
}
```

**Expected response:**
```json
{
  "presignedUrl": "https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/...",
  "s3Key": "posts/originals/abc123.mp4",
  "fileUrl": "https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/...",
  "expiresInSeconds": 3600
}
```

---

### 🐛 Step 5: Debug Any Errors

If you see errors, you'll see them **immediately** in the console:

#### **Common Errors and Fixes:**

1. **"Bean creation error: S3Presigner"**
   - **Cause:** AWS credentials are invalid or missing
   - **Fix:** Check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`

2. **"Cannot resolve placeholder 'aws.access-key-id'"**
   - **Cause:** Environment variables not loaded
   - **Fix:** Make sure you ran `.\load-env.ps1` before starting the app

3. **"Connection refused" (database)**
   - **Cause:** Database not accessible from your machine
   - **Fix:** Check RDS security group allows your IP address

4. **"Region is missing"**
   - **Cause:** `AWS_REGION` not set
   - **Fix:** Add `AWS_REGION=us-west-2` to `.env`

---

### ✅ Step 6: Once Everything Works Locally

**Before proceeding to build and deploy:**

1. ✅ **Fix any errors** you found
2. ✅ **Test thoroughly** - verify all your changes work
3. ✅ **Check logs** - make sure no warnings that need attention
4. ✅ **Commit your changes** (if ready):
   ```powershell
   git add .
   git commit -m "Description of your changes"
   ```

**Now you're ready to build and deploy!** 🎉

---

## 📦 Part 2: Build JAR File

Once your code works perfectly locally, it's time to build the production JAR file.

### 🔨 Step 1: Clean Previous Builds

```powershell
cd backend

# Clean previous builds
.\mvnw.cmd clean
```

This removes old compiled files and ensures a fresh build.

---

### 📦 Step 2: Build Production JAR

```powershell
# Build the JAR file (skip tests for faster build)
.\mvnw.cmd package -DskipTests

# OR if you want to run tests first:
.\mvnw.cmd package
```

**What this does:**
- Compiles all Java code
- Packages dependencies into the JAR
- Creates a single executable JAR file
- Build time: Usually 1-3 minutes

---

### ✅ Step 3: Verify JAR File

**Check that the JAR was created:**

```powershell
# Check if JAR file exists
Test-Path target\church-app-backend-0.0.1-SNAPSHOT.jar

# Get JAR file size
Get-Item target\church-app-backend-0.0.1-SNAPSHOT.jar | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
```

**Expected output:**
- ✅ File exists at: `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`
- ✅ File size: Usually 50-150 MB (depending on dependencies)
- ✅ Build should show: `BUILD SUCCESS`

**If build fails:**
- Check the error messages in the console
- Fix any compilation errors
- Make sure all dependencies are downloaded
- Try `.\mvnw.cmd clean install` to refresh dependencies

---

### 💡 Alternative: Use Build Script

You can also use the provided build script:

```powershell
cd backend
.\build-and-deploy.ps1
```

This script will:
- Clean previous builds
- Build the JAR file
- Show you the file location and size
- Provide next steps

---

## 📤 Part 3: Upload & Deploy to Elastic Beanstalk

Now that you have a working JAR file, let's deploy it to production!

### 🎯 Step 1: Navigate to AWS Elastic Beanstalk

1. **Open AWS Console**
   - Go to: https://console.aws.amazon.com
   - Make sure you're in the correct region (e.g., `us-west-2`)

2. **Find Elastic Beanstalk**
   - Type "Elastic Beanstalk" in the search bar
   - Click **"Elastic Beanstalk"** service

3. **Select Your Environment**
   - Click on your environment name (e.g., `church-app-api-prod`)
   - Wait for the dashboard to load

---

### 📤 Step 2: Upload JAR File

1. **Click "Upload and deploy" button**
   - Orange button in the top right corner

2. **Choose File**
   - Click **"Choose file"** button
   - Navigate to: `C:\Users\Admin\Church-App\Church-App\backend\target\`
   - Select: `church-app-backend-0.0.1-SNAPSHOT.jar`

3. **Enter Version Label**
   - **Version label:** Enter a descriptive name (e.g., `v1.2.3` or `feature-xyz-2025-12-01`)
   - **Description (optional):** Add a note about what changed

4. **Click "Deploy"**
   - This starts the deployment process
   - ⏱️ Deployment takes **5-10 minutes**

---

### ⏱️ Step 3: Monitor Deployment

**Watch the deployment progress:**

1. **Events Tab** (automatically shown)
   - Shows real-time deployment progress
   - Look for messages like:
     - ✅ "Successfully deployed new version"
     - ✅ "Environment health has transitioned from Warning to Ok"
     - ✅ "Application deployment completed"

2. **Health Status**
   - Top of the page shows environment health
   - Will change from "Deploying..." to "Ok" when complete

3. **What to Watch For:**
   - ✅ **Good:** "Deploying..." → "Deploying..." → "Ok"
   - ⚠️ **Warning:** Status stays "Warning" (check logs)
   - ❌ **Bad:** Status goes "Degraded" or "Severe" (check logs immediately)

**⚠️ Don't close the browser!** Wait for deployment to complete.

---

## ✅ Part 4: Verify Deployment

Once deployment completes, verify everything is working!

### 🏥 Step 1: Check Health Status

**In Elastic Beanstalk Console:**
- ✅ Health status should be **"Ok"** (green)
- ✅ Environment should show **"Healthy"**

**If health is not "Ok":**
- Check the **"Logs"** tab
- Look for error messages
- Common issues:
  - Environment variables missing
  - Database connection failed
  - Port configuration issue

---

### 🔍 Step 2: Test Health Endpoint

**Test the health endpoint:**

```bash
# Replace with your actual API URL
GET https://api.thegathrd.com/api/actuator/health
```

**Expected response:**
```json
{
  "status": "UP"
}
```

**Or via browser:**
- Navigate to: `https://api.thegathrd.com/api/actuator/health`
- Should see JSON response with `"status": "UP"`

---

### 🧪 Step 3: Test Your Changes

**Test the specific features you deployed:**

1. **Test authentication** (if you changed it)
2. **Test new endpoints** (if you added any)
3. **Test modified features** (verify your changes work)

**Example using curl or Postman:**
```bash
# Test your API endpoint
GET https://api.thegathrd.com/api/your-endpoint
Authorization: Bearer YOUR_JWT_TOKEN
```

---

### 📋 Step 4: Check Application Logs

**If something doesn't work:**

1. **Go to Elastic Beanstalk Console** → Your environment
2. **Click "Logs" tab**
3. **Click "Request logs"** → **"Last 100 Lines"**
4. **Look for:**
   - ✅ Successful requests
   - ❌ Error messages
   - ⚠️ Warning messages

**Common log locations:**
- `Request logs` - HTTP request/response logs
- `Error logs` - Application errors
- `Platform logs` - System-level logs

---

## 🎯 Benefits of This Workflow

- ✅ **See errors immediately** - Test locally first (no 30-minute wait!)
- ✅ **Fast iteration** - Fix → test → fix in seconds locally
- ✅ **Confident deployment** - Only deploy code that works locally
- ✅ **Better debugging** - Full stack traces in local environment
- ✅ **Git safe** - `.env` files never committed
- ✅ **Production ready** - JAR file tested before deployment

---

## 📝 Quick Reference Commands

### **Start Local Development:**
```powershell
cd backend
. .\load-env.ps1
.\mvnw.cmd spring-boot:run
```

### **Build JAR File:**
```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

### **Check JAR File:**
```powershell
# Verify JAR exists
Test-Path backend\target\church-app-backend-0.0.1-SNAPSHOT.jar

# Get file size
Get-Item backend\target\church-app-backend-0.0.1-SNAPSHOT.jar | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB, 2)}}
```

### **Deploy Process:**
1. Build JAR: `.\mvnw.cmd clean package -DskipTests`
2. Go to AWS Console → Elastic Beanstalk
3. Click "Upload and deploy"
4. Select JAR file: `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`
5. Enter version label
6. Click "Deploy"
7. Wait 5-10 minutes
8. Verify health status

### **Check if .env is ignored:**
```powershell
git status
# .env should NOT appear in the list

# Verify .env is in .gitignore
git check-ignore -v backend/.env
# Should show: backend/.env:1:backend/.env
```

---

## 🚨 Important Notes

- ✅ The `.env` file is **already in `.gitignore`** - it will never be committed
- ✅ You can test with production database (RDS) or local database
- ✅ All your code changes are safe - only the `.env` file has secrets
- ✅ Always test locally before building and deploying
- ✅ Wait for deployment to complete before testing production
- ✅ Check logs if deployment health is not "Ok"

---

## 🔄 Complete Workflow Summary

```
1. Develop Locally
   └─> Set up .env file
   └─> Run: .\load-env.ps1
   └─> Run: .\mvnw.cmd spring-boot:run
   └─> Test changes
   └─> Fix any errors

2. Build JAR
   └─> Clean: .\mvnw.cmd clean
   └─> Build: .\mvnw.cmd package -DskipTests
   └─> Verify JAR exists and is reasonable size

3. Deploy
   └─> Go to AWS Elastic Beanstalk Console
   └─> Click "Upload and deploy"
   └─> Select JAR file
   └─> Enter version label
   └─> Click "Deploy"
   └─> Wait 5-10 minutes

4. Verify
   └─> Check health status is "Ok"
   └─> Test health endpoint
   └─> Test your changes
   └─> Check logs if needed
```

---

**You're all set! Follow this workflow every time you want to deploy changes.** 🚀

**Happy coding!** 🎉
