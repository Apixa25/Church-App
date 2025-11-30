# 🔐 Google OAuth Setup - Step by Step

## ✅ Current Status

You're creating the OAuth client in Google Cloud Console. Here's what to do:

---

## 📝 Form Fields to Fill

### 1. Application Type
- ✅ **Already set**: "Web application" (correct!)

### 2. Name
- ✅ **Current**: "Web client 1"
- 💡 **Suggestion**: Change to "Church App Production" (easier to identify later)

### 3. Authorized JavaScript Origins
**Click "Add URI" and add these (one at a time):**

```
https://www.thegathrd.com
https://app.thegathrd.com
https://d3loytcgioxpml.cloudfront.net
```

**Why these?**
- These are the domains where users will click "Continue with Google"
- Google needs to know which domains are allowed to initiate OAuth

### 4. Authorized Redirect URIs
- ✅ **Already set**: `https://api.thegathrd.com/api/oauth2/callback/google`
- ✅ **This is correct!** Don't change it.

---

## 🎯 After Clicking "Create"

1. **You'll see a popup with:**
   - **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
   - **Client Secret** (looks like: `GOCSPX-abc...xyz`)

2. **IMPORTANT: Copy both values immediately!**
   - You won't be able to see the Client Secret again
   - Save them somewhere secure (password manager, notes, etc.)

---

## 📋 Next Steps (After Getting Credentials)

### Step 1: Add to Elastic Beanstalk

1. Go to **AWS Console** → **Elastic Beanstalk**
2. Select environment: **church-app-backend-prod**
3. Go to **Configuration** → **Software** → **Edit**
4. Add these environment variables:

   **Variable 1:**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `[Paste your Client ID here]`

   **Variable 2:**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `[Paste your Client Secret here]`

   **Variable 3:**
   - Name: `GOOGLE_REDIRECT_URI`
   - Value: `https://api.thegathrd.com/api/oauth2/callback/google`

5. Click **Apply**
6. Wait 2-5 minutes for environment to update

### Step 2: Test

1. Go to: https://d3loytcgioxpml.cloudfront.net/login
2. Click **Continue with Google**
3. Should redirect to Google login (no errors!)

---

## 🔍 Troubleshooting

### Error: "redirect_uri_mismatch"
- ✅ Check redirect URI in Google Console matches exactly:
  ```
  https://api.thegathrd.com/api/oauth2/callback/google
  ```
- ✅ No trailing slashes
- ✅ Must be HTTPS

### Error: "invalid_client"
- ✅ Check Client ID and Secret are correct in Elastic Beanstalk
- ✅ No extra spaces when copying/pasting
- ✅ Wait 2-5 minutes after adding environment variables

### OAuth works but shows "Access blocked"
- ✅ Check OAuth consent screen is configured
- ✅ Add your email as a test user if app is in testing mode

---

## ✅ Checklist

Before clicking "Create":
- [ ] Application type: Web application
- [ ] Name: "Church App Production" (or your preferred name)
- [ ] Authorized JavaScript origins: Added 3 domains
- [ ] Authorized redirect URIs: `https://api.thegathrd.com/api/oauth2/callback/google`

After clicking "Create":
- [ ] Client ID copied
- [ ] Client Secret copied (save securely!)
- [ ] Credentials added to Elastic Beanstalk
- [ ] Environment updated (waited 2-5 minutes)
- [ ] Tested Google login

---

## 🎉 You're Almost There!

Once you:
1. ✅ Add the JavaScript origins
2. ✅ Click "Create"
3. ✅ Copy the credentials
4. ✅ Add them to Elastic Beanstalk

Google OAuth will work perfectly! 🚀

