import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import ImageViewer from '../components/ImageViewer';

export default function CompareScreen({ route, navigation }) {
  const { friend } = route.params;
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border } = useTheme();
  const [myStreak,         setMyStreak]        = useState(0);
  const [theirStreak,      setTheirStreak]     = useState(0);
  const [friendActivities, setFriendActivities]= useState([]);
  const [viewerUri,        setViewerUri]       = useState(null);

  useEffect(() => {
    api.get('/activities/streak').then(r => setMyStreak(r.data.streak)).catch(() => {});
    api.get(`/activities/user/${friend.id}/streak`).then(r => setTheirStreak(r.data.streak)).catch(() => {});
    api.get(`/activities/user/${friend.id}`).then(r => setFriendActivities(r.data.slice(0, 20))).catch(() => {});
  }, []);

  async function toggleLike(id) {
    try {
      const { data } = await api.post(`/activities/${id}/like`);
      setFriendActivities(prev => prev.map(a =>
        a.id === id ? { ...a, isLiked: data.liked, likeCount: data.liked ? a.likeCount + 1 : a.likeCount - 1 } : a
      ));
    } catch {}
  }

  const winning = myStreak > theirStreak ? '🏆 You have the longer streak!'
    : myStreak < theirStreak ? `🔥 ${friend.username} is on a longer streak!`
    : '🤝 You\'re tied!';

  function StreakCard({ label, streak, highlight }) {
    return (
      <View style={[styles.streakCard, { backgroundColor: cardBg, borderColor: highlight ? accent : border }]}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={[styles.streakNum, { color: accent }]}>{streak}</Text>
        <Text style={[styles.streakLabel, { color: textSecondary }]}>day streak</Text>
        <Text style={[styles.streakName, { color: textPrimary }]}>{label}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.back, { color: accent }]}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: textPrimary }]}>You vs {friend.username}</Text>
      <Text style={[styles.sub, { color: textSecondary }]}>Streak Comparison 🔥</Text>

      <View style={[styles.scoreBadge, { backgroundColor: accent }]}>
        <Text style={styles.scoreText}>{winning}</Text>
      </View>

      <View style={styles.columns}>
        <StreakCard label="You" streak={myStreak} highlight={myStreak >= theirStreak} />
        <View style={styles.vs}><Text style={[styles.vsText, { color: textSecondary }]}>VS</Text></View>
        <StreakCard label={friend.username} streak={theirStreak} highlight={theirStreak > myStreak} />
      </View>

      <View style={[styles.infoBox, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.infoTitle, { color: textPrimary }]}>📖 How streaks work</Text>
        <Text style={[styles.infoText, { color: textSecondary }]}>Log at least one activity every day to keep your streak alive. Miss a day and it resets to zero!</Text>
      </View>

      {friendActivities.length > 0 && (
        <View style={styles.feedSection}>
          <Text style={[styles.feedTitle, { color: accent }]}>{friend.username}'s Recent Activities</Text>
          {friendActivities.map(a => (
            <View key={a.id} style={[styles.actCard, { backgroundColor: cardBg, borderColor: border }]}>
              {a.imageBase64 ? (
                <TouchableOpacity onPress={() => setViewerUri(`data:image/jpeg;base64,${a.imageBase64}`)}>
                  <Image source={{ uri: `data:image/jpeg;base64,${a.imageBase64}` }} style={styles.actImage} resizeMode="cover" />
                </TouchableOpacity>
              ) : null}
              <View style={styles.actBody}>
                <Text style={[styles.actType, { color: textPrimary }]}>{a.type}</Text>
                {a.duration ? <Text style={[styles.actMeta, { color: accent }]}>⏱ {a.duration} min</Text> : null}
                {a.notes    ? <Text style={[styles.actNotes, { color: textSecondary }]}>📝 {a.notes}</Text> : null}
              </View>
              <View style={styles.actActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(a.id)}>
                  <Text style={[styles.actionText, { color: textSecondary }]}>{a.isLiked ? '❤️' : '🤍'} {a.likeCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}
                  onPress={() => navigation.navigate('Comments', { activityId: a.id, activityType: a.type })}>
                  <Text style={[styles.actionText, { color: textSecondary }]}>💬 {a.commentCount}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <ImageViewer uri={viewerUri} visible={!!viewerUri} onClose={() => setViewerUri(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  content:      { padding: 20, paddingBottom: 48 },
  backBtn:      { marginTop: 52, marginBottom: 4 },
  back:         { fontSize: 16, fontWeight: '600' },
  heading:      { fontSize: 26, fontWeight: '800', marginTop: 8 },
  sub:          { marginBottom: 16, fontSize: 14 },
  scoreBadge:   { padding: 14, borderRadius: 14, marginBottom: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  scoreText:    { color: '#fff', fontWeight: '800', fontSize: 16 },
  columns:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  streakCard:   { flex: 1, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1.5, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  streakEmoji:  { fontSize: 36, marginBottom: 6 },
  streakNum:    { fontSize: 42, fontWeight: '900' },
  streakLabel:  { fontSize: 12, fontWeight: '600' },
  streakName:   { fontSize: 14, fontWeight: '800', marginTop: 8 },
  vs:           { alignItems: 'center' },
  vsText:       { fontWeight: '900', fontSize: 18 },
  infoBox:      { borderRadius: 14, padding: 18, borderWidth: 1.5, marginBottom: 24 },
  infoTitle:    { fontWeight: '800', fontSize: 15, marginBottom: 8 },
  infoText:     { lineHeight: 20, fontSize: 14 },
  feedSection:  { marginTop: 4 },
  feedTitle:    { fontWeight: '800', fontSize: 16, marginBottom: 12 },
  actCard:      { borderRadius: 16, marginBottom: 12, borderWidth: 1.5, overflow: 'hidden', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  actImage:     { width: '100%', height: 160 },
  actBody:      { padding: 14, paddingBottom: 8 },
  actType:      { fontSize: 15, fontWeight: '700' },
  actMeta:      { fontSize: 13, marginTop: 2 },
  actNotes:     { fontSize: 13, marginTop: 2 },
  actActions:   { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12, gap: 16 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center' },
  actionText:   { fontSize: 14, fontWeight: '600' },
});
