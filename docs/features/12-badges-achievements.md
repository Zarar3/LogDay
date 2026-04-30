# Badges & Achievements

## What it does
Awards milestone badges automatically as users hit goals — first log, 7-day streak, 100 activities, first friend, etc. Badges appear as a trophy shelf on the Profile card and a full achievement wall on the Profile screen. This is the single highest-impact retention feature: people open the app just to see what they've unlocked.

## Backend changes

### 1. Define badges (no DB needed — computed on the fly)

Badges are derived from existing data (streak, activity count, friend count). No new table required. Add a helper:

```js
// backend/src/utils/badges.js

const BADGES = [
  { id: 'first_log',     emoji: '📋', label: 'First Log',       desc: 'Logged your first activity' },
  { id: 'streak_3',      emoji: '🔥', label: '3-Day Streak',    desc: 'Logged 3 days in a row' },
  { id: 'streak_7',      emoji: '⚡', label: 'Week Warrior',    desc: 'Logged 7 days in a row' },
  { id: 'streak_30',     emoji: '💎', label: 'Diamond Streak',  desc: 'Logged 30 days in a row' },
  { id: 'acts_10',       emoji: '🏅', label: 'Getting Started', desc: '10 activities logged' },
  { id: 'acts_50',       emoji: '🥈', label: 'Half Century',    desc: '50 activities logged' },
  { id: 'acts_100',      emoji: '🏆', label: 'Centurion',       desc: '100 activities logged' },
  { id: 'first_friend',  emoji: '👥', label: 'Social',          desc: 'Made your first friend' },
  { id: 'friends_5',     emoji: '🫂', label: 'Squad Goals',     desc: 'Have 5 friends' },
  { id: 'variety_3',     emoji: '🎯', label: 'Well-Rounded',    desc: 'Logged 3 different activity types' },
  { id: 'variety_5',     emoji: '🌈', label: 'Renaissance',     desc: 'Logged 5 different activity types' },
  { id: 'early_bird',    emoji: '🌅', label: 'Early Bird',      desc: 'Joined in the first month' },
];

async function computeBadges(userId, prisma) {
  const [actCount, friendCount, activities, user] = await Promise.all([
    prisma.activity.count({ where: { userId } }),
    prisma.friendship.count({ where: { OR: [{ userAId: userId }, { userBId: userId }] } }),
    prisma.activity.findMany({ where: { userId }, select: { type: true, date: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
  ]);

  const { getStreak } = require('./streak');
  const streak = await getStreak(userId);

  const types  = new Set(activities.map(a => a.type)).size;
  const earned = new Set();

  if (actCount >= 1)   earned.add('first_log');
  if (streak >= 3)     earned.add('streak_3');
  if (streak >= 7)     earned.add('streak_7');
  if (streak >= 30)    earned.add('streak_30');
  if (actCount >= 10)  earned.add('acts_10');
  if (actCount >= 50)  earned.add('acts_50');
  if (actCount >= 100) earned.add('acts_100');
  if (friendCount >= 1) earned.add('first_friend');
  if (friendCount >= 5) earned.add('friends_5');
  if (types >= 3)      earned.add('variety_3');
  if (types >= 5)      earned.add('variety_5');

  // Early bird: joined within 30 days of first user (approximation: account < 30 days old at launch)
  const daysSinceJoin = (Date.now() - new Date(user.createdAt).getTime()) / 86400000;
  if (daysSinceJoin <= 30) earned.add('early_bird');

  return BADGES.map(b => ({ ...b, earned: earned.has(b.id) }));
}

module.exports = { computeBadges, BADGES };
```

### 2. Badges route (`backend/src/routes/auth.js` or new file)

Add to `backend/src/routes/auth.js`:

```js
const { computeBadges } = require('../utils/badges');

// GET /api/auth/badges
router.get('/badges', auth, async (req, res) => {
  const badges = await computeBadges(req.user.id, prisma);
  res.json(badges);
});
```

No migration needed — entirely derived from existing tables.

## Frontend changes
- `ProfileScreen.js` — trophy shelf (earned badges only, 2-row horizontal scroll) + full achievement wall
- New component: `BadgeShelf` (inline in ProfileScreen)

## Step-by-step implementation

### 1. Fetch badges in ProfileScreen.js

```js
const [badges, setBadges] = useState([]);

// Inside loadAll():
const badgesRes = await api.get('/auth/badges');
setBadges(badgesRes.data);
```

### 2. Trophy shelf on the profile card

Show only earned badges as emoji icons across the bottom of the abilities section:

```js
{/* Inside the card, below abilitiesSection */}
{badges.filter(b => b.earned).length > 0 && (
  <View style={[trophyStyles.shelf, { borderTopColor: primary + '33' }]}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={trophyStyles.row}>
      {badges.filter(b => b.earned).map(b => (
        <View key={b.id} style={trophyStyles.item}>
          <Text style={trophyStyles.emoji}>{b.emoji}</Text>
        </View>
      ))}
    </ScrollView>
  </View>
)}

const trophyStyles = StyleSheet.create({
  shelf: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  row:   { gap: 8 },
  item:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.06)',
           justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 18 },
});
```

### 3. Achievement wall section (below color pickers)

```js
<View style={[styles.colorSection, { backgroundColor: cardBg, borderColor: border }]}>
  <Text style={[styles.sectionHeader, { color: textPrimary, marginBottom: 16 }]}>
    Achievements  {badges.filter(b => b.earned).length}/{badges.length}
  </Text>

  <View style={achieveStyles.grid}>
    {badges.map(b => (
      <View key={b.id}
        style={[achieveStyles.badge,
          b.earned
            ? { backgroundColor: appAccent + '18', borderColor: appAccent }
            : { backgroundColor: 'transparent', borderColor: border, opacity: 0.45 }
        ]}>
        <Text style={achieveStyles.badgeEmoji}>{b.emoji}</Text>
        <Text style={[achieveStyles.badgeLabel, { color: b.earned ? textPrimary : textSecondary }]}>
          {b.label}
        </Text>
        <Text style={[achieveStyles.badgeDesc, { color: textSecondary }]}>{b.desc}</Text>
      </View>
    ))}
  </View>
</View>

const achieveStyles = StyleSheet.create({
  grid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge:      { width: '47%', borderRadius: 14, borderWidth: 1.5,
                padding: 12, alignItems: 'center' },
  badgeEmoji: { fontSize: 28, marginBottom: 6 },
  badgeLabel: { fontSize: 13, fontWeight: '800', textAlign: 'center', marginBottom: 3 },
  badgeDesc:  { fontSize: 10, textAlign: 'center', lineHeight: 14 },
});
```

### 4. New badge notification (optional)

Track which badges were earned on last load in AsyncStorage. On next load, compare and show a toast for newly earned badges:

```js
import AsyncStorage from '@react-native-async-storage/async-storage';

async function checkNewBadges(newBadges) {
  const earned = newBadges.filter(b => b.earned).map(b => b.id);
  const prev   = JSON.parse(await AsyncStorage.getItem('earnedBadges') || '[]');
  const fresh  = earned.filter(id => !prev.includes(id));

  if (fresh.length > 0) {
    const badge = newBadges.find(b => b.id === fresh[0]);
    Alert.alert(`${badge.emoji} Achievement Unlocked!`, `${badge.label}\n${badge.desc}`);
  }

  await AsyncStorage.setItem('earnedBadges', JSON.stringify(earned));
}

// Call after fetching badges:
const badgesRes = await api.get('/auth/badges');
setBadges(badgesRes.data);
await checkNewBadges(badgesRes.data);
```

## How to test
1. Fresh account: log one activity → "First Log 📋" appears earned.
2. Log activities for 3 consecutive days → "3-Day Streak 🔥" unlocks.
3. Log 3 different types → "Well-Rounded 🎯" unlocks.
4. Add a friend → "Social 👥" unlocks.
5. Unearned badges appear grayed-out in the achievement wall.
6. Trophy shelf on the card shows only earned badge emojis.
7. First time a badge is earned → Alert notification fires.
