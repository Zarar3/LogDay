import React, { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { removeToken } from '../auth';
import { useTheme } from '../context/ThemeContext';
import ImageViewer from '../components/ImageViewer';

function todayDate() { return new Date().toISOString().split('T')[0]; }

function dateFromOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return '🌅 Good morning!';
  if (h < 17) return '☀️ Good afternoon!';
  return '🌙 Good evening!';
}

const REFLECTIONS = [
  "What made today's activities feel good? 💭",
  "Are you building habits that excite you? ✨",
  "Small steps every day add up fast. Keep going! 🚀",
  "What's one thing you want to do tomorrow? 🎯",
  "Consistency beats perfection every time. 💪",
];

const CONGRATS = [
  'Great job! 🎉', 'You crushed it! 💪', 'Nailed it! 🔥',
  'Well done! ⭐', 'Keep it up! 🚀', 'Amazing! 🌟',
  "You're on fire! 🔥", 'Smashed it! 💥',
];

function getMotivation(id) {
  return CONGRATS[id.charCodeAt(0) % CONGRATS.length];
}

// ─── Who's active today strip ────────────────────────────────────────────────
function ActiveStrip({ friends, onPress }) {
  const { accent, cardBg, textSecondary, border } = useTheme();
  if (friends.length === 0) return null;

  return (
    <View style={stripStyles.wrap}>
      <Text style={[stripStyles.label, { color: textSecondary }]}>Active today</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stripStyles.row}>
        {friends.map(f => (
          <TouchableOpacity key={f.id} style={stripStyles.item} onPress={() => onPress(f.id)}>
            {f.avatarBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${f.avatarBase64}` }}
                style={[stripStyles.avatar, { borderColor: accent }]}
              />
            ) : (
              <View style={[stripStyles.avatar, stripStyles.placeholder, { borderColor: accent, backgroundColor: cardBg }]}>
                <Text style={{ fontSize: 18 }}>👤</Text>
              </View>
            )}
            <View style={[stripStyles.dot, { borderColor: cardBg }]} />
            <Text style={[stripStyles.name, { color: textSecondary }]} numberOfLines={1}>
              {f.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const stripStyles = StyleSheet.create({
  wrap:        { marginBottom: 16 },
  label:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
                 textTransform: 'uppercase', marginBottom: 10 },
  row:         { gap: 16, paddingRight: 4 },
  item:        { alignItems: 'center', position: 'relative', width: 56 },
  avatar:      { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  dot:         { position: 'absolute', top: 36, right: 2,
                 width: 13, height: 13, borderRadius: 7,
                 backgroundColor: '#22c55e', borderWidth: 2 },
  name:        { fontSize: 10, fontWeight: '600', marginTop: 5,
                 textAlign: 'center', width: 56 },
});

// ─── Liquid-fill circle for overall goal progress ─────────────────────────────
function GoalRing({ done, total, size, accent, bgColor }) {
  const pct = total === 0 ? 0 : Math.min(1, done / total);
  const allDone = total > 0 && done === total;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#e2e8f0' }}>
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${pct * 100}%`,
        backgroundColor: allDone ? accent : accent + 'cc',
      }} />
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
        {total === 0 ? (
          <Text style={{ fontSize: size * 0.22, color: '#94a3b8' }}>—</Text>
        ) : (
          <>
            <Text style={{ fontSize: size * 0.22, fontWeight: '900', color: pct > 0.55 ? '#fff' : '#1e293b', lineHeight: size * 0.26 }}>
              {done}/{total}
            </Text>
            {allDone && <Text style={{ fontSize: size * 0.16, color: '#fff' }}>✓</Text>}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Circle toggle per goal ───────────────────────────────────────────────────
function GoalCircle({ done, accent }) {
  const size = 26;
  if (done) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: accent, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: '#000' }} />
  );
}

const DEADLINE_PRESETS = [
  { label: 'Today',    days: 0 },
  { label: '+1 day',  days: 1 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
  { label: '+2 wks',  days: 14 },
];

export default function HomeScreen({ navigation, onLogout }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg, statsBg, isDark } = useTheme();
  const [activities, setActivities] = useState([]);
  const [streak, setStreak]           = useState(0);
  const [goals, setGoals]             = useState([]);
  const [goalText, setGoalText]       = useState('');
  const [deadlineDays, setDeadline]   = useState(0);
  const [viewerUri, setViewerUri]     = useState(null);
  const [activeFriends, setActiveFriends] = useState([]);
  const reflection = REFLECTIONS[new Date().getDay() % REFLECTIONS.length];

  useFocusEffect(useCallback(() => {
    const today = todayDate();
    api.get(`/activities?date=${today}`).then(r => setActivities(r.data)).catch(() => {});
    api.get('/activities/streak').then(r => setStreak(r.data.streak)).catch(() => {});
    api.get('/goals/active').then(r => setGoals(r.data)).catch(() => {});
    api.get('/friends/active-today').then(r => setActiveFriends(r.data)).catch(() => {});
  }, []));

  async function deleteActivity(id) {
    await api.delete(`/activities/${id}`);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  function confirmDelete(id) {
    Alert.alert('Delete', 'Remove this activity?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteActivity(id) },
    ]);
  }

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await removeToken(); onLogout(); } },
    ]);
  }

  async function toggleLike(id) {
    try {
      const { data } = await api.post(`/activities/${id}/like`);
      setActivities(prev => prev.map(a =>
        a.id === id ? { ...a, isLiked: data.liked, likeCount: data.liked ? a.likeCount + 1 : a.likeCount - 1 } : a
      ));
    } catch {}
  }

  async function addGoal() {
    if (!goalText.trim()) return;
    const date = dateFromOffset(deadlineDays);
    try {
      const { data } = await api.post('/goals', { text: goalText.trim(), date });
      setGoals(prev => [...prev, data]);
      setGoalText('');
    } catch {}
  }

  async function toggleGoal(id) {
    const goal = goals.find(g => g.id === id);
    if (goal?.done) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    try {
      const { data } = await api.patch(`/goals/${id}/toggle`);
      setGoals(prev => prev.map(g => g.id === id ? data : g));
    } catch {}
  }

  async function deleteGoal(id) {
    try {
      await api.delete(`/goals/${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch {}
  }

  const today       = todayDate();
  const todayGoals  = goals.filter(g => g.date === today);
  const futureGoals = goals.filter(g => g.date >  today);
  const doneCount   = goals.filter(g => g.done).length;

  function renderGoal(g) {
    const isToday = g.date === today;
    return (
      <View key={g.id} style={[styles.goalRow, { backgroundColor: cardBg, borderColor: g.done ? accent + '55' : border }]}>
        <TouchableOpacity onPress={() => toggleGoal(g.id)} style={styles.circleWrap}>
          <GoalCircle done={g.done} accent={accent} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.goalText, { color: textPrimary }, g.done && styles.goalTextDone]}>{g.text}</Text>
          {g.done
            ? <Text style={[styles.motivate, { color: accent }]}>{getMotivation(g.id)}</Text>
            : !isToday && <Text style={[styles.deadline, { color: textSecondary }]}>Due {g.date}</Text>
          }
        </View>
        <TouchableOpacity onPress={() => deleteGoal(g.id)}>
          <Text style={styles.goalDelete}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: pageBg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.heading}>Today's Log 📋</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activities}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <ActiveStrip
              friends={activeFriends}
              onPress={(userId) => navigation.navigate('UserProfile', { userId })}
            />

            <View style={[styles.statsRow, { backgroundColor: statsBg, borderBottomColor: border }]}>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={[styles.statNum, { color: accent }]}>{streak}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>day streak</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={styles.statEmoji}>📋</Text>
                <Text style={[styles.statNum, { color: accent }]}>{activities.length}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>logged</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: border }]}>
                <GoalRing done={doneCount} total={goals.length} size={52} accent={accent} bgColor={cardBg} />
                <Text style={[styles.statLabel, { color: textSecondary, marginTop: 4 }]}>goals</Text>
              </View>
            </View>

            <View style={[styles.reflectionBox, { backgroundColor: isDark ? '#1a2744' : '#eff6ff', borderColor: border }]}>
              <Text style={[styles.reflectionText, { color: accent }]}>{reflection}</Text>
            </View>

            {/* Goals section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accent }]}>Goals 🎯</Text>

              {todayGoals.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { color: textSecondary }]}>TODAY</Text>
                  {todayGoals.map(renderGoal)}
                </>
              )}

              {futureGoals.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { color: textSecondary, marginTop: todayGoals.length > 0 ? 10 : 0 }]}>UPCOMING</Text>
                  {futureGoals.map(renderGoal)}
                </>
              )}

              {goals.length === 0 && (
                <Text style={[styles.noGoals, { color: textSecondary }]}>No goals yet — add one below!</Text>
              )}

              {/* Deadline presets */}
              <View style={styles.presetRow}>
                {DEADLINE_PRESETS.map(p => (
                  <TouchableOpacity key={p.days} onPress={() => setDeadline(p.days)}
                    style={[styles.preset, { borderColor: accent, backgroundColor: deadlineDays === p.days ? accent : 'transparent' }]}>
                    <Text style={[styles.presetText, { color: deadlineDays === p.days ? '#fff' : accent }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Goal input */}
              <View style={styles.goalInputRow}>
                <TextInput
                  style={[styles.goalInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
                  placeholder={`Add a goal (${deadlineDays === 0 ? 'today' : `in ${deadlineDays}d`})...`}
                  value={goalText} onChangeText={setGoalText}
                  placeholderTextColor={textSecondary}
                  onSubmitEditing={addGoal} returnKeyType="done" />
                <TouchableOpacity style={[styles.goalAddBtn, { backgroundColor: accent }]} onPress={addGoal}>
                  <Text style={styles.goalAddText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.sectionTitle2, { color: accent }]}>Activities</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🫙</Text>
            <Text style={[styles.emptyText, { color: textPrimary }]}>No activities yet.</Text>
            <Text style={[styles.emptySubText, { color: textSecondary }]}>Tap below to log your first one!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            {item.imageBase64 ? (
              <TouchableOpacity onPress={() => setViewerUri(`data:image/jpeg;base64,${item.imageBase64}`)}>
                <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.cardImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : null}
            <View style={styles.cardBody}>
              <View style={styles.cardLeft}>
                <Text style={[styles.type, { color: textPrimary }]}>{item.type}</Text>
                {item.duration ? <Text style={[styles.meta, { color: accent }]}>⏱ {item.duration} min</Text> : null}
                {item.notes    ? <Text style={[styles.notes, { color: textSecondary }]}>📝 {item.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                <Text style={styles.delete}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
                <Text style={[styles.actionText, { color: textSecondary }]}>{item.isLiked ? '❤️' : '🤍'} {item.likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}
                onPress={() => navigation.navigate('Comments', { activityId: item.id, activityType: item.type })}>
                <Text style={[styles.actionText, { color: textSecondary }]}>💬 {item.commentCount}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: accent }]} onPress={() => navigation.navigate('LogActivity')}>
        <Text style={styles.fabText}>+ Log Activity</Text>
      </TouchableOpacity>

      <ImageViewer uri={viewerUri} visible={!!viewerUri} onClose={() => setViewerUri(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        { padding: 24, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  greeting:      { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 2 },
  heading:       { fontSize: 26, fontWeight: '800', color: '#fff' },
  date:          { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  logoutBtn:     { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  logoutText:    { color: '#fff', fontSize: 13, fontWeight: '600' },
  list:          { paddingBottom: 100 },
  statsRow:      { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1 },
  statCard:      { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1.5, shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  statEmoji:     { fontSize: 18 },
  statNum:       { fontSize: 18, fontWeight: '900' },
  statLabel:     { fontSize: 10, fontWeight: '600' },
  reflectionBox: { margin: 12, marginBottom: 4, borderRadius: 14, padding: 14, borderWidth: 1.5 },
  reflectionText:{ fontWeight: '600', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  section:       { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  sectionTitle:  { fontWeight: '800', fontSize: 15, marginBottom: 10 },
  sectionTitle2: { fontWeight: '800', fontSize: 15, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  groupLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  noGoals:       { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
  goalRow:       { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1.5, gap: 10 },
  circleWrap:    { width: 30, alignItems: 'center' },
  goalText:      { fontSize: 14, fontWeight: '600' },
  goalTextDone:  { textDecorationLine: 'line-through', opacity: 0.5 },
  motivate:      { fontSize: 12, fontWeight: '700', marginTop: 2 },
  deadline:      { fontSize: 11, marginTop: 2, fontWeight: '600' },
  goalDelete:    { color: '#94a3b8', fontSize: 16, paddingLeft: 4 },
  presetRow:     { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  preset:        { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  presetText:    { fontSize: 11, fontWeight: '700' },
  goalInputRow:  { flexDirection: 'row', gap: 8, marginTop: 2 },
  goalInput:     { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  goalAddBtn:    { borderRadius: 12, width: 44, justifyContent: 'center', alignItems: 'center' },
  goalAddText:   { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  card:          { borderRadius: 20, marginHorizontal: 12, marginBottom: 12, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardImage:     { width: '100%', height: 180 },
  cardBody:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 8 },
  cardLeft:      { flex: 1 },
  type:          { fontSize: 16, fontWeight: '700' },
  meta:          { fontSize: 13, marginTop: 2 },
  notes:         { fontSize: 13, marginTop: 2 },
  delete:        { color: '#94a3b8', fontSize: 18, paddingLeft: 12 },
  cardActions:   { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12, gap: 16 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center' },
  actionText:    { fontSize: 14, fontWeight: '600' },
  emptyBox:      { alignItems: 'center', marginTop: 24, paddingHorizontal: 12 },
  emptyEmoji:    { fontSize: 48, marginBottom: 10 },
  emptyText:     { fontSize: 17, fontWeight: '700' },
  emptySubText:  { fontSize: 14, marginTop: 4 },
  fab:           { position: 'absolute', bottom: 24, left: 20, right: 20, padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  fabText:       { color: '#fff', fontWeight: '800', fontSize: 16 },
});
