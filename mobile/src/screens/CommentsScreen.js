import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CommentsScreen({ route, navigation }) {
  const { activityId, activityType } = route.params;
  const { pageBg, accent } = useTheme();
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const listRef = useRef(null);

  useEffect(() => { loadComments(); }, []);

  async function loadComments() {
    try { const { data } = await api.get(`/activities/${activityId}/comments`); setComments(data); } catch {}
  }

  async function sendComment() {
    if (!text.trim()) return;
    try {
      const { data } = await api.post(`/activities/${activityId}/comments`, { text: text.trim() });
      setComments(prev => [...prev, data]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch { Alert.alert('Error', 'Could not post comment'); }
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: pageBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>💬 Comments</Text>
        <Text style={styles.sub}>{activityType}</Text>
      </View>

      <FlatList
        ref={listRef} data={comments} keyExtractor={item => item.id} contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySub}>Be the first to say something! 👋</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentCard}>
            <View style={styles.commentTop}>
              <Text style={styles.commentUser}>👤 {item.user.username}</Text>
              <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.commentText}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput style={styles.input} placeholder="Write a comment..." value={text}
          onChangeText={setText} placeholderTextColor="#94a3b8" multiline maxLength={300} />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: accent }, !text.trim() && styles.sendBtnDisabled]} onPress={sendComment}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { padding: 20, paddingTop: 56 },
  back:         { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  heading:      { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub:          { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  list:         { padding: 16, paddingBottom: 16 },
  commentCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#bae6fd', shadowColor: '#0ea5e9', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  commentTop:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentUser:  { fontWeight: '700', color: '#1e293b', fontSize: 13 },
  commentTime:  { color: '#94a3b8', fontSize: 12 },
  commentText:  { color: '#334155', fontSize: 14, lineHeight: 20 },
  emptyBox:     { alignItems: 'center', marginTop: 60 },
  emptyEmoji:   { fontSize: 48, marginBottom: 12 },
  emptyText:    { fontSize: 17, fontWeight: '700', color: '#334155' },
  emptySub:     { color: '#94a3b8', marginTop: 4 },
  inputRow:     { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0f2fe' },
  input:        { flex: 1, backgroundColor: '#f0f9ff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1.5, borderColor: '#c7d2fe', maxHeight: 100, color: '#1e293b' },
  sendBtn:      { borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
});
