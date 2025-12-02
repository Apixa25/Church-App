# 🧪 Local Testing Guide - Debug Presigned URL Code

## ✅ Git Safety - You're Protected!

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

## 📝 Step 1: Create `.env` File

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

## 🚀 Step 2: Load Environment Variables and Run

```powershell
cd backend

# Load environment variables from .env file
. .\load-env.ps1

# Run the application
.\mvnw.cmd spring-boot:run
```

**Expected output:**
- Application starts on `http://localhost:8083/api`
- You'll see the **exact error** immediately if something fails
- No 30-minute wait!

---

## 🔍 Step 3: Watch for Errors

When the app starts, look for:

### ✅ **Success Indicators:**
- `Started ChurchAppApplication in X seconds`
- `Tomcat started on port 8083`
- No errors about `S3Presigner` or bean creation

### ❌ **Error Indicators:**
- `BeanCreationException: Error creating bean with name 's3Presigner'`
- `Cannot resolve placeholder 'aws.access-key-id'`
- `Connection refused` (database)
- Any red error messages

---

## 🧪 Step 4: Test the Presigned URL Endpoints

Once the app starts successfully, test the new endpoints:

### **Test 1: Generate Presigned URL (using curl or Postman)**

```bash
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

## 🐛 Step 5: Debug Any Errors

If you see errors, you'll see them **immediately** in the console:

### **Common Errors and Fixes:**

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

## ✅ Step 6: Once It Works Locally

1. **Fix any errors** you find
2. **Test thoroughly** - try generating presigned URLs
3. **Build new JAR** with fixes:
   ```powershell
   .\mvnw.cmd clean package -DskipTests
   ```
4. **Deploy to Elastic Beanstalk** with confidence!

---

## 🎯 Benefits of Local Testing

- ✅ **See errors immediately** (no 30-minute wait)
- ✅ **Fast iteration** (fix → test → fix in seconds)
- ✅ **No risk to production** (test locally first)
- ✅ **Better debugging** (full stack traces)
- ✅ **Git safe** (`.env` is ignored)

---

## 📝 Quick Reference

### **Start Local Testing:**
```powershell
cd backend
. .\load-env.ps1
.\mvnw.cmd spring-boot:run
```

### **Check if .env is ignored:**
```powershell
git status
# .env should NOT appear in the list
```

### **If .env appears in git status:**
```powershell
# Make sure it's in .gitignore (it should be)
git check-ignore -v backend/.env
# Should show: backend/.env:1:backend/.env
```

---

## 🚨 Important Notes

- The `.env` file is **already in `.gitignore`** - it will never be committed
- You can test with production database (RDS) or local database
- All your code changes are safe - only the `.env` file has secrets
- Once you fix the issue locally, deploy with confidence!

---

**Let's find that startup error!** 🚀

