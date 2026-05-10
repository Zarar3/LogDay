const router = require('express').Router();
const prisma  = require('../prisma');
const auth    = require('../middleware/auth');

const ALL_TYPES = [
  'Running','Walking','Gym','Reading','Cooking','Gaming','Studying','Meditation',
  'Music','Art','Cycling','Swimming','Yoga','Hiking','Stretching',
  'Football','Basketball','Tennis','Volleyball','Boxing',
  'Dancing','Climbing','Rowing','Writing',
];

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 17), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x3335b369);
    s ^= s >>> 16;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function checkBingo(completed) {
  const lines = [];
  for (let r = 0; r < 5; r++) lines.push([r*5, r*5+1, r*5+2, r*5+3, r*5+4]);
  for (let c = 0; c < 5; c++) lines.push([c, c+5, c+10, c+15, c+20]);
  lines.push([0,6,12,18,24]);
  lines.push([4,8,12,16,20]);
  return lines.some(line => line.every(i => completed[i]));
}

// GET /api/bingo/this-week
router.get('/this-week', auth, async (req, res) => {
  const today  = new Date();
  const year   = today.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.floor((today - startOfYear) / (7 * 24 * 3600 * 1000));
  const seed   = year * 1000 + weekNum;

  const grid = seededShuffle(ALL_TYPES, seed).slice(0, 25);

  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const mondayStr = monday.toISOString().split('T')[0];
  const todayStr  = today.toISOString().split('T')[0];

  const acts = await prisma.activity.findMany({
    where: { userId: req.user.id, date: { gte: mondayStr, lte: todayStr } },
    select: { type: true },
  });

  const logged = new Set(acts.map(a => a.type.toLowerCase()));
  const completed = grid.map(t => logged.has(t.toLowerCase()));
  const hasBingo  = checkBingo(completed);

  res.json({ grid, completed, hasBingo, weekStart: mondayStr });
});

module.exports = router;
