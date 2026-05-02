const router = require('express').Router();
const prisma  = require('../prisma');
const auth    = require('../middleware/auth');

async function sessionCount(userId, activityType, since, deadline) {
  return prisma.activity.count({
    where: { userId, type: activityType, date: { gte: since, lte: deadline } },
  });
}

// POST /api/group-challenges
router.post('/', auth, async (req, res) => {
  const { participantIds, activityType, targetSessions, deadline } = req.body;
  if (!participantIds?.length || !activityType || !targetSessions || !deadline)
    return res.status(400).json({ error: 'All fields required' });
  if (participantIds.length > 4)
    return res.status(400).json({ error: 'Max 4 additional participants (5 total)' });

  const challenge = await prisma.groupChallenge.create({
    data: {
      creatorId: req.user.id,
      activityType,
      targetSessions: parseInt(targetSessions),
      deadline,
      participants: {
        create: [req.user.id, ...participantIds].map(userId => ({ userId })),
      },
    },
  });
  res.status(201).json(challenge);
});

// GET /api/group-challenges
router.get('/', auth, async (req, res) => {
  const participations = await prisma.groupChallengeParticipant.findMany({
    where: { userId: req.user.id },
    select: { groupChallengeId: true },
  });
  const ids = participations.map(p => p.groupChallengeId);

  const challenges = await prisma.groupChallenge.findMany({
    where: { id: { in: ids }, status: 'active' },
    include: {
      creator:      { select: { id: true, username: true } },
      participants: { include: { user: { select: { id: true, username: true } } } },
    },
    orderBy: { deadline: 'asc' },
  });

  const withProgress = await Promise.all(challenges.map(async c => {
    const since = c.createdAt.toISOString().split('T')[0];
    const members = await Promise.all(
      c.participants.map(async p => ({
        id:       p.user.id,
        username: p.user.username,
        count:    await sessionCount(p.user.id, c.activityType, since, c.deadline),
      }))
    );
    const totalSessions = members.reduce((s, m) => s + m.count, 0);
    const groupTarget   = c.targetSessions * c.participants.length;
    return { ...c, members, totalSessions, groupTarget };
  }));

  res.json(withProgress);
});

// PATCH /api/group-challenges/:id/complete
router.patch('/:id/complete', auth, async (req, res) => {
  const participation = await prisma.groupChallengeParticipant.findFirst({
    where: { groupChallengeId: req.params.id, userId: req.user.id },
  });
  if (!participation) return res.status(403).json({ error: 'Not a participant' });

  await prisma.groupChallenge.update({
    where: { id: req.params.id },
    data:  { status: 'completed' },
  });
  res.json({ success: true });
});

module.exports = router;
