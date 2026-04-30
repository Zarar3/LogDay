import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import ImageViewer from '../components/ImageViewer';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PAGE = 20;

export default function DiscoverScreen({ navigation }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border } = useTheme();
  const [posts, setPosts]         = useState([]);
  const [refreshing, setRefresh]  = useState(false);
  const [loading, setLoading]     = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [viewerUri, setViewerUri] = useState(null);
  const publicOffset  = useRef(0);
  const freshingRef   = useRef(false);

  useFocusEffect(useCallback(() => { loadFresh(); }, []));

  async function loadFresh() {
    freshingRef.current = true;
    publicOffset.current = 0;
    setHasMore(true);
    setLoading(true);
    try {
      const { data } = await api.get(`/friends/unified-feed?limit=${PAGE}&offset=0`);
      setPosts(data.posts);
      publicOffset.current = PAGE;
      setHasMore(data.hasMore);
    } catch {}
    setLoading(false);
    freshingRef.current = false;
  }

  async function loadMore() {
    if (freshingRef.current || loading || !hasMore) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/friends/unified-feed?limit=${PAGE}&offset=${publicOffset.current}`);
      setPosts(prev => [...prev, ...data.posts]);
      publicOffset.current += PAGE;
      setHasMore(data.hasMore);
    } catch {}
    setLoading(false);
  }

  async function refresh() { setRefresh(true); await loadFresh(); setRefresh(false); }

  async function toggleLike(id) {
    try {
      const { data } = await api.post(`/activities/${id}/like`);
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, isLiked: data.liked, likeCount: data.liked ? p.likeCount + 1 : p.likeCount - 1 } : p
      ));
    } catch {}
  }

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <Text style={styles.heading}>Feed 📡</Text>
        <Text style={styles.sub}>Friends & everyone's logs</Text>
      </View>

      <FlatList
        data={posts} keyExtractor={item => item.id} contentContainerStyle={styles.list}
        onEndReached={loadMore} onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} />}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator style={{ padding: 20 }} color={accent} /> : null}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🌍</Text>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>Nothing here yet</Text>
              <Text style={[styles.emptySub, { color: textSecondary }]}>Check back once more people sign up!</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <TouchableOpacity style={styles.cardHeader}
              onPress={() => navigation.navigate('UserProfile', { userId: item.userId, username: item.username })}>
              <View style={[styles.avatarCircle, { backgroundColor: accent + '22' }]}>
                <Text style={[styles.avatarLetter, { color: accent }]}>{item.username[0].toUpperCase()}</Text>
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardUsername, { color: textPrimary }]}>{item.username}</Text>
                <Text style={[styles.cardTime, { color: textSecondary }]}>{timeAgo(item.loggedAt)}</Text>
              </View>
              <Text style={[styles.cardDate, { color: textSecondary }]}>{item.date}</Text>
            </TouchableOpacity>
            {item.imageBase64 ? (
              <TouchableOpacity onPress={() => setViewerUri(`data:image/jpeg;base64,${item.imageBase64}`)}>
                <Image source={{ uri: `data:image/jpeg;base64,${item.imageBase64}` }} style={styles.cardImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : null}
            <View style={styles.cardBody}>
              <Text style={[styles.actType, { color: textPrimary }]}>{item.type}</Text>
              {item.duration ? <Text style={[styles.actMeta, { color: accent }]}>⏱ {item.duration} min</Text> : null}
              {item.notes    ? <Text style={[styles.actNotes, { color: textSecondary }]}>📝 {item.notes}</Text> : null}
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

      <ImageViewer uri={viewerUri} visible={!!viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { padding: 24, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heading:      { fontSize: 26, fontWeight: '800', color: '#fff' },
  sub:          { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  list:         { padding: 12, paddingBottom: 32 },
  card:         { borderRadius: 20, marginBottom: 14, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10, gap: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 17, fontWeight: '800' },
  cardMeta:     { flex: 1 },
  cardUsername: { fontWeight: '700', fontSize: 15 },
  cardTime:     { fontSize: 12, marginTop: 1 },
  cardDate:     { fontSize: 12, fontWeight: '600' },
  cardImage:    { width: '100%', height: 200 },
  cardBody:     { padding: 14, paddingTop: 10, paddingBottom: 8 },
  actType:      { fontSize: 16, fontWeight: '700' },
  actMeta:      { fontSize: 13, marginTop: 3 },
  actNotes:     { fontSize: 13, marginTop: 3 },
  cardActions:  { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 20 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center' },
  actionText:   { fontSize: 15, fontWeight: '600' },
  emptyBox:     { alignItems: 'center', marginTop: 80 },
  emptyEmoji:   { fontSize: 56, marginBottom: 14 },
  emptyTitle:   { fontSize: 18, fontWeight: '700' },
  emptySub:     { marginTop: 6, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
});
