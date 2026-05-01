import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import { getActivityIcon } from '../utils/activityIcons';

function motivationalMessage(streak, thisWeek, sessionDelta) {
  if (streak >= 7)                    return "You're on fire — don't break the chain!";
  if (thisWeek.totalSessions === 0)   return 'Every legend starts somewhere. Log something this week!';
  if (sessionDelta >= 0)              return "Great work — you're improving week over week!";
  return "Last week was better — let's bounce back stronger!";
}

export default function WeeklyDigestScreen({ navigation }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, isDark } = useTheme();
  const [data, setData] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    api.get('/activities/weekly-summary').then(r => setData(r.data)).catch(() => {});
  }, []);

  async function shareCard() {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your week' });
      } else {
        Alert.alert('Not supported', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not capture card.');
    }
  }

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
  const actBreakdown = Object.entries(thisWeek.counts || {}).sort((a, b) => b[1] - a[1]);
  const gradientColors = isDark ? ['#3730a3', '#5b21b6'] : ['#4F46E5', '#7c3aed'];

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>

      {/* Back — not captured */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.back, { color: accent }]}>← Back</Text>
      </TouchableOpacity>

      {/* ── Shareable card ── */}
      <View ref={cardRef} collapsable={false} style={[styles.card, { backgroundColor: cardBg }]}>

        {/* Gradient header */}
        <LinearGradient colors={gradientColors} style={styles.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {/* Decorative circles */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />

          <Text style={styles.eyebrow}>WEEK IN REVIEW</Text>
          <Text style={styles.weekDate}>{weekStart}</Text>
          <Text style={styles.heroNum}>{thisWeek.totalSessions}</Text>
          <Text style={styles.heroLabel}>session{thisWeek.totalSessions !== 1 ? 's' : ''} this week</Text>
        </LinearGradient>

        {/* Stats row */}
        <View style={[styles.statsRow, { borderBottomColor: border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: accent }]}>{thisWeek.totalSessions}</Text>
            <Text style={[styles.statLbl, { color: textSecondary }]}>Sessions</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: accent }]}>{thisWeek.totalMinutes}</Text>
            <Text style={[styles.statLbl, { color: textSecondary }]}>Minutes</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: accent }]}>{streak}</Text>
            <Text style={[styles.statLbl, { color: textSecondary }]}>🔥 Streak</Text>
          </View>
        </View>

        {/* vs Last Week */}
        <View style={[styles.section, { borderBottomColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>VS LAST WEEK</Text>
          <View style={styles.pillRow}>
            <View style={[styles.deltaPill, { backgroundColor: sessionDelta >= 0 ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.deltaPillText, { color: sessionDelta >= 0 ? '#16a34a' : '#dc2626' }]}>
                {sessionDelta >= 0 ? '▲' : '▼'} {Math.abs(sessionDelta)} sessions
              </Text>
            </View>
            <View style={[styles.deltaPill, { backgroundColor: minuteDelta >= 0 ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={[styles.deltaPillText, { color: minuteDelta >= 0 ? '#16a34a' : '#dc2626' }]}>
                {minuteDelta >= 0 ? '▲' : '▼'} {Math.abs(minuteDelta)} min
              </Text>
            </View>
          </View>
          {lastWeek.totalSessions === 0 && (
            <Text style={[styles.noData, { color: textSecondary }]}>No data from last week</Text>
          )}
        </View>

        {/* Top Activity */}
        <View style={[styles.section, { borderBottomColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>TOP ACTIVITY</Text>
          {thisWeek.topType ? (
            <View style={styles.topRow}>
              <View style={[styles.topIcon, { backgroundColor: accent + '18' }]}>
                <Text style={styles.topEmoji}>{getActivityIcon(thisWeek.topType)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.topType, { color: textPrimary }]}>{thisWeek.topType}</Text>
                <Text style={[styles.topCount, { color: textSecondary }]}>
                  {thisWeek.counts[thisWeek.topType]} session{thisWeek.counts[thisWeek.topType] > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.noData, { color: textSecondary }]}>Nothing logged yet this week</Text>
          )}
        </View>

        {/* Breakdown */}
        {actBreakdown.length > 0 && (
          <View style={[styles.section, { borderBottomColor: border }]}>
            <Text style={[styles.sectionTitle, { color: textSecondary }]}>BREAKDOWN</Text>
            {actBreakdown.map(([type, count]) => {
              const pct = count / thisWeek.totalSessions;
              return (
                <View key={type} style={styles.breakRow}>
                  <Text style={[styles.breakType, { color: textPrimary }]}>{type}</Text>
                  <View style={[styles.breakBarWrap, { backgroundColor: accent + '18' }]}>
                    <View style={[styles.breakBar, { width: `${pct * 100}%`, backgroundColor: accent }]} />
                  </View>
                  <Text style={[styles.breakPct, { color: textSecondary }]}>{Math.round(pct * 100)}%</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Motivational message */}
        <View style={styles.mottoSection}>
          <Text style={[styles.motto, { color: accent }]}>
            🔥 {motivationalMessage(streak, thisWeek, sessionDelta)}
          </Text>
        </View>

        {/* LogDay branding footer */}
        <View style={[styles.footer, { borderTopColor: border }]}>
          <Text style={[styles.footerText, { color: textSecondary }]}>LogDay</Text>
        </View>

      </View>
      {/* ── End shareable card ── */}

      {/* Share button — not captured */}
      <TouchableOpacity style={[styles.shareBtn, { backgroundColor: accent }]} onPress={shareCard}>
        <Text style={styles.shareBtnText}>📤  Share this week</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  content:        { padding: 20, paddingBottom: 60 },
  backBtn:        { marginTop: 52, marginBottom: 20 },
  back:           { fontSize: 16, fontWeight: '600' },

  card:           { borderRadius: 28, overflow: 'hidden',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },

  /* Gradient header */
  gradientHeader: { paddingHorizontal: 28, paddingTop: 40, paddingBottom: 36, overflow: 'hidden' },
  circle1:        { position: 'absolute', width: 200, height: 200, borderRadius: 100,
                    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40 },
  circle2:        { position: 'absolute', width: 140, height: 140, borderRadius: 70,
                    backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: -20 },
  eyebrow:        { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '800',
                    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  weekDate:       { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 20 },
  heroNum:        { color: '#fff', fontSize: 80, fontWeight: '900', lineHeight: 84, letterSpacing: -2 },
  heroLabel:      { color: 'rgba(255,255,255,0.75)', fontSize: 15, fontWeight: '600', marginTop: 4 },

  /* Stats row */
  statsRow:       { flexDirection: 'row', paddingVertical: 20,
                    borderBottomWidth: 1 },
  statBox:        { flex: 1, alignItems: 'center' },
  statDivider:    { width: 1, marginVertical: 6 },
  statVal:        { fontSize: 26, fontWeight: '900' },
  statLbl:        { fontSize: 11, fontWeight: '600', marginTop: 3, textAlign: 'center' },

  /* Sections */
  section:        { paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1 },
  sectionTitle:   { fontSize: 10, fontWeight: '800', letterSpacing: 1.5,
                    textTransform: 'uppercase', marginBottom: 12 },

  /* Delta pills */
  pillRow:        { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  deltaPill:      { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  deltaPillText:  { fontSize: 13, fontWeight: '800' },
  noData:         { fontSize: 12, fontStyle: 'italic', marginTop: 4 },

  /* Top activity */
  topRow:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
  topIcon:        { width: 52, height: 52, borderRadius: 26,
                    justifyContent: 'center', alignItems: 'center' },
  topEmoji:       { fontSize: 26 },
  topType:        { fontSize: 18, fontWeight: '800' },
  topCount:       { fontSize: 13, fontWeight: '600', marginTop: 2 },

  /* Breakdown */
  breakRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  breakType:      { width: 82, fontSize: 13, fontWeight: '700' },
  breakBarWrap:   { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  breakBar:       { height: '100%', borderRadius: 7 },
  breakPct:       { width: 36, fontSize: 12, fontWeight: '700', textAlign: 'right' },

  /* Motto */
  mottoSection:   { paddingHorizontal: 20, paddingVertical: 20 },
  motto:          { fontSize: 14, fontWeight: '700', lineHeight: 22,
                    fontStyle: 'italic', textAlign: 'center' },

  /* Footer branding */
  footer:         { borderTopWidth: 1, paddingVertical: 14, alignItems: 'center' },
  footerText:     { fontSize: 12, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },

  /* Share button */
  shareBtn:       { marginTop: 20, padding: 18, borderRadius: 16, alignItems: 'center',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  shareBtnText:   { color: '#fff', fontWeight: '800', fontSize: 16 },
});
