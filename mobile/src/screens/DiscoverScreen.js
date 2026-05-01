import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import ImageViewer from '../components/ImageViewer';
import LikeButton from '../components/LikeButton';
import EmptyState from '../components/EmptyState';
import { getActivityIcon } from '../utils/activityIcons';
import * as Haptics from 'expo-haptics';

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
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg } = useTheme();
  const [posts, setPosts]           = useState([]);
  const [refreshing, setRefresh]    = useState(false);
  const [loading, setLoading]       = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [viewerUri, setViewerUri]   = useState(null);
  const [query, setQuery]           = useState('');
  const [searchResults, setResults] = useState([]);
  const [searching, setSearching]   = useState(false);
  const publicOffset  = useRef(0);
  const freshingRef   = useRef(false);
  const debounceTimer = useRef(null);

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
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const liked = post.isLiked;
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, isLiked: !liked, likeCount: p.likeCount + (liked ? -1 : 1) } : p
    ));
    try {
      await api.post(`/activities/${id}/like`);
    } catch {
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, isLiked: liked, likeCount: p.likeCount + (liked ? 1 : -1) } : p
      ));
    }
  }

  function onQueryChange(text) {
    setQuery(text);
    clearTimeout(debounceTimer.current);
    if (!text.trim() || text.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/discover/search?q=${encodeURIComponent(text.trim())}`);
        setResults(data);
      } catch {}
      setSearching(false);
    }, 300);
  }

  const isSearching = query.trim().length >= 2;

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <Text style={styles.heading}>Feed 📡</Text>
        <Text style={styles.sub}>Friends & everyone's logs</Text>
      </View>

      <TextInput
        style={[styles.searchInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
        placeholder="Search people..."
        value={query}
        onChangeText={onQueryChange}
        placeholderTextColor={textSecondary}
        clearButtonMode="while-editing"
      />

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !searching
              ? <EmptyState emoji="🔍" title="No users found" subtitle="Try a different username." />
              : <ActivityIndicator style={{ marginTop: 40 }} color={accent} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userRow, { backgroundColor: cardBg, borderColor: border }]}
              onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })}>
              {item.avatarBase64 ? (
                <Image source={{ uri: `data:image/jpeg;base64,${item.avatarBase64}` }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: accent + '22' }]}>
                  <Text style={[styles.avatarLetter, { color: accent }]}>{item.username[0].toUpperCase()}</Text>
                </View>
              )}
              <Text style={[styles.searchUsername, { color: textPrimary }]}>{item.username}</Text>
              <Text style={[styles.searchArrow, { color: accent }]}>→</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
      <FlatList
        data={posts} keyExtractor={item => item.id} contentContainerStyle={styles.list}
        onEndReached={loadMore} onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} />}
        ListFooterComponent={loading && !refreshing ? <ActivityIndicator style={{ padding: 20 }} color={accent} /> : null}
        ListEmptyComponent={
          !loading && (
            <EmptyState
              emoji="📡"
              title="Nothing here yet"
              subtitle="Follow friends or wait for others to log activities — the feed will fill up fast."
            />
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
              <View style={[styles.iconBadge, { backgroundColor: accent + '18' }]}>
                <Text style={styles.typeIcon}>{getActivityIcon(item.type)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={[styles.actType, { color: textPrimary }]}>{item.type}</Text>
                  {item.isPR && (
                    <View style={styles.prBadge}>
                      <Text style={styles.prBadgeText}>🏆 PR</Text>
                    </View>
                  )}
                </View>
                {item.duration ? <Text style={[styles.actMeta, { color: accent }]}>⏱ {item.duration} min</Text> : null}
                {item.notes    ? <Text style={[styles.actNotes, { color: textSecondary }]}>📝 {item.notes}</Text> : null}
              </View>
            </View>
            <View style={styles.cardActions}>
              <LikeButton
                liked={item.isLiked}
                count={item.likeCount}
                onPress={() => toggleLike(item.id)}
              />
              <TouchableOpacity style={styles.actionBtn}
                onPress={() => navigation.navigate('Comments', { activityId: item.id, activityType: item.type })}>
                <Text style={[styles.actionText, { color: textSecondary }]}>💬 {item.commentCount}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      )}

      <ImageViewer uri={viewerUri} visible={!!viewerUri} onClose={() => setViewerUri(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  header:          { padding: 24, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  searchInput:     { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, margin: 12 },
  userRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginHorizontal: 12, marginBottom: 8, borderRadius: 14, borderWidth: 1.5 },
  avatar:          { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  searchUsername:  { flex: 1, fontSize: 15, fontWeight: '700' },
  searchArrow:     { fontSize: 16, fontWeight: '700' },
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
  cardBody:     { flexDirection: 'row', alignItems: 'center', padding: 14, paddingTop: 10, paddingBottom: 8 },
  iconBadge:    { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  typeIcon:     { fontSize: 26 },
  actType:      { fontSize: 16, fontWeight: '700' },
  prBadge:      { backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  prBadgeText:  { fontSize: 11, fontWeight: '800', color: '#92400e' },
  actMeta:      { fontSize: 13, marginTop: 3 },
  actNotes:     { fontSize: 13, marginTop: 3 },
  cardActions:  { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 14, gap: 20 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center' },
  actionText:   { fontSize: 15, fontWeight: '600' },
});
