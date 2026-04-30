# Friend Challenges

## What it does
Any user can challenge a friend to log X sessions of a given activity type by a specific date. Both participants see a live progress bar. The challenger sets the target; the system tracks each qualifying logged activity automatically. A completed challenge shows a winner banner.

## Backend changes

### 1. Add Challenge model (`backend/prisma/schema.prisma`)

```prisma
model Challenge {
  id             String   @id @default(uuid())
  challengerId   String
  challengeeId   String
  activityType   String
  targetSessions Int
  deadline       String   // YYYY-MM-DD
  status         String   @default("pending")  // pending | active | completed | declined
  createdAt      DateTime @default(now())

  challenger User @relation("ChallengesSent",     fields: [challengerId], references: [id], onDelete: Cascade)
  challengee User @relation("ChallengesReceived",  fields: [challengeeId], references: [id], onDelete: Cascade)
}
```

Add back-relations on User:
```prisma
model User {
  // ...
  challengesSent     Challenge[] @relation("ChallengesSent")
  challengesReceived Challenge[] @relation("ChallengesReceived")
}
```

Run migration:
```bash
npx prisma migrate dev --name add_challenges
```

### 2. Challenges routes (`backend/src/routes/challenges.js`)

```js
const router = require('express').Router();
const prisma  = require('../prisma');
const auth    = require('../middleware/auth');

// Helper: count sessions logged since challenge creation
async function progress(userId, activityType, since, deadline) {
  return prisma.activity.count({
    where: {
      userId,
      type: activityType,
      date: { gte: since, lte: deadline },
    },
  });
}

// POST /api/challenges  — send a challenge
router.post('/', auth, async (req, res) => {
  const { challengeeId, activityType, targetSessions, deadline } = req.body;
  if (!challengeeId || !activityType || !targetSessions || !deadline)
    return res.status(400).json({ error: 'All fields required' });

  const challenge = await prisma.challenge.create({
    data: {
      challengerId: req.user.id,
      challengeeId,
      activityType,
      targetSessions: parseInt(targetSessions),
      deadline,
      status: 'active',
    },
  });
  res.status(201).json(challenge);
});

// GET /api/challenges  — all active challenges involving me
router.get('/', auth, async (req, res) => {
  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [{ challengerId: req.user.id }, { challengeeId: req.user.id }],
      status: { in: ['active', 'pending'] },
    },
    include: {
      challenger: { select: { id: true, username: true } },
      challengee: { select: { id: true, username: true } },
    },
    orderBy: { deadline: 'asc' },
  });

  const today     = new Date().toISOString().split('T')[0];
  const withProgress = await Promise.all(
    challenges.map(async c => {
      const since     = c.createdAt.toISOString().split('T')[0];
      const myId      = req.user.id;
      const otherId   = myId === c.challengerId ? c.challengeeId : c.challengerId;
      const [myCount, theirCount] = await Promise.all([
        progress(myId,    c.activityType, since, c.deadline),
        progress(otherId, c.activityType, since, c.deadline),
      ]);
      return { ...c, myCount, theirCount, isChallenger: myId === c.challengerId };
    })
  );

  res.json(withProgress);
});

// PATCH /api/challenges/:id/decline
router.patch('/:id/decline', auth, async (req, res) => {
  await prisma.challenge.updateMany({
    where: { id: req.params.id, challengeeId: req.user.id },
    data:  { status: 'declined' },
  });
  res.json({ success: true });
});

module.exports = router;
```

### 3. Register in `backend/src/app.js`

```js
app.use('/api/challenges', require('./routes/challenges'));
```

## Frontend changes
- `HomeScreen.js` — challenges section below goals
- `UserProfileScreen.js` — "Challenge" button alongside Message/Compare
- New screen: `mobile/src/screens/NewChallengeScreen.js`
- `AppNavigator.js` — register NewChallengeScreen in the stack

## Step-by-step implementation

### 1. ChallengeCard component (in HomeScreen.js)

```js
function ChallengeCard({ challenge, accent, textPrimary, textSecondary, cardBg, border }) {
  const other = challenge.isChallenger ? challenge.challengee : challenge.challenger;
  const myPct = Math.min(1, challenge.myCount / challenge.targetSessions);
  const theirPct = Math.min(1, challenge.theirCount / challenge.targetSessions);
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(challenge.deadline) - new Date()) / 86400000
  ));

  return (
    <View style={[chStyles.card, { backgroundColor: cardBg, borderColor: border }]}>
      <Text style={[chStyles.title, { color: textPrimary }]}>
        ⚔️ vs {other.username}
      </Text>
      <Text style={[chStyles.sub, { color: textSecondary }]}>
        {challenge.activityType}  •  {challenge.targetSessions} sessions  •  {daysLeft}d left
      </Text>

      {/* My progress */}
      <View style={chStyles.barWrap}>
        <Text style={[chStyles.barLabel, { color: textSecondary }]}>You  {challenge.myCount}/{challenge.targetSessions}</Text>
        <View style={[chStyles.barTrack, { borderColor: border }]}>
          <View style={[chStyles.barFill, { width: `${myPct * 100}%`, backgroundColor: accent }]} />
        </View>
      </View>

      {/* Their progress */}
      <View style={chStyles.barWrap}>
        <Text style={[chStyles.barLabel, { color: textSecondary }]}>{other.username}  {challenge.theirCount}/{challenge.targetSessions}</Text>
        <View style={[chStyles.barTrack, { borderColor: border }]}>
          <View style={[chStyles.barFill, { width: `${theirPct * 100}%`, backgroundColor: '#94a3b8' }]} />
        </View>
      </View>
    </View>
  );
}

const chStyles = StyleSheet.create({
  card:     { borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  title:    { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  sub:      { fontSize: 12, marginBottom: 12 },
  barWrap:  { marginBottom: 10 },
  barLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.05)',
              borderWidth: 1, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 4 },
});
```

### 2. Fetch and render challenges in HomeScreen.js

```js
const [challenges, setChallenges] = useState([]);

async function loadChallenges() {
  try {
    const { data } = await api.get('/challenges');
    setChallenges(data);
  } catch {}
}

// In render, below goals section:
{challenges.length > 0 && (
  <View style={{ marginTop: 24 }}>
    <Text style={[styles.sectionLabel, { color: textSecondary }]}>Challenges</Text>
    {challenges.map(c => <ChallengeCard key={c.id} challenge={c} {...theme} />)}
  </View>
)}
```

### 3. "Challenge" button on UserProfileScreen.js

```js
<TouchableOpacity
  style={[actionStyles.btn, { borderColor: accent }]}
  onPress={() => navigation.navigate('NewChallenge', { userId: user.id, username: user.username })}>
  <Text style={actionStyles.btnIcon}>⚔️</Text>
  <Text style={[actionStyles.btnLabel, { color: accent }]}>Challenge</Text>
</TouchableOpacity>
```

### 4. NewChallengeScreen.js

```js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import { ACTIVITY_TYPES } from './LogActivityScreen'; // reuse existing type list

const DEADLINE_OPTIONS = [
  { label: '+3 days',  days: 3  },
  { label: '+1 week',  days: 7  },
  { label: '+2 weeks', days: 14 },
  { label: '+1 month', days: 30 },
];

export default function NewChallengeScreen({ route, navigation }) {
  const { userId, username } = route.params;
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg } = useTheme();

  const [type,     setType]     = useState('');
  const [sessions, setSessions] = useState('7');
  const [deadline, setDeadline] = useState('');

  function pickDeadline(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDeadline(d.toISOString().split('T')[0]);
  }

  async function send() {
    if (!type || !sessions || !deadline)
      return Alert.alert('Missing fields', 'Choose an activity, session count, and deadline.');
    try {
      await api.post('/challenges', {
        challengeeId: userId,
        activityType: type,
        targetSessions: parseInt(sessions),
        deadline,
      });
      Alert.alert('Challenge sent!', `You challenged ${username}!`);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not send challenge.');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <Text style={[styles.title, { color: textPrimary }]}>Challenge {username} ⚔️</Text>
      {/* Activity type picker, session TextInput, deadline pills, Send button */}
      {/* Follow same UI patterns as LogActivityScreen */}
    </View>
  );
}
```

### 5. Register in AppNavigator.js

```js
import NewChallengeScreen from '../screens/NewChallengeScreen';

// Inside MainStack:
<Stack.Screen name="NewChallenge" component={NewChallengeScreen} />
```

## How to test
1. Open a friend's profile → tap Challenge → fill in form → send.
2. Log in as that friend → Home shows the challenge card with your progress vs theirs.
3. Log the targeted activity type → count increments on next refresh.
4. Let deadline pass → challenge remains visible (add cleanup cron or a `status: completed` patch later).
