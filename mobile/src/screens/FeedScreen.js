import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FeedScreen({ navigation }) {
  const { pageBg, accent } = useTheme();
  const [feed, setFeed]          = useState([]);
  const [refreshing, setRefresh] = useState(false);

  useFocusEffect(useCallback(() => { loadFeed(); }, []));

  async function loadFeed() {
    try { const { data } = await api.get('/friends/feed'); setFeed(data); } catch {}
  }

  async function refresh() { setRefresh(true); await loadFeed(); setRefresh(false); }

  async function toggleLike(id) {
    try {
      const { data } = await api.post(`/activities/${id}/like`);
      setFeed(prev => prev.map(a =>
        a.id === id ? { ...a, isLiked: data.liked, likeCount: data.liked ? a.likeCount + 1 : a.likeCount - 1 } : a
      ));
    } catch {}
  }

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <Text style={styles.heading}>Live Feed 📡</Text>
        <Text style={styles.sub}>What your friends are up to</Text>
      </View>

      <FlatList
        data={feed} keyExtractor={item => item.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>Add friends to see their activities here!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: accent + '22' }]}>
                <Text style={[styles.avatarLetter, { color: accent }]}>{item.username[0].toUpperCase()}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardUsername}>{item.username}</Text>
                <Text style={styles.cardTime}>{timeAgo(item.loggedAt)}</Text>
              </View>
              <Text style={styles.cardDate}>{item.date}</Text>
            </View>
            {item.imageBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.cardImage} resizeMode="cover" />
            ) : null}
            <View style={styles.cardBody}>
              <Text style={styles.actType}>{item.type}</Text>
              {item.duration ? <Text style={[styles.actMeta, { color: accent }]}>⏱ {item.duration} min</Text> : null}
              {item.notes    ? <Text style={styles.actNotes}>📝 {item.notes}</Text> : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { padding: 24, paddingTop: 56 },
  heading:      { fontSize: 26, fontWeight: '800', color: '#fff' },
  sub:          { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  list:         { padding: 12, paddingBottom: 32 },
  card:         { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, borderWidth: 1.5, borderColor: '#bae6fd', overflow: 'hidden', shadowColor: '#0ea5e9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10, gap: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 17, fontWeight: '800' },
  cardMeta:     { flex: 1 },
  cardUsername: { fontWeight: '700', fontSize: 15, color: '#1e293b' },
  cardTime:     { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  cardDate:     { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  cardImage:    { width: '100%', height: 200 },
  cardBody:     { padding: 14, paddingTop: 10, paddingBottom: 8 },
  actType:      { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  actMeta:      { fontSize: 13, marginTop: 3 },
  actNotes:     { color: '#64748b', fontSize: 13, marginTop: 3 },
  cardActions:  { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 20 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center' },
  actionText:   { fontSize: 15, color: '#64748b', fontWeight: '600' },
  emptyBox:     { alignItems: 'center', marginTop: 80 },
  emptyEmoji:   { fontSize: 56, marginBottom: 14 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: '#334155' },
  emptySub:     { color: '#94a3b8', marginTop: 6, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
});
