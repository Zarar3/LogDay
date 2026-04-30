import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Modal, ScrollView, TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

const EMOJI_GRID = [
  '😀','😂','😍','🥰','😎','😅','🤣','😢',
  '😭','😡','🤯','😴','🥱','🤔','🫡','😈',
  '👍','👎','❤️','🔥','💪','👏','🙌','🤝',
  '🙏','✌️','🤞','💅','🤌','🫶','👀','💀',
  '🎉','🏆','💯','⭐','🚀','💡','🎯','💎',
  '🌟','✨','🎊','🥳','💔','😤','🤗','😇',
  '🫠','🤭','😏','🥹','😬','🫣','🤑','😪',
  '🐐','💥','🫐','🍕','🎵','📸','🏅','🔮',
];

export default function ConversationScreen({ route, navigation }) {
  const { friend } = route.params;
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg } = useTheme();
  const [messages, setMessages]     = useState([]);
  const [myId, setMyId]             = useState(null);
  const [text, setText]             = useState('');
  const [pickerMsgId, setPickerMsg] = useState(null);
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
    try {
      const { data } = await api.get(`/messages/${friend.id}`);
      setMessages(data);
    } catch {}
  }

  async function send() {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const draft = text.trim();
    setText('');
    try {
      const { data } = await api.post(`/messages/${friend.id}`, { text: draft });
      setMessages(prev => [...prev, { ...data, reactions: [] }]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      Alert.alert('Error', 'Could not send message');
      setText(draft);
    }
  }

  function openPicker(messageId) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPickerMsg(messageId);
  }

  async function toggleReaction(emoji) {
    if (!pickerMsgId) return;
    const msgId = pickerMsgId;
    setPickerMsg(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = m.reactions || [];
      const existing  = reactions.find(r => r.emoji === emoji && r.userId === myId);
      if (existing) {
        return { ...m, reactions: reactions.filter(r => r.id !== existing.id) };
      }
      return { ...m, reactions: [...reactions, { id: `tmp-${Date.now()}`, userId: myId, emoji }] };
    }));

    try {
      await api.post(`/messages/${msgId}/react`, { emoji });
      // Re-fetch to sync IDs
      const { data } = await api.get(`/messages/${friend.id}`);
      setMessages(data);
    } catch {}
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Group reactions: { emoji -> { count, isMine } }
  function groupReactions(reactions = []) {
    const map = {};
    reactions.forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, isMine: false };
      map[r.emoji].count++;
      if (r.userId === myId) map[r.emoji].isMine = true;
    });
    return Object.entries(map);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: pageBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>

      <View style={[styles.header, { backgroundColor: accent }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCenter} onPress={() => navigation.navigate('UserProfile', { userId: friend.id })} activeOpacity={0.75}>
          <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.avatarLetter}>{friend.username[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.heading}>{friend.username}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👋</Text>
            <Text style={[styles.emptyText, { color: textSecondary }]}>Say hi to {friend.username}!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe    = item.senderId === myId;
          const grouped = groupReactions(item.reactions);
          return (
            <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
              <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => openPicker(item.id)}
                delayLongPress={350}>
                <View style={[
                  styles.bubble,
                  isMe
                    ? { ...styles.bubbleMe, backgroundColor: accent }
                    : { ...styles.bubbleThem, backgroundColor: cardBg, borderColor: border },
                ]}>
                  <Text style={[styles.bubbleText, { color: isMe ? '#fff' : textPrimary }]}>
                    {item.text}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Reactions row */}
              {grouped.length > 0 && (
                <View style={[styles.reactRow, isMe && styles.reactRowMe]}>
                  {grouped.map(([emoji, { count, isMine }]) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={async () => {
                        setPickerMsg(item.id);
                        await toggleReaction(emoji);
                      }}
                      style={[
                        styles.reactPill,
                        { backgroundColor: isMine ? accent + '22' : cardBg, borderColor: isMine ? accent : border },
                      ]}>
                      <Text style={styles.reactEmoji}>{emoji}</Text>
                      {count > 1 && <Text style={[styles.reactCount, { color: isMine ? accent : textSecondary }]}>{count}</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.bubbleTime, { color: textSecondary }, isMe && styles.bubbleTimeMe]}>
                {formatTime(item.createdAt)}
              </Text>
            </View>
          );
        }}
      />

      {/* Emoji picker modal */}
      <Modal visible={!!pickerMsgId} transparent animationType="fade" onRequestClose={() => setPickerMsg(null)}>
        <TouchableWithoutFeedback onPress={() => setPickerMsg(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerSheet, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[styles.pickerTitle, { color: textSecondary }]}>React with an emoji</Text>
                <ScrollView contentContainerStyle={styles.pickerGrid}>
                  {EMOJI_GRID.map(e => (
                    <TouchableOpacity key={e} style={styles.pickerCell} onPress={() => toggleReaction(e)}>
                      <Text style={styles.pickerEmoji}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <View style={[styles.inputRow, { backgroundColor: cardBg, borderTopColor: border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
          placeholder={`Message ${friend.username}...`}
          value={text} onChangeText={setText} placeholderTextColor={textSecondary}
          multiline maxLength={500} />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: accent }, !text.trim() && styles.sendBtnDisabled]}
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
  bubbleRow:      { marginBottom: 14, alignItems: 'flex-start' },
  bubbleRowMe:    { alignItems: 'flex-end' },
  bubble:         { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:       { borderBottomRightRadius: 4 },
  bubbleThem:     { borderWidth: 1.5, borderBottomLeftRadius: 4 },
  bubbleText:     { fontSize: 15 },
  bubbleTime:     { fontSize: 11, color: '#94a3b8', marginTop: 3, marginHorizontal: 4 },
  bubbleTimeMe:   { textAlign: 'right' },
  reactRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, marginLeft: 4 },
  reactRowMe:     { justifyContent: 'flex-end', marginLeft: 0, marginRight: 4 },
  reactPill:      { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 12,
                    borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  reactEmoji:     { fontSize: 14 },
  reactCount:     { fontSize: 11, fontWeight: '700' },
  inputRow:       { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1 },
  input:          { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
                    fontSize: 15, borderWidth: 1.5, maxHeight: 100 },
  sendBtn:        { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  sendBtnDisabled:{ opacity: 0.35 },
  sendText:       { color: '#fff', fontSize: 20, fontWeight: '800' },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1,
                    padding: 20, paddingBottom: 36, maxHeight: 340 },
  pickerTitle:    { fontSize: 12, fontWeight: '700', textTransform: 'uppercase',
                    letterSpacing: 0.8, marginBottom: 14, textAlign: 'center' },
  pickerGrid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4 },
  pickerCell:     { width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
                    borderRadius: 10 },
  pickerEmoji:    { fontSize: 26 },
});
