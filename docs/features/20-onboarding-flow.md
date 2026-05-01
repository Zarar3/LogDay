# Onboarding Flow

## What it does
Shows a 3-screen swipeable intro to new users the very first time they open the app after registering. Covers the three core loops: log activities, connect with friends, and track progress. Stored in AsyncStorage so it only shows once.

## Backend changes
None.

## Frontend changes
- New screen: `mobile/src/screens/OnboardingScreen.js`
- `mobile/src/navigation/AppNavigator.js` — show OnboardingScreen after login if not yet seen

## Dependencies
None — uses React Native's built-in `FlatList` with `pagingEnabled` for the swipe.

## Step-by-step implementation

### 1. Create OnboardingScreen.js

```js
// mobile/src/screens/OnboardingScreen.js
import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji:    '📋',
    title:    'Log Your Day',
    subtitle: 'Track any activity — gym, reading, cooking. Add photos, notes, and duration. Build a habit log that's actually yours.',
  },
  {
    emoji:    '👥',
    title:    'Connect & Compete',
    subtitle: 'Add friends, see what they're up to, react to their posts, and challenge them to hit goals together.',
  },
  {
    emoji:    '🔥',
    title:    'Track Your Progress',
    subtitle: 'Watch your streak grow, unlock achievement badges, and review your weekly digest every Sunday.',
  },
];

export default function OnboardingScreen({ onDone }) {
  const { pageBg, accent, textPrimary, textSecondary } = useTheme();
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  async function finish() {
    await AsyncStorage.setItem('@logday_onboarded', 'true');
    onDone();
  }

  function next() {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        onMomentumScrollEnd={e => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={[styles.title, { color: textPrimary }]}>{item.title}</Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === index ? accent : accent + '40' }]} />
        ))}
      </View>

      <TouchableOpacity style={[styles.btn, { backgroundColor: accent }]} onPress={next}>
        <Text style={styles.btnText}>
          {index === SLIDES.length - 1 ? "Let's Go 🚀" : 'Next →'}
        </Text>
      </TouchableOpacity>

      {index < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skip} onPress={finish}>
          <Text style={[styles.skipText, { color: textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emoji:     { fontSize: 80, marginBottom: 28 },
  title:     { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  subtitle:  { fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  dots:      { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  btn:       { marginHorizontal: 32, marginBottom: 16, padding: 18, borderRadius: 16, alignItems: 'center' },
  btnText:   { color: '#fff', fontWeight: '800', fontSize: 16 },
  skip:      { alignItems: 'center', marginBottom: 40 },
  skipText:  { fontSize: 14, fontWeight: '600' },
});
```

### 2. Check onboarding state in AppNavigator.js

```js
import OnboardingScreen from '../screens/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// In AppNavigator, add state:
const [onboarded, setOnboarded] = useState(null);

// Check on mount (alongside getToken):
useEffect(() => {
  Promise.all([
    getToken(),
    AsyncStorage.getItem('@logday_onboarded'),
  ]).then(([token, ob]) => {
    setLoggedIn(!!token);
    setOnboarded(ob === 'true');
  });
}, []);

// Show OnboardingScreen after first login:
// In the logged-in branch of the navigator:
{loggedIn && !onboarded ? (
  <Stack.Screen name="Onboarding">
    {() => <OnboardingScreen onDone={() => setOnboarded(true)} />}
  </Stack.Screen>
) : loggedIn ? (
  <Stack.Screen name="Main">
    {props => <MainStack {...props} onLogout={() => setLoggedIn(false)} />}
  </Stack.Screen>
) : (
  // ...login/register screens
)}
```

## How to test
1. Clear AsyncStorage (or reinstall the app) and log in.
2. Onboarding slides appear — swipe through all 3, tap "Let's Go" → lands on Home.
3. Restart the app → onboarding does NOT appear again (AsyncStorage flag persists).
4. Test "Skip" on slide 1 → jumps straight to Home.
5. Test swipe gesture (pagingEnabled) — swipe left/right between slides.
