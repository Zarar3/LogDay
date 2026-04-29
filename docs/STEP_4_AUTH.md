# Step 4 — Authentication (Register, Login, JWT)

## Goal
Build the sign-up and sign-in API endpoints, hash passwords with bcrypt, and issue JWT tokens.

---

## 4.1 Fill In the Auth Routes

Open `backend/src/routes/auth.js` and replace it with:

```js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../prisma');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password)
    return res.status(400).json({ error: 'All fields are required' });

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });
  if (exists)
    return res.status(409).json({ error: 'Email or username already taken' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, passwordHash }
  });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

// GET /api/auth/me  (requires token)
const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, username: true, createdAt: true }
  });
  res.json(user);
});

module.exports = router;
```

---

## 4.2 Test the Endpoints

Make sure your server is running (`npm run dev`), then test with these curl commands or use a tool like Postman / Insomnia.

**Register a new user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'
```

Expected response:
```json
{
  "token": "eyJ...",
  "user": { "id": "...", "email": "test@example.com", "username": "testuser" }
}
```

**Log in:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Get current user (replace TOKEN with the token from login):**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## 4.3 How Tokens Work in This App

1. User logs in → server returns a JWT token
2. Mobile app stores the token in secure storage (`expo-secure-store`)
3. Every API request that needs auth includes the header: `Authorization: Bearer <token>`
4. The `authMiddleware` verifies the token and attaches `req.user` for the route handler

Tokens expire after 7 days — users will need to log in again after that.

---

## Checklist

- [ ] `/api/auth/register` returns a token on success
- [ ] `/api/auth/login` returns a token on success
- [ ] `/api/auth/me` returns user info when a valid token is sent
- [ ] Wrong password / missing fields return proper error messages

---

## Next Step → [STEP_5_MOBILE_APP.md](STEP_5_MOBILE_APP.md)
