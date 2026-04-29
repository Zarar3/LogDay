import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

export default function FriendsScreen({ navigation }) {
  const { pageBg, accent } = useTheme();
  const [friends, setFriends]         = useState([]);
  const [requests, setRequests]       = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [username, setUsername]       = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  async function loadData() {
    const [f, r, l] = await Promise.all([
      api.get('/friends'), api.get('/friends/requests'), api.get('/friends/leaderboard'),
    ]);
    setFriends(f.data); setRequests(r.data); setLeaderboard(l.data);
  }

  async function sendRequest() {
    if (!username.trim()) return;
    try {
      await api.post('/friends/request', { username: username.trim() });
      Alert.alert('Sent! 🎉', `Friend request sent to ${username}`);
      setUsername('');
    } catch (e) {
      Alert.alert('Oops!', e.response?.data?.error || 'Could not send request');
    }
  }

  async function acceptRequest(id) { await api.post(`/friends/requests/${id}/accept`); loadData(); }
  async function rejectRequest(id) { await api.post(`/friends/requests/${id}/reject`); loadData(); }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <Text style={styles.heading}>Friends 👥</Text>
      </View>

      <FlatList
        data={[]} keyExtractor={() => ''} renderItem={null}
        ListHeaderComponent={
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accent }]}>Add a Friend 🔍</Text>
              <View style={styles.row}>
                <TextInput style={styles.input} placeholder="Search by username"
                  value={username} onChangeText={setUsername} autoCapitalize="none"
                  placeholderTextColor="#94a3b8" />
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: accent }]} onPress={sendRequest}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {requests.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>Pending Requests 📬</Text>
                {requests.map(r => (
                  <View key={r.id} style={styles.requestCard}>
                    <Text style={styles.requestName}>👤 {r.sender.username}</Text>
                    <TouchableOpacity onPress={() => acceptRequest(r.id)} style={[styles.acceptBtn, { backgroundColor: accent }]}>
                      <Text style={styles.acceptText}>✓ Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => rejectRequest(r.id)}>
                      <Text style={styles.rejectText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {leaderboard.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>Leaderboard 🏆</Text>
                {leaderboard.map((user, i) => (
                  <View key={user.id} style={[styles.leaderCard, user.isMe && { backgroundColor: '#eff6ff', borderColor: '#a5b4fc' }]}>
                    <Text style={styles.medal}>{medals[i] || `#${i + 1}`}</Text>
                    <Text style={styles.leaderName}>{user.isMe ? 'You' : user.username}</Text>
                    <Text style={[styles.leaderCount, { color: accent }]}>🔥 {user.streak} day streak</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: accent }]}>Your Friends</Text>
              {friends.length === 0
                ? <Text style={styles.empty}>No friends yet — add some! 👆</Text>
                : friends.map(item => (
                  <View key={item.id} style={styles.friendCard}>
                    <Text style={styles.friendName}>👤 {item.username}</Text>
                    <TouchableOpacity style={styles.msgBtn}
                      onPress={() => navigation.navigate('Conversation', { friend: item })}>
                      <Text style={styles.msgBtnText}>💬</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Compare', { friend: item })}>
                      <Text style={[styles.compareText, { color: accent }]}>Compare →</Text>
                    </TouchableOpacity>
                  </View>
                ))
              }
            </View>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { padding: 24, paddingTop: 56 },
  heading:      { fontSize: 26, fontWeight: '800', color: '#fff' },
  section:      { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontWeight: '800', fontSize: 15, marginBottom: 10 },
  row:          { flexDirection: 'row', gap: 8 },
  input:        { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#c7d2fe', borderRadius: 14, padding: 12, fontSize: 14, color: '#1e293b' },
  addBtn:       { borderRadius: 14, paddingHorizontal: 18, justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  addBtnText:   { color: '#fff', fontWeight: '700' },
  requestCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#bae6fd', gap: 10 },
  requestName:  { flex: 1, fontWeight: '600', color: '#1e293b' },
  acceptBtn:    { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  acceptText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectText:   { color: '#f87171', fontSize: 18, fontWeight: '700' },
  leaderCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#bae6fd', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  medal:        { fontSize: 24, marginRight: 12 },
  leaderName:   { flex: 1, fontWeight: '700', fontSize: 15, color: '#1e293b' },
  leaderCount:  { fontWeight: '700' },
  friendCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1.5, borderColor: '#bae6fd' },
  friendName:   { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  msgBtn:       { paddingHorizontal: 10 },
  msgBtnText:   { fontSize: 18 },
  compareText:  { fontWeight: '700' },
  empty:        { textAlign: 'center', color: '#94a3b8', marginTop: 20, fontSize: 14 },
});
