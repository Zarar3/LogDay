const BADGES = [
  { id: 'first_log',    emoji: '📋', label: 'First Log',       desc: 'Logged your first activity' },
  { id: 'streak_3',     emoji: '🔥', label: '3-Day Streak',    desc: 'Logged 3 days in a row' },
  { id: 'streak_7',     emoji: '⚡', label: 'Week Warrior',    desc: 'Logged 7 days in a row' },
  { id: 'streak_30',    emoji: '💎', label: 'Diamond Streak',  desc: 'Logged 30 days in a row' },
  { id: 'acts_10',      emoji: '🏅', label: 'Getting Started', desc: '10 activities logged' },
  { id: 'acts_50',      emoji: '🥈', label: 'Half Century',    desc: '50 activities logged' },
  { id: 'acts_100',     emoji: '🏆', label: 'Centurion',       desc: '100 activities logged' },
  { id: 'first_friend', emoji: '👥', label: 'Social',          desc: 'Made your first friend' },
  { id: 'friends_5',    emoji: '🫂', label: 'Squad Goals',     desc: 'Have 5 friends' },
  { id: 'variety_3',    emoji: '🎯', label: 'Well-Rounded',    desc: 'Logged 3 different activity types' },
  { id: 'variety_5',    emoji: '🌈', label: 'Renaissance',     desc: 'Logged 5 different activity types' },
  { id: 'early_bird',   emoji: '🌅', label: 'Early Bird',      desc: 'Joined within the first 30 days' },
];

async function computeBadges(userId, prisma) {
  const { getStreak } = require('./streak');

  const [actCount, friendCount, activities, user, streak] = await Promise.all([
    prisma.activity.count({ where: { userId } }),
    prisma.friendship.count({ where: { OR: [{ userAId: userId }, { userBId: userId }] } }),
    prisma.activity.findMany({ where: { userId }, select: { type: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    getStreak(userId),
  ]);

  const types  = new Set(activities.map(a => a.type)).size;
  const earned = new Set();

  if (actCount >= 1)    earned.add('first_log');
  if (streak  >= 3)     earned.add('streak_3');
  if (streak  >= 7)     earned.add('streak_7');
  if (streak  >= 30)    earned.add('streak_30');
  if (actCount >= 10)   earned.add('acts_10');
  if (actCount >= 50)   earned.add('acts_50');
  if (actCount >= 100)  earned.add('acts_100');
  if (friendCount >= 1) earned.add('first_friend');
  if (friendCount >= 5) earned.add('friends_5');
  if (types >= 3)       earned.add('variety_3');
  if (types >= 5)       earned.add('variety_5');

  const daysSinceJoin = (Date.now() - new Date(user.createdAt).getTime()) / 86400000;
  if (daysSinceJoin <= 30) earned.add('early_bird');

  return BADGES.map(b => ({ ...b, earned: earned.has(b.id) }));
}

module.exports = { computeBadges, BADGES };
