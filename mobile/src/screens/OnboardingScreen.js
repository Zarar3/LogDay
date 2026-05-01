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
    subtitle: "Track any activity — gym, reading, cooking. Add photos, notes, and duration. Build a habit log that's actually yours.",
  },
  {
    emoji:    '👥',
    title:    'Connect & Compete',
    subtitle: "Add friends, see what they're up to, react to their posts, and challenge them to hit goals together.",
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
