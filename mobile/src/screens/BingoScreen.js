import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

export default function BingoScreen({ navigation }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border } = useTheme();
  const [grid,      setGrid]      = useState([]);
  const [completed, setCompleted] = useState([]);
  const [hasBingo,  setHasBingo]  = useState(false);
  const [weekStart, setWeekStart] = useState('');
  const cardRef = useRef(null);

  useFocusEffect(useCallback(() => {
    api.get('/bingo/this-week')
      .then(r => {
        setGrid(r.data.grid);
        setCompleted(r.data.completed);
        setHasBingo(r.data.hasBingo);
        setWeekStart(r.data.weekStart);
      })
      .catch(() => {});
  }, []));

  async function share() {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your bingo card' });
      } else {
        Alert.alert('Not supported', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not capture card.');
    }
  }

  const completedCount = completed.filter(Boolean).length;
  const rows = Array.from({ length: 5 }, (_, i) => grid.slice(i * 5, i * 5 + 5));
  const completedRows = Array.from({ length: 5 }, (_, i) => completed.slice(i * 5, i * 5 + 5));

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: accent }]}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: textPrimary }]}>Activity Bingo 🎲</Text>
      <Text style={[styles.sub, { color: textSecondary }]}>Week of {weekStart}</Text>

      {hasBingo && (
        <View style={[styles.bingoAlert, { backgroundColor: accent }]}>
          <Text style={styles.bingoAlertText}>🎉 BINGO! You got a line this week!</Text>
        </View>
      )}

      <View ref={cardRef} collapsable={false}
        style={[styles.card, { backgroundColor: cardBg, borderColor: accent }]}>
        <Text style={[styles.cardHeader, { color: accent }]}>
          ACTIVITY BINGO
        </Text>
        <Text style={[styles.cardSub, { color: textSecondary }]}>
          {completedCount}/25 completed • {weekStart}
        </Text>

        <View style={styles.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((type, ci) => {
                const done = completedRows[ri]?.[ci] ?? false;
                return (
                  <View key={ci} style={[
                    styles.cell,
                    { borderColor: done ? accent : border },
                    done && { backgroundColor: accent },
                  ]}>
                    <Text
                      style={[styles.cellText, { color: done ? '#fff' : textPrimary }]}
                      numberOfLines={2}
                      adjustsFontSizeToFit>
                      {type}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text style={[styles.cardFooter, { color: textSecondary }]}>LogDay</Text>
      </View>

      <TouchableOpacity style={[styles.shareBtn, { backgroundColor: accent }]} onPress={share}>
        <Text style={styles.shareBtnText}>📤 Share card</Text>
      </TouchableOpacity>

      <View style={[styles.legend, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.legendTitle, { color: textPrimary }]}>How to play</Text>
        <Text style={[styles.legendText, { color: textSecondary }]}>
          Log any activity from the grid this week. Get 5 in a row — horizontally, vertically, or diagonally — to get a BINGO! The grid resets every Monday.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  content:        { padding: 16, paddingBottom: 48 },
  backBtn:        { marginTop: 52, marginBottom: 12 },
  backText:       { fontSize: 15, fontWeight: '700' },
  title:          { fontSize: 26, fontWeight: '900', marginBottom: 4 },
  sub:            { fontSize: 13, marginBottom: 14 },
  bingoAlert:     { borderRadius: 14, padding: 14, marginBottom: 14, alignItems: 'center' },
  bingoAlertText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  card:           { borderRadius: 20, borderWidth: 2, padding: 16, marginBottom: 16 },
  cardHeader:     { fontSize: 13, fontWeight: '900', letterSpacing: 2, textAlign: 'center',
                    textTransform: 'uppercase', marginBottom: 2 },
  cardSub:        { fontSize: 11, textAlign: 'center', marginBottom: 14 },
  grid:           { gap: 4 },
  gridRow:        { flexDirection: 'row', gap: 4 },
  cell:           { flex: 1, aspectRatio: 1, borderWidth: 1.5, borderRadius: 8,
                    justifyContent: 'center', alignItems: 'center', padding: 4 },
  cellText:       { fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 13 },
  cardFooter:     { textAlign: 'center', fontSize: 11, marginTop: 14, fontWeight: '600' },
  shareBtn:       { borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 16 },
  shareBtnText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
  legend:         { borderRadius: 16, borderWidth: 1, padding: 16 },
  legendTitle:    { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  legendText:     { fontSize: 13, lineHeight: 20 },
});
