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
    select: { id: true, email: true, username: true, avatarBase64: true, cardColor: true, cardSecondaryColor: true, isPublic: true, createdAt: true }
  });
  res.json(user);
});

// PATCH /api/auth/profile  — update avatar, card colors, and privacy
router.patch('/profile', auth, async (req, res) => {
  const { avatarBase64, cardColor, cardSecondaryColor, isPublic } = req.body;
  const data = {};
  if (avatarBase64       !== undefined) data.avatarBase64       = avatarBase64       || null;
  if (cardColor          !== undefined) data.cardColor          = cardColor          || null;
  if (cardSecondaryColor !== undefined) data.cardSecondaryColor = cardSecondaryColor || null;
  if (isPublic           !== undefined) data.isPublic           = Boolean(isPublic);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { id: true, email: true, username: true, avatarBase64: true, cardColor: true, cardSecondaryColor: true, isPublic: true },
  });
  res.json(user);
});

// GET /api/auth/user/:id  — public profile
router.get('/user/:id', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, username: true, avatarBase64: true, cardColor: true, cardSecondaryColor: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;