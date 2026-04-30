# Emoji Reactions

## What it does
Replaces the single like with five emoji reactions (🔥 💪 👏 😮 😂). Users tap a reaction to toggle it; each reaction shows its own count. Tapping the post's reaction row shows a summary bar. This is a drop-in replacement for `ActivityLike` — the existing like endpoint gets extended.

## Backend changes

### 1. Update Prisma schema (`backend/prisma/schema.prisma`)

Replace the `ActivityLike` model:

```prisma
model ActivityLike {
  id         String   @id @default(uuid())
  activityId String
  userId     String
  emoji      String   @default("❤️")   // 🔥 💪 👏 😮 😂 ❤️
  createdAt  DateTime @default(now())

  activity Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([activityId, userId, emoji])   // one of each emoji per user per post
}
```

Run migration:
```bash
npx prisma migrate dev --name add_reaction_emoji
```

### 2. Update the like route (`backend/src/routes/activities.js`)

```js
// POST /api/activities/:id/like   body: { emoji: "🔥" }
router.post('/:id/like', auth, async (req, res) => {
  const emoji = req.body.emoji || '❤️';
  const allowed = ['❤️', '🔥', '💪', '👏', '😮', '😂'];
  if (!allowed.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji' });

  const existing = await prisma.activityLike.findUnique({
    where: { activityId_userId_emoji: { activityId: req.params.id, userId: req.user.id, emoji } },
  });

  if (existing) {
    await prisma.activityLike.delete({ where: { id: existing.id } });
    return res.json({ action: 'removed', emoji });
  }

  await prisma.activityLike.create({
    data: { activityId: req.params.id, userId: req.user.id, emoji },
  });
  res.json({ action: 'added', emoji });
});
```

### 3. Update the feed queries to return reaction counts

In the `include` block for activity queries (friends.js unified-feed, discover.js), replace:
```js
_count: { select: { likes: true, comments: true } },
likes:  { where: { userId: req.user.id }, select: { id: true } },
```
with:
```js
_count:     { select: { comments: true } },
likes:      { select: { emoji: true, userId: true } },
```

And in the `fmt` mapper:
```js
const EMOJIS = ['❤️', '🔥', '💪', '👏', '😮', '😂'];
const myLikes = a.likes.filter(l => l.userId === req.user.id).map(l => l.emoji);
const reactions = Object.fromEntries(
  EMOJIS.map(e => [e, a.likes.filter(l => l.emoji === e).length])
);
// ...
reactions,
myReactions: myLikes,
```

## Frontend changes
- `DiscoverScreen.js` — replace like button with reaction row
- `CommentsScreen.js` — if you want reactions on comments too (optional, same pattern)
- New component: `mobile/src/components/ReactionBar.js`

## Step-by-step implementation

### 1. `mobile/src/components/ReactionBar.js`

```js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import api from '../api';

const EMOJIS = ['❤️', '🔥', '💪', '👏', '😮', '😂'];

export default function ReactionBar({ activityId, reactions = {}, myReactions = [], commentCount, onComment }) {
  const [local, setLocal]   = useState(reactions);
  const [mine, setMine]     = useState(myReactions);

  async function toggle(emoji) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const had = mine.includes(emoji);
    // Optimistic
    setLocal(r => ({ ...r, [emoji]: (r[emoji] || 0) + (had ? -1 : 1) }));
    setMine(m => had ? m.filter(e => e !== emoji) : [...m, emoji]);
    try {
      await api.post(`/activities/${activityId}/like`, { emoji });
    } catch {
      // Revert
      setLocal(r => ({ ...r, [emoji]: (r[emoji] || 0) + (had ? 1 : -1) }));
      setMine(m => had ? [...m, emoji] : m.filter(e => e !== emoji));
    }
  }

  return (
    <View style={styles.bar}>
      {EMOJIS.map(e => {
        const count = local[e] || 0;
        const active = mine.includes(e);
        return (
          <TouchableOpacity key={e} style={[styles.pill, active && styles.pillActive]} onPress={() => toggle(e)}>
            <Text style={styles.emoji}>{e}</Text>
            {count > 0 && <Text style={[styles.count, active && styles.countActive]}>{count}</Text>}
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.pill} onPress={onComment}>
        <Text style={styles.emoji}>💬</Text>
        {commentCount > 0 && <Text style={styles.count}>{commentCount}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 3,
                 backgroundColor: '#f1f5f9', borderRadius: 14,
                 paddingHorizontal: 8, paddingVertical: 4 },
  pillActive:  { backgroundColor: '#ede9fe' },
  emoji:       { fontSize: 14 },
  count:       { fontSize: 12, fontWeight: '700', color: '#64748b' },
  countActive: { color: '#6366f1' },
});
```

### 2. Use ReactionBar in DiscoverScreen.js

```js
import ReactionBar from '../components/ReactionBar';

// In the post card, replace old like button:
<ReactionBar
  activityId={post.id}
  reactions={post.reactions}
  myReactions={post.myReactions}
  commentCount={post.commentCount}
  onComment={() => navigation.navigate('Comments', { activityId: post.id })}
/>
```

## How to test
1. Open a post in the Feed.
2. Tap 🔥 → pill highlights, count increments instantly.
3. Tap 🔥 again → unreacted, count decrements.
4. Tap two different emojis → both can be active simultaneously.
5. Reload feed → reactions persist (stored in DB).
6. Another user reacts → their count shows up on your next load.
