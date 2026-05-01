# Loading Skeletons

## What it does
Replaces blank screens and spinner-only states with animated grey shimmer placeholder cards while data loads from the API. The app feels significantly faster because the layout is already visible before content arrives.

## Backend changes
None.

## Frontend changes
- New component: `mobile/src/components/SkeletonCard.js`
- `mobile/src/screens/HomeScreen.js` — show skeletons while `activities` is loading
- `mobile/src/screens/DiscoverScreen.js` — show skeletons while feed loads
- `mobile/src/screens/MessagesScreen.js` — show skeletons while conversations load

## Dependencies
```bash
npx expo install expo-linear-gradient
```
Used to create the shimmer sweep effect.

## Step-by-step implementation

### 1. Create the shimmer animation hook

```js
// mobile/src/hooks/useShimmer.js
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });
  return opacity;
}
```

### 2. Create SkeletonCard component

```js
// mobile/src/components/SkeletonCard.js
import React from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import useShimmer from '../hooks/useShimmer';

function SkeletonLine({ width = '100%', height = 14, marginBottom = 8 }) {
  const { border } = useTheme();
  const opacity = useShimmer();
  return (
    <Animated.View style={[styles.line, { width, height, marginBottom,
      backgroundColor: border, opacity }]} />
  );
}

export default function SkeletonCard() {
  const { cardBg, border } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
      <SkeletonLine width="40%" height={16} marginBottom={10} />
      <SkeletonLine width="25%" height={12} marginBottom={8} />
      <SkeletonLine width="70%" height={12} marginBottom={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, marginHorizontal: 12, marginBottom: 12,
          borderWidth: 1, padding: 14 },
  line: { borderRadius: 6 },
});
```

### 3. HomeScreen.js — show skeletons while loading

Add an `initialLoad` state:

```js
const [initialLoad, setInitialLoad] = useState(true);

// In loadAll(), set it false after data arrives:
async function loadAll() {
  await Promise.all([...]);
  setInitialLoad(false);
}
```

In the FlatList, replace `ListEmptyComponent` with a skeleton list when loading:

```js
import SkeletonCard from '../components/SkeletonCard';

// Before the FlatList:
{initialLoad && (
  <>
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
  </>
)}
```

Or render as `ListEmptyComponent` that checks `initialLoad`:

```js
ListEmptyComponent={
  initialLoad
    ? <>{[0,1,2].map(i => <SkeletonCard key={i} />)}</>
    : <View style={styles.emptyBox}>...</View>
}
```

### 4. DiscoverScreen.js — same pattern

```js
const [initialLoad, setInitialLoad] = useState(true);

// After fetch completes:
setInitialLoad(false);

// In JSX before FlatList:
{initialLoad ? (
  [0,1,2,4].map(i => <SkeletonCard key={i} />)
) : (
  <FlatList ... />
)}
```

## How to test
1. Open the app on a slow network (toggle throttling in Expo dev tools or airplane mode briefly).
2. Navigate to Home → shimmer cards appear while activities load, then replaced by real cards.
3. Navigate to Feed → same shimmer while feed loads.
4. On fast connections the shimmer appears only briefly — still better than a blank screen.
