import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

function StatBox({ label, value, accent, textSecondary }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statVal, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLbl, { color: textSecondary }]}>{label}</Text>
    </View>
  );
}

function Delta({ value, unit }) {
  const up = value >= 0;
  return (
    <Text style={[styles.delta, { color: up ? '#22c55e' : '#ef4444' }]}>
      {up ? '▲' : '▼'} {Math.abs(value)} {unit} vs last week
    </Text>
  );
}

function motivationalMessage(streak, thisWeek, sessionDelta) {
  if (streak >= 7)                    return "🔥 You're on fire — don't break the chain!";
  if (thisWeek.totalSessions === 0)   return 'Every legend starts somewhere. Log something this week!';
  if (sessionDelta >= 0)              return 'Great work — you\'re improving week over week!';
  return 'Last week was better — let\'s bounce back stronger!';
}

export default function WeeklyDigestScreen({ navigation }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, isDark } = useTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/activities/weekly-summary').then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) {
    return (
      <View style={[styles.container, { backgroundColor: pageBg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: textSecondary, fontSize: 15 }}>Loading...</Text>
      </View>
    );
  }

  const { thisWeek, lastWeek, streak, weekStart } = data;
  const sessionDelta = thisWeek.totalSessions - lastWeek.totalSessions;
  const minuteDelta  = thisWeek.totalMinutes  - lastWeek.totalMinutes;

  const actBreakdown = Object.entries(thisWeek.counts || {})
    .sort((a, b) => b[1] - a[1]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.back, { color: accent }]}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.eyebrow, { color: textSecondary }]}>Week of {weekStart}</Text>
      <Text style={[styles.heading, { color: textPrimary }]}>This Week 📊</Text>

      {/* Big stats */}
      <View style={[styles.statRow, { backgroundColor: cardBg, borderColor: border }]}>
        <StatBox label="Sessions"      value={thisWeek.totalSessions} accent={accent} textSecondary={textSecondary} />
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <StatBox label="Minutes"       value={thisWeek.totalMinutes}  accent={accent} textSecondary={textSecondary} />
        <View style={[styles.statDivider, { backgroundColor: border }]} />
        <StatBox label="Day Streak 🔥" value={streak}                 accent={accent} textSecondary={textSecondary} />
      </View>

      {/* vs last week */}
      <View style={[styles.deltaCard, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.cardTitle, { color: textPrimary }]}>vs Last Week</Text>
        <Delta value={sessionDelta} unit="sessions" />
        <View style={{ height: 8 }} />
        <Delta value={minuteDelta}  unit="min" />
        {lastWeek.totalSessions === 0 && (
          <Text style={[styles.noLastWeek, { color: textSecondary }]}>No activities logged last week</Text>
        )}
      </View>

      {/* Top activity */}
      {thisWeek.topType ? (
        <View style={[styles.topCard, { backgroundColor: accent }]}>
          <Text style={styles.topLabel}>Top Activity This Week</Text>
          <Text style={styles.topType}>{thisWeek.topType}</Text>
          <Text style={styles.topCount}>{thisWeek.counts[thisWeek.topType]} session{thisWeek.counts[thisWeek.topType] > 1 ? 's' : ''}</Text>
        </View>
      ) : (
        <View style={[styles.topCard, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderWidth: 1.5, borderColor: border }]}>
          <Text style={[styles.topLabel, { color: textSecondary }]}>No activities this week yet</Text>
          <Text style={[styles.topType, { color: textSecondary, fontSize: 20 }]}>🫙</Text>
        </View>
      )}

      {/* Activity breakdown */}
      {actBreakdown.length > 0 && (
        <View style={[styles.breakdownCard, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>Breakdown</Text>
          {actBreakdown.map(([type, count]) => {
            const pct = count / thisWeek.totalSessions;
            return (
              <View key={type} style={styles.breakRow}>
                <Text style={[styles.breakType, { color: textPrimary }]}>{type}</Text>
                <View style={styles.breakBarWrap}>
                  <View style={[styles.breakBar, { width: `${pct * 100}%`, backgroundColor: accent }]} />
                </View>
                <Text style={[styles.breakCount, { color: textSecondary }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Motivational message */}
      <View style={[styles.mottoBox, { backgroundColor: isDark ? '#1a2744' : '#eff6ff', borderColor: border }]}>
        <Text style={[styles.motto, { color: accent }]}>
          {motivationalMessage(streak, thisWeek, sessionDelta)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  content:      { padding: 24, paddingBottom: 60 },
  backBtn:      { marginTop: 52, marginBottom: 20 },
  back:         { fontSize: 16, fontWeight: '600' },
  eyebrow:      { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  heading:      { fontSize: 30, fontWeight: '900', marginBottom: 24, letterSpacing: -0.5 },

  statRow:      { flexDirection: 'row', borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 14 },
  statBox:      { flex: 1, alignItems: 'center' },
  statDivider:  { width: 1.5, marginVertical: 4 },
  statVal:      { fontSize: 30, fontWeight: '900' },
  statLbl:      { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  deltaCard:    { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  cardTitle:    { fontSize: 12, fontWeight: '800', textTransform: 'uppercase',
                  letterSpacing: 1, marginBottom: 12 },
  delta:        { fontSize: 14, fontWeight: '700' },
  noLastWeek:   { fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  topCard:      { borderRadius: 20, padding: 24, marginBottom: 14, alignItems: 'center' },
  topLabel:     { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: 0.8 },
  topType:      { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 6 },
  topCount:     { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginTop: 4 },

  breakdownCard:{ borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  breakRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  breakType:    { width: 80, fontSize: 13, fontWeight: '700' },
  breakBarWrap: { flex: 1, height: 10, backgroundColor: 'rgba(0,0,0,0.06)',
                  borderRadius: 5, overflow: 'hidden' },
  breakBar:     { height: '100%', borderRadius: 5 },
  breakCount:   { width: 24, fontSize: 13, fontWeight: '700', textAlign: 'right' },

  mottoBox:     { borderRadius: 16, borderWidth: 1.5, padding: 20 },
  motto:        { fontSize: 15, fontWeight: '700', textAlign: 'center',
                  lineHeight: 22, fontStyle: 'italic' },
});
