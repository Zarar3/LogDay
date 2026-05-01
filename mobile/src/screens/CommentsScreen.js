import React, { useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import LikeButton from '../components/LikeButton';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
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

function Avatar({ username, accent, size = 30 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: accent + '22', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: accent, fontWeight: '800', fontSize: size * 0.46 }}>{username[0].toUpperCase()}</Text>
    </View>
  );
}

export default function CommentsScreen({ route, navigation }) {
  const { activityId, activityType } = route.params;
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg } = useTheme();
  const [comments, setComments] = useState([]);
  const [text, setText]         = useState('');
  const [replyTo, setReplyTo]   = useState(null); // { id, username }
  const listRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { loadComments(); }, []);

  async function loadComments() {
    try {
      const { data } = await api.get(`/activities/${activityId}/comments`);
      setComments(data);
    } catch {}
  }

  async function send() {
    if (!text.trim()) return;
    try {
      const { data } = await api.post(`/activities/${activityId}/comments`, {
        text: text.trim(),
        parentId: replyTo?.id ?? null,
      });
      if (replyTo) {
        setComments(prev => prev.map(c =>
          c.id === replyTo.id ? { ...c, replies: [...(c.replies || []), data] } : c
        ));
      } else {
        setComments(prev => [...prev, data]);
      }
      setText('');
      setReplyTo(null);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {}
  }

  async function toggleCommentLike(commentId, parentId) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { data } = await api.post(`/activities/${activityId}/comments/${commentId}/like`);
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, isLiked: data.liked, likeCount: data.liked ? c.likeCount + 1 : c.likeCount - 1 };
        }
        if (c.id === parentId) {
          return {
            ...c, replies: c.replies.map(r =>
              r.id === commentId
                ? { ...r, isLiked: data.liked, likeCount: data.liked ? r.likeCount + 1 : r.likeCount - 1 }
                : r
            ),
          };
        }
        return c;
      }));
    } catch {}
  }

  function startReply(comment) {
    setReplyTo({ id: comment.id, username: comment.user.username });
    inputRef.current?.focus();
  }

  function renderReply(r, parentId) {
    return (
      <View key={r.id} style={[styles.replyRow, { borderLeftColor: accent + '44' }]}>
        <Avatar username={r.user.username} accent={accent} size={24} />
        <View style={{ flex: 1 }}>
          <View style={styles.metaRow}>
            <Text style={[styles.username, { color: textPrimary, fontSize: 12 }]}>{r.user.username}</Text>
            <Text style={[styles.time, { color: textSecondary }]}>{timeAgo(r.createdAt)}</Text>
          </View>
          <Text style={[styles.commentText, { color: textPrimary, fontSize: 13 }]}>{r.text}</Text>
          <LikeButton
            liked={r.isLiked}
            count={r.likeCount}
            onPress={() => toggleCommentLike(r.id, parentId)}
            size={13}
          />
        </View>
      </View>
    );
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
        <Text style={styles.heading}>💬 Comments</Text>
        <Text style={styles.sub}>{activityType}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={comments}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={[styles.emptyText, { color: textPrimary }]}>No comments yet</Text>
            <Text style={[styles.emptySub, { color: textSecondary }]}>Be the first to say something! 👋</Text>
          </View>
        }
        renderItem={({ item: c }) => (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.cardTop}>
              <Avatar username={c.user.username} accent={accent} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={styles.metaRow}>
                  <Text style={[styles.username, { color: textPrimary }]}>{c.user.username}</Text>
                  <Text style={[styles.time, { color: textSecondary }]}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={[styles.commentText, { color: textPrimary }]}>{c.text}</Text>
              </View>
            </View>

            <View style={[styles.actions, { borderTopColor: border }]}>
              <LikeButton
                liked={c.isLiked}
                count={c.likeCount}
                onPress={() => toggleCommentLike(c.id, null)}
                size={13}
              />
              <TouchableOpacity onPress={() => startReply(c)} style={styles.replyBtn}>
                <Text style={[styles.replyTxt, { color: textSecondary }]}>↩ Reply</Text>
              </TouchableOpacity>
            </View>

            {c.replies?.length > 0 && (
              <View style={[styles.repliesWrap, { borderTopColor: border }]}>
                {c.replies.map(r => renderReply(r, c.id))}
              </View>
            )}
          </View>
        )}
      />

      <View style={[styles.inputWrap, { backgroundColor: cardBg, borderTopColor: border }]}>
        {replyTo && (
          <View style={[styles.replyBanner, { backgroundColor: accent + '18' }]}>
            <Text style={[styles.replyBannerTxt, { color: accent }]}>↩ Replying to @{replyTo.username}</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Text style={[styles.replyBannerX, { color: accent }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
            placeholder={replyTo ? `Reply to ${replyTo.username}...` : 'Write a comment...'}
            value={text}
            onChangeText={setText}
            placeholderTextColor={textSecondary}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: accent }, !text.trim() && styles.sendBtnOff]}
            onPress={send}>
            <Text style={styles.sendTxt}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  header:         { padding: 20, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back:           { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  heading:        { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub:            { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 },
  list:           { padding: 16, paddingBottom: 8 },

  card:           { borderRadius: 18, marginBottom: 12, borderWidth: 1,
                    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTop:        { flexDirection: 'row', padding: 14, paddingBottom: 10 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  username:       { fontWeight: '700', fontSize: 13 },
  time:           { fontSize: 11 },
  commentText:    { fontSize: 14, lineHeight: 20 },

  actions:        { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1 },
  likeBtn:        { flexDirection: 'row', alignItems: 'center' },
  likeTxt:        { fontSize: 13, fontWeight: '600' },
  replyBtn:       {},
  replyTxt:       { fontSize: 13, fontWeight: '600' },

  repliesWrap:    { paddingHorizontal: 14, paddingBottom: 12, paddingTop: 8, gap: 12, borderTopWidth: 1 },
  replyRow:       { flexDirection: 'row', gap: 10, paddingLeft: 10, borderLeftWidth: 2 },

  emptyBox:       { alignItems: 'center', marginTop: 60 },
  emptyEmoji:     { fontSize: 48, marginBottom: 12 },
  emptyText:      { fontSize: 17, fontWeight: '700' },
  emptySub:       { marginTop: 4, fontSize: 13 },

  inputWrap:      { borderTopWidth: 1 },
  replyBanner:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  replyBannerTxt: { fontSize: 13, fontWeight: '600' },
  replyBannerX:   { fontSize: 14, fontWeight: '700', paddingLeft: 12 },
  inputRow:       { flexDirection: 'row', padding: 12, gap: 8 },
  input:          { flex: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, maxHeight: 100 },
  sendBtn:        { borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  sendBtnOff:     { opacity: 0.35 },
  sendTxt:        { color: '#fff', fontWeight: '700', fontSize: 14 },
});
