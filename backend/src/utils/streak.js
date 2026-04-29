const prisma = require('../prisma');

async function getStreak(userId) {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const count = await prisma.activity.count({
      where: { userId, date: dateStr },
    });

    if (count === 0) break;
    streak++;
  }

  return streak;
}

module.exports = { getStreak };
