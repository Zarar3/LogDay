const router = require('express').Router();
const prisma  = require('../prisma');
const auth    = require('../middleware/auth');

const CHALLENGES = [
  { emoji: '⏱', title: 'Log any activity for 20+ min',  type: null,        minMinutes: 20 },
  { emoji: '🏃', title: 'Go for a run today',            type: 'Running',   minMinutes: 0  },
  { emoji: '🏋️', title: 'Hit the gym today',             type: 'Gym',       minMinutes: 0  },
  { emoji: '📚', title: 'Read for 30+ min',              type: 'Reading',   minMinutes: 30 },
  { emoji: '🧘', title: 'Meditate for 10+ min',          type: 'Meditation',minMinutes: 10 },
  { emoji: '✅', title: 'Log any activity today',         type: null,        minMinutes: 0  },
  { emoji: '💪', title: 'Work out for 45+ min',          type: null,        minMinutes: 45 },
  { emoji: '🎨', title: 'Do something creative',         type: 'Art',       minMinutes: 0  },
  { emoji: '🚶', title: 'Go for a walk',                 type: 'Walking',   minMinutes: 0  },
  { emoji: '🎵', title: 'Play music for 20+ min',        type: 'Music',     minMinutes: 20 },
  { emoji: '📖', title: 'Study for 1 hour',              type: 'Studying',  minMinutes: 60 },
  { emoji: '🍳', title: 'Cook something today',          type: 'Cooking',   minMinutes: 0  },
  { emoji: '🌟', title: 'Log 2 different activities',    type: null,        minMinutes: 0, distinctCount: 2 },
  { emoji: '🎯', title: 'Log 3 sessions today',          type: null,        minMinutes: 0, sessionCount: 3 },
  { emoji: '🏊', title: 'Go for a swim',                 type: 'Swimming',  minMinutes: 0  },
  { emoji: '🚴', title: 'Log a cycling session',         type: 'Cycling',   minMinutes: 0  },
  { emoji: '🤸', title: 'Do yoga today',                 type: 'Yoga',      minMinutes: 0  },
  { emoji: '🥾', title: 'Go for a hike',                 type: 'Hiking',    minMinutes: 0  },
  { emoji: '🎮', title: 'Game for 1 hour',               type: 'Gaming',    minMinutes: 60 },
  { emoji: '🏃', title: 'Run for 30+ min',               type: 'Running',   minMinutes: 30 },
];

function meetsChallenge(acts, c) {
  if (c.sessionCount) return acts.length >= c.sessionCount;
  if (c.distinctCount) return new Set(acts.map(a => a.type)).size >= c.distinctCount;
  return acts.some(a => {
    if (c.type && a.type.toLowerCase() !== c.type.toLowerCase()) return false;
    if (c.minMinutes && (!a.duration || a.duration < c.minMinutes)) return false;
    return true;
  });
}

// GET /api/daily-challenge
router.get('/', auth, async (req, res) => {
  const today  = new Date().toISOString().split('T')[0];
  const seed   = parseInt(today.replace(/-/g, ''));
  const challenge = CHALLENGES[seed % CHALLENGES.length];

  const [todayActs, friends] = await Promise.all([
    prisma.activity.findMany({ where: { userId: req.user.id, date: today }, select: { type: true, duration: true } }),
    prisma.friendship.findMany({
      where: { OR: [{ userAId: req.user.id }, { userBId: req.user.id }] },
      select: { userAId: true, userBId: true },
    }),
  ]);

  const completed = meetsChallenge(todayActs, challenge);
  const friendIds = friends.map(f => f.userAId === req.user.id ? f.userBId : f.userAId);

  let friendsCompleted = 0;
  if (friendIds.length > 0) {
    const friendActs = await prisma.activity.findMany({
      where: { userId: { in: friendIds }, date: today },
      select: { userId: true, type: true, duration: true },
    });
    const byUser = {};
    friendActs.forEach(a => { (byUser[a.userId] = byUser[a.userId] || []).push(a); });
    friendsCompleted = Object.values(byUser).filter(acts => meetsChallenge(acts, challenge)).length;
  }

  res.json({ ...challenge, completed, friendsCompleted, date: today, totalFriends: friendIds.length });
});

module.exports = router;
