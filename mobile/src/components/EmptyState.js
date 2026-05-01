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
