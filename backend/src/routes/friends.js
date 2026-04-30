const router = require('express').Router();
const prisma = require('../prisma');
const auth   = require('../middleware/auth');

// POST /api/friends/request  — send a friend request by username
router.post('/request', auth, async (req, res) => {
  const { username } = req.body;

  const receiver = await prisma.user.findUnique({ where: { username } });
  if (!receiver)            return res.status(404).json({ error: 'User not found' });
  if (receiver.id === req.user.id)
                            return res.status(400).json({ error: 'Cannot add yourself' });

  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: req.user.id, receiverId: receiver.id },
        { senderId: receiver.id, receiverId: req.user.id },
      ],
    },
  });
  if (existing) return res.status(409).json({ error: 'Request already exists' });

  const request = await prisma.friendRequest.create({
    data: { senderId: req.user.id, receiverId: receiver.id },
  });
  res.status(201).json(request);
});

// GET /api/friends/requests  — incoming pending requests
router.get('/requests', auth, async (req, res) => {
  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: req.user.id, status: 'pending' },
    include: { sender: { select: { id: true, username: true } } },
  });
  res.json(requests);
});

// POST /api/friends/requests/:id/accept
router.post('/requests/:id/accept', auth, async (req, res) => {
  const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.receiverId !== req.user.id)
    return res.status(404).json({ error: 'Request not found' });

  await prisma.friendRequest.update({ where: { id: req.params.id }, data: { status: 'accepted' } });

  // Create friendship (store with smaller id first to keep unique)
  const [userAId, userBId] = [request.senderId, request.receiverId].sort();
  await prisma.friendship.create({ data: { userAId, userBId } });

  res.json({ success: true });
});

// POST /api/friends/requests/:id/reject
router.post('/requests/:id/reject', auth, async (req, res) => {
  const request = await prisma.friendRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.receiverId !== req.user.id)
    return res.status(404).json({ error: 'Request not found' });

  await prisma.friendRequest.update({ where: { id: req.params.id }, data: { status: 'rejected' } });
  res.json({ success: true });
});

// GET /api/friends  — your friends list
router.get('/', auth, async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: req.user.id }, { userBId: req.user.id }],
    },
    include: {
      userA: { select: { id: true, username: true } },
      userB: { select: { id: true, username: true } },
    },
  });

  const friends = friendships.map(f =>
    f.userAId === req.user.id ? f.userB : f.userA
  );
  res.json(friends);
});

// GET /api/friends/leaderboard  — ranked by streak
const { getStreak } = require('../utils/streak');
router.get('/leaderboard', auth, async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
    include: {
      userA: { select: { id: true, username: true } },
      userB: { select: { id: true, username: true } },
    },
  });

  const friends = friendships.map(f =>
    f.userAId === req.user.id ? f.userB : f.userA
  );

  const me = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true },
  });
  const everyone = [me, ...friends];

  const leaderboard = await Promise.all(
    everyone.map(async (user) => {
      const streak = await getStreak(user.id);
      return { ...user, streak, isMe: user.id === req.user.id };
    })
  );

  leaderboard.sort((a, b) => b.streak - a.streak);
  res.json(leaderboard);
});

// GET /api/friends/active-today  — friends who logged something today
router.get('/active-today', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
    select: { userAId: true, userBId: true },
  });
  const friendIds = friendships.map(f =>
    f.userAId === req.user.id ? f.userBId : f.userAId
  );

  if (friendIds.length === 0) return res.json([]);

  const active = await prisma.user.findMany({
    where: {
      id: { in: friendIds },
      activities: { some: { date: today } },
    },
    select: { id: true, username: true, avatarBase64: true },
  });

  res.json(active);
});

// GET /api/friends/feed  — recent activities from all friends
router.get('/feed', auth, async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
    include: {
      userA: { select: { id: true, username: true } },
      userB: { select: { id: true, username: true } },
    },
  });

  const friends = friendships.map(f =>
    f.userAId === req.user.id ? f.userB : f.userA
  );

  if (friends.length === 0) return res.json([]);

  const friendIds = friends.map(f => f.id);

  const activities = await prisma.activity.findMany({
    where: { userId: { in: friendIds } },
    orderBy: { loggedAt: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, username: true } },
      _count: { select: { comments: true, likes: true } },
      likes:  { where: { userId: req.user.id }, select: { id: true } },
    },
  });

  const result = activities.map(a => ({
    id:          a.id,
    userId:      a.userId,
    username:    a.user.username,
    type:        a.type,
    duration:    a.duration,
    notes:       a.notes,
    imageBase64: a.imageBase64,
    date:        a.date,
    loggedAt:    a.loggedAt,
    likeCount:   a._count.likes,
    commentCount:a._count.comments,
    isLiked:     a.likes.length > 0,
  }));

  res.json(result);
});

// GET /api/friends/unified-feed?limit=20&offset=0
// offset is the public-post offset; friend posts are prepended on the first page (offset=0)
router.get('/unified-feed', auth, async (req, res) => {
  const limit        = Math.min(parseInt(req.query.limit) || 20, 50);
  const publicOffset = parseInt(req.query.offset) || 0;

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
    select: { userAId: true, userBId: true },
  });
  const friendIds = friendships.map(f =>
    f.userAId === req.user.id ? f.userBId : f.userAId
  );

  const include = {
    user:   { select: { id: true, username: true } },
    _count: { select: { likes: true, comments: true } },
    likes:  { where: { userId: req.user.id }, select: { id: true } },
  };

  const fmt = (a) => ({
    id:          a.id,
    userId:      a.userId,
    username:    a.user.username,
    type:        a.type,
    duration:    a.duration,
    notes:       a.notes,
    imageBase64: a.imageBase64,
    date:        a.date,
    loggedAt:    a.loggedAt,
    likeCount:   a._count.likes,
    commentCount:a._count.comments,
    isLiked:     a.likes.length > 0,
    isPR:        a.isPR ?? false,
  });

  let friendPosts = [];
  if (publicOffset === 0 && friendIds.length > 0) {
    friendPosts = await prisma.activity.findMany({
      where:   { userId: { in: friendIds } },
      orderBy: { loggedAt: 'desc' },
      take:    5,
      include,
    });
  }

  const publicPosts = await prisma.activity.findMany({
    where:   { userId: { notIn: [req.user.id, ...friendIds] }, user: { isPublic: true } },
    orderBy: { loggedAt: 'desc' },
    take:    limit,
    skip:    publicOffset,
    include,
  });

  res.json({
    posts:   [...friendPosts.map(fmt), ...publicPosts.map(fmt)],
    hasMore: publicPosts.length === limit,
  });
});

module.exports = router;