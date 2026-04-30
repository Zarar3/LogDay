# Building & Sharing LogDay with EAS

## What this does
Builds a real Android `.apk` file that anyone can install on their phone —
no Expo Go needed, your laptop does not need to be on.

---

## Step 1 — Make sure you're in the mobile folder

```bash
cd mobile
```

---

## Step 2 — Build for Android

```bash
eas build -p android --profile preview
```

- It will ask: **"Generate a new Android Keystore?"** — type `Y` and press Enter
- The build uploads to Expo's servers and runs in the cloud
- Takes about **5–15 minutes**
- You'll get a link like: `https://expo.dev/accounts/Zarar3/projects/mobile/builds/...`

---

## Step 3 — Download the APK

1. Open the build link in your browser (or go to expo.dev → your project → Builds)
2. Click **Download** to get the `.apk` file

---

## Step 4 — Share with friends

**Option A — Direct download link**
- On the build page on expo.dev there is a shareable link
- Send it to your friends — they open it on their Android phone and tap **Install**
- They may need to allow "Install from unknown sources" in their phone settings

**Option B — Send the APK file directly**
- Download the `.apk` yourself and send it via WhatsApp, iMessage, email, etc.
- Friends tap it on their phone to install

---

## Step 5 — Allowing installation on Android

When your friend tries to install the APK their phone may say **"Install blocked"**.
Tell them to:

1. Go to **Settings** → **Apps** → **Special app access** → **Install unknown apps**
2. Find the browser or file manager they used to open it
3. Toggle **Allow from this source** on
4. Go back and tap the APK again

---

## Rebuilding after code changes

Every time you update the app you need to rebuild:

```bash
eas build -p android --profile preview
```

Then share the new download link with your friends.

---

## Notes

- Free EAS plan includes **1 build per month** — enough for testing
- The backend on Railway runs 24/7 independently — no laptop needed
- iOS requires a $99/year Apple Developer account — skip for now
