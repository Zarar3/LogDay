# Swipe to Delete

## What it does
Lets users swipe left on any activity card to reveal a red "Delete" button, replacing the small ✕ tap target. This is the standard mobile gesture for deletion and dramatically reduces accidental mis-taps.

## Backend changes
None — the existing `DELETE /api/activities/:id` route is used as-is.

## Frontend changes
- `mobile/src/screens/HomeScreen.js` — replace `FlatList` renderItem card with a swipeable wrapper
- `mobile/src/screens/DiscoverScreen.js` — own-activities cards (optional, skip for others' posts)

## Dependencies
```bash
npx expo install react-native-gesture-handler
```
Already included in Expo SDK 54 — just needs wrapping in `GestureHandlerRootView`.

## Step-by-step implementation

### 1. Wrap the app root in GestureHandlerRootView

In `mobile/App.js` (or wherever `AppNavigator` is rendered):

```js
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
```

### 2. Create a SwipeableCard component

```js
// mobile/src/components/SwipeableCard.js
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

export default function SwipeableCard({ onDelete, children }) {
  const swipeRef = useRef(null);

  function renderRightActions(progress, dragX) {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.8],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeRef.current?.close();
          onDelete();
        }}>
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
          🗑️ Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      friction={2}>
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    borderRadius: 20,
    marginLeft: 8,
    marginBottom: 12,
    marginRight: 12,
  },
  deleteText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
```

### 3. Use SwipeableCard in HomeScreen.js

In the `renderItem` of the FlatList:

```js
import SwipeableCard from '../components/SwipeableCard';

renderItem={({ item }) => (
  <SwipeableCard onDelete={() => confirmDelete(item.id)}>
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
      {/* ...existing card content unchanged... */}
    </View>
  </SwipeableCard>
)}
```

You can keep the ✕ button too, or remove it for a cleaner look.

## How to test
1. Log 2+ activities on Home.
2. Swipe left on a card — red Delete button slides in.
3. Tap Delete — card disappears, activity removed from the list.
4. Swipe left then swipe back right — action closes without deleting.
5. Tap elsewhere on the card — navigates/interacts normally, no accidental delete.
