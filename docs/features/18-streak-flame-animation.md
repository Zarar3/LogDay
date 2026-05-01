# Streak Flame Animation

## What it does
When the HomeScreen loads, the 🔥 streak number in the stats row plays a brief scale pulse animation — growing slightly then settling back. A small touch that makes the streak feel alive and draws the eye to a key engagement metric.

## Backend changes
None.

## Frontend changes
- `mobile/src/screens/HomeScreen.js` — animate the streak stat card

## Dependencies
None — uses React Native's built-in `Animated` API.

## Step-by-step implementation

### 1. Add animated value in HomeScreen.js

Near the other state declarations:

```js
import { Animated } from 'react-native'; // already imported, just ensure it's there

const flameScale = useRef(new Animated.Value(1)).current;
```

### 2. Trigger the animation when streak data arrives

In `loadAll()`, after `setStreak(...)`:

```js
api.get('/activities/streak').then(r => {
  setStreak(r.data.streak);
  // Pulse the flame
  Animated.sequence([
    Animated.timing(flameScale, { toValue: 1.4, duration: 200, useNativeDriver: true }),
    Animated.spring(flameScale,  { toValue: 1,   friction: 4,   useNativeDriver: true }),
  ]).start();
}).catch(() => {});
```

### 3. Wrap the streak stat card content in Animated.View

In the stats row section of the ListHeaderComponent, find the streak stat card and wrap the emoji + number:

```js
<View style={[styles.statCard, { backgroundColor: cardBg, borderColor: border }]}>
  <Animated.View style={{ transform: [{ scale: flameScale }], alignItems: 'center' }}>
    <Text style={styles.statEmoji}>🔥</Text>
    <Text style={[styles.statNum, { color: accent }]}>{streak}</Text>
  </Animated.View>
  <Text style={[styles.statLabel, { color: textSecondary }]}>day streak</Text>
</View>
```

### 4. (Optional) Repeat on focus

If you want the animation to replay every time the user navigates back to Home, trigger it inside the `useFocusEffect` callback:

```js
useFocusEffect(useCallback(() => {
  loadAll();
  Animated.sequence([
    Animated.timing(flameScale, { toValue: 1.35, duration: 180, useNativeDriver: true }),
    Animated.spring(flameScale,  { toValue: 1,   friction: 3,   useNativeDriver: true }),
  ]).start();
}, []));
```

### 5. (Optional) Stronger pulse for milestone streaks

If streak is a multiple of 7 (weekly milestone), play a bigger animation:

```js
const isMilestone = r.data.streak > 0 && r.data.streak % 7 === 0;
const peakScale   = isMilestone ? 1.7 : 1.4;

Animated.sequence([
  Animated.timing(flameScale, { toValue: peakScale, duration: 220, useNativeDriver: true }),
  Animated.spring(flameScale,  { toValue: 1, friction: 3, useNativeDriver: true }),
]).start();
```

## How to test
1. Open HomeScreen → 🔥 streak number pulses and bounces back on load.
2. Navigate away and return → animation replays (if focus trigger is added).
3. Ensure the animation doesn't block interaction — tapping other elements works immediately.
4. Test with streak = 0 → animation still fires (just looks like a 0 bouncing, which is fine).
5. Test with streak = 7 (milestone) → larger pulse if milestone logic added.
