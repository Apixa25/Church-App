# App Store & Play Store Submission Guide

This guide covers the remaining manual steps needed to submit The Gathering to both app stores.

## Prerequisites You Need

| Item | Cost | Purpose |
|------|------|---------|
| Apple Developer Program | $99/year | Required to submit to App Store |
| Google Play Developer Account | $25 one-time | Required to submit to Play Store |
| Mac with Xcode | N/A | Required to build iOS app (cannot build on Windows) |
| Android Studio | Free | Required to build Android app |

---

## Step 1: Apple Developer Program Setup

1. Go to https://developer.apple.com/programs/ and enroll ($99/year)
2. Once enrolled, get your **Team ID** from https://developer.apple.com/account/#/membership
3. Update `frontend/capacitor.config.json` — replace the empty `developmentTeam` with your Team ID:
   ```json
   "ios": {
     "scheme": "The Gathering",
     "buildOptions": {
       "developmentTeam": "YOUR_TEAM_ID_HERE",
       "automaticProvisioning": true
     }
   }
   ```
4. Update `frontend/public/.well-known/apple-app-site-association` — replace `TEAM_ID` with your actual Team ID

### Apple Sign-In Configuration
1. In Apple Developer Console, go to **Certificates, Identifiers & Profiles**
2. Create a new **App ID** with bundle ID: `com.thegathering.app`
3. Enable **Sign in with Apple** capability
4. Create a **Services ID** for web sign-in (used by the website version)
5. Set the `APPLE_CLIENT_ID` environment variable on your backend

---

## Step 2: App Icons

You need a **1024x1024 PNG** icon with no transparency (required by Apple).

1. Place your 1024x1024 icon at `frontend/assets/icon-only.png`
2. Create a background version at `frontend/assets/icon-background.png` (solid color background)
3. Create a foreground version at `frontend/assets/icon-foreground.png` (icon without background)
4. Run:
   ```bash
   cd frontend
   npx capacitor-assets generate
   ```
   This generates all required icon sizes for both Android and iOS.

---

## Step 3: Build Android AAB

```bash
cd frontend

# Build the web app
npm run build

# Sync to native
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Go to **Build > Generate Signed Bundle / APK**
2. Select **Android App Bundle**
3. Use the keystore at `frontend/android/app/thegathering-release.keystore`
   - Password: `thegathering2026`
   - Alias: `thegathering`
   - Key password: `thegathering2026`
4. Select **release** build variant
5. The AAB file will be at `android/app/build/outputs/bundle/release/app-release.aab`

**IMPORTANT:** Back up your keystore file securely! If you lose it, you cannot update the app.

---

## Step 4: Build iOS IPA (requires Mac)

```bash
cd frontend

# Build the web app
npm run build

# Sync to native
npx cap sync ios

# Open in Xcode
npx cap open ios
```

In Xcode:
1. Select the **App** target
2. Go to **Signing & Capabilities**
3. Select your development team
4. Ensure **Push Notifications** and **Associated Domains** capabilities are added
5. Set version to **1.0.0** and build number to **1**
6. Go to **Product > Archive**
7. Once archived, click **Distribute App** > **App Store Connect**

---

## Step 5: Google Play Store Submission

1. Go to https://play.google.com/console
2. Create a new app:
   - App name: **The Gathering**
   - Default language: English (US)
   - App or game: **App**
   - Free or paid: **Free**
3. Complete the **Store listing**:
   - Short description (80 chars): "Connect with your church community through faith-based social networking"
   - Full description (4000 chars): See suggested text below
   - Screenshots: Need minimum 2 screenshots per device type (phone required)
   - Feature graphic: 1024x500 PNG
   - App icon: 512x512 PNG (already have logo512.png)
4. Complete **Content rating** questionnaire
5. Set **Target audience**: 13+
6. **App content**: 
   - Privacy policy URL: `https://www.thegathrd.com/privacy-policy`
   - Ads: No ads
7. Upload the AAB to **Production** track
8. Submit for review

---

## Step 6: Apple App Store Submission

1. Go to https://appstoreconnect.apple.com
2. Create a new app:
   - Platform: iOS
   - Name: **The Gathering**
   - Bundle ID: `com.thegathering.app`
   - SKU: `com.thegathering.app`
3. Complete the **App Information**:
   - Subtitle: "Church Community Platform"
   - Category: **Social Networking** (Primary), **Lifestyle** (Secondary)
   - Privacy Policy URL: `https://www.thegathrd.com/privacy-policy`
   - Age Rating: 4+ (complete the questionnaire)
4. Complete **App Privacy** data disclosures:
   - Contact Info (name, email) — used for account creation
   - User Content (photos, videos, messages) — user-generated content
   - Identifiers (user ID) — for app functionality
   - Usage Data — analytics
   - Location — approximate location for community discovery
5. Upload screenshots for:
   - 6.7" display (iPhone 15 Pro Max / 16 Pro Max)
   - 6.5" display (iPhone 11 Pro Max)
   - 5.5" display (iPhone 8 Plus) — optional
6. Upload the IPA from Xcode
7. Submit for review

---

## Suggested Store Description

### Short Description (Play Store)
Connect with your church community through faith-based social networking.

### Full Description

**The Gathering** is a faith-based community platform that brings your church family together in one place.

**Stay Connected:**
- Share updates, photos, and videos with your church community
- Send and receive direct messages and group chats
- Get push notifications for messages, prayer requests, and events

**Grow Together:**
- Submit and pray over prayer requests from your community
- Join worship rooms with live music and fellowship
- Discover and join church organizations and groups

**Stay Organized:**
- View upcoming church events and RSVP
- Access shared resources, sermons, and study materials
- Browse the community marketplace

**Give Back:**
- Make secure donations to your church through Stripe
- Support your church's mission from anywhere

**Key Features:**
- Multi-church support — connect with multiple congregations
- Family groups for household coordination
- Beautiful, modern interface with dark mode
- Real-time messaging and notifications
- Photo and video sharing
- Event calendar with RSVP tracking
- Prayer request wall
- Secure donation processing

Download The Gathering and strengthen your church community today!

---

## Security Notes

- **NEVER** commit the keystore file to git (it's in .gitignore)
- Store the keystore password securely (consider a password manager)
- The Apple Sign-In `APPLE_CLIENT_ID` should be set as an environment variable
- The signing key SHA-256 fingerprint is: `02:B8:3A:DA:51:0B:0B:E6:5C:F6:3E:AD:79:1F:52:44:6B:7A:20:6D:A7:88:7C:38:B1:E8:11:3D:CC:34:0C:0E`

---

## Content Compliance Checklist

- [x] Privacy Policy page created and accessible at `/privacy-policy`
- [x] Terms of Service page created and accessible at `/terms-of-service`
- [x] Sign in with Apple implemented (Apple requirement when Google Sign-In exists)
- [x] Content moderation: Users can report and block other users
- [x] Age restriction: App requires age 13+
- [x] Donations: Processed via Stripe, platform does not take a cut
- [x] Camera/microphone usage descriptions in Info.plist
- [x] Location usage description in Info.plist
- [x] Push notification support for both platforms
- [x] Deep linking configured for both Android and iOS
