# 🔧 Fixing Google OAuth for Localhost

## 📋 The Problem

When you're testing locally, Google OAuth needs to know that `http://localhost:8083` is an allowed redirect URI. The `load-env.ps1` script loads your `.env` file, but you need to make sure:

1. ✅ Your `.env` file has the correct Google OAuth credentials
2. ✅ Google Cloud Console has `http://localhost:8083/api/oauth2/callback/google` as an authorized redirect URI
3. ✅ Your `.env` file has `GOOGLE_REDIRECT_URI` set to the localhost URL

---

## 🔍 Step 1: Check Your `.env` File

**Location:** `backend/.env` (should exist in the backend folder)

Your `.env` file should have these Google OAuth variables:

```bash
# Google OAuth for LOCALHOST development
GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8083/api/oauth2/callback/google
FRONTEND_URL=http://localhost:3000
```

**Important Notes:**
- Use your **actual** Google Client ID and Secret (not placeholders)
- `GOOGLE_REDIRECT_URI` **must** be `http://localhost:8083/api/oauth2/callback/google`
- `FRONTEND_URL` should be `http://localhost:3000` for local development

---

## 🌐 Step 2: Configure Google Cloud Console

You need to add localhost as an authorized redirect URI in Google Cloud Console:

### **Instructions:**

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (the one with your OAuth credentials)

2. **Navigate to OAuth Credentials:**
   - Go to: **APIs & Services** → **Credentials**
   - Find your **OAuth 2.0 Client ID** (the one you're using)

3. **Add Authorized Redirect URIs:**
   - Click on your OAuth Client ID to edit
   - In **Authorized redirect URIs**, add:
     ```
     http://localhost:8083/api/oauth2/callback/google
     ```
   - **Also keep your production URI:**
     ```
     https://api.thegathrd.com/api/oauth2/callback/google
     ```
   - Click **Save**

4. **Authorized JavaScript origins (if needed):**
   - Add: `http://localhost:8083`
   - Also keep: `https://api.thegathrd.com`

---

## ✅ Step 3: Verify Your `.env` File

Create or update `backend/.env` file with this template:

```bash
# Database (use your local PostgreSQL)
DB_HOST=localhost
DB_PORT=5433
DB_NAME=church_app
DB_USER=church_user
DB_PASSWORD=church_password
DB_URL=jdbc:postgresql://localhost:5433/church_app

# Google OAuth - LOCALHOST
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8083/api/oauth2/callback/google

# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:3000

# JWT Secret (use a strong random string)
JWT_SECRET=your-local-jwt-secret-key-here

# AWS (optional for local dev - can use placeholder if not testing S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**⚠️ Replace ALL placeholders with actual values!**

---

## 🚀 Step 4: Load Environment Variables

In PowerShell, navigate to the `backend` folder and run:

```powershell
cd backend
. .\load-env.ps1
```

**Expected Output:**
```
📝 Loading environment variables from .env file...

  ✅ GOOGLE_CLIENT_ID
  ✅ GOOGLE_CLIENT_SECRET
  ✅ GOOGLE_REDIRECT_URI
  ✅ FRONTEND_URL
  ✅ DB_HOST
  ✅ DB_PORT
  ... (more variables)

✅ Environment variables loaded!

🚀 You can now run: .\mvnw.cmd spring-boot:run
```

---

## 🧪 Step 5: Test Google OAuth Locally

1. **Start the backend:**
   ```powershell
   # After loading env vars
   .\mvnw.cmd spring-boot:run
   ```

2. **Start the frontend:**
   ```powershell
   # In a new terminal, go to frontend folder
   cd frontend
   npm start
   ```

3. **Test the login:**
   - Go to: `http://localhost:3000/login`
   - Click "Continue with Google"
   - Should redirect to Google login
   - After login, should redirect back to localhost

---

## 🔍 Troubleshooting

### **Problem: "redirect_uri_mismatch" error**

**Solution:** 
- Verify in Google Cloud Console that `http://localhost:8083/api/oauth2/callback/google` is in **Authorized redirect URIs**
- Make sure there are no extra spaces or trailing slashes
- Wait a few minutes after saving (Google can take time to propagate)

### **Problem: `.env` file not found**

**Solution:**
```powershell
cd backend
# Create .env file if it doesn't exist
New-Item -Path .env -ItemType File
# Then edit it with your actual values
```

### **Problem: Environment variables not loading**

**Solution:**
- Make sure you're in the `backend` folder when running `load-env.ps1`
- Check that `.env` file exists in `backend/.env`
- Verify file format (no extra spaces, one variable per line)

### **Problem: Still using production credentials**

**Solution:**
- Check that `GOOGLE_REDIRECT_URI` in `.env` is set to `http://localhost:8083/api/oauth2/callback/google`
- The script loads `.env`, but if variables aren't set, Spring Boot uses defaults from `application.properties`
- Default in `application.properties` is `http://localhost:8083/api/oauth2/callback/google` ✅

---

## 📝 Quick Reference

**For Local Development:**
- Redirect URI: `http://localhost:8083/api/oauth2/callback/google`
- Frontend URL: `http://localhost:3000`
- Backend URL: `http://localhost:8083/api`

**For Production:**
- Redirect URI: `https://api.thegathrd.com/api/oauth2/callback/google`
- Frontend URL: `https://www.thegathrd.com`
- Backend URL: `https://api.thegathrd.com/api`

**Both can coexist in Google Cloud Console!** ✅

---

## ✅ Checklist

Before testing Google OAuth locally:

- [ ] `.env` file exists in `backend/.env`
- [ ] `GOOGLE_CLIENT_ID` has your actual client ID
- [ ] `GOOGLE_CLIENT_SECRET` has your actual secret
- [ ] `GOOGLE_REDIRECT_URI=http://localhost:8083/api/oauth2/callback/google`
- [ ] Google Cloud Console has localhost redirect URI added
- [ ] Ran `load-env.ps1` script
- [ ] Backend starts without errors
- [ ] Frontend can connect to backend

---

**Remember:** The `load-env.ps1` script just loads variables for the current PowerShell session. You need to run it **before** starting the backend server! 🚀

