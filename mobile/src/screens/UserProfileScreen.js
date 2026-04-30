import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import ImageViewer from '../components/ImageViewer';

const DEFAULT_PRIMARY   = '#6366f1';
const DEFAULT_SECONDARY = '#fffbeb';

export default function UserProfileScreen({ route, navigation }) {
  const { userId, username } = route.params;
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border } = useTheme();

  const [profile,    setProfile]    = useState(null);
  const [streak,     setStreak]     = useState(0);
  const [activities, setActivities] = useState([]);
  const [topActs,    setTopActs]    = useState([]);
  const [isFriend,   setIsFriend]   = useState(false);
  const [isMe,       setIsMe]       = useState(false);
  const [viewerUri,  setViewerUri]  = useState(null);

  useEffect(() => {
    loadAll();
  }, [userId]);

  async function loadAll() {
    try {
      const [profileRes, streakRes, actsRes, meRes, friendsRes] = await Promise.all([
        api.get(`/auth/user/${userId}`),
        api.get(`/activities/user/${userId}/streak`),
        api.get(`/activities/user/${userId}`),
        api.get('/auth/me'),
        api.get('/friends'),
      ]);

      setProfile(profileRes.data);
      setStreak(streakRes.data.streak);
      setIsMe(meRes.data.id === userId);
      setIsFriend(friendsRes.data.some(f => f.id === userId));

      const acts = actsRes.data;
      setActivities(acts.slice(0, 15));

      const counts = {};
      acts.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
      setTopActs(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4));
    } catch {}
  }

  async function sendFriendRequest() {
    try {
      await api.post('/friends/request', { username });
      Alert.alert('Sent! 🎉', `Friend request sent to ${username}`);
    } catch (e) {
      Alert.alert('Oops!', e.response?.data?.error || 'Could not send request');
    }
  }

  const primary   = profile?.cardColor          || DEFAULT_PRIMARY;
  const secondary = profile?.cardSecondaryColor || DEFAULT_SECONDARY;

  if (!profile) {
    return (
      <View style={[styles.loading, { backgroundColor: pageBg }]}>
        <Text style={[styles.loadingText, { color: textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={[styles.back, { color: accent }]}>← Back</Text>
      </TouchableOpacity>

      {/* Card */}
      <View style={[styles.card, { borderColor: primary, backgroundColor: secondary }]}>
        <View style={[styles.cardBanner, { backgroundColor: primary }]}>
          <Text style={styles.cardName}>{profile.username}</Text>
          <Text style={styles.cardType}>🎮 Logger  •  🔥 {streak} day streak</Text>
        </View>

        <View style={[styles.avatarSection, { backgroundColor: secondary }]}>
          {profile.avatarBase64 ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${profile.avatarBase64}` }}
              style={[styles.avatar, { borderColor: primary }]}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { borderColor: primary }]}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: primary }]} />

        <View style={[styles.abilitiesSection, { backgroundColor: secondary }]}>
          <Text style={[styles.abilitiesTitle, { color: primary }]}>Abilities</Text>
          {topActs.length === 0 ? (
            <Text style={styles.noAbilities}>No activities logged yet</Text>
          ) : (
            topActs.map(([type, count]) => (
              <View key={type} style={styles.abilityRow}>
                <Text style={styles.abilityName}>{type}</Text>
                <Text style={[styles.abilityCount, { color: primary }]}>{count}×</Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: primary }]} />

        <View style={[styles.statsFooter, { backgroundColor: secondary }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: primary }]}>{activities.length}</Text>
            <Text style={styles.statLbl}>Activities</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: primary }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: primary }]}>{streak}</Text>
            <Text style={styles.statLbl}>Day Streak</Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { backgroundColor: primary }]}>
          <Text style={styles.cardFooterText}>LogDay</Text>
        </View>
      </View>

      {/* Action buttons */}
      {!isMe && (
        <View style={styles.actions}>
          {isFriend ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: accent }]}
              onPress={() => navigation.navigate('Conversation', { friend: { id: userId, username } })}>
              <Text style={styles.actionBtnText}>💬 Message</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: accent }]}
              onPress={sendFriendRequest}>
              <Text style={styles.actionBtnText}>➕ Add Friend</Text>
            </TouchableOpacity>
          )}
          {isFriend && (
            <TouchableOpacity
              style={[styles.actionBtnOutline, { borderColor: accent }]}
              onPress={() => navigation.navigate('Compare', { friend: { id: userId, username } })}>
              <Text style={[styles.actionBtnOutlineText, { color: accent }]}>🔥 Compare Streaks</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recent activities */}
      {activities.length > 0 && (
        <View style={styles.feedSection}>
          <Text style={[styles.feedTitle, { color: accent }]}>Recent Activities</Text>
          {activities.map(a => (
            <View key={a.id} style={[styles.actCard, { backgroundColor: cardBg, borderColor: border }]}>
              {a.imageBase64 ? (
                <TouchableOpacity onPress={() => setViewerUri(`data:image/jpeg;base64,${a.imageBase64}`)}>
                  <Image source={{ uri: `data:image/jpeg;base64,${a.imageBase64}` }} style={styles.actImage} resizeMode="cover" />
                </TouchableOpacity>
              ) : null}
              <View style={styles.actBody}>
                <Text style={[styles.actType, { color: textPrimary }]}>{a.type}</Text>
                {a.duration ? <Text style={[styles.actMeta, { color: accent }]}>⏱ {a.duration} min</Text> : null}
                {a.notes    ? <Text style={[styles.actNotes, { color: textSecondary }]}>📝 {a.notes}</Text> : null}
                <Text style={[styles.actDate, { color: textSecondary }]}>{a.date}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <ImageViewer uri={viewerUri} visible={!!viewerUri} onClose={() => setViewerUri(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  content:          { padding: 20, paddingBottom: 48 },
  loading:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { fontSize: 15 },
  backBtn:          { marginTop: 52, marginBottom: 16 },
  back:             { fontSize: 16, fontWeight: '600' },

  card:             { borderRadius: 20, overflow: 'hidden', borderWidth: 3,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  cardBanner:       { padding: 18, paddingHorizontal: 20 },
  cardName:         { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  cardType:         { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  avatarSection:    { alignItems: 'center', paddingVertical: 22 },
  avatar:           { width: 110, height: 110, borderRadius: 55, borderWidth: 3 },
  avatarPlaceholder:{ width: 110, height: 110, borderRadius: 55, borderWidth: 3,
                      justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)' },
  avatarEmoji:      { fontSize: 40 },
  divider:          { height: 2, opacity: 0.2 },
  abilitiesSection: { padding: 18 },
  abilitiesTitle:   { fontSize: 11, fontWeight: '800', letterSpacing: 1.5,
                      textTransform: 'uppercase', marginBottom: 14 },
  noAbilities:      { color: '#94a3b8', fontSize: 13, fontStyle: 'italic' },
  abilityRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  abilityName:      { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  abilityCount:     { fontSize: 15, fontWeight: '800' },
  statsFooter:      { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  statItem:         { alignItems: 'center', flex: 1 },
  statVal:          { fontSize: 22, fontWeight: '900' },
  statLbl:          { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  statDivider:      { width: 1.5, opacity: 0.25, marginVertical: 4 },
  cardFooter:       { paddingVertical: 10, alignItems: 'center' },
  cardFooterText:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  actions:          { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 4 },
  actionBtn:        { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  actionBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  actionBtnOutline: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 2 },
  actionBtnOutlineText: { fontWeight: '700', fontSize: 15 },

  feedSection:      { marginTop: 24 },
  feedTitle:        { fontWeight: '800', fontSize: 16, marginBottom: 12 },
  actCard:          { borderRadius: 16, marginBottom: 12, borderWidth: 1.5, overflow: 'hidden' },
  actImage:         { width: '100%', height: 160 },
  actBody:          { padding: 14 },
  actType:          { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  actMeta:          { fontSize: 13, marginBottom: 2 },
  actNotes:         { fontSize: 13, marginBottom: 4 },
  actDate:          { fontSize: 12 },
});
