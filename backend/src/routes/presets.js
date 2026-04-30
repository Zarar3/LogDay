const router = require('express').Router();
const prisma  = require('../prisma');
const auth    = require('../middleware/auth');

// GET /api/presets
router.get('/', auth, async (req, res) => {
  const presets = await prisma.preset.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(presets);
});

// POST /api/presets
router.post('/', auth, async (req, res) => {
  const { name, type, duration, notes } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const preset = await prisma.preset.create({
    data: { userId: req.user.id, name, type, duration: duration || null, notes: notes || null },
  });
  res.status(201).json(preset);
});

// DELETE /api/presets/:id
router.delete('/:id', auth, async (req, res) => {
  const preset = await prisma.preset.findUnique({ where: { id: req.params.id } });
  if (!preset || preset.userId !== req.user.id)
    return res.status(404).json({ error: 'Not found' });
  await prisma.preset.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

module.exports = router;
