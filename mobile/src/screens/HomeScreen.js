import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, Image, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { removeToken } from '../auth';
import { useTheme } from '../context/ThemeContext';

function todayDate() { return new Date().toISOString().split('T')[0]; }

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

export default function HomeScreen({ navigation, onLogout }) {
  const { pageBg, accent } = useTheme();
  const [activities, setActivities] = useState([]);
  const [streak, setStreak]         = useState(0);
  const [goals, setGoals]           = useState([]);
  const [goalText, setGoalText]     = useState('');
  const reflection = REFLECTIONS[new Date().getDay() % REFLECTIONS.length];

  useFocusEffect(useCallback(() => {
    const today = todayDate();
    api.get(`/activities?date=${today}`).then(r => setActivities(r.data)).catch(() => {});
    api.get('/activities/streak').then(r => setStreak(r.data.streak)).catch(() => {});
    api.get(`/goals?date=${today}`).then(r => setGoals(r.data)).catch(() => {});
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
    try {
      const { data } = await api.post('/goals', { text: goalText.trim(), date: todayDate() });
      setGoals(prev => [...prev, data]);
      setGoalText('');
    } catch {}
  }

  async function toggleGoal(id) {
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

  const doneCount = goals.filter(g => g.done).length;

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: pageBg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.heading}>Today's Log 📋</Text>
          <Text style={styles.date}>{todayDate()}</Text>
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
            <View style={[styles.statsRow, { borderBottomColor: '#bae6fd' }]}>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={[styles.statNum, { color: accent }]}>{streak}</Text>
                <Text style={styles.statLabel}>day streak</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>📋</Text>
                <Text style={[styles.statNum, { color: accent }]}>{activities.length}</Text>
                <Text style={styles.statLabel}>logged</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statEmoji}>✅</Text>
                <Text style={[styles.statNum, { color: accent }]}>{doneCount}/{goals.length}</Text>
                <Text style={styles.statLabel}>goals</Text>
              </View>
            </View>

            <View style={styles.reflectionBox}>
              <Text style={[styles.reflectionText, { color: accent }]}>{reflection}</Text>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accent }]}>Today's Goals 🎯</Text>
              {goals.map(g => (
                <View key={g.id} style={styles.goalRow}>
                  <TouchableOpacity onPress={() => toggleGoal(g.id)} style={styles.checkbox}>
                    <Text style={styles.checkboxText}>{g.done ? '✅' : '⬜'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.goalText, g.done && styles.goalTextDone]}>{g.text}</Text>
                  <TouchableOpacity onPress={() => deleteGoal(g.id)}>
                    <Text style={styles.goalDelete}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.goalInputRow}>
                <TextInput style={styles.goalInput} placeholder="Add a goal for today..."
                  value={goalText} onChangeText={setGoalText} placeholderTextColor="#94a3b8"
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
            <Text style={styles.emptyText}>No activities yet.</Text>
            <Text style={styles.emptySubText}>Tap below to log your first one!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.imageBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.cardImage} resizeMode="cover" />
            ) : null}
            <View style={styles.cardBody}>
              <View style={styles.cardLeft}>
                <Text style={styles.type}>{item.type}</Text>
                {item.duration ? <Text style={[styles.meta, { color: accent }]}>⏱ {item.duration} min</Text> : null}
                {item.notes    ? <Text style={styles.notes}>📝 {item.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                <Text style={styles.delete}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
                <Text style={styles.actionText}>{item.isLiked ? '❤️' : '🤍'} {item.likeCount}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}
                onPress={() => navigation.navigate('Comments', { activityId: item.id, activityType: item.type })}>
                <Text style={styles.actionText}>💬 {item.commentCount}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: accent }]} onPress={() => navigation.navigate('LogActivity')}>
        <Text style={styles.fabText}>+ Log Activity</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  header:        { padding: 24, paddingTop: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting:      { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 2 },
  heading:       { fontSize: 26, fontWeight: '800', color: '#fff' },
  date:          { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  logoutBtn:     { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 4 },
  logoutText:    { color: '#fff', fontSize: 13, fontWeight: '600' },
  list:          { paddingBottom: 100 },
  statsRow:      { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#e0f2fe', borderBottomWidth: 1 },
  statCard:      { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#bae6fd', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  statEmoji:     { fontSize: 18 },
  statNum:       { fontSize: 18, fontWeight: '900' },
  statLabel:     { fontSize: 10, color: '#64748b', fontWeight: '600' },
  reflectionBox: { margin: 12, marginBottom: 4, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#c7d2fe' },
  reflectionText:{ fontWeight: '600', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
  section:       { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  sectionTitle:  { fontWeight: '800', fontSize: 15, marginBottom: 10 },
  sectionTitle2: { fontWeight: '800', fontSize: 15, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },
  goalRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1.5, borderColor: '#bae6fd', gap: 10 },
  checkbox:      { width: 28 },
  checkboxText:  { fontSize: 20 },
  goalText:      { flex: 1, fontSize: 14, color: '#1e293b', fontWeight: '500' },
  goalTextDone:  { textDecorationLine: 'line-through', color: '#94a3b8' },
  goalDelete:    { color: '#94a3b8', fontSize: 16, paddingLeft: 4 },
  goalInputRow:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  goalInput:     { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#c7d2fe', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  goalAddBtn:    { borderRadius: 12, width: 44, justifyContent: 'center', alignItems: 'center' },
  goalAddText:   { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  card:          { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#bae6fd', overflow: 'hidden', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardImage:     { width: '100%', height: 180 },
  cardBody:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, paddingBottom: 8 },
  cardLeft:      { flex: 1 },
  type:          { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  meta:          { fontSize: 13, marginTop: 2 },
  notes:         { color: '#64748b', fontSize: 13, marginTop: 2 },
  delete:        { color: '#94a3b8', fontSize: 18, paddingLeft: 12 },
  cardActions:   { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 12, gap: 16 },
  actionBtn:     { flexDirection: 'row', alignItems: 'center' },
  actionText:    { fontSize: 14, color: '#64748b', fontWeight: '600' },
  emptyBox:      { alignItems: 'center', marginTop: 24, paddingHorizontal: 12 },
  emptyEmoji:    { fontSize: 48, marginBottom: 10 },
  emptyText:     { fontSize: 17, fontWeight: '700', color: '#334155' },
  emptySubText:  { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  fab:           { position: 'absolute', bottom: 24, left: 20, right: 20, padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  fabText:       { color: '#fff', fontWeight: '800', fontSize: 16 },
});
