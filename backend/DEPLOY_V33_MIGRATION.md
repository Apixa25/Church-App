# 🚀 Deploy V33 Migration - Social Media Embed Support

## 📋 What's Being Deployed

**Migration V33** adds support for embedding social media content (X/Twitter posts, Facebook Reels, Instagram Reels, YouTube videos) in posts.

**New Database Columns:**
- `external_url` - Stores the original social media URL
- `external_platform` - Identifies the platform (X_POST, FACEBOOK_REEL, etc.)
- `external_embed_html` - Stores oEmbed HTML for rendering

## ✅ Pre-Deployment Checklist

- [ ] Migration file exists: `backend/src/main/resources/db/migration/V33__add_social_media_embed_support.sql`
- [ ] Code changes are committed to git
- [ ] Backend code includes the new fields in `Post` entity and DTOs
- [ ] Frontend code includes the new fields in `Post` type and components

## 🏗️ Step 1: Build New JAR File

The new JAR will include:
- ✅ All code changes (PostService, PostController, etc.)
- ✅ Migration file V33 (packaged inside JAR)
- ✅ All dependencies

### **Option A: Use Build Script (Recommended)**

```powershell
cd backend
.\build-and-deploy.ps1
```

### **Option B: Manual Build**

```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
```

**Expected Output:**
- JAR file created: `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`
- Size: ~90-100 MB
- Build should complete without errors

## 📤 Step 2: Deploy to AWS Elastic Beanstalk

### **Step 2.1: Navigate to AWS Console**

1. Go to: https://console.aws.amazon.com
2. Make sure you're in the correct region (e.g., `us-west-2`)
3. Search for "Elastic Beanstalk"
4. Click on your environment (e.g., `church-app-api-prod`)

### **Step 2.2: Upload New JAR**

1. **Click "Upload and deploy"** (orange button, top right)

2. **Choose File:**
   - Navigate to: `C:\Users\Admin\Church-App\Church-App\backend\target\`
   - Select: `church-app-backend-0.0.1-SNAPSHOT.jar`

3. **Version Label:**
   - Enter: `v33-social-media-embed-2025-12-06`
   - Or use: `social-media-embed-support`
   - **Important:** Use descriptive labels to track deployments

4. **Description (Optional):**
   - "Adds social media embed support (X, Facebook, Instagram, YouTube)"
   - "Includes database migration V33"

5. **Click "Deploy"**

### **Step 2.3: Monitor Deployment**

⏱️ **Deployment takes 5-10 minutes**

**Watch the Events tab for:**

✅ **Good Signs:**
- "Successfully deployed new version"
- "Environment health has transitioned from Warning to Ok"
- "Application deployment completed"
- "Flyway migration successful" (in logs)

⚠️ **Watch For:**
- Health status changing: "Deploying..." → "Warning" → "Ok"
- If it stays on "Warning", check logs immediately

## 🔍 Step 3: Verify Migration Ran

### **Check Application Logs:**

1. Go to **Logs** → **Request Logs** → **Last 1000 lines**
2. Download and search for:
   - `"Flyway"` - Should show migration execution
   - `"V33"` - Should show migration applied
   - `"Successfully applied"` - Confirmation

### **Expected Log Messages:**

```
Flyway Community Edition X.X.X by Redgate
Successfully validated X migrations (execution time XXms)
Successfully applied 1 migration to schema "public" (execution time XXms)
```

### **Verify Database:**

If you have database access, you can verify:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' 
  AND column_name IN ('external_url', 'external_platform', 'external_embed_html');

-- Should return 3 rows
```

## ✅ Step 4: Verify Application Works

### **Test 1: Check Health Endpoint**

```powershell
Invoke-RestMethod -Uri "https://api.thegathrd.com/api/actuator/health"
```

**Expected:** `{"status":"UP"}`

### **Test 2: Check Posts Load**

- Open your app: https://thegathrd.com
- Log in
- Go to feed
- **Posts should load without 500 errors**

### **Test 3: Create Post with X URL (Optional)**

- Create a new post
- Add an X/Twitter URL in "More Options"
- Post should be created successfully
- Embed should appear in the feed

## 🚨 Troubleshooting

### **Issue: Deployment Failed**

**Check:**
1. **Logs** → Look for error messages
2. **Events tab** → Find the failure point
3. **Common causes:**
   - Database connection issues
   - Migration syntax error (unlikely, already tested)
   - JAR file corrupted

### **Issue: Migration Didn't Run**

**Symptoms:**
- App starts but posts still fail with 500 errors
- Columns don't exist in database

**Fix:**
1. Check Flyway is enabled: `spring.flyway.enabled=true`
2. Check database connection in logs
3. Verify migration file is in JAR (unzip and check)
4. Check Flyway logs for errors

### **Issue: App Won't Start**

**Check logs for:**
- Database connection errors
- Migration errors
- Missing environment variables

**Quick Fix:**
- Roll back to previous version in Elastic Beanstalk
- Fix issues
- Redeploy

## 📝 Post-Deployment

After successful deployment:

- [ ] Verify posts load in feed
- [ ] Test creating a post with X URL (if ready)
- [ ] Monitor application health for 24 hours
- [ ] Update deployment notes/documentation

## 🎯 Summary

**What Happens:**
1. You build a new JAR (includes migration file)
2. Deploy JAR to AWS Elastic Beanstalk
3. App starts up on AWS
4. Flyway automatically detects migration V33
5. Migration runs automatically (adds 3 columns)
6. App becomes ready to serve requests
7. Posts should load without errors!

**Total Time:** ~10-15 minutes (mostly waiting for deployment)

**Zero Downtime:** Elastic Beanstalk handles rolling deployment automatically

---

**Ready to deploy?** Follow the steps above! 🚀

