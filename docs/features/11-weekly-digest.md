# Weekly Digest Screen

## What it does
A full-screen recap that appears (or is accessible from Home) every week — typically on Sunday or Monday morning. Shows total time logged, activities completed, streak maintained, top activity type, and how this week compares to last week. Makes the app feel like a personal coach reviewing your progress.

## Backend changes

### New route: `GET /api/activities/weekly-summary`

Add to `backend/src/routes/activities.js` (before `/:id`):

```js
// GET /api/activities/weekly-summary
router.get('/weekly-summary', auth, async (req, res) => {
  const now     = new Date();
  const dayOfWk = now.getDay(); // 0 = Sunday

  // This week: Monday to today
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((dayOfWk + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);

  // Last week: Monday to Sunday before this Monday
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(lastSunday.getDate() - 1);

  const fmt = d => d.toISOString().split('T')[0];

  const [thisWeek, lastWeek] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: req.user.id, date: { gte: fmt(thisMonday), lte: fmt(now) } },
      select: { type: true, duration: true },
    }),
    prisma.activity.findMany({
      where: { userId: req.user.id, date: { gte: fmt(lastMonday), lte: fmt(lastSunday) } },
      select: { type: true, duration: true },
    }),
  ]);

  function summarize(acts) {
    const totalSessions = acts.length;
    const totalMinutes  = acts.reduce((s, a) => s + (a.duration || 0), 0);
    const counts        = {};
    acts.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    const topType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { totalSessions, totalMinutes, topType, counts };
  }

  const { data: streak } = { data: { streak: 0 } }; // import getStreak if needed
  const { getStreak } = require('../utils/streak');
  const currentStreak = await getStreak(req.user.id);

  res.json({
    thisWeek: summarize(thisWeek),
    lastWeek: summarize(lastWeek),
    streak:   currentStreak,
    weekStart: fmt(thisMonday),
  });
});
```

## Frontend changes
- New screen: `mobile/src/screens/WeeklyDigestScreen.js`
- `HomeScreen.js` — "This week" summary card that navigates to digest
- `AppNavigator.js` — register WeeklyDigestScreen

## Step-by-step implementation

### 1. WeeklyDigestScreen.js

```js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

export default function WeeklyDigestScreen({ navigation }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border } = useTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/activities/weekly-summary').then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <View style={[styles.container, { backgroundColor: pageBg }]} />;

  const { thisWeek, lastWeek, streak } = data;
  const sessionDelta  = thisWeek.totalSessions - lastWeek.totalSessions;
  const minuteDelta   = thisWeek.totalMinutes  - lastWeek.totalMinutes;

  function Delta({ value, unit }) {
    const up = value >= 0;
    return (
      <Text style={{ fontSize: 13, fontWeight: '700', color: up ? '#22c55e' : '#ef4444' }}>
        {up ? '▲' : '▼'} {Math.abs(value)} {unit} vs last week
      </Text>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]}
      contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 20 }}>
        <Text style={{ color: accent, fontWeight: '700' }}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: textPrimary }]}>This Week 📊</Text>

      {/* Big stats */}
      <View style={[styles.statRow, { backgroundColor: cardBg, borderColor: border }]}>
        <StatBox label="Sessions"     value={thisWeek.totalSessions} accent={accent} textPrimary={textPrimary} textSecondary={textSecondary} />
        <StatBox label="Minutes"      value={thisWeek.totalMinutes}  accent={accent} textPrimary={textPrimary} textSecondary={textSecondary} />
        <StatBox label="Day Streak 🔥" value={streak}               accent={accent} textPrimary={textPrimary} textSecondary={textSecondary} />
      </View>

      {/* Deltas */}
      <View style={[styles.deltaCard, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.deltaTitle, { color: textPrimary }]}>vs Last Week</Text>
        <Delta value={sessionDelta}  unit="sessions" />
        <View style={{ height: 6 }} />
        <Delta value={minuteDelta}   unit="min" />
      </View>

      {/* Top activity */}
      {thisWeek.topType && (
        <View style={[styles.topCard, { backgroundColor: accent }]}>
          <Text style={styles.topLabel}>Top Activity</Text>
          <Text style={styles.topType}>{thisWeek.topType}</Text>
          <Text style={styles.topCount}>{thisWeek.counts[thisWeek.topType]} sessions</Text>
        </View>
      )}

      {/* Motivational message */}
      <Text style={[styles.motto, { color: textSecondary }]}>
        {streak >= 7
          ? '🔥 You\'re on fire — don\'t break the chain!'
          : thisWeek.totalSessions === 0
          ? 'Every legend starts somewhere. Log something this week!'
          : sessionDelta >= 0
          ? 'Great work — you\'re improving week over week!'
          : 'Last week was better — let\'s bounce back stronger!'}
      </Text>
    </ScrollView>
  );
}

function StatBox({ label, value, accent, textPrimary, textSecondary }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statVal, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLbl, { color: textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 20, paddingBottom: 48 },
  heading:   { fontSize: 28, fontWeight: '900', marginBottom: 20 },
  statRow:   { flexDirection: 'row', borderRadius: 16, borderWidth: 1.5,
               padding: 16, marginBottom: 14 },
  statBox:   { flex: 1, alignItems: 'center' },
  statVal:   { fontSize: 28, fontWeight: '900' },
  statLbl:   { fontSize: 11, fontWeight: '600', marginTop: 3 },
  deltaCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  deltaTitle:{ fontSize: 13, fontWeight: '800', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  topCard:   { borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center' },
  topLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  topType:   { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 4 },
  topCount:  { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginTop: 2 },
  motto:     { fontSize: 15, fontWeight: '600', textAlign: 'center',
               lineHeight: 22, marginTop: 10, fontStyle: 'italic' },
});
```

### 2. Mini summary card in HomeScreen.js

```js
// Tap to open full digest:
<TouchableOpacity
  style={[weekStyles.card, { backgroundColor: cardBg, borderColor: border }]}
  onPress={() => navigation.navigate('WeeklyDigest')}>
  <Text style={[weekStyles.label, { color: textSecondary }]}>This week</Text>
  <Text style={[weekStyles.count, { color: accent }]}>{weekSessions} sessions</Text>
  <Text style={[weekStyles.cta, { color: accent }]}>See recap →</Text>
</TouchableOpacity>
```

Fetch `weekSessions` from the `/weekly-summary` endpoint on load, or count from already-loaded activities.

### 3. Register screen in AppNavigator.js

```js
import WeeklyDigestScreen from '../screens/WeeklyDigestScreen';

// In MainStack:
<Stack.Screen name="WeeklyDigest" component={WeeklyDigestScreen} />
```

## How to test
1. Log several activities across this week.
2. Navigate to WeeklyDigest → stats show correct totals.
3. Log nothing last week (or use a fresh account) → delta shows "▲ N vs last week".
4. Test on Sunday — thisWeek should include today (Sunday offset math).
5. Streak counter matches the value on the leaderboard/profile.
