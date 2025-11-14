# Deep Linking Setup Guide

This guide explains how to set up deep linking for The Gathering app on Android and iOS.

## Deep Link Formats

The app supports the following deep link formats:

### App Scheme (works on devices with app installed)
```
thegathering://join/org/{organizationId}
thegathering://join/group/{groupId}
thegathering://view/user/{userId}
thegathering://view/post/{postId}
thegathering://view/event/{eventId}
thegathering://view/prayer/{prayerId}
```

### Web Fallback (works in browsers)
```
https://app.thegathering.com/join/org/{organizationId}
https://app.thegathering.com/join/group/{groupId}
https://app.thegathering.com/view/user/{userId}
```

## Android Setup

### 1. Update AndroidManifest.xml

Add the following to `android/app/src/main/AndroidManifest.xml` inside the `<activity>` tag for your MainActivity:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask"
    android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
    android:label="@string/app_name"
    android:theme="@style/AppTheme.NoActionBarLaunch">

    <!-- Existing intent filter -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- Deep Link Intent Filter - Custom Scheme -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="thegathering" />
    </intent-filter>

    <!-- Deep Link Intent Filter - HTTPS -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="app.thegathering.com" />
    </intent-filter>

</activity>
```

### 2. Create Digital Asset Links File

For HTTPS deep links to work on Android, create a file at:
`https://app.thegathering.com/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.thegathering.app",
    "sha256_cert_fingerprints": [
      "YOUR_APP_SHA256_FINGERPRINT"
    ]
  }
}]
```

To get your SHA256 fingerprint:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## iOS Setup

### 1. Update Info.plist

Add the following to `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.thegathering.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>thegathering</string>
        </array>
    </dict>
</array>
```

### 2. Enable Associated Domains

1. Open your project in Xcode
2. Select your app target
3. Go to "Signing & Capabilities"
4. Click "+ Capability" and add "Associated Domains"
5. Add the following domains:
   ```
   applinks:app.thegathering.com
   ```

### 3. Create Apple App Site Association File

Create a file at:
`https://app.thegathering.com/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.thegathering.app",
        "paths": [
          "/join/*",
          "/view/*",
          "/share/*"
        ]
      }
    ]
  }
}
```

Replace `TEAM_ID` with your Apple Developer Team ID.

## Web Server Configuration

### 1. Ensure HTTPS

Both deep link verification files must be served over HTTPS:
- `https://app.thegathering.com/.well-known/assetlinks.json` (Android)
- `https://app.thegathering.com/.well-known/apple-app-site-association` (iOS)

### 2. Set Correct Content-Type

Configure your web server to serve these files with:
```
Content-Type: application/json
```

### 3. NGINX Example

```nginx
location /.well-known/ {
    default_type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

### 4. Apache Example

```apache
<Directory "/var/www/html/.well-known">
    Header set Content-Type "application/json"
    Header set Access-Control-Allow-Origin "*"
</Directory>
```

## Testing Deep Links

### Android
```bash
# Test custom scheme
adb shell am start -W -a android.intent.action.VIEW -d "thegathering://join/org/ABC123" com.thegathering.app

# Test HTTPS scheme
adb shell am start -W -a android.intent.action.VIEW -d "https://app.thegathering.com/join/org/ABC123" com.thegathering.app
```

### iOS
```bash
# Test custom scheme
xcrun simctl openurl booted "thegathering://join/org/ABC123"

# Test HTTPS scheme
xcrun simctl openurl booted "https://app.thegathering.com/join/org/ABC123"
```

### Browser Testing
```
https://app.thegathering.com/join/org/ABC123
```

## Implementation in React

### 1. Initialize Deep Linking

In your `App.tsx`:

```typescript
import { deepLinkingService } from './services/deepLinkingService';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize deep linking
    deepLinkingService.initialize();

    // Listen for deep link events
    const unsubscribe = deepLinkingService.addListener((route) => {
      console.log('Deep link route:', route);

      // Handle different routes
      switch (route.type) {
        case 'organization':
          if (route.action === 'join') {
            navigate(`/organizations/${route.id}/join`);
          } else {
            navigate(`/organizations/${route.id}`);
          }
          break;

        case 'group':
          if (route.action === 'join') {
            navigate(`/groups/${route.id}/join`);
          } else {
            navigate(`/groups/${route.id}`);
          }
          break;

        case 'user':
          navigate(`/profile/${route.id}`);
          break;

        case 'post':
          navigate(`/post/${route.id}`);
          break;

        case 'event':
          navigate(`/events/${route.id}`);
          break;

        case 'prayer':
          navigate(`/prayers/${route.id}`);
          break;
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return (
    // Your app content
  );
}
```

### 2. Generate Share Links

```typescript
import { deepLinkingService } from './services/deepLinkingService';

// Generate a shareable link
const shareLink = deepLinkingService.generateShareableLink({
  type: 'organization',
  action: 'join',
  id: 'abc-123',
  params: { inviter: 'user-456' }
});

console.log(shareLink.deepLink);  // thegathering://join/org/abc-123?inviter=user-456
console.log(shareLink.webLink);   // https://app.thegathering.com/join/org/abc-123?inviter=user-456
console.log(shareLink.shareText); // Join our church on The Gathering: https://...

// Share using native share API
if (navigator.share) {
  navigator.share({
    title: 'Join Our Church',
    text: shareLink.shareText,
    url: shareLink.webLink
  });
}
```

## Troubleshooting

### Android: Deep Links Not Working

1. Verify AndroidManifest.xml is correct
2. Check SHA256 fingerprint matches assetlinks.json
3. Verify assetlinks.json is accessible: `curl https://app.thegathering.com/.well-known/assetlinks.json`
4. Clear app data and reinstall
5. Check ADB logs: `adb logcat | grep -i "deep"`

### iOS: Deep Links Not Working

1. Verify Info.plist is correct
2. Verify Associated Domains capability is enabled
3. Check apple-app-site-association is accessible: `curl https://app.thegathering.com/.well-known/apple-app-site-association`
4. Ensure file has no `.json` extension
5. Delete app and reinstall
6. Check Xcode console logs

### Web Fallback Not Working

1. Verify web server is serving files over HTTPS
2. Check Content-Type headers
3. Verify no authentication is required for .well-known files
4. Test with curl: `curl -I https://app.thegathering.com/.well-known/assetlinks.json`

## Security Considerations

1. **Validate Deep Link Data**: Always validate organization/group IDs before processing
2. **Authentication**: Ensure users are authenticated before joining organizations
3. **Rate Limiting**: Implement rate limiting on join endpoints
4. **Expiring Invites**: Consider adding expiration timestamps to invitation links
5. **Abuse Prevention**: Monitor for suspicious deep link activity

## Analytics

Track deep link usage:

```typescript
deepLinkingService.addListener((route) => {
  // Track with analytics
  analytics.track('Deep Link Opened', {
    type: route.type,
    action: route.action,
    id: route.id,
    params: route.params
  });
});
```

## Resources

- [Android App Links](https://developer.android.com/training/app-links)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Capacitor Deep Links Plugin](https://capacitorjs.com/docs/guides/deep-links)
