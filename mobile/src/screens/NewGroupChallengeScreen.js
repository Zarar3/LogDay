import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

const ACTIVITY_TYPES = [
  { label: '🏃 Running',    value: 'Running' },
  { label: '🚶 Walking',    value: 'Walking' },
  { label: '🏋️ Gym',        value: 'Gym' },
  { label: '📚 Reading',    value: 'Reading' },
  { label: '🍳 Cooking',    value: 'Cooking' },
  { label: '🎮 Gaming',     value: 'Gaming' },
  { label: '📖 Studying',   value: 'Studying' },
  { label: '🧘 Meditation', value: 'Meditation' },
  { label: '🎵 Music',      value: 'Music' },
  { label: '🎨 Art',        value: 'Art' },
  { label: '🚴 Cycling',    value: 'Cycling' },
  { label: '🏊 Swimming',   value: 'Swimming' },
  { label: '🤸 Yoga',       value: 'Yoga' },
  { label: '🥾 Hiking',     value: 'Hiking' },
];

const DEADLINE_OPTIONS = [
  { label: '3 days',  days: 3 },
  { label: '1 week',  days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export default function NewGroupChallengeScreen({ navigation }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg } = useTheme();
  const [friends,        setFriends]        = useState([]);
  const [selectedIds,    setSelectedIds]    = useState([]);
  const [activityType,   setActivityType]   = useState('');
  const [targetSessions, setTargetSessions] = useState('');
  const [deadlineDays,   setDeadlineDays]   = useState(7);
  const [loading,        setLoading]        = useState(false);

  useEffect(() => {
    api.get('/friends').then(r => setFriends(r.data)).catch(() => {});
  }, []);

  function toggleFriend(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }

  async function handleCreate() {
    if (selectedIds.length === 0) return Alert.alert('Missing', 'Select at least 1 friend');
    if (!activityType)            return Alert.alert('Missing', 'Pick an activity type');
    const sessions = parseInt(targetSessions);
    if (!sessions || sessions < 1) return Alert.alert('Missing', 'Enter a valid session count');

    setLoading(true);
    try {
      await api.post('/group-challenges', {
        participantIds: selectedIds,
        activityType,
        targetSessions: sessions,
        deadline: addDays(deadlineDays),
      });
      Alert.alert('Group Challenge Created! 🏆', `${selectedIds.length + 1} players. Each needs ${sessions} ${activityType} sessions in ${deadlineDays} days.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not create challenge');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.back, { color: accent }]}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.heading, { color: textPrimary }]}>🏆 Group Challenge</Text>
      <Text style={[styles.sub, { color: textSecondary }]}>Pick up to 4 friends — everyone competes together</Text>

      <Text style={[styles.label, { color: textPrimary }]}>
        Select Friends{' '}
        <Text style={{ color: textSecondary, fontWeight: '500' }}>({selectedIds.length}/4)</Text>
      </Text>
      {friends.length === 0 ? (
        <Text style={[styles.hint, { color: textSecondary }]}>No friends yet — add some first!</Text>
      ) : (
        <View style={styles.chips}>
          {friends.map(f => {
            const selected = selectedIds.includes(f.id);
            const disabled = !selected && selectedIds.length >= 4;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.chip,
                  { backgroundColor: cardBg, borderColor: border },
                  selected  && { backgroundColor: accent, borderColor: accent },
                  disabled  && { opacity: 0.4 },
                ]}
                onPress={() => toggleFriend(f.id)}
                disabled={disabled}>
                <Text style={[styles.chipText, { color: textSecondary }, selected && { color: '#fff' }]}>
                  {f.username}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={[styles.label, { color: textPrimary }]}>Activity Type</Text>
      <View style={styles.chips}>
        {ACTIVITY_TYPES.map(a => (
          <TouchableOpacity
            key={a.value}
            style={[
              styles.chip,
              { backgroundColor: cardBg, borderColor: border },
              activityType === a.value && { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={() => setActivityType(a.value)}>
            <Text style={[styles.chipText, { color: textSecondary }, activityType === a.value && { color: '#fff' }]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: textPrimary }]}>Sessions per person</Text>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
        placeholder="e.g. 5"
        value={targetSessions}
        onChangeText={v => { if (v === '' || /^\d+$/.test(v)) setTargetSessions(v); }}
        keyboardType="number-pad"
        placeholderTextColor={textSecondary}
      />
      <Text style={[styles.hint, { color: textSecondary }]}>Everyone must hit this many sessions to win</Text>

      <Text style={[styles.label, { color: textPrimary }]}>Deadline</Text>
      <View style={styles.pills}>
        {DEADLINE_OPTIONS.map(o => (
          <TouchableOpacity
            key={o.days}
            style={[
              styles.pill,
              { backgroundColor: cardBg, borderColor: border },
              deadlineDays === o.days && { backgroundColor: accent, borderColor: accent },
            ]}
            onPress={() => setDeadlineDays(o.days)}>
            <Text style={[styles.pillText, { color: textSecondary }, deadlineDays === o.days && { color: '#fff' }]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.hint, { color: textSecondary }]}>Ends on {addDays(deadlineDays)}</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: accent, opacity: loading ? 0.6 : 1 }]}
        onPress={handleCreate}
        disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Creating…' : '🏆 Create Group Challenge'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  content:    { padding: 24, paddingBottom: 60 },
  backBtn:    { marginTop: 52, marginBottom: 16 },
  back:       { fontSize: 16, fontWeight: '600' },
  heading:    { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  sub:        { fontSize: 14, marginBottom: 28 },
  label:      { fontWeight: '700', marginBottom: 10, marginTop: 24, fontSize: 15 },
  hint:       { fontSize: 12, marginTop: 6, opacity: 0.7 },
  chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText:   { fontWeight: '600', fontSize: 13 },
  input:      { borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 15 },
  pills:      { flexDirection: 'row', gap: 10 },
  pill:       { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  pillText:   { fontWeight: '700', fontSize: 13 },
  button:     { marginTop: 36, padding: 18, borderRadius: 16, alignItems: 'center',
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
