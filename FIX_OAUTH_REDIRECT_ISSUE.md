# 🔧 Fix OAuth Redirect Issue

## 🔍 Problem

When logging in with Google OAuth:
1. ✅ User can see Google accounts
2. ✅ User selects account
3. ✅ Backend processes OAuth
4. ❌ User gets redirected back to login screen
5. ❌ Token is not being captured

## 📊 Debugging Added

I've added debugging to `AuthCallback.tsx` that will show:
- Current URL the user is redirected to
- All query parameters present
- Which parameters are missing

**The debugging version is now deployed!**

---

## 🧪 Test OAuth Now

1. **Go to**: https://d3loytcgioxpml.cloudfront.net/login
2. **Click**: "Continue with Google"
3. **Select**: Your Google account
4. **Open Browser Console** (F12 → Console tab)
5. **Look for**:
   ```
   🔍 AuthCallback - Current URL: ...
   🔍 AuthCallback - Search params: ...
   🔍 AuthCallback - Extracted values: ...
   ```

---

## 🔍 What to Check

### 1. Check Browser Console Output

After trying OAuth login, check the console for:
- **Current URL**: Should be `https://d3loytcgioxpml.cloudfront.net/auth/callback?token=...`
- **Search params**: Should show all parameters (token, userId, email, name, role, etc.)
- **Extracted values**: Shows which parameters are present/missing

### 2. Check FRONTEND_URL Environment Variable

**In Elastic Beanstalk:**
1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select **church-app-backend-prod**
3. Click **Configuration** → **Software** → **Edit**
4. Look for: `FRONTEND_URL`
5. **Should be**: `https://d3loytcgioxpml.cloudfront.net`

**If missing:**
1. Click **Add environment variable**
2. **Name**: `FRONTEND_URL`
3. **Value**: `https://d3loytcgioxpml.cloudfront.net`
4. Click **Apply**
5. Wait 2-5 minutes for environment to update

### 3. Check Backend Logs

**In Elastic Beanstalk:**
1. Go to **Logs** tab
2. Click **Request Logs** → **Last 100 Lines**
3. Look for the OAuth redirect:
   ```
   GET /api/auth/oauth2/success → 302
   ```
4. Check what URL it's redirecting to

---

## 🐛 Common Issues

### Issue 1: Redirect goes to wrong URL
**Symptom**: Console shows URL like `http://localhost:3000/auth/callback` or wrong domain
**Fix**: Set `FRONTEND_URL` environment variable in Elastic Beanstalk

### Issue 2: Missing query parameters
**Symptom**: Console shows empty search params or missing token
**Fix**: Check backend `AuthController.handleOAuth2Success` method

### Issue 3: profilePicUrl missing
**Symptom**: All other params present but profilePicUrl is null
**Status**: This is OK - profilePicUrl is optional

### Issue 4: Role parameter issue
**Symptom**: Role is missing or incorrect
**Fix**: Check `AuthService.handleOAuth2Login` method

---

## ✅ Expected Console Output (Success)

When OAuth works correctly, you should see:
```
🔍 AuthCallback - Current URL: https://d3loytcgioxpml.cloudfront.net/auth/callback?token=eyJhbGc...&refreshToken=...&userId=...&email=...&name=...&role=USER&isNewUser=false
🔍 AuthCallback - Search params: {token: "eyJhbGc...", refreshToken: "...", userId: "...", email: "...", name: "...", role: "USER", isNewUser: "false"}
🔍 AuthCallback - Extracted values: {token: "Present", refreshToken: "Present", userId: "...", email: "...", name: "...", role: "USER", isNewUser: false, error: "None"}
OAuth2 login successful, redirecting to dashboard
```

---

## 🔧 Next Steps

1. **Try OAuth login** with browser console open
2. **Share the console output** - especially the "AuthCallback" logs
3. **Check FRONTEND_URL** in Elastic Beanstalk
4. **Check backend logs** for the redirect URL

This will help us identify exactly where the issue is! 🎯

