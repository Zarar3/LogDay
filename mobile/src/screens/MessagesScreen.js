import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import EmptyState from '../components/EmptyState';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesScreen({ navigation }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border } = useTheme();
  const [convos, setConvos]      = useState([]);
  const [refreshing, setRefresh] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try { const { data } = await api.get('/messages'); setConvos(data); } catch {}
  }

  async function refresh() { setRefresh(true); await load(); setRefresh(false); }

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <Text style={styles.heading}>Messages 💬</Text>
      </View>

      <FlatList
        data={convos} keyExtractor={item => item.user.id} contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={accent} />}
        ListEmptyComponent={
          <EmptyState
            emoji="💬"
            title="No conversations yet"
            subtitle="Message a friend to get started."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { backgroundColor: cardBg, borderBottomColor: border }]}
            onPress={() => navigation.navigate('Conversation', { friend: item.user })}>
            <TouchableOpacity
              onPress={() => navigation.navigate('UserProfile', { userId: item.user.id })}
              activeOpacity={0.7}>
              <View style={[styles.avatarCircle, { backgroundColor: accent + '22' }]}>
                <Text style={[styles.avatarLetter, { color: accent }]}>{item.user.username[0].toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowName, { color: textPrimary }]}>{item.user.username}</Text>
                <Text style={[styles.rowTime, { color: textSecondary }]}>{timeAgo(item.lastMessage.createdAt)}</Text>
              </View>
              <Text style={[styles.rowPreview, { color: textSecondary }]} numberOfLines={1}>
                {item.lastMessage.senderId === item.user.id ? '' : 'You: '}{item.lastMessage.text}
              </Text>
            </View>
            {item.unread > 0 && (
              <View style={[styles.badge, { backgroundColor: accent }]}>
                <Text style={styles.badgeText}>{item.unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { padding: 24, paddingTop: 56 },
  heading:      { fontSize: 26, fontWeight: '800', color: '#fff' },
  list:         { paddingVertical: 8 },
  row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '800' },
  rowBody:      { flex: 1 },
  rowTop:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  rowName:      { fontWeight: '700', fontSize: 15 },
  rowTime:      { fontSize: 12 },
  rowPreview:   { fontSize: 13 },
  badge:        { borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText:    { color: '#fff', fontSize: 12, fontWeight: '700' },
});
