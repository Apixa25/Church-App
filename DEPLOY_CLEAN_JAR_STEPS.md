# 🚀 Deploy Clean JAR File - Step by Step

## 📦 File Location
**Clean JAR:** `backend/deploy-clean.jar` (93.19 MB)

This JAR contains:
- ✅ All new presigned URL code
- ✅ No .platform hooks (removed)
- ✅ No .ebextensions (uses environment variables from EB Console)
- ✅ All your existing functionality

---

## 🛑 Step 1: Stop/Restart Elastic Beanstalk Environment

You have a few options to stop the hanging deployment:

### **Option A: Restart Environment (Recommended)**
1. Go to **Elastic Beanstalk Console**
2. Select your environment: **`church-app-api-prod`** (or whatever it's named)
3. Click **"Actions"** (top right)
4. Select **"Restart app server(s)"**
5. Wait 2-3 minutes for restart

**OR**

### **Option B: Terminate and Recreate (If restart doesn't work)**
1. Go to **Elastic Beanstalk Console**
2. Select your environment
3. Click **"Actions"** → **"Terminate environment"**
4. Wait for termination
5. Create new environment (or it might auto-recreate if configured)

**OR**

### **Option C: Abort Current Deployment**
1. Go to **Elastic Beanstalk Console**
2. Select your environment
3. Look for **"Deployment in progress"** banner
4. Click **"Abort"** or **"Cancel"** if available
5. Wait for it to revert to previous version

---

## 📤 Step 2: Upload Clean JAR

Once the environment is stable (not deploying/hanging):

1. Go to **Elastic Beanstalk Console** → Your environment
2. Click **"Upload and deploy"** button (top right)
3. Click **"Choose file"**
4. Navigate to: `C:\Users\Admin\Church-App\Church-App\backend\deploy-clean.jar`
5. **Version label:** `s3-direct-upload-v1` (or any name)
6. Click **"Deploy"**

---

## ⏱️ Step 3: Monitor Deployment

1. Watch the **"Events"** tab for progress
2. Look for:
   - ✅ "Successfully deployed new version"
   - ✅ "Environment health has transitioned from Warning to Ok"
   - ❌ Any errors (share them if you see any)

3. **Deployment time:** Usually 5-10 minutes

---

## ✅ Step 4: Verify Deployment

After deployment completes:

1. **Check Health:**
   - Go to **"Health"** tab
   - Should show **"Ok"** (green)

2. **Test Endpoint:**
   - Try: `https://api.thegathrd.com/api/actuator/health`
   - Should return: `{"status":"UP"}`

3. **Test New Upload Endpoint:**
   - The new presigned URL endpoints should be available:
   - `POST /api/posts/generate-upload-url`
   - `POST /api/posts/confirm-upload`

---

## 🚨 If Deployment Still Fails

If the clean JAR still fails to deploy:

1. **Check Events Tab:**
   - Look for specific error messages
   - Share the exact error with me

2. **Try Rolling Back:**
   - Go to **"Application versions"**
   - Find last working version
   - Deploy that version

3. **Check Logs (if accessible):**
   - Try EC2 Instance Connect method from `DEPLOYMENT_TROUBLESHOOTING.md`

---

## 📝 Notes

- The clean JAR has **no configuration files** - it relies entirely on environment variables you set in EB Console
- This should avoid any `.platform` or `.ebextensions` issues
- If environment variables are all set correctly, this should work!

---

**Good luck! Let me know how it goes!** 🚀

