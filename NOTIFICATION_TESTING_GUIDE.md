# 🔍 Push Notification Testing & Debugging Guide

## Current Status Check

### Backend Deployment ✅
- Status: **Ready**
- Health: **Green**
- Last Updated: 2025-12-14 01:15 UTC

### What's NOT Implemented Yet ⚠️
**Important:** We built the notification infrastructure, but we haven't connected it to prayer requests yet!

The code we deployed includes:
- ✅ Backend API endpoints for notifications
- ✅ Frontend permission & token registration
- ✅ Firebase integration
- ❌ **Prayer request triggers** (not implemented yet)
- ❌ **Event reminder triggers** (not implemented yet)

---

## 🧪 Step-by-Step Testing Process

### Step 1: Test Basic Infrastructure

#### A. Check if Frontend Can Request Permission

1. Open your browser to `https://thegathrd.com`
2. Open **DevTools** (F12 or Right-click → Inspect)
3. Go to **Console** tab
4. Log in to your account
5. Look for these messages:
   ```
   🔧 Runtime Config Loaded: { hostname: 'thegathrd.com', apiUrl: 'https://api.thegathrd.com/api' }
   ```

#### B. Test Notification Permission Banner

**Expected:** You should see a purple notification banner asking to enable notifications

**If you DON'T see it:**
- Check browser console for errors
- The banner only shows if:
  - Permission is NOT already granted
  - Permission is NOT already denied
  - Banner wasn't previously dismissed

**To reset and see it again:**
```javascript
// Run in browser console
localStorage.removeItem('notification-banner-dismissed');
window.location.reload();
```

#### C. Grant Permission & Register Token

1. Click **"✨ Enable Notifications"** on the banner
2. Click **"Allow"** when browser prompts
3. Check console for:
   ```
   FCM token obtained: [token...]
   FCM token registered with backend
   ```

**If you see errors:**
- Check Network tab for failed API calls
- Look for CORS errors
- Verify you're logged in (JWT token valid)

---

### Step 2: Test Manual Notification (API Call)

This is the **easiest way to verify everything works**!

#### Using Browser DevTools Console

```javascript
// 1. Get your JWT token
const token = localStorage.getItem('token');
console.log('JWT Token:', token ? 'Found ✅' : 'Not found ❌');

// 2. Send test notification
fetch('https://api.thegathrd.com/api/notifications/test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Test notification response:', data))
.catch(err => console.error('Error:', err));
```

**Expected Response:**
```json
{
  "message": "Test notification sent successfully"
}
```

**You should receive a notification:**
> **TheGathering Test**
> Your notifications are working! 🎉

#### Using curl (from your computer)

```bash
# Get your JWT token from browser localStorage first
curl -X POST https://api.thegathrd.com/api/notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

### Step 3: Check Notification Status

```javascript
// Run in browser console
fetch('https://api.thegathrd.com/api/notifications/status', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => console.log('Notification status:', data));
```

**Expected:**
```json
{
  "registered": true,
  "message": "Push notifications are enabled"
}
```

---

### Step 4: Check Firebase Console

#### In Firebase Console (https://console.firebase.google.com/)

1. Go to your project: **thegathering-42de7**
2. Click **"Engage"** → **"Cloud Messaging"**
3. Look at the **"Messages"** section

**What to check:**
- Number of messages sent (should increment when you send test)
- Delivery rate
- Any errors

#### Send Test from Firebase Console

1. In Firebase Console → **Cloud Messaging**
2. Click **"Send your first message"** or **"New campaign"**
3. Enter:
   - **Notification title:** Test from Firebase
   - **Notification text:** Testing direct from console
4. Click **"Send test message"**
5. **Problem:** You need the FCM token!

**To get your FCM token:**
```javascript
// Run in browser console on thegathrd.com
import { getCurrentToken } from './src/config/firebase';
getCurrentToken().then(token => console.log('Your FCM token:', token));
```

Or check the Network tab when you click "Enable Notifications" - the token is sent to `/api/notifications/register-token`

---

## 🔧 Why Prayer Requests Aren't Triggering Notifications

**The notification infrastructure is ready, but we need to add the trigger code!**

### What Needs to Be Added

You need to modify `PrayerRequestService.java` to send notifications when a prayer request is created.

Here's the code to add:

```java
// In backend/src/main/java/com/churchapp/service/PrayerRequestService.java

@Autowired
private NotificationService notificationService;

@Autowired
private UserRepository userRepository;

// In the createPrayerRequest() method, AFTER creating the prayer request:
public PrayerRequest createPrayerRequest(PrayerRequestDTO dto, User user) {
    // ... existing code to create prayer request ...

    // NEW CODE: Send notifications to all users in the organization
    try {
        Organization organization = user.getChurchPrimaryOrganization();
        if (organization != null) {
            // Get all users in the same organization
            List<User> orgUsers = userRepository.findByChurchPrimaryOrganization(organization);

            // Get FCM tokens
            List<String> tokens = orgUsers.stream()
                .map(User::getFcmToken)
                .filter(token -> token != null && !token.trim().isEmpty())
                .collect(Collectors.toList());

            if (!tokens.isEmpty()) {
                Map<String, String> data = new HashMap<>();
                data.put("type", "prayer_request");
                data.put("prayerId", prayerRequest.getId().toString());

                notificationService.sendBulkNotification(
                    tokens,
                    "🙏 New Prayer Request",
                    user.getName() + " needs your prayers: " + dto.getTitle(),
                    data
                );

                log.info("Sent prayer request notification to {} users", tokens.size());
            }
        }
    } catch (Exception e) {
        log.error("Failed to send prayer request notification", e);
        // Don't fail the whole request if notification fails
    }

    return prayerRequest;
}
```

**This code:**
1. Gets all users in the same organization
2. Collects their FCM tokens
3. Sends a bulk notification to all of them
4. Logs success/errors

---

## 🚨 Common Issues & Solutions

### Issue 1: "No notification appears"

**Check:**
1. Browser permission granted? (Chrome settings → Site settings → Notifications)
2. FCM token registered? (Run status check from Step 3)
3. Service worker registered? (DevTools → Application → Service Workers)
4. Notification permission not blocked at OS level? (Windows Settings → Notifications)

### Issue 2: "CORS error in console"

**Solution:** Your backend is already configured for CORS, but verify:
```bash
curl -I https://api.thegathrd.com/api/notifications/status
```

Should return `Access-Control-Allow-Origin: *`

### Issue 3: "FCM token not registering"

**Check:**
1. VAPID key is correct in `frontend/src/config/firebase.ts`
2. Firebase Messaging is initialized (check console logs)
3. Service worker is loaded (check DevTools → Application)

### Issue 4: "Firebase credentials error in backend logs"

**Critical:** The Firebase Admin SDK JSON file needs to be on the production server!

**Check backend logs:**
```bash
aws elasticbeanstalk describe-events \
  --environment-name Church-app-backend-prod \
  --max-items 50 \
  --query "Events[?Severity=='ERROR']"
```

**If you see "Firebase configuration file not found":**
You need to upload the credentials to the server (see DEPLOYMENT_COMPLETE.md Step 1)

---

## ✅ Quick Verification Checklist

- [ ] Frontend deployed to S3
- [ ] CloudFront cache invalidated
- [ ] Backend deployed to Elastic Beanstalk (Status: Ready ✅)
- [ ] Database migration applied (V37 ✅)
- [ ] Firebase Admin credentials uploaded to server (⚠️ **Check this!**)
- [ ] Browser notification permission granted
- [ ] FCM token registered (check `/api/notifications/status`)
- [ ] Test notification works (run `/api/notifications/test`)
- [ ] Prayer request trigger code added (❌ **Not added yet**)

---

## 🎯 Recommended Testing Order

1. **First:** Test manual notification (`/api/notifications/test`) ← **Start here!**
2. **Second:** Check notification status
3. **Third:** Verify service worker is working
4. **Fourth:** Add prayer request trigger code
5. **Fifth:** Test with actual prayer request

---

## 📊 Firebase Console Monitoring

### Real-time Monitoring

1. Go to Firebase Console → **Cloud Messaging** → **Reports**
2. You'll see:
   - Messages sent (today, this week)
   - Delivery rate
   - Errors (invalid tokens, etc.)

### Debug Logs

1. Firebase Console → **Cloud Messaging** → **Notification composer**
2. Click **"Campaign analytics"** to see delivery stats

---

## 🔥 Next Steps

1. **Test the infrastructure first** (manual `/test` endpoint)
2. **If that works:** Add prayer request trigger code
3. **If that doesn't work:** Check Firebase credentials on server
4. **Monitor:** Use Firebase Console to see messages being sent

---

**Need more help?** Check the backend logs for errors:
```bash
aws logs tail /aws/elasticbeanstalk/Church-app-backend-prod/var/log/web.stdout.log --follow
```

This will show real-time logs including FCM errors!
