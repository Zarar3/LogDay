const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const prisma  = require('../prisma');
const { computeBadges } = require('../utils/badges');
const { sendVerificationEmail } = require('../utils/email');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/register
// Validates input, checks for existing email/username, creates user with unverified email, sends verification code
router.post('/register', async (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password)
    return res.status(400).json({ error: 'All fields are required' });

  if (!isValidEmail(email))
    return res.status(400).json({ error: 'Please enter a valid email address' });

  if (username.length < 3)
    return res.status(400).json({ error: 'Username must be at least 3 characters' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });
  if (exists)
    return res.status(409).json({ error: 'Email or username already taken' });

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: { email, username, passwordHash, emailVerified: true },
  });

  const token = jwt.sign({ id: newUser.id, username: newUser.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, username: newUser.username } });
});

// POST /api/auth/verify-email 
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

  if (!user.emailVerifyCode || user.emailVerifyCode !== code)
    return res.status(400).json({ error: 'Invalid verification code' });

  if (!user.emailVerifyExpiry || new Date() > user.emailVerifyExpiry)
    return res.status(400).json({ error: 'Code has expired — please request a new one' });

  await prisma.user.update({
    where: { id: user.id },
    data:  { emailVerified: true, emailVerifyCode: null, emailVerifyExpiry: null },
  });

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
});

// POST /api/auth/resend-code
router.post('/resend-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

  const code   = generateCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data:  { emailVerifyCode: code, emailVerifyExpiry: expiry },
  });

  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error('Email send failed:', err.message);
    return res.status(500).json({ error: 'Could not send email — check server email config' });
  }

  res.json({ sent: true });
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
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, username: true, avatarBase64: true, cardColor: true, cardSecondaryColor: true, isPublic: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    console.error('GET /me error:', e);
    res.status(500).json({ error: 'Server error' });
  }
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

// GET /api/auth/badges
router.get('/badges', auth, async (req, res) => {
  try {
    const badges = await computeBadges(req.user.id, prisma);
    res.json(badges);
  } catch (e) {
    console.error('Badges error:', e);
    res.status(500).json({ error: e.message });
  }
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
