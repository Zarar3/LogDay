# Step 1 — Project Setup

## Goal
Install all required tools and scaffold the monorepo folder structure.

---

## 1.1 Install Required Tools

### Node.js
Download and install Node.js v18 or later from https://nodejs.org (choose the LTS version).

Verify:
```bash
node --version   # should print v18.x.x or higher
npm --version
```

### PostgreSQL
Download from https://www.postgresql.org/download/windows/

During install:
- Set a password for the `postgres` superuser — **write this down**
- Keep the default port: `5432`

Verify (in a new terminal):
```bash
psql --version
```

### Git
Download from https://git-scm.com if not already installed.

### Expo CLI
```bash
npm install -g expo-cli
npm install -g eas-cli      # for App Store builds later
```

Verify:
```bash
expo --version
eas --version
```

### Expo Go (on your iPhone)
Install **Expo Go** from the iOS App Store on your physical device.

---

## 1.2 Create the Folder Structure

Run these commands from wherever you want the project to live (e.g., your Desktop or Documents):

```bash
mkdir logging-app
cd logging-app

mkdir backend
mkdir mobile
mkdir web
mkdir docs
```

You should now have:
```
logging-app/
├── backend/
├── mobile/
├── web/
└── docs/
```

---

## 1.3 Initialize Git

```bash
cd logging-app
git init
```

Create a `.gitignore` at the root:

```
# .gitignore
node_modules/
.env
.env.local
*.log
dist/
build/
.expo/
```

---

## 1.4 Initialize the Backend

```bash
cd backend
npm init -y
```

Install backend dependencies:
```bash
npm install express cors dotenv bcryptjs jsonwebtoken
npm install @prisma/client
npm install --save-dev prisma nodemon
```

Create the entry point:
```bash
# backend/src/index.js  (create this file — see Step 3)
mkdir src
```

Create `backend/.env`:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/logday"
JWT_SECRET="replace_with_a_long_random_string"
PORT=3000
```
Replace `YOUR_PASSWORD` with the password you set during PostgreSQL install.

---

## 1.5 Initialize the Mobile App

```bash
cd ../mobile
npx create-expo-app . --template blank
```

When prompted, choose **blank (JavaScript)** template.

Install navigation and UI packages:
```bash
npx expo install react-navigation/native
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context
npx expo install react-native-gesture-handler
npm install axios
npm install @react-native-async-storage/async-storage
npx expo install expo-secure-store
```

---

## 1.6 Initialize the Landing Page

```bash
cd ../web
npm create vite@latest . -- --template react
npm install
npm install react-router-dom axios
```

---

## 1.7 Verify Everything Works

### Backend (test server starts)
```bash
cd backend
# Create a quick test file
node -e "console.log('backend ok')"
```

### Mobile (test Expo starts)
```bash
cd mobile
npx expo start
```
A QR code will appear. Scan it with the **Expo Go** app on your iPhone to open the app.

### Web (test Vite starts)
```bash
cd web
npm run dev
```
Open http://localhost:5173 in your browser.

---

## Checklist

- [ ] Node.js v18+ installed
- [ ] PostgreSQL installed, password saved
- [ ] Expo CLI and EAS CLI installed
- [ ] Expo Go on your iPhone
- [ ] `logging-app/` folder created with `backend/`, `mobile/`, `web/`
- [ ] Git initialized
- [ ] `backend/` npm initialized and packages installed
- [ ] `mobile/` Expo app created and opens on phone via Expo Go
- [ ] `web/` Vite React app created and opens in browser

---

## Next Step → [STEP_2_DATABASE.md](STEP_2_DATABASE.md)
