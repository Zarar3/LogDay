const router = require('express').Router();
const prisma  = require('../prisma');
const auth    = require('../middleware/auth');

async function sessionCount(userId, activityType, since, deadline) {
  return prisma.activity.count({
    where: { userId, type: activityType, date: { gte: since, lte: deadline } },
  });
}

// POST /api/challenges
router.post('/', auth, async (req, res) => {
  const { challengeeId, activityType, targetSessions, deadline } = req.body;
  if (!challengeeId || !activityType || !targetSessions || !deadline)
    return res.status(400).json({ error: 'All fields required' });

  try {
    const challenge = await prisma.challenge.create({
      data: {
        challengerId:   req.user.id,
        challengeeId,
        activityType,
        targetSessions: parseInt(targetSessions),
        deadline,
      },
    });
    res.status(201).json(challenge);
  } catch (e) {
    console.error('Challenge create error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenges
router.get('/', auth, async (req, res) => {
  try {
    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [{ challengerId: req.user.id }, { challengeeId: req.user.id }],
        status: 'active',
      },
      include: {
        challenger: { select: { id: true, username: true } },
        challengee: { select: { id: true, username: true } },
      },
      orderBy: { deadline: 'asc' },
    });

    const withProgress = await Promise.all(challenges.map(async c => {
      const since     = c.createdAt.toISOString().split('T')[0];
      const myId      = req.user.id;
      const otherId   = myId === c.challengerId ? c.challengeeId : c.challengerId;
      const [myCount, theirCount] = await Promise.all([
        sessionCount(myId,    c.activityType, since, c.deadline),
        sessionCount(otherId, c.activityType, since, c.deadline),
      ]);
      return { ...c, myCount, theirCount, isChallenger: myId === c.challengerId };
    }));

    res.json(withProgress);
  } catch (e) {
    console.error('Challenge list error:', e);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/challenges/:id/complete
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    await prisma.challenge.updateMany({
      where: {
        id: req.params.id,
        OR: [{ challengerId: req.user.id }, { challengeeId: req.user.id }],
      },
      data: { status: 'completed' },
    });
    res.json({ success: true });
  } catch (e) {
    console.error('Challenge complete error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
