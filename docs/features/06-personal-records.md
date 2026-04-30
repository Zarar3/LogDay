# Personal Records (PRs)

## What it does
Tracks each user's longest session per activity type. When a new activity is logged and its duration beats the existing record, the logged activity is flagged `isPR: true`. The Home screen shows a "New PR! 🏆" banner on fresh PRs, and each activity card in the feed shows a small trophy badge.

## Backend changes

### 1. Update Prisma schema (`backend/prisma/schema.prisma`)

Add a field to Activity:

```prisma
model Activity {
  // ... existing fields
  isPR  Boolean @default(false)
}
```

Add a PersonalRecord lookup table:

```prisma
model PersonalRecord {
  id           String   @id @default(uuid())
  userId       String
  activityType String
  bestDuration Int
  activityId   String   // which activity holds the record
  updatedAt    DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  @@unique([userId, activityType])
}
```

Add back-relations on User and Activity:
```prisma
model User {
  // ...
  personalRecords PersonalRecord[]
}
model Activity {
  // ...
  personalRecord PersonalRecord[]
}
```

Run migration:
```bash
npx prisma migrate dev --name add_personal_records
```

### 2. PR check on activity creation (`backend/src/routes/activities.js`)

In the `POST /` route, after creating the activity, add:

```js
// PR check (only if duration provided)
if (duration) {
  const pr = await prisma.personalRecord.findUnique({
    where: { userId_activityType: { userId: req.user.id, activityType: type } },
  });

  const isBetter = !pr || duration > pr.bestDuration;

  if (isBetter) {
    // Update the record row
    await prisma.personalRecord.upsert({
      where:  { userId_activityType: { userId: req.user.id, activityType: type } },
      update: { bestDuration: duration, activityId: activity.id },
      create: { userId: req.user.id, activityType: type, bestDuration: duration, activityId: activity.id },
    });
    // Flag the activity itself
    await prisma.activity.update({ where: { id: activity.id }, data: { isPR: true } });
    activity.isPR = true;
  }
}

res.status(201).json(activity);
```

### 3. Expose PRs endpoint

```js
// GET /api/activities/prs  — all personal records for the authed user
router.get('/prs', auth, async (req, res) => {
  const records = await prisma.personalRecord.findMany({
    where: { userId: req.user.id },
    include: { activity: { select: { id: true, type: true, duration: true, date: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(records);
});
```

Add this route **before** `/:id` to avoid param conflicts.

### 4. Include `isPR` in feed responses

In your `fmt` mapper in `friends.js` and `discover.js`, add:

```js
isPR: a.isPR,
```

## Frontend changes
- `LogActivityScreen.js` — show PR toast after logging
- `HomeScreen.js` — recent PR banner
- `DiscoverScreen.js` — trophy badge on activity cards

## Step-by-step implementation

### 1. PR toast in LogActivityScreen.js

After the API call returns:

```js
const { data: activity } = await api.post('/activities', payload);

if (activity.isPR) {
  // Simple Alert or a custom toast
  Alert.alert('🏆 New Personal Record!', `Best ${type} session ever — ${duration} minutes!`);
}
navigation.goBack();
```

### 2. Trophy badge on feed cards (DiscoverScreen.js)

In your activity card component, alongside the type/duration text:

```js
{post.isPR && (
  <View style={prStyles.badge}>
    <Text style={prStyles.badgeText}>🏆 PR</Text>
  </View>
)}

const prStyles = StyleSheet.create({
  badge:     { backgroundColor: '#fef3c7', borderRadius: 10,
               paddingHorizontal: 7, paddingVertical: 2,
               flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#92400e' },
});
```

### 3. PRs section on ProfileScreen (optional)

Fetch and display a compact list:

```js
const { data: prs } = await api.get('/activities/prs');
// Render as: "🏃 Running  •  45 min" rows under a "Personal Records" heading
```

## How to test
1. Log a Running activity for 30 min → no PR banner (first entry, counts as PR but show only "New PR" once).
2. Log Running for 20 min → no PR (shorter).
3. Log Running for 45 min → 🏆 alert fires.
4. Check the feed — the 45-min entry shows the trophy badge.
5. Check `/activities/prs` in Postman → returns `{ activityType: "Running", bestDuration: 45 }`.
