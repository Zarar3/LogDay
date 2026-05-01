# Tab Notification Badges

## What it does
Shows a red dot on the Friends tab when there are pending friend requests, and on the Messages tab when there are unread messages. This is a standard mobile pattern — without it, users have no reason to tap these tabs unless they already know something is waiting.

## Backend changes

### 1. Add unread count to messages

Add to `backend/src/routes/messages.js`:

```js
// GET /api/messages/unread-count
router.get('/unread-count', auth, async (req, res) => {
  const count = await prisma.message.count({
    where: { receiverId: req.user.id, isRead: false },
  });
  res.json({ count });
});
```

Place this **before** any `/:userId` param routes.

### 2. Add pending requests count to friends

Add to `backend/src/routes/friends.js`:

```js
// GET /api/friends/pending-count
router.get('/pending-count', auth, async (req, res) => {
  const count = await prisma.friendRequest.count({
    where: { receiverId: req.user.id, status: 'pending' },
  });
  res.json({ count });
});
```

Place this **before** any `/:id` param routes.

## Frontend changes
- `mobile/src/navigation/AppNavigator.js` — poll counts and pass as badge props to tab icons
- `mobile/src/context/BadgeContext.js` — new context to share counts across tabs (optional but cleaner)

## Step-by-step implementation

### 1. Create a BadgeContext to hold counts

```js
// mobile/src/context/BadgeContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';

const BadgeContext = createContext({ pendingFriends: 0, unreadMessages: 0, refresh: () => {} });

export function BadgeProvider({ children }) {
  const [pendingFriends,   setPending]  = useState(0);
  const [unreadMessages,   setUnread]   = useState(0);

  async function refresh() {
    try {
      const [fr, msg] = await Promise.all([
        api.get('/friends/pending-count'),
        api.get('/messages/unread-count'),
      ]);
      setPending(fr.data.count);
      setUnread(msg.data.count);
    } catch {}
  }

  return (
    <BadgeContext.Provider value={{ pendingFriends, unreadMessages, refresh }}>
      {children}
    </BadgeContext.Provider>
  );
}

export const useBadges = () => useContext(BadgeContext);
```

### 2. Wrap the app with BadgeProvider

In `App.js` (or wherever ThemeProvider lives):

```js
import { BadgeProvider } from './src/context/BadgeContext';

<ThemeProvider>
  <BadgeProvider>
    <AppNavigator />
  </BadgeProvider>
</ThemeProvider>
```

### 3. Poll badge counts periodically

In `AppNavigator.js`, refresh counts when the app is focused:

```js
import { useBadges } from '../context/BadgeContext';
import { useEffect } from 'react';
import { AppState } from 'react-native';

function MainTabs({ onLogout }) {
  const { pendingFriends, unreadMessages, refresh } = useBadges();

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

  // ...
}
```

### 4. Add badge dots to tab icons in AppNavigator.js

Replace the simple `icon()` helper with a version that supports a badge count:

```js
function icon(emoji, badge = 0) {
  return ({ focused }) => (
    <View style={{ position: 'relative' }}>
      <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
      {badge > 0 && (
        <View style={{
          position: 'absolute', top: -2, right: -6,
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: '#ef4444',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

// In Tab.Navigator:
<Tab.Screen name="Friends"  component={FriendsScreen}
  options={{ tabBarIcon: icon('👥', pendingFriends) }} />
<Tab.Screen name="Messages" component={MessagesScreen}
  options={{ tabBarIcon: icon('💬', unreadMessages) }} />
```

### 5. Clear unread count when conversation is opened

In `ConversationScreen.js`, mark messages as read when the screen loads:

```js
// Call the existing mark-as-read endpoint when the conversation opens:
useEffect(() => {
  api.patch(`/messages/${friend.id}/read`).catch(() => {});
}, []);
```

And call `refresh()` from `useBadges()` when leaving the conversation so the badge clears:

```js
const { refresh } = useBadges();

useFocusEffect(useCallback(() => {
  return () => refresh(); // runs on blur (leaving screen)
}, []));
```

## How to test
1. Send a friend request from another account → red dot appears on Friends tab.
2. Accept the request → dot disappears.
3. Have a friend send you a message → red dot appears on Messages tab.
4. Open the conversation → dot disappears after reading.
5. Bring the app from background → counts refresh automatically via AppState listener.
6. Test badge number display: 1–9 shows the number, 10+ shows "9+".
