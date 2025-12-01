# 🚀 Deploy Nginx Configuration Fix - Manual Steps

## ✅ What Was Fixed

1. **Increased nginx body size limit** from 1MB to 100MB
2. **Extended timeouts** for large file uploads
3. **Optimized buffer sizes** for better performance

## 📦 Files Ready

- ✅ JAR file built: `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`
- ✅ Nginx config: `backend\.ebextensions\02-nginx.config`
- ✅ Deployment package: `backend\deploy.zip` (includes both)

---

## 🎯 Deployment Method 1: Upload JAR + Source Bundle (Recommended)

Since the `.ebextensions` folder contains new nginx configuration, you need to deploy it as a source bundle.

### Step 1: Go to Elastic Beanstalk Console

1. Open **AWS Console** → **Elastic Beanstalk**
2. Region: **us-west-2** (based on your logs)
3. Select your environment (likely named something like `church-app-backend-prod` or similar)

### Step 2: Upload Source Bundle

1. Click **"Upload and deploy"** button (orange button, top right)
2. Click **"Choose file"**
3. Navigate to: `C:\Users\Admin\Church-App\Church-App\backend\`
4. Select: **`deploy.zip`** (this includes both JAR and .ebextensions)
5. **Version label:** Enter `nginx-fix-v1` (or any descriptive name)
6. **Description (optional):** "Fix nginx upload size limit to 100MB"
7. Click **"Deploy"**

### Step 3: Wait for Deployment

- Deployment takes **5-10 minutes**
- Watch the **Events** tab for progress
- Status will show "Deploying..." then "Ok" when complete

---

## 🎯 Deployment Method 2: Upload JAR Only (If .ebextensions Already Exists)

If you've previously deployed with `.ebextensions`, you can upload just the JAR:

1. Click **"Upload and deploy"**
2. Select: `backend\target\church-app-backend-0.0.1-SNAPSHOT.jar`
3. Version label: `nginx-fix-v1`
4. Click **"Deploy"**

**Note:** The nginx configuration will only be updated if `.ebextensions` is included in the deployment.

---

## ✅ Step 4: Verify Deployment

### 4.1 Check Health Status

1. In Elastic Beanstalk console, check **"Health"** status
2. Should show **"Ok"** (green) after deployment completes

### 4.2 Verify Nginx Configuration

1. Go to **"Logs"** → **"Request logs"** → **"Last 100 lines"**
2. Look for nginx configuration being applied (you might see messages about proxy.conf)

### 4.3 Test Upload

1. Go to https://www.thegathrd.com
2. Try creating a post with a large image or video (up to 75MB)
3. The upload should now work without 413 errors!

---

## 🔍 Troubleshooting

### If deployment fails:

1. **Check Events tab** in Elastic Beanstalk for error messages
2. **Check Logs** → **Request logs** for nginx errors
3. **Verify .ebextensions structure:**
   - Should be: `backend\.ebextensions\02-nginx.config`
   - File should exist and be valid YAML

### If uploads still fail after deployment:

1. **SSH into instance** (if enabled):
   ```bash
   # Check nginx config
   cat /etc/nginx/conf.d/proxy.conf
   
   # Test nginx config
   sudo nginx -t
   
   # Restart nginx if needed
   sudo systemctl restart nginx
   ```

2. **Check nginx error logs:**
   ```bash
   tail -f /var/log/nginx/error.log
   ```

3. **Verify body size limit:**
   - The config should show `client_max_body_size 100M;`

---

## 📝 What Happens During Deployment

1. Elastic Beanstalk extracts the deployment package
2. Copies the JAR file to the application directory
3. Applies `.ebextensions\02-nginx.config`:
   - Creates `/etc/nginx/conf.d/proxy.conf` with new settings
   - Nginx automatically reloads the configuration
4. Restarts the application
5. Health checks verify everything is working

---

## ✅ Success Criteria

After deployment, you should be able to:
- ✅ Upload images up to 20MB
- ✅ Upload videos up to 75MB (30 seconds max)
- ✅ No more 413 "Content Too Large" errors
- ✅ No more CORS errors on upload failures

---

## 🎉 Next Steps

1. **Wait for deployment** (5-10 minutes)
2. **Test upload functionality** on your site
3. **Monitor logs** for any issues
4. **Celebrate!** 🎊 Your upload size limit is now fixed!

---

**Last Updated**: December 1, 2025  
**Status**: Ready for deployment

