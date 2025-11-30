# 🔐 Setup Google OAuth for Production

## Problem
You're seeing this error:
```
Error 401: invalid_client
The OAuth client was not found.
```

This means Google OAuth credentials are **not configured** in Elastic Beanstalk.

---

## ✅ Solution: Configure Google OAuth

### Step 1: Get Google OAuth Credentials

If you **already have** Google OAuth credentials:
- Skip to **Step 2**

If you **don't have** Google OAuth credentials yet:

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click project dropdown at top
   - Click "New Project"
   - Name: "Church App" (or your preferred name)
   - Click "Create"

3. **Enable Google+ API**
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

4. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - If prompted, configure OAuth consent screen first:
     - User Type: **External** (unless you have Google Workspace)
     - App name: "The Gathering" (or your app name)
     - User support email: Your email
     - Developer contact: Your email
     - Click **Save and Continue**
     - Scopes: Click **Save and Continue**
     - Test users: Add your email, click **Save and Continue**
     - Click **Back to Dashboard**

5. **Create OAuth Client ID**
   - Application type: **Web application**
   - Name: "Church App Production"
   - **Authorized JavaScript origins:**
     ```
     https://api.thegathrd.com
     https://www.thegathrd.com
     https://app.thegathrd.com
     ```
   - **Authorized redirect URIs:**
     ```
     https://api.thegathrd.com/api/oauth2/callback/google
     ```
   - Click **Create**
   - **Copy the Client ID and Client Secret** (you'll need these!)

---

### Step 2: Add Environment Variables to Elastic Beanstalk

1. **Go to Elastic Beanstalk Console**
   - https://console.aws.amazon.com/elasticbeanstalk/
   - Select region: **us-west-2**
   - Click on environment: **church-app-backend-prod**

2. **Go to Configuration**
   - Left sidebar → **Configuration**
   - Scroll down to **Software** section
   - Click **Edit**

3. **Add Environment Variables**
   Click **Add environment variable** for each:

   **Variable 1:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `[Your Google Client ID from Step 1]`
   - Example: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

   **Variable 2:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `[Your Google Client Secret from Step 1]`
   - Example: `GOCSPX-abcdefghijklmnopqrstuvwxyz`

   **Variable 3:**
   - Name: `GOOGLE_REDIRECT_URI`
   - Value: `https://api.thegathrd.com/api/oauth2/callback/google`
   - (This should already be set, but verify it's correct)

4. **Save Configuration**
   - Click **Apply** at bottom
   - Wait 2-5 minutes for environment to update

---

### Step 3: Verify Configuration

1. **Check Environment Variables**
   - Go to **Configuration** → **Software**
   - Verify all three variables are set:
     - ✅ `GOOGLE_CLIENT_ID`
     - ✅ `GOOGLE_CLIENT_SECRET`
     - ✅ `GOOGLE_REDIRECT_URI`

2. **Test OAuth**
   - Go to: https://d3loytcgioxpml.cloudfront.net/login
   - Click **Continue with Google**
   - Should redirect to Google login (not show "invalid_client" error)

---

## 🔍 Troubleshooting

### Error: "invalid_client"
- ✅ Check `GOOGLE_CLIENT_ID` is correct (no extra spaces)
- ✅ Check `GOOGLE_CLIENT_SECRET` is correct (no extra spaces)
- ✅ Verify redirect URI matches exactly in Google Cloud Console

### Error: "redirect_uri_mismatch"
- ✅ In Google Cloud Console, check **Authorized redirect URIs** includes:
  ```
  https://api.thegathrd.com/api/oauth2/callback/google
  ```
- ✅ Make sure there are no trailing slashes or typos

### OAuth works but user can't sign in
- ✅ Check OAuth consent screen is published (if using external users)
- ✅ Add test users in Google Cloud Console if app is in testing mode

---

## 📝 Required Environment Variables Summary

Add these to Elastic Beanstalk:

| Variable Name | Example Value | Description |
|--------------|---------------|-------------|
| `GOOGLE_CLIENT_ID` | `123456789-abc...apps.googleusercontent.com` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-abc...xyz` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://api.thegathrd.com/api/oauth2/callback/google` | Production callback URL |

---

## ✅ After Configuration

Once environment variables are set:
1. ✅ Elastic Beanstalk will restart the application
2. ✅ Google OAuth will work correctly
3. ✅ Users can sign in with Google
4. ✅ No more "invalid_client" errors

---

## 🎯 Quick Checklist

- [ ] Google Cloud Console project created
- [ ] Google+ API enabled
- [ ] OAuth 2.0 credentials created
- [ ] Authorized redirect URI added: `https://api.thegathrd.com/api/oauth2/callback/google`
- [ ] Client ID and Secret copied
- [ ] Environment variables added to Elastic Beanstalk:
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI`
- [ ] Configuration saved and environment updated
- [ ] Tested Google login

