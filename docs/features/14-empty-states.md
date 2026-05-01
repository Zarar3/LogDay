# Empty States

## What it does
Shows a friendly emoji illustration + message when Feed, Friends, and Messages tabs have no content. Without this, new users see a completely blank screen with no indication of what to do, making the app feel broken.

## Backend changes
None.

## Frontend changes
- `mobile/src/screens/DiscoverScreen.js` — `ListEmptyComponent`
- `mobile/src/screens/FriendsScreen.js` — empty list fallback
- `mobile/src/screens/MessagesScreen.js` — empty conversation list fallback

## Step-by-step implementation

### 1. Create a reusable EmptyState component

```js
// mobile/src/components/EmptyState.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function EmptyState({ emoji, title, subtitle, action }) {
  const { textPrimary, textSecondary } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: textSecondary }]}>{subtitle}</Text>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:     { flex: 1, alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 40, paddingVertical: 60 },
  emoji:    { fontSize: 64, marginBottom: 16 },
  title:    { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
});
```

### 2. Feed (DiscoverScreen.js)

```js
import EmptyState from '../components/EmptyState';

// In the FlatList:
ListEmptyComponent={
  <EmptyState
    emoji="📡"
    title="Nothing here yet"
    subtitle="Follow friends or wait for others to log activities — the feed will fill up fast."
  />
}
```

### 3. Friends (FriendsScreen.js)

In the section where `friends.length === 0`:

```js
import EmptyState from '../components/EmptyState';

{friends.length === 0 && (
  <EmptyState
    emoji="👥"
    title="No friends yet"
    subtitle="Search for people you know and send them a friend request."
  />
)}
```

### 4. Messages (MessagesScreen.js)

In the FlatList or conditional render:

```js
import EmptyState from '../components/EmptyState';

ListEmptyComponent={
  <EmptyState
    emoji="💬"
    title="No conversations yet"
    subtitle="Message a friend to get started."
  />
}
```

### 5. Friends tab — pending requests empty state

If the pending requests list is also empty:

```js
{pending.length === 0 && (
  <EmptyState
    emoji="🤝"
    title="No pending requests"
    subtitle="When someone sends you a friend request, it'll appear here."
  />
)}
```

## How to test
1. Create a fresh account (or remove all friends/messages).
2. Open Feed tab → illustration appears instead of blank screen.
3. Open Friends tab → empty state shown in the friends list area.
4. Open Messages tab → empty state shown.
5. Add a friend and send a message → empty states disappear, replaced by real content.
