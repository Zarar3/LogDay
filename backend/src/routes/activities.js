const router = require('express').Router();
const prisma = require('../prisma');
const auth   = require('../middleware/auth');
const { getStreak } = require('../utils/streak');

function activityInclude(userId) {
  return {
    _count: { select: { comments: true, likes: true } },
    likes:  { where: { userId }, select: { id: true } },
  };
}

function fmt(a) {
  return {
    id:          a.id,
    userId:      a.userId,
    type:        a.type,
    duration:    a.duration,
    notes:       a.notes,
    imageBase64: a.imageBase64,
    date:        a.date,
    loggedAt:    a.loggedAt,
    likeCount:   a._count?.likes    ?? 0,
    commentCount:a._count?.comments ?? 0,
    isLiked:     (a.likes?.length   ?? 0) > 0,
    isPR:        a.isPR ?? false,
  };
}

async function friendshipCheck(userAId, userBId) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId, userBId },
        { userAId: userBId, userBId: userAId },
      ],
    },
  });
}

// GET /api/activities?date=YYYY-MM-DD
router.get('/', auth, async (req, res) => {
  const { date } = req.query;
  const where = { userId: req.user.id };
  if (date) where.date = date;

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { loggedAt: 'desc' },
    include: activityInclude(req.user.id),
  });
  res.json(activities.map(fmt));
});

// POST /api/activities
router.post('/', auth, async (req, res) => {
  const { type, duration, notes, date, imageBase64 } = req.body;
  if (!type || !date)
    return res.status(400).json({ error: 'type and date are required' });
  if (duration && (isNaN(duration) || duration > 240))
    return res.status(400).json({ error: 'Duration cannot exceed 4 hours (240 minutes)' });

  let isPR = false;
  const activity = await prisma.activity.create({
    data: { userId: req.user.id, type, duration, notes, date, imageBase64: imageBase64 || null },
  });

  if (duration) {
    const pr = await prisma.personalRecord.findUnique({
      where: { userId_activityType: { userId: req.user.id, activityType: type } },
    });
    if (!pr || duration > pr.bestDuration) {
      await prisma.personalRecord.upsert({
        where:  { userId_activityType: { userId: req.user.id, activityType: type } },
        update: { bestDuration: duration, activityId: activity.id },
        create: { userId: req.user.id, activityType: type, bestDuration: duration, activityId: activity.id },
      });
      await prisma.activity.update({ where: { id: activity.id }, data: { isPR: true } });
      isPR = true;
    }
  }

  res.status(201).json({ ...activity, isPR, likeCount: 0, commentCount: 0, isLiked: false });
});

// GET /api/activities/calendar?weeks=12
router.get('/calendar', auth, async (req, res) => {
  const weeks = Math.min(parseInt(req.query.weeks) || 12, 52);
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceStr = since.toISOString().split('T')[0];

  const activities = await prisma.activity.findMany({
    where: { userId: req.user.id, date: { gte: sinceStr } },
    select: { date: true },
  });

  const activeDates = [...new Set(activities.map(a => a.date))];
  res.json({ activeDates, since: sinceStr });
});

// GET /api/activities/prs  — personal records for the authed user
router.get('/prs', auth, async (req, res) => {
  const records = await prisma.personalRecord.findMany({
    where: { userId: req.user.id },
    include: { activity: { select: { id: true, type: true, duration: true, date: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(records);
});

// GET /api/activities/weekly-summary
router.get('/weekly-summary', auth, async (req, res) => {
  const now      = new Date();
  const dayOfWk  = now.getDay(); // 0=Sun

  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((dayOfWk + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(lastSunday.getDate() - 1);

  const fmt = d => d.toISOString().split('T')[0];

  const [thisWeekActs, lastWeekActs, streak] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: req.user.id, date: { gte: fmt(thisMonday), lte: fmt(now) } },
      select: { type: true, duration: true },
    }),
    prisma.activity.findMany({
      where: { userId: req.user.id, date: { gte: fmt(lastMonday), lte: fmt(lastSunday) } },
      select: { type: true, duration: true },
    }),
    getStreak(req.user.id),
  ]);

  function summarize(acts) {
    const totalSessions = acts.length;
    const totalMinutes  = acts.reduce((s, a) => s + (a.duration || 0), 0);
    const counts = {};
    acts.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { totalSessions, totalMinutes, topType, counts };
  }

  res.json({
    thisWeek:  summarize(thisWeekActs),
    lastWeek:  summarize(lastWeekActs),
    streak,
    weekStart: fmt(thisMonday),
  });
});

// GET /api/activities/time-insights  — hour-of-day distribution + personality label
router.get('/time-insights', auth, async (req, res) => {
  const acts = await prisma.activity.findMany({
    where:  { userId: req.user.id },
    select: { loggedAt: true },
  });
  if (acts.length < 3) return res.json({ label: null, topHour: null, distribution: [] });

  const hourCounts = Array(24).fill(0);
  acts.forEach(a => { hourCounts[new Date(a.loggedAt).getHours()]++; });

  const topHour = hourCounts.indexOf(Math.max(...hourCounts));
  let label = 'All-Day Grinder';
  if      (topHour >= 5  && topHour < 10) label = 'Morning Warrior 🌅';
  else if (topHour >= 10 && topHour < 13) label = 'Midday Mover ☀️';
  else if (topHour >= 13 && topHour < 17) label = 'Afternoon Grinder 💪';
  else if (topHour >= 17 && topHour < 21) label = 'Evening Athlete 🌆';
  else                                     label = 'Night Owl 🦉';

  const max = Math.max(...hourCounts, 1);
  res.json({
    label,
    topHour,
    total: acts.length,
    distribution: hourCounts.map((count, hour) => ({ hour, count, ratio: count / max })),
  });
});

// GET /api/activities/type-streaks  — consecutive-day streak per activity type
router.get('/type-streaks', auth, async (req, res) => {
  const acts = await prisma.activity.findMany({
    where:   { userId: req.user.id },
    select:  { type: true, date: true },
    orderBy: { date: 'desc' },
  });

  const byType = {};
  acts.forEach(a => {
    if (!byType[a.type]) byType[a.type] = new Set();
    byType[a.type].add(a.date);
  });

  const results = [];
  for (const [type, dateSet] of Object.entries(byType)) {
    const dates = [...dateSet].sort().reverse(); // newest first
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (dateSet.has(ds)) streak++;
      else break;
    }
    if (streak > 0) results.push({ type, streak });
  }

  results.sort((a, b) => b.streak - a.streak);
  res.json(results);
});

// GET /api/activities/streak  — before /:id routes
router.get('/streak', auth, async (req, res) => {
  const streak = await getStreak(req.user.id);
  res.json({ streak });
});

// GET /api/activities/user/:userId/streak  — before /user/:userId
router.get('/user/:userId/streak', auth, async (req, res) => {
  const { userId } = req.params;
  const friendship = await friendshipCheck(req.user.id, userId);
  if (!friendship) return res.status(403).json({ error: 'Not friends' });

  const streak = await getStreak(userId);
  res.json({ streak });
});

// GET /api/activities/user/:userId?date=YYYY-MM-DD  — friend's activities
router.get('/user/:userId', auth, async (req, res) => {
  const { userId } = req.params;
  const { date }   = req.query;

  const friendship = await friendshipCheck(req.user.id, userId);
  if (!friendship)
    return res.status(403).json({ error: 'You are not friends with this user' });

  const where = { userId };
  if (date) where.date = date;

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { loggedAt: 'desc' },
    include: activityInclude(req.user.id),
  });
  res.json(activities.map(fmt));
});

// PUT /api/activities/:id
router.put('/:id', auth, async (req, res) => {
  const { type, duration, notes, date, imageBase64 } = req.body;
  const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!activity || activity.userId !== req.user.id)
    return res.status(404).json({ error: 'Activity not found' });

  const updated = await prisma.activity.update({
    where: { id: req.params.id },
    data: {
      ...(type        !== undefined && { type }),
      ...(duration    !== undefined && { duration: duration ? parseInt(duration) : null }),
      ...(notes       !== undefined && { notes }),
      ...(date        !== undefined && { date }),
      ...(imageBase64 !== undefined && { imageBase64 }),
    },
  });
  res.json(updated);
});

// DELETE /api/activities/:id
router.delete('/:id', auth, async (req, res) => {
  const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!activity || activity.userId !== req.user.id)
    return res.status(404).json({ error: 'Activity not found' });

  await prisma.activity.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// POST /api/activities/:id/like  — toggle like (any authenticated user)
router.post('/:id/like', auth, async (req, res) => {
  const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const existing = await prisma.activityLike.findUnique({
    where: { activityId_userId: { activityId: req.params.id, userId: req.user.id } },
  });

  if (existing) {
    await prisma.activityLike.delete({ where: { id: existing.id } });
    res.json({ liked: false });
  } else {
    await prisma.activityLike.create({
      data: { activityId: req.params.id, userId: req.user.id },
    });
    res.json({ liked: true });
  }
});

// GET /api/activities/:id/comments
router.get('/:id/comments', auth, async (req, res) => {
  const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const fmtComment = (c) => ({
    id: c.id, activityId: c.activityId, userId: c.userId, text: c.text,
    parentId: c.parentId, createdAt: c.createdAt, user: c.user,
    likeCount: c._count.likes,
    isLiked:   c.likes.length > 0,
  });

  const all = await prisma.comment.findMany({
    where:   { activityId: req.params.id },
    include: {
      user:   { select: { id: true, username: true } },
      _count: { select: { likes: true } },
      likes:  { where: { userId: req.user.id }, select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const top     = all.filter(c => !c.parentId).map(fmtComment);
  const replies = all.filter(c =>  c.parentId).map(fmtComment);
  top.forEach(c => { c.replies = replies.filter(r => r.parentId === c.id); });

  res.json(top);
});

// POST /api/activities/:id/comments
router.post('/:id/comments', auth, async (req, res) => {
  const { text, parentId } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

  const activity = await prisma.activity.findUnique({ where: { id: req.params.id } });
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const comment = await prisma.comment.create({
    data: {
      activityId: req.params.id, userId: req.user.id,
      text: text.trim(), parentId: parentId || null,
    },
    include: { user: { select: { id: true, username: true } } },
  });
  res.status(201).json({ ...comment, likeCount: 0, isLiked: false, replies: [] });
});

// POST /api/activities/:id/comments/:commentId/like
router.post('/:id/comments/:commentId/like', auth, async (req, res) => {
  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userId: { commentId: req.params.commentId, userId: req.user.id } },
  });
  if (existing) {
    await prisma.commentLike.delete({ where: { id: existing.id } });
    res.json({ liked: false });
  } else {
    await prisma.commentLike.create({
      data: { commentId: req.params.commentId, userId: req.user.id },
    });
    res.json({ liked: true });
  }
});

module.exports = router;
