import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

export default function ConversationScreen({ route, navigation }) {
  const { friend } = route.params;
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg } = useTheme();
  const [messages, setMessages] = useState([]);
  const [myId, setMyId]         = useState(null);
  const [text, setText]         = useState('');
  const listRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.get('/auth/me').then(r => setMyId(r.data.id)).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []);

  useFocusEffect(useCallback(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, []));

  async function loadMessages() {
    try { const { data } = await api.get(`/messages/${friend.id}`); setMessages(data); } catch {}
  }

  async function send() {
    if (!text.trim()) return;
    const draft = text.trim();
    setText('');
    try {
      const { data } = await api.post(`/messages/${friend.id}`, { text: draft });
      setMessages(prev => [...prev, data]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      Alert.alert('Error', 'Could not send message');
      setText(draft);
    }
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: pageBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={[styles.header, { backgroundColor: accent }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.avatarLetter}>{friend.username[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.heading}>{friend.username}</Text>
        </View>
      </View>

      <FlatList
        ref={listRef} data={messages} keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={[styles.emptyText, { color: textSecondary }]}>Say hi to {friend.username}!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.senderId === myId;
          return (
            <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
              <View style={[styles.bubble, isMe ? { ...styles.bubbleMe, backgroundColor: accent } : { ...styles.bubbleThem, backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[styles.bubbleText, { color: isMe ? '#fff' : textPrimary }]}>{item.text}</Text>
              </View>
              <Text style={[styles.bubbleTime, { color: textSecondary }, isMe && styles.bubbleTimeMe]}>{formatTime(item.createdAt)}</Text>
            </View>
          );
        }}
      />

      <View style={[styles.inputRow, { backgroundColor: cardBg, borderTopColor: border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
          placeholder={`Message ${friend.username}...`}
          value={text} onChangeText={setText} placeholderTextColor={textSecondary}
          multiline maxLength={500} />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: accent }, !text.trim() && styles.sendBtnDisabled]}
          onPress={send} disabled={!text.trim()}>
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { padding: 20, paddingTop: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back:           { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  headerCenter:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle:   { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarLetter:   { fontSize: 16, fontWeight: '800', color: '#fff' },
  heading:        { fontSize: 18, fontWeight: '800', color: '#fff' },
  list:           { padding: 16, paddingBottom: 8 },
  emptyBox:       { alignItems: 'center', marginTop: 60 },
  emptyEmoji:     { fontSize: 48, marginBottom: 10 },
  emptyText:      { fontSize: 15 },
  bubbleRow:      { marginBottom: 12, alignItems: 'flex-start' },
  bubbleRowMe:    { alignItems: 'flex-end' },
  bubble:         { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:       { borderBottomRightRadius: 4 },
  bubbleThem:     { borderWidth: 1.5, borderBottomLeftRadius: 4 },
  bubbleText:     { fontSize: 15 },
  bubbleTime:     { fontSize: 11, color: '#94a3b8', marginTop: 3, marginHorizontal: 4 },
  bubbleTimeMe:   { textAlign: 'right' },
  inputRow:       { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1 },
  input:          { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, borderWidth: 1.5, maxHeight: 100 },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  sendBtnDisabled:{ opacity: 0.35 },
  sendText:       { color: '#fff', fontSize: 20, fontWeight: '800' },
});
