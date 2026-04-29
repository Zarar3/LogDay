# LogDay App — Project Overview

## What We're Building

**LogDay** is a social daily activity logging app with:
- A mobile app (iOS, React Native + Expo) where users log custom daily activities
- A social feed to compare what you and your friends did each day
- A user authentication system (sign up / sign in)
- A PostgreSQL database for all user, activity, and social data
- A web landing page to market the app

---

## Architecture

```
logging-app/
├── backend/        # Node.js + Express API server
├── mobile/         # React Native + Expo mobile app
├── web/            # React landing page (Vite)
└── docs/           # Step-by-step guides (you are here)
```

### Data Flow

```
[Mobile App / Web]
       |
       | HTTP requests (REST API)
       v
[Node.js + Express Backend]
       |
       | Prisma ORM
       v
[PostgreSQL Database]
```

---

## Feature List

### Authentication
- Sign up with email + password
- Sign in / sign out
- JWT-based session tokens

### Activity Logging
- Create custom activity types (e.g., "Running", "Reading", "Cooking")
- Log an activity entry with: type, duration, notes, date/time
- View your own daily log history
- Edit or delete log entries

### Social / Friends
- Send and accept friend requests by username
- View a friend's activity log for today
- Side-by-side daily comparison view with a friend

### Landing Page (Web)
- Hero section explaining the app
- Feature highlights
- App Store download link (once published)
- Sign up / waitlist form

---

## Full Step Index

| Step | File | What you'll do |
|------|------|----------------|
| 1 | STEP_1_PROJECT_SETUP.md | Install tools, create folder structure |
| 2 | STEP_2_DATABASE.md | Set up PostgreSQL and define schema |
| 3 | STEP_3_BACKEND.md | Build the Node.js + Express API |
| 4 | STEP_4_AUTH.md | Add user registration and JWT login |
| 5 | STEP_5_MOBILE_APP.md | Create Expo app, screens, navigation |
| 6 | STEP_6_ACTIVITIES.md | Build activity logging UI + API |
| 7 | STEP_7_FRIENDS.md | Add friends and comparison features |
| 8 | STEP_8_LANDING_PAGE.md | Build the React web landing page |
| 9 | STEP_9_APP_STORE.md | Build and submit to the iOS App Store |

---

## Prerequisites (install before Step 1)

- Node.js v18+ — https://nodejs.org
- PostgreSQL — https://www.postgresql.org/download/
- Expo CLI — installed in Step 1
- Xcode (for iOS simulator, Mac only) — App Store
- A physical iPhone with Expo Go installed (for device testing)
- An Apple Developer account ($99/year) — needed for App Store
- Git — https://git-scm.com
