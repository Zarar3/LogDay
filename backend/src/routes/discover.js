const router = require('express').Router();
const prisma = require('../prisma');
const auth   = require('../middleware/auth');

// GET /api/discover?limit=20&offset=0  — activities from non-friends
router.get('/', auth, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 20, 50);
  const offset = parseInt(req.query.offset) || 0;

  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
    select: { userAId: true, userBId: true },
  });
  const friendIds = friendships.map(f =>
    f.userAId === req.user.id ? f.userBId : f.userAId
  );

  const activities = await prisma.activity.findMany({
    where: { userId: { notIn: [req.user.id, ...friendIds] }, user: { isPublic: true } },
    orderBy: { loggedAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user:   { select: { id: true, username: true } },
      _count: { select: { likes: true, comments: true } },
      likes:  { where: { userId: req.user.id }, select: { id: true } },
    },
  });

  res.json(activities.map(a => ({
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
  })));
});

module.exports = router;
