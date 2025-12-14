# 🚀 Quick Start - Push Notifications

## ✅ What's Been Completed

All the code is ready! Here's what was set up:

1. ✅ **VAPID Key configured** - Added to [firebase.ts](frontend/src/config/firebase.ts)
2. ✅ **Dependencies installed** - Firebase & Capacitor packages added
3. ✅ **Backend ready** - Firebase Admin SDK + API endpoints created
4. ✅ **Frontend ready** - Notification hooks, components, and service workers

---

## 🎯 To Test Push Notifications (Quick 3-Step Process)

### Step 1: Start Docker Desktop
Your PostgreSQL database runs in Docker, so you need to:
1. Open **Docker Desktop** application
2. Wait for it to fully start (icon in system tray turns green)

### Step 2: Start the Backend
Open a terminal and run:
```bash
cd backend
mvnw.cmd clean compile spring-boot:run
```

The database migration will run automatically on startup and add the `fcm_token` column!

### Step 3: Start the Frontend
Open another terminal and run:
```bash
cd frontend
npm start
```

---

## 🎉 Test It Out!

1. Open your browser to `http://localhost:3000`
2. Log in to your account
3. You'll see a **purple notification banner** appear
4. Click **"✨ Enable Notifications"**
5. Click **"Allow"** when the browser asks for permission
6. Click **"Send Test"** to test!

You should receive a notification that says:
> **TheGathering Test**
> Your notifications are working! 🎉

---

## 📱 Features Now Available

### Notification Types Supported
- 🙏 **Prayer Requests** - When someone posts a new prayer
- 📅 **Event Reminders** - When an event is coming up
- 💬 **Chat Messages** - New messages in group chats
- ❤️ **Post Interactions** - Likes, comments, shares
- 📢 **Announcements** - Church-wide announcements

### Where It Works
- ✅ **Chrome** (Desktop & Mobile)
- ✅ **Firefox** (Desktop & Mobile)
- ✅ **Edge** (Desktop)
- ✅ **Safari** (iOS 16.4+ & macOS)
- ✅ **iOS App** (via Capacitor)
- ✅ **Android App** (via Capacitor)

### Special Features
- 🔴 **Badge/dot on app icon** - Shows unread notification count!
- 🔔 **Background notifications** - Works even when app is closed
- 🎯 **Smart routing** - Clicking a notification takes you to the right page
- 📲 **Foreground alerts** - Custom in-app notifications when browsing

---

## 🔧 API Endpoints You Can Use

All endpoints require authentication (JWT token):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notifications/register-token` | POST | Register FCM token |
| `/api/notifications/unregister-token` | DELETE | Remove token |
| `/api/notifications/test` | POST | Send test notification |
| `/api/notifications/status` | GET | Check if registered |

**Test via Postman/curl:**
```bash
# Send test notification
curl -X POST http://localhost:8080/api/notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 💡 How to Add Notifications to Your Features

### Example: Prayer Request Notification

When a new prayer request is created, notify all users:

```java
// In PrayerRequestService.java
@Autowired
private NotificationService notificationService;

@Autowired
private UserRepository userRepository;

public PrayerRequest createPrayerRequest(PrayerRequestDTO dto, User user) {
    // ... create prayer request ...

    // Send notification to all users
    List<User> users = userRepository.findAll();
    List<String> tokens = users.stream()
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
            user.getName() + " needs your prayers",
            data
        );
    }

    return prayerRequest;
}
```

---

## 🎨 Customize Notification Settings

Your existing [SettingsPage.tsx](frontend/src/components/SettingsPage.tsx) already has notification toggles!

Users can enable/disable:
- Push notifications
- Email notifications
- Prayer request notifications
- Event notifications
- Announcement notifications

---

## 📂 Key Files Created

### Backend
- [FirebaseConfig.java](backend/src/main/java/com/churchapp/config/FirebaseConfig.java) - Firebase initialization
- [NotificationService.java](backend/src/main/java/com/churchapp/service/NotificationService.java) - Send notifications
- [NotificationController.java](backend/src/main/java/com/churchapp/controller/NotificationController.java) - API endpoints
- [V37__add_fcm_token_to_users.sql](backend/src/main/resources/db/migration/V37__add_fcm_token_to_users.sql) - Database migration

### Frontend
- [firebase.ts](frontend/src/config/firebase.ts) - Firebase web config
- [firebase-messaging-sw.js](frontend/public/firebase-messaging-sw.js) - Background notifications
- [useNotifications.ts](frontend/src/hooks/useNotifications.ts) - React hook
- [NotificationPermissionBanner.tsx](frontend/src/components/NotificationPermissionBanner.tsx) - Permission UI
- [pushNotificationService.ts](frontend/src/services/pushNotificationService.ts) - Universal service (web + mobile)

---

## 🐛 Troubleshooting

### "No notification appears"
- Check browser permissions: `chrome://settings/content/notifications`
- Verify token is registered: `GET /api/notifications/status`
- Check console for errors

### "Database connection refused"
- Make sure **Docker Desktop** is running
- Check PostgreSQL is running: `docker ps`

### "VAPID key error"
- Already configured! Key is in [firebase.ts:76](frontend/src/config/firebase.ts#L76)

---

## 🎊 You're All Set!

Once you start Docker → Backend → Frontend, your push notifications will be **fully functional**!

The badge/dot you wanted will appear on the app icon when notifications arrive! 🔴

For more details, see [NOTIFICATIONS_SETUP.md](NOTIFICATIONS_SETUP.md)

---

**Built with ❤️ for TheGathering**
