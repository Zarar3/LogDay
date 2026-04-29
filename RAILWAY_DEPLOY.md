# Deploying LogDay Backend to Railway

## Prerequisites
- Code pushed to GitHub (done)
- Railway account — sign up at https://railway.app using your GitHub account

---

## Step 1 — Create a New Project

1. Go to https://railway.app and log in
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Find and select **LogDay** from your repo list
5. If you don't see it, click **Configure GitHub App** and grant access

---

## Step 2 — Set the Root Directory

After selecting the repo, Railway will detect it as a Node project.

1. Click on the service that was created
2. Go to **Settings** tab
3. Under **Source**, set **Root Directory** to `backend`
4. Railway will now only look inside the `backend` folder for your app

---

## Step 3 — Add a PostgreSQL Database

1. In your project dashboard, click **New** (top right)
2. Select **Database** → **Add PostgreSQL**
3. Railway provisions a Postgres instance and automatically adds a `DATABASE_URL` environment variable to your project

---

## Step 4 — Set Environment Variables

1. Click on your backend service
2. Go to the **Variables** tab
3. Add the following:

| Variable | Value |
|---|---|
| `JWT_SECRET` | pick a long random string (e.g. `k9x2mQ7pL...`) |
| `NODE_ENV` | `production` |

> `DATABASE_URL` and `PORT` are set automatically by Railway — do not add them manually.

---

## Step 5 — Set the Start Command

Railway should auto-detect `npm start` from your `package.json`. Verify this:

1. Go to **Settings** tab on your service
2. Under **Deploy**, check that **Start Command** is `npm start`
3. If it's blank, enter: `npm start`

---

## Step 6 — Run Prisma Migrations

Your database is empty — you need to run migrations before the app works.

1. Click on your backend service
2. Go to the **Settings** tab
3. Scroll to **Deploy** section and find **Custom Build Command**
4. Set **Custom Build Command** to:
   ```
   npx prisma migrate deploy
   ```
5. Leave **Custom Start Command** as `npm start` (Railway sets this by default)

   > Migrations run during build, then the server starts normally.

Alternatively, use the Railway CLI:
```bash
npm install -g @railway/cli
railway login
railway link        # select your project
railway run npx prisma migrate deploy
```

---

## Step 7 — Get Your Public URL

1. Click on your backend service
2. Go to the **Settings** tab
3. Under **Networking**, click **Generate Domain**
4. You'll get a URL like: `https://logday-production-xxxx.up.railway.app`

---

## Step 8 — Update the Mobile App

Open `mobile/src/api.js` and replace the placeholder with your Railway URL:

```js
const api = axios.create({
  baseURL: 'https://logday-production-xxxx.up.railway.app/api',
});
```

Then restart Expo:
```bash
npx expo start --clear
```

---

## Step 9 — Verify It Works

Test your backend is live by opening this in a browser:
```
https://your-app.up.railway.app/api/auth/me
```
You should get a JSON response (even if it says unauthorized — that means the server is running).

---

## Redeploying After Code Changes

Every time you push to GitHub, Railway redeploys automatically. No manual steps needed.

```bash
git add .
git commit -m "your message"
git push origin main
```

---

## Troubleshooting

**Build fails**
- Check the **Logs** tab on Railway for the exact error
- Most common: missing env variable or wrong root directory

**Database connection error**
- Make sure the PostgreSQL plugin is in the same Railway project as your backend service
- `DATABASE_URL` should appear automatically in your Variables tab

**Migrations didn't run**
- Use the Railway CLI: `railway run npx prisma migrate deploy`
- Or set the custom build command as shown in Step 6

**App returns 502 / not found**
- Check logs — the server may have crashed on startup
- Make sure `PORT` is not hardcoded (your code uses `process.env.PORT`, so this is fine)
