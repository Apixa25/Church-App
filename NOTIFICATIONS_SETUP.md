# 🔔 Push Notifications Setup Guide for TheGathering

## ✅ What's Been Implemented

We've successfully integrated **Firebase Cloud Messaging (FCM)** for push notifications across web and mobile platforms!

### Backend (Spring Boot) ✅
- **Firebase Admin SDK** integrated ([pom.xml:183-188](backend/pom.xml#L183-L188))
- **Firebase Configuration** class ([FirebaseConfig.java](backend/src/main/java/com/churchapp/config/FirebaseConfig.java))
- **Notification Service** with single & bulk send ([NotificationService.java](backend/src/main/java/com/churchapp/service/NotificationService.java))
- **Notification Controller** with REST API endpoints ([NotificationController.java](backend/src/main/java/com/churchapp/controller/NotificationController.java))
- **User Entity** updated with FCM token storage ([User.java:165-167](backend/src/main/java/com/churchapp/entity/User.java#L165-L167))
- **Database Migration** for FCM token column ([V37__add_fcm_token_to_users.sql](backend/src/main/resources/db/migration/V37__add_fcm_token_to_users.sql))

### Frontend (React + Capacitor) ✅
- **Firebase SDK** added to package.json ([package.json:24](frontend/package.json#L24))
- **Capacitor Push Notifications** plugin added ([package.json:11](frontend/package.json#L11))
- **Firebase Configuration** for web ([firebase.ts](frontend/src/config/firebase.ts))
- **Firebase Messaging Service Worker** for background notifications ([firebase-messaging-sw.js](frontend/public/firebase-messaging-sw.js))
- **useNotifications Hook** for React components ([useNotifications.ts](frontend/src/hooks/useNotifications.ts))
- **NotificationPermissionBanner** component ([NotificationPermissionBanner.tsx](frontend/src/components/NotificationPermissionBanner.tsx))
- **Unified Push Notification Service** (web + mobile) ([pushNotificationService.ts](frontend/src/services/pushNotificationService.ts))

---

## 📋 Next Steps to Complete Setup

### 1. Get Your Firebase VAPID Key 🔑

**CRITICAL:** You need to add your VAPID key for web push notifications to work!

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **thegathering-42de7**
3. Go to **Project Settings** (⚙️ gear icon)
4. Click the **"Cloud Messaging"** tab
5. Scroll to **"Web configuration"** → **"Web Push certificates"**
6. If you see a key pair, copy the **"Key pair"** value
7. If no key exists, click **"Generate key pair"**

**Then update these files:**

[frontend/src/config/firebase.ts:79](frontend/src/config/firebase.ts#L79)
```typescript
vapidKey: 'YOUR_VAPID_KEY_HERE' // ← Replace this!
```

[frontend/src/config/firebase.ts:125](frontend/src/config/firebase.ts#L125)
```typescript
vapidKey: 'YOUR_VAPID_KEY_HERE' // ← Replace this too!
```

---

### 2. Install Dependencies

Run these commands:

```bash
# Install npm dependencies
cd frontend
npm install

# Sync Capacitor (if building for mobile)
npx cap sync
```

---

### 3. Run Database Migration

The FCM token column needs to be added to the users table:

```bash
cd backend
./mvnw flyway:migrate
# or on Windows:
mvnw.cmd flyway:migrate
```

---

### 4. Test the Integration

#### A. Start Backend
```bash
cd backend
./mvnw spring-boot:run
```

#### B. Start Frontend
```bash
cd frontend
npm start
```

#### C. Test Flow
1. Open the app at `http://localhost:3000`
2. You should see the **NotificationPermissionBanner** (purple gradient banner)
3. Click **"✨ Enable Notifications"**
4. Grant permission when the browser prompts
5. Click **"Send Test"** button to test
6. You should receive a notification!

---

## 🎯 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/register-token` | POST | Register FCM token for user |
| `/api/notifications/unregister-token` | DELETE | Remove FCM token |
| `/api/notifications/test` | POST | Send test notification |
| `/api/notifications/status` | GET | Check registration status |

**Example - Register Token:**
```bash
curl -X POST http://localhost:8080/api/notifications/register-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"FCM_TOKEN_HERE"}'
```

---

## 📱 How to Use in Your Code

### Request Permission (React Component)
```typescript
import useNotifications from '../hooks/useNotifications';

function MyComponent() {
  const { requestPermission, isRegistered } = useNotifications();

  const handleEnableNotifications = async () => {
    const success = await requestPermission();
    if (success) {
      console.log('Notifications enabled!');
    }
  };

  return (
    <button onClick={handleEnableNotifications}>
      Enable Notifications
    </button>
  );
}
```

### Send Notification (Backend)
```java
@Autowired
private NotificationService notificationService;

@Autowired
private UserRepository userRepository;

public void notifyPrayerRequest(UUID prayerId, String prayerTitle) {
    // Get all users with FCM tokens
    List<User> users = userRepository.findAll();
    List<String> tokens = users.stream()
        .map(User::getFcmToken)
        .filter(token -> token != null && !token.trim().isEmpty())
        .collect(Collectors.toList());

    // Send bulk notification
    Map<String, String> data = new HashMap<>();
    data.put("type", "prayer_request");
    data.put("prayerId", prayerId.toString());

    notificationService.sendBulkNotification(
        tokens,
        "New Prayer Request",
        prayerTitle,
        data
    );
}
```

---

## 🔍 Implementation Examples

### Example 1: Prayer Request Notifications

Add this to `PrayerRequestService.java`:

```java
public PrayerRequest createPrayerRequest(PrayerRequestDTO dto, User user) {
    // ... existing code to create prayer request ...

    // Send notification to all users
    List<User> allUsers = userRepository.findAll();
    List<String> tokens = allUsers.stream()
        .filter(u -> u.getFcmToken() != null)
        .map(User::getFcmToken)
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
    }

    return prayerRequest;
}
```

### Example 2: Event Reminders

Add this to `EventService.java`:

```java
@Scheduled(cron = "0 0 9 * * *") // Daily at 9 AM
public void sendEventReminders() {
    LocalDateTime tomorrow = LocalDateTime.now().plusDays(1);

    List<Event> upcomingEvents = eventRepository.findEventsBetween(
        tomorrow.toLocalDate().atStartOfDay(),
        tomorrow.toLocalDate().atTime(23, 59)
    );

    for (Event event : upcomingEvents) {
        // Get RSVPs for this event
        List<String> tokens = event.getRsvps().stream()
            .map(rsvp -> rsvp.getUser().getFcmToken())
            .filter(token -> token != null)
            .collect(Collectors.toList());

        if (!tokens.isEmpty()) {
            Map<String, String> data = new HashMap<>();
            data.put("type", "event_reminder");
            data.put("eventId", event.getId().toString());

            notificationService.sendBulkNotification(
                tokens,
                "📅 Event Tomorrow",
                event.getTitle() + " starts tomorrow at " + event.getStartTime(),
                data
            );
        }
    }
}
```

---

## 🎨 Features Included

### ✅ Web Push Notifications
- Works on Chrome, Firefox, Edge, Safari (iOS 16.4+)
- Background notifications (even when tab is closed)
- Foreground notifications with custom handling
- Notification click handling with deep linking

### ✅ Mobile Push Notifications (iOS/Android)
- Native push via Capacitor
- Badge count support
- Sound and vibration
- Notification click handling

### ✅ Smart Notification Settings
- Existing SettingsPage already has notification toggles
- User can enable/disable per notification type
- Push notification banner for onboarding

---

## 🐛 Troubleshooting

### "VAPID key not found" Error
- Make sure you've added the VAPID key to [firebase.ts](frontend/src/config/firebase.ts)

### Notifications Not Appearing
1. Check browser permission: `chrome://settings/content/notifications`
2. Verify FCM token is registered: `GET /api/notifications/status`
3. Check browser console for errors
4. Ensure service worker is registered: DevTools → Application → Service Workers

### Mobile Not Working
1. Run `npx cap sync` after installing dependencies
2. For iOS: Configure push notifications in Xcode capabilities
3. For Android: Ensure `google-services.json` is in `android/app/`

---

## 📊 What Gets Sent in Notifications

### Notification Structure
```javascript
{
  notification: {
    title: "New Prayer Request",
    body: "John needs your prayers: Health Recovery"
  },
  data: {
    type: "prayer_request",
    prayerId: "uuid-here",
    userId: "uuid-here"
  }
}
```

### Supported Notification Types
- `prayer_request` → Routes to `/prayer/{prayerId}`
- `post_like` → Routes to `/feed`
- `post_comment` → Routes to `/feed`
- `event_reminder` → Routes to `/events/{eventId}`
- `chat_message` → Routes to `/chat/{chatId}`
- `announcement` → Routes to `/announcements`

---

## 🚀 Ready to Go!

Once you:
1. ✅ Add the VAPID key
2. ✅ Run `npm install`
3. ✅ Run the database migration
4. ✅ Start backend and frontend

Your push notifications will be **LIVE**! 🎉

The badge/dot you wanted on the app icon will appear when notifications are received!

---

## 📞 Need Help?

Check these resources:
- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

**Made with ❤️ for TheGathering community**
