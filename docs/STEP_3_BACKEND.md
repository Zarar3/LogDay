# Step 3 — Backend API (Node.js + Express)

## Goal
Build the Express server with a clean route structure, connect it to PostgreSQL via Prisma, and verify it runs.

---

## 3.1 Create the Server Entry Point

Create `backend/src/index.js`:

```js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes (added in later steps)
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/friends',    require('./routes/friends'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## 3.2 Create the Prisma Client Singleton

Create `backend/src/prisma.js`:

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = prisma;
```

Import this file anywhere you need to query the database instead of creating a new PrismaClient each time.

---

## 3.3 Create the Route Files (Empty Stubs)

Create these files now so the server can start without errors. You'll fill them in during Steps 4, 6, and 7.

**`backend/src/routes/auth.js`**
```js
const router = require('express').Router();
module.exports = router;
```

**`backend/src/routes/activities.js`**
```js
const router = require('express').Router();
module.exports = router;
```

**`backend/src/routes/friends.js`**
```js
const router = require('express').Router();
module.exports = router;
```

Your `backend/src/` folder should now look like:
```
src/
├── index.js
├── prisma.js
└── routes/
    ├── auth.js
    ├── activities.js
    └── friends.js
```

---

## 3.4 Add a Start Script

Open `backend/package.json` and update the `"scripts"` section:

```json
"scripts": {
  "start": "node src/index.js",
  "dev": "nodemon src/index.js"
}
```

---

## 3.5 Start the Server

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 3000
```

Test it by opening http://localhost:3000 in your browser — you'll get a "Cannot GET /" which is fine, it means Express is running.

---

## 3.6 Create the Auth Middleware

This middleware will protect routes that require a logged-in user. You'll apply it in Steps 6 and 7.

Create `backend/src/middleware/auth.js`:

```js
const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1]; // "Bearer <token>"
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

---

## Checklist

- [ ] `backend/src/index.js` created and server starts with `npm run dev`
- [ ] `backend/src/prisma.js` created
- [ ] Three route stub files created under `backend/src/routes/`
- [ ] `backend/src/middleware/auth.js` created
- [ ] Server prints `Server running on port 3000`

---

## Next Step → [STEP_4_AUTH.md](STEP_4_AUTH.md)
