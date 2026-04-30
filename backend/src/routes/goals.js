const router = require('express').Router();
const prisma = require('../prisma');
const auth   = require('../middleware/auth');

// GET /api/goals/active — all goals with date >= today
router.get('/active', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const goals = await prisma.goal.findMany({
    where: { userId: req.user.id, date: { gte: today } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(goals);
});

// GET /api/goals?date=YYYY-MM-DD
router.get('/', auth, async (req, res) => {
  const { date } = req.query;
  const where = { userId: req.user.id };
  if (date) where.date = date;

  const goals = await prisma.goal.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
  res.json(goals);
});

// POST /api/goals
router.post('/', auth, async (req, res) => {
  const { text, date } = req.body;
  if (!text?.trim() || !date)
    return res.status(400).json({ error: 'text and date are required' });

  const goal = await prisma.goal.create({
    data: { userId: req.user.id, text: text.trim(), date },
  });
  res.status(201).json(goal);
});

// PATCH /api/goals/:id/toggle
router.patch('/:id/toggle', auth, async (req, res) => {
  const goal = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!goal || goal.userId !== req.user.id)
    return res.status(404).json({ error: 'Goal not found' });

  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data:  { done: !goal.done },
  });
  res.json(updated);
});

// DELETE /api/goals/:id
router.delete('/:id', auth, async (req, res) => {
  const goal = await prisma.goal.findUnique({ where: { id: req.params.id } });
  if (!goal || goal.userId !== req.user.id)
    return res.status(404).json({ error: 'Goal not found' });

  await prisma.goal.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
