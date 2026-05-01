# Confetti on Goal Complete

## What it does
When the user ticks the last incomplete goal of the day, a brief confetti burst animation fires from the top of the screen. It's a moment of delight that rewards completing your daily goals and makes the app feel celebratory rather than clinical.

## Backend changes
None — triggered entirely by client-side state.

## Frontend changes
- `mobile/src/screens/HomeScreen.js` — trigger confetti after `toggleGoal` completes all today's goals

## Dependencies
```bash
npx expo install react-native-confetti-cannon
```

## Step-by-step implementation

### 1. Install and import

```bash
npx expo install react-native-confetti-cannon
```

In `HomeScreen.js`:

```js
import ConfettiCannon from 'react-native-confetti-cannon';
```

### 2. Add a ref to trigger the cannon

```js
const confettiRef = useRef(null);
```

### 3. Add the ConfettiCannon to the JSX

Place it as a sibling of the `FlatList`, **outside** of it so it overlays the whole screen:

```js
return (
  <KeyboardAvoidingView style={[styles.container, { backgroundColor: pageBg }]} ...>

    <View style={[styles.header, ...]} />

    <FlatList ... />

    <TouchableOpacity style={[styles.fab, ...]} ... />

    <ImageViewer ... />

    {/* Confetti — invisible until fired */}
    <ConfettiCannon
      ref={confettiRef}
      count={120}
      origin={{ x: -10, y: 0 }}
      autoStart={false}
      fadeOut
      explosionSpeed={350}
      fallSpeed={3000}
    />

  </KeyboardAvoidingView>
);
```

### 4. Fire confetti in toggleGoal

In the `toggleGoal` function, after the API call updates the goals state, check if all today's goals are now done:

```js
async function toggleGoal(id) {
  const goal = goals.find(g => g.id === id);
  if (goal?.done) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  try {
    const { data } = await api.patch(`/goals/${id}/toggle`);
    const updatedGoals = goals.map(g => g.id === id ? data : g);
    setGoals(updatedGoals);

    // Fire confetti if this was the last incomplete today-goal
    const todayStr = todayDate();
    const todayGoalsUpdated = updatedGoals.filter(g => g.date === todayStr);
    const allDone = todayGoalsUpdated.length > 0 && todayGoalsUpdated.every(g => g.done);
    if (allDone && !goal?.done) {
      confettiRef.current?.start();
    }
  } catch {}
}
```

The `!goal?.done` check ensures confetti only fires when ticking a goal ON (not off).

### 5. (Optional) Two-cannon variant for more impact

Add a second cannon firing from the right side:

```js
const confettiRef2 = useRef(null);

// In JSX:
<ConfettiCannon
  ref={confettiRef2}
  count={120}
  origin={{ x: 420, y: 0 }}  // right edge — adjust to screen width
  autoStart={false}
  fadeOut
  explosionSpeed={350}
  fallSpeed={3000}
/>

// In toggleGoal, fire both:
confettiRef.current?.start();
confettiRef2.current?.start();
```

## How to test
1. Add 2 goals for today.
2. Tick the first → no confetti (goals still incomplete).
3. Tick the second (last one) → confetti bursts from top of screen.
4. Untick a goal → no confetti.
5. Re-tick it → confetti fires again.
6. Test with 1 goal only → ticking it fires confetti immediately.
