# Step 9 — App Store Submission (iOS)

## Goal
Build a production iOS binary with EAS Build and submit it to the Apple App Store.

> **Cost reminder:** You need an Apple Developer account ($99/year) to submit to the App Store.
> Everything before submission is free. You can test on your phone via Expo Go for free indefinitely.

---

## 9.1 Prerequisites

- [ ] Apple Developer account at https://developer.apple.com
- [ ] EAS CLI installed: `npm install -g eas-cli`
- [ ] Logged into Expo: `npx expo login`

---

## 9.2 Configure app.json

Open `mobile/app.json` and update it:

```json
{
  "expo": {
    "name": "LogDay",
    "slug": "logday",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#4F46E5"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourname.logday"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

Replace `com.yourname.logday` with a unique reverse-domain ID (e.g. `com.zarar.logday`).

---

## 9.3 Initialize EAS

```bash
cd mobile
eas init
```

This links your project to Expo's build service and fills in the `projectId` in `app.json`.

---

## 9.4 Configure EAS Build

```bash
eas build:configure
```

This creates `mobile/eas.json`. It will look like:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## 9.5 Add App Icons and Splash Screen

You need two image files in `mobile/assets/`:
- `icon.png` — 1024×1024 px, no transparency, no rounded corners (Apple rounds them)
- `splash.png` — 1284×2778 px (iPhone 14 Pro Max size), your splash screen

You can design these for free at:
- https://www.canva.com (use the App Icon template)

---

## 9.6 Update API URL for Production

Before building for production, your `mobile/src/api.js` baseURL must point to your deployed backend, not `localhost`.

Deploy your backend first (see below), then update:

```js
const api = axios.create({
  baseURL: 'https://your-deployed-backend.com/api',
});
```

### Deploy the Backend for Free

Use **Railway** (https://railway.app):
1. Sign up and connect your GitHub repo
2. Add a new service → select your `backend/` folder
3. Add a PostgreSQL plugin
4. Set environment variables (`JWT_SECRET`, etc.)
5. Railway gives you a public URL like `https://logday-backend.railway.app`

---

## 9.7 Build for Production

```bash
cd mobile
eas build --platform ios --profile production
```

This uploads your code to Expo's servers and builds an `.ipa` file. It takes 10–20 minutes. You'll get an email when it's done.

---

## 9.8 Create an App Store Listing

1. Go to https://appstoreconnect.apple.com
2. Click **+** → **New App**
3. Fill in:
   - **Name:** LogDay
   - **Bundle ID:** com.yourname.logday (must match `app.json`)
   - **SKU:** logday-1 (any unique string)
   - **Primary Language:** English
4. Add screenshots (you can take these from Expo Go on your iPhone using the iOS screenshot tool)
5. Write the app description (you can use the landing page copy as a starting point)
6. Set the category: **Health & Fitness** or **Lifestyle**

---

## 9.9 Submit to the App Store

```bash
eas submit --platform ios --profile production
```

EAS will ask for your Apple credentials and automatically upload the build to App Store Connect.

Alternatively, from App Store Connect:
1. Go to **TestFlight** → upload the `.ipa` manually
2. Test with internal testers first
3. When ready, go to **App Store** → submit for review

---

## 9.10 App Review

Apple reviews apps within 1–3 days. They will check:
- The app works as described
- No placeholder content or broken features
- Privacy policy URL (required) — create a simple one at https://www.termsfeed.com (free)
- App Store screenshots match the app

Common rejection reasons:
- Broken features during review
- Missing privacy policy
- Crashes on launch

---

## Post-Launch Checklist

- [ ] Update the Download button URL on your landing page with the real App Store link
- [ ] Share the App Store link with friends to test the social features
- [ ] Monitor for crashes via Expo's error reporting

---

## Checklist

- [ ] `app.json` updated with bundle identifier and version
- [ ] `eas.json` created
- [ ] App icon and splash screen assets added
- [ ] Backend deployed and production API URL set in `api.js`
- [ ] `eas build --platform ios` completed successfully
- [ ] App Store listing created in App Store Connect
- [ ] App submitted for review via `eas submit` or manually
- [ ] Privacy policy URL added to listing

---

## You're done!

You've built and shipped a full-stack social logging app:
- PostgreSQL database with users, activities, and friendships
- Node.js REST API with JWT auth
- React Native (Expo) iOS app with logging and social comparison
- React web landing page

Good luck on the App Store!
