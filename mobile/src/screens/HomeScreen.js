import React, { useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, TextInput, KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { removeToken } from '../auth';
import { useTheme } from '../context/ThemeContext';
import ImageViewer from '../components/ImageViewer';
import SwipeableCard from '../components/SwipeableCard';
import ActivityRings from '../components/ActivityRings';
import { getActivityIcon } from '../utils/activityIcons';
import ConfettiCannon from 'react-native-confetti-cannon';

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
  const { accent, cardBg, textSecondary } = useTheme();
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
  wrap:        { marginTop: 8, marginBottom: 12, paddingHorizontal: 16 },
  label:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
                 textTransform: 'uppercase', marginBottom: 12 },
  row:         { gap: 20, paddingRight: 8 },
  item:        { alignItems: 'center', position: 'relative', width: 68 },
  avatar:      { width: 62, height: 62, borderRadius: 31, borderWidth: 2.5 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  dot:         { position: 'absolute', top: 44, right: 4,
                 width: 14, height: 14, borderRadius: 7,
                 backgroundColor: '#22c55e', borderWidth: 2 },
  name:        { fontSize: 11, fontWeight: '600', marginTop: 6,
                 textAlign: 'center', width: 68 },
});

// ─── Quick-log preset strip ──────────────────────────────────────────────────
function PresetStrip({ presets, onLog, onDelete }) {
  const { accent, cardBg, textPrimary, textSecondary, border } = useTheme();
  if (presets.length === 0) return null;
  return (
    <View style={{ marginBottom: 4, paddingHorizontal: 16 }}>
      <Text style={[pStyles.label, { color: textSecondary }]}>Quick Log</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
        {presets.map(p => (
          <TouchableOpacity key={p.id}
            style={[pStyles.card, { backgroundColor: cardBg, borderColor: border }]}
            onPress={() => onLog(p)}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Delete Preset', `Remove "${p.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(p.id) },
              ]);
            }}>
            <Text style={[pStyles.name, { color: textPrimary }]}>{p.name}</Text>
            <Text style={[pStyles.sub, { color: accent }]}>
              {p.type}{p.duration ? `  •  ${p.duration}m` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={[pStyles.hint, { color: textSecondary }]}>Long-press to delete</Text>
    </View>
  );
}

const pStyles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  card:  { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, minWidth: 110 },
  name:  { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  sub:   { fontSize: 12, fontWeight: '600' },
  hint:  { fontSize: 10, marginTop: 6 },
});

// ─── Daily challenge card ─────────────────────────────────────────────────────
function DailyChallengeCard({ challenge, accent, cardBg, textPrimary, textSecondary, border }) {
  const { emoji, title, completed, friendsCompleted, totalFriends } = challenge;
  return (
    <View style={[dcStyles.card, { backgroundColor: cardBg, borderColor: completed ? accent : border }]}>
      <View style={dcStyles.row}>
        <View style={[dcStyles.badge, { backgroundColor: accent + '18' }]}>
          <Text style={dcStyles.badgeEmoji}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[dcStyles.title, { color: textPrimary }]}>{title}</Text>
          {totalFriends > 0 && (
            <Text style={[dcStyles.friends, { color: textSecondary }]}>
              {friendsCompleted}/{totalFriends} friends done
            </Text>
          )}
        </View>
        <View style={[dcStyles.status, { backgroundColor: completed ? accent : border + '80' }]}>
          <Text style={dcStyles.statusText}>{completed ? '✓ Done' : 'Today'}</Text>
        </View>
      </View>
    </View>
  );
}

const dcStyles = StyleSheet.create({
  card:       { borderRadius: 16, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge:      { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  badgeEmoji: { fontSize: 22 },
  title:      { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  friends:    { fontSize: 12, fontWeight: '500' },
  status:     { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});

// ─── 1-on-1 challenge card ────────────────────────────────────────────────────
function ChallengeCard({ challenge, onComplete, accent, cardBg, textPrimary, textSecondary, border }) {
  const { isChallenger, challenger, challengee, activityType, targetSessions, deadline, myCount, theirCount } = challenge;
  const opponent   = isChallenger ? challengee : challenger;
  const myPct      = Math.min(1, myCount    / targetSessions);
  const theirPct   = Math.min(1, theirCount / targetSessions);
  const bothDone   = myCount >= targetSessions && theirCount >= targetSessions;
  const daysLeft   = Math.max(0, Math.ceil((new Date(deadline) - new Date()) / 86400000));

  return (
    <View style={[cStyles.card, { backgroundColor: cardBg, borderColor: bothDone ? accent : border }]}>
      <View style={cStyles.row}>
        <Text style={[cStyles.title, { color: textPrimary }]}>⚔️ {activityType}</Text>
        <Text style={[cStyles.deadline, { color: daysLeft <= 2 ? '#ef4444' : textSecondary }]}>
          {daysLeft === 0 ? 'Ends today!' : `${daysLeft}d left`}
        </Text>
      </View>
      <Text style={[cStyles.sub, { color: textSecondary }]}>
        vs <Text style={{ fontWeight: '800', color: accent }}>{opponent.username}</Text>  •  {targetSessions} sessions
      </Text>
      <View style={cStyles.barRow}>
        <Text style={[cStyles.barLabel, { color: textSecondary }]}>You</Text>
        <View style={[cStyles.barBg, { borderColor: border }]}>
          <View style={[cStyles.barFill, { width: `${myPct * 100}%`, backgroundColor: accent }]} />
        </View>
        <Text style={[cStyles.barCount, { color: textPrimary }]}>{myCount}/{targetSessions}</Text>
      </View>
      <View style={cStyles.barRow}>
        <Text style={[cStyles.barLabel, { color: textSecondary }]}>{opponent.username.slice(0, 6)}</Text>
        <View style={[cStyles.barBg, { borderColor: border }]}>
          <View style={[cStyles.barFill, { width: `${theirPct * 100}%`, backgroundColor: accent + '88' }]} />
        </View>
        <Text style={[cStyles.barCount, { color: textPrimary }]}>{theirCount}/{targetSessions}</Text>
      </View>
      {bothDone && (
        <TouchableOpacity style={[cStyles.doneBtn, { backgroundColor: accent }]} onPress={() => onComplete(challenge.id)}>
          <Text style={cStyles.doneBtnText}>🏆 Mark Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const cStyles = StyleSheet.create({
  card:      { borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title:     { fontSize: 15, fontWeight: '800' },
  deadline:  { fontSize: 12, fontWeight: '700' },
  sub:       { fontSize: 13, marginBottom: 10 },
  barRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  barLabel:  { width: 48, fontSize: 11, fontWeight: '700' },
  barBg:     { flex: 1, height: 10, borderRadius: 5, borderWidth: 1, backgroundColor: 'transparent', overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 5 },
  barCount:  { width: 36, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  doneBtn:   { marginTop: 8, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});

// ─── Group challenge card ─────────────────────────────────────────────────────
function GroupChallengeCard({ challenge, onComplete, accent, cardBg, textPrimary, textSecondary, border }) {
  const { activityType, targetSessions, deadline, members = [], totalSessions = 0, groupTarget = 0 } = challenge;
  const pct      = groupTarget > 0 ? Math.min(1, totalSessions / groupTarget) : 0;
  const allDone  = pct >= 1;
  const daysLeft = Math.max(0, Math.ceil((new Date(deadline) - new Date()) / 86400000));

  return (
    <View style={[gcStyles.card, { backgroundColor: cardBg, borderColor: allDone ? accent : border }]}>
      <View style={gcStyles.header}>
        <Text style={[gcStyles.title, { color: textPrimary }]}>🏆 {activityType}</Text>
        <Text style={[gcStyles.days, { color: daysLeft <= 2 ? '#ef4444' : textSecondary }]}>
          {daysLeft === 0 ? 'Ends today!' : `${daysLeft}d left`}
        </Text>
      </View>
      <Text style={[gcStyles.sub, { color: textSecondary }]}>
        {members.length} players  •  {targetSessions} sessions each
      </Text>
      <View style={gcStyles.barRow}>
        <View style={[gcStyles.barBg, { borderColor: border }]}>
          <View style={[gcStyles.barFill, { width: `${pct * 100}%`, backgroundColor: accent }]} />
        </View>
        <Text style={[gcStyles.barCount, { color: textPrimary }]}>
          {totalSessions}/{groupTarget}
        </Text>
      </View>
      <View style={gcStyles.members}>
        {members.map(m => (
          <View key={m.id} style={[gcStyles.member, {
            backgroundColor: m.count >= targetSessions ? accent + '18' : 'transparent',
            borderColor: border,
          }]}>
            <Text style={[gcStyles.memberName, { color: textSecondary }]} numberOfLines={1}>
              {m.username.slice(0, 8)}
            </Text>
            <Text style={[gcStyles.memberCount, { color: m.count >= targetSessions ? accent : textPrimary }]}>
              {m.count}/{targetSessions}
            </Text>
          </View>
        ))}
      </View>
      {allDone && (
        <TouchableOpacity style={[gcStyles.doneBtn, { backgroundColor: accent }]} onPress={() => onComplete(challenge.id)}>
          <Text style={gcStyles.doneBtnText}>🏆 Mark Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const gcStyles = StyleSheet.create({
  card:        { borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title:       { fontSize: 15, fontWeight: '800' },
  days:        { fontSize: 12, fontWeight: '700' },
  sub:         { fontSize: 12, marginBottom: 10 },
  barRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  barBg:       { flex: 1, height: 10, borderRadius: 5, borderWidth: 1, overflow: 'hidden' },
  barFill:     { height: '100%', borderRadius: 5 },
  barCount:    { width: 48, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  members:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  member:      { borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  memberName:  { fontSize: 10, fontWeight: '600' },
  memberCount: { fontSize: 11, fontWeight: '800' },
  doneBtn:     { marginTop: 8, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});

// ─── Liquid-fill circle for overall goal progress ─────────────────────────────
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
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg, statsBg } = useTheme();
  const confettiRef  = useRef(null);
  const confettiRef2 = useRef(null);
  const [activities, setActivities]           = useState([]);
  const [streak, setStreak]                   = useState(0);
  const [goals, setGoals]                     = useState([]);
  const [goalText, setGoalText]               = useState('');
  const [deadlineDays, setDeadline]           = useState(0);
  const [viewerUri, setViewerUri]             = useState(null);
  const [activeFriends, setActiveFriends]     = useState([]);
  const [refreshing, setRefreshing]           = useState(false);
  const [presets, setPresets]                 = useState([]);
  const [challenges, setChallenges]           = useState([]);
  const [groupChallenges, setGroupChallenges] = useState([]);
  const [dailyChallenge, setDailyChallenge]   = useState(null);
  const [weekSummary, setWeekSummary]         = useState(null);
  const [showAllActs, setShowAllActs]         = useState(false);
  const reflection = REFLECTIONS[new Date().getDay() % REFLECTIONS.length];

  async function loadAll() {
    const today = todayDate();
    await Promise.all([
      api.get(`/activities?date=${today}`).then(r => { setActivities(r.data); setShowAllActs(false); }).catch(() => {}),
      api.get('/activities/streak').then(r => setStreak(r.data.streak)).catch(() => {}),
      api.get('/goals/active').then(r => setGoals(r.data)).catch(() => {}),
      api.get('/friends/active-today').then(r => setActiveFriends(r.data)).catch(() => {}),
      api.get('/presets').then(r => setPresets(r.data)).catch(() => {}),
      api.get('/challenges').then(r => setChallenges(r.data)).catch(() => {}),
      api.get('/activities/weekly-summary').then(r => setWeekSummary(r.data)).catch(() => {}),
    ]);
    api.get('/daily-challenge').then(r => setDailyChallenge(r.data)).catch(() => {});
    api.get('/group-challenges').then(r => setGroupChallenges(r.data)).catch(() => {});
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { loadAll(); }, []));

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

  async function logPreset(preset) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await api.post('/activities', {
        type: preset.type, duration: preset.duration,
        notes: preset.notes, date: todayDate(),
      });
      api.get(`/activities?date=${todayDate()}`).then(r => setActivities(r.data)).catch(() => {});
    } catch { Alert.alert('Error', 'Could not log activity.'); }
  }

  async function deletePreset(id) {
    try {
      await api.delete(`/presets/${id}`);
      setPresets(prev => prev.filter(p => p.id !== id));
    } catch {}
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
      const updatedGoals = goals.map(g => g.id === id ? data : g);
      setGoals(updatedGoals);
      const todayStr = todayDate();
      const todayGoalsUpdated = updatedGoals.filter(g => g.date === todayStr);
      const allDone = todayGoalsUpdated.length > 0 && todayGoalsUpdated.every(g => g.done);
      if (allDone && !goal?.done) {
        confettiRef.current?.start();
        confettiRef2.current?.start();
      }
    } catch {}
  }

  async function completeChallenge(id) {
    try {
      await api.patch(`/challenges/${id}/complete`);
      setChallenges(prev => prev.filter(c => c.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  async function completeGroupChallenge(id) {
    try {
      await api.patch(`/group-challenges/${id}/complete`);
      setGroupChallenges(prev => prev.filter(c => c.id !== id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        data={showAllActs ? activities : activities.slice(0, 5)}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} colors={[accent]} />
        }
        ListHeaderComponent={
          <>
            <ActiveStrip
              friends={activeFriends}
              onPress={(userId) => navigation.navigate('UserProfile', { userId })}
            />

            <PresetStrip presets={presets} onLog={logPreset} onDelete={deletePreset} />

            {/* Activity rings — replaces flat stat strip */}
            <View style={{ backgroundColor: statsBg }}>
              <ActivityRings
                streak={streak}
                sessionsToday={activities.length}
                goalsDone={doneCount}
                goalsTotal={goals.length}
                accent={accent}
                border={border}
                textSecondary={textSecondary}
                textPrimary={textPrimary}
              />
            </View>

            <View style={[styles.reflectionBox, { borderLeftColor: accent }]}>
              <Text style={[styles.reflectionText, { color: textSecondary }]}>{reflection}</Text>
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

              <View style={styles.presetRow}>
                {DEADLINE_PRESETS.map(p => (
                  <TouchableOpacity key={p.days} onPress={() => setDeadline(p.days)}
                    style={[styles.preset, { borderColor: accent, backgroundColor: deadlineDays === p.days ? accent : 'transparent' }]}>
                    <Text style={[styles.presetText, { color: deadlineDays === p.days ? '#fff' : accent }]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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

            {/* Daily challenge */}
            {dailyChallenge && (
              <View style={[styles.section, { paddingTop: 0 }]}>
                <Text style={[styles.sectionTitle, { color: accent }]}>Daily Challenge</Text>
                <DailyChallengeCard
                  challenge={dailyChallenge}
                  accent={accent}
                  cardBg={cardBg}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  border={border}
                />
              </View>
            )}

            {/* 1-on-1 challenges */}
            {challenges.length > 0 && (
              <View style={[styles.section, { paddingTop: 0 }]}>
                <Text style={[styles.sectionTitle, { color: accent }]}>Challenges ⚔️</Text>
                {challenges.map(c => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    onComplete={completeChallenge}
                    accent={accent}
                    cardBg={cardBg}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    border={border}
                  />
                ))}
              </View>
            )}

            {/* Group challenges */}
            <View style={[styles.section, { paddingTop: 0 }]}>
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: accent, marginBottom: 0 }]}>Group Challenges 🏆</Text>
                <TouchableOpacity onPress={() => navigation.navigate('NewGroupChallenge')}>
                  <Text style={[styles.sectionLink, { color: accent }]}>+ New</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 8 }} />
              {groupChallenges.map(c => (
                <GroupChallengeCard
                  key={c.id}
                  challenge={c}
                  onComplete={completeGroupChallenge}
                  accent={accent}
                  cardBg={cardBg}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  border={border}
                />
              ))}
              {groupChallenges.length === 0 && (
                <TouchableOpacity
                  style={[styles.emptyGC, { backgroundColor: cardBg, borderColor: border }]}
                  onPress={() => navigation.navigate('NewGroupChallenge')}>
                  <Text style={styles.emptyGCEmoji}>🏆</Text>
                  <Text style={[styles.emptyGCTitle, { color: textPrimary }]}>Start a Group Challenge</Text>
                  <Text style={[styles.emptyGCSub, { color: textSecondary }]}>Compete with up to 4 friends</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Weekly digest + Bingo row */}
            {weekSummary && (
              <TouchableOpacity
                style={[wStyles.card, { backgroundColor: cardBg, borderColor: border }]}
                onPress={() => navigation.navigate('WeeklyDigest')}
                activeOpacity={0.75}>
                <View style={wStyles.left}>
                  <Text style={[wStyles.label, { color: textSecondary }]}>This week</Text>
                  <Text style={[wStyles.sessions, { color: textPrimary }]}>
                    {weekSummary.thisWeek.totalSessions} session{weekSummary.thisWeek.totalSessions !== 1 ? 's' : ''}
                  </Text>
                  {weekSummary.thisWeek.topType ? (
                    <Text style={[wStyles.top, { color: textSecondary }]}>Top: {weekSummary.thisWeek.topType}</Text>
                  ) : null}
                </View>
                <View style={wStyles.right}>
                  <View style={[wStyles.streak, { backgroundColor: accent + '18' }]}>
                    <Text style={[wStyles.streakNum, { color: accent }]}>🔥 {weekSummary.streak}</Text>
                    <Text style={[wStyles.streakLbl, { color: textSecondary }]}>day streak</Text>
                  </View>
                  <Text style={[wStyles.cta, { color: accent }]}>See recap →</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Bingo button */}
            <TouchableOpacity
              style={[bingoStyles.btn, { backgroundColor: cardBg, borderColor: border }]}
              onPress={() => navigation.navigate('Bingo')}
              activeOpacity={0.75}>
              <Text style={bingoStyles.emoji}>🎲</Text>
              <View style={{ flex: 1 }}>
                <Text style={[bingoStyles.title, { color: textPrimary }]}>Activity Bingo</Text>
                <Text style={[bingoStyles.sub, { color: textSecondary }]}>Log 5 in a row this week</Text>
              </View>
              <Text style={[bingoStyles.arrow, { color: accent }]}>→</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle2, { color: accent }]}>Activities</Text>
          </>
        }
        ListFooterComponent={
          activities.length > 5 ? (
            <TouchableOpacity
              style={[styles.seeMoreBtn, { borderColor: border }]}
              onPress={() => setShowAllActs(v => !v)}>
              <Text style={[styles.seeMoreText, { color: accent }]}>
                {showAllActs ? 'Show less ↑' : `See ${activities.length - 5} more ↓`}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🫙</Text>
            <Text style={[styles.emptyText, { color: textPrimary }]}>No activities yet.</Text>
            <Text style={[styles.emptySubText, { color: textSecondary }]}>Tap below to log your first one!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <SwipeableCard
            onDelete={() => confirmDelete(item.id)}
            onEdit={() => navigation.navigate('LogActivity', { activity: item })}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              {item.imageBase64 ? (
                <TouchableOpacity onPress={() => setViewerUri(`data:image/jpeg;base64,${item.imageBase64}`)}>
                  <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.cardImage} resizeMode="cover" />
                </TouchableOpacity>
              ) : null}
              <View style={styles.cardBody}>
                <View style={[styles.iconBadge, { backgroundColor: accent + '18' }]}>
                  <Text style={styles.cardIcon}>{getActivityIcon(item.type)}</Text>
                </View>
                <View style={styles.cardLeft}>
                  <Text style={[styles.type, { color: textPrimary }]}>{item.type}</Text>
                  {item.duration ? <Text style={[styles.meta, { color: accent }]}>⏱ {item.duration} min</Text> : null}
                  {item.notes    ? <Text style={[styles.notes, { color: textSecondary }]}>📝 {item.notes}</Text> : null}
                </View>
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
          </SwipeableCard>
        )}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: accent }]} onPress={() => navigation.navigate('LogActivity')}>
        <Text style={styles.fabText}>+ Log Activity</Text>
      </TouchableOpacity>

      <ImageViewer uri={viewerUri} visible={!!viewerUri} onClose={() => setViewerUri(null)} />

      <ConfettiCannon ref={confettiRef} count={120} origin={{ x: -10, y: 0 }}
        autoStart={false} fadeOut explosionSpeed={350} fallSpeed={3000} />
      <ConfettiCannon ref={confettiRef2} count={120} origin={{ x: 420, y: 0 }}
        autoStart={false} fadeOut explosionSpeed={350} fallSpeed={3000} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        { padding: 18, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  greeting:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 2 },
  heading:       { fontSize: 22, fontWeight: '800', color: '#fff' },
  date:          { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  logoutBtn:     { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  logoutText:    { color: '#fff', fontSize: 13, fontWeight: '600' },
  list:          { paddingBottom: 100 },
  reflectionBox: { marginHorizontal: 16, marginVertical: 8, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  reflectionText:{ fontWeight: '500', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  section:       { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { fontWeight: '800', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, opacity: 0.55 },
  sectionLink:   { fontSize: 13, fontWeight: '800' },
  sectionTitle2: { fontWeight: '800', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 4, opacity: 0.55 },
  groupLabel:    { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  noGoals:       { fontSize: 13, fontStyle: 'italic', marginBottom: 10 },
  goalRow:       { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 10, marginBottom: 6, borderWidth: 1, gap: 10 },
  circleWrap:    { width: 30, alignItems: 'center' },
  goalText:      { fontSize: 14, fontWeight: '600' },
  goalTextDone:  { textDecorationLine: 'line-through', opacity: 0.5 },
  motivate:      { fontSize: 12, fontWeight: '700', marginTop: 2 },
  deadline:      { fontSize: 11, marginTop: 2, fontWeight: '600' },
  goalDelete:    { color: '#94a3b8', fontSize: 16, paddingLeft: 4 },
  presetRow:     { flexDirection: 'row', gap: 4, marginBottom: 6, flexWrap: 'wrap' },
  preset:        { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  presetText:    { fontSize: 10, fontWeight: '700' },
  goalInputRow:  { flexDirection: 'row', gap: 8, marginTop: 2 },
  goalInput:     { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14 },
  goalAddBtn:    { borderRadius: 12, width: 44, justifyContent: 'center', alignItems: 'center' },
  goalAddText:   { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  card:          { borderRadius: 16, marginHorizontal: 12, marginBottom: 8, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardImage:     { width: '100%', height: 180 },
  cardBody:      { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 6 },
  iconBadge:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardIcon:      { fontSize: 22 },
  cardLeft:      { flex: 1 },
  type:          { fontSize: 15, fontWeight: '700' },
  meta:          { fontSize: 13, marginTop: 2 },
  notes:         { fontSize: 13, marginTop: 2 },
  cardActions:   { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 14 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center' },
  actionText:    { fontSize: 14, fontWeight: '600' },
  emptyBox:      { alignItems: 'center', marginTop: 24, paddingHorizontal: 12 },
  emptyEmoji:    { fontSize: 48, marginBottom: 10 },
  emptyText:     { fontSize: 17, fontWeight: '700' },
  emptySubText:  { fontSize: 14, marginTop: 4 },
  emptyGC:       { borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', marginBottom: 4 },
  emptyGCEmoji:  { fontSize: 32, marginBottom: 6 },
  emptyGCTitle:  { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  emptyGCSub:    { fontSize: 12 },
  fab:           { position: 'absolute', bottom: 24, left: 20, right: 20, padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  fabText:       { color: '#fff', fontWeight: '800', fontSize: 16 },
  seeMoreBtn:    { marginHorizontal: 12, marginBottom: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  seeMoreText:   { fontWeight: '700', fontSize: 14 },
});

const wStyles = StyleSheet.create({
  card:       { marginHorizontal: 12, marginBottom: 8, borderRadius: 16, borderWidth: 1,
                padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left:       { flex: 1 },
  label:      { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, opacity: 0.55 },
  sessions:   { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  top:        { fontSize: 12, fontWeight: '600' },
  right:      { alignItems: 'flex-end', gap: 6 },
  streak:     { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  streakNum:  { fontSize: 14, fontWeight: '900' },
  streakLbl:  { fontSize: 10, fontWeight: '600' },
  cta:        { fontSize: 13, fontWeight: '800' },
});

const bingoStyles = StyleSheet.create({
  btn:   { marginHorizontal: 12, marginBottom: 8, borderRadius: 16, borderWidth: 1,
           padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28 },
  title: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  sub:   { fontSize: 12 },
  arrow: { fontSize: 20, fontWeight: '700' },
});
