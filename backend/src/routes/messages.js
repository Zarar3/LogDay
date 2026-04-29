const router = require('express').Router();
const prisma = require('../prisma');
const auth   = require('../middleware/auth');

async function areFriends(userAId, userBId) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId, userBId },
        { userAId: userBId, userBId: userAId },
      ],
    },
  });
}

// GET /api/messages  — list of conversations with last message + unread count
router.get('/', auth, async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: req.user.id }, { receiverId: req.user.id }] },
    orderBy: { createdAt: 'desc' },
    include: {
      sender:   { select: { id: true, username: true, avatarBase64: true } },
      receiver: { select: { id: true, username: true, avatarBase64: true } },
    },
  });

  const conversations = {};
  messages.forEach(m => {
    const partner = m.senderId === req.user.id ? m.receiver : m.sender;
    if (!conversations[partner.id]) {
      conversations[partner.id] = { user: partner, lastMessage: m, unread: 0 };
    }
    if (m.receiverId === req.user.id && !m.isRead) {
      conversations[partner.id].unread++;
    }
  });

  res.json(Object.values(conversations));
});

// GET /api/messages/:userId  — conversation with a specific user
router.get('/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  const friendship = await areFriends(req.user.id, userId);
  if (!friendship) return res.status(403).json({ error: 'Not friends' });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.user.id, receiverId: userId },
        { senderId: userId, receiverId: req.user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, username: true } },
    },
  });

  // Mark received messages as read
  await prisma.message.updateMany({
    where: { senderId: userId, receiverId: req.user.id, isRead: false },
    data:  { isRead: true },
  });

  res.json(messages);
});

// POST /api/messages/:userId  — send a message
router.post('/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  const { text }   = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Message text required' });

  const friendship = await areFriends(req.user.id, userId);
  if (!friendship) return res.status(403).json({ error: 'Not friends' });

  const message = await prisma.message.create({
    data: { senderId: req.user.id, receiverId: userId, text: text.trim() },
    include: { sender: { select: { id: true, username: true } } },
  });
  res.status(201).json(message);
});

module.exports = router;
