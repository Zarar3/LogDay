import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

const PRIMARY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#10b981', '#0ea5e9',
  '#64748b', '#1e293b',
];

const SECONDARY_COLORS = [
  '#fffbeb', '#eff6ff', '#f0fdf4', '#fff1f2',
  '#faf5ff', '#f0f9ff', '#fff7ed', '#f8fafc',
  '#fdf4ff', '#f1f5f9',
];

const APP_BG_COLORS = [
  '#f0f9ff', '#f8fafc', '#fff7ed', '#f0fdf4',
  '#fdf4ff', '#fffbeb', '#fff1f2', '#f1f5f9',
];

const APP_ACCENT_COLORS = [
  '#4F46E5', '#0ea5e9', '#8b5cf6', '#ec4899',
  '#10b981', '#f97316', '#ef4444', '#f59e0b',
];

const DEFAULT_PRIMARY   = '#6366f1';
const DEFAULT_SECONDARY = '#fffbeb';

export default function ProfileScreen() {
  const { pageBg, accent: appAccent, updateTheme } = useTheme();
  const [user, setUser]           = useState(null);
  const [streak, setStreak]       = useState(0);
  const [topActivities, setTop]   = useState([]);
  const [totalCount, setTotal]    = useState(0);
  const [friendCount, setFriends] = useState(0);
  const [primary, setPrimary]     = useState(DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(DEFAULT_SECONDARY);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  async function loadAll() {
    try {
      const [meRes, streakRes, actsRes, friendsRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/activities/streak'),
        api.get('/activities'),
        api.get('/friends'),
      ]);

      const me = meRes.data;
      setUser(me);
      setStreak(streakRes.data.streak);
      setFriends(friendsRes.data.length);
      if (me.cardColor)          setPrimary(me.cardColor);
      if (me.cardSecondaryColor) setSecondary(me.cardSecondaryColor);

      const allActs = actsRes.data;
      setTotal(allActs.length);
      const counts = {};
      allActs.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
      setTop(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4));
    } catch {}
  }

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled) {
      try {
        const { data } = await api.patch('/auth/profile', { avatarBase64: result.assets[0].base64 });
        setUser(prev => ({ ...prev, avatarBase64: data.avatarBase64 }));
      } catch {
        Alert.alert('Error', 'Could not update photo. Try a smaller image.');
      }
    }
  }

  async function changePrimary(color) {
    setPrimary(color);
    try { await api.patch('/auth/profile', { cardColor: color }); } catch {}
  }

  async function changeSecondary(color) {
    setSecondary(color);
    try { await api.patch('/auth/profile', { cardSecondaryColor: color }); } catch {}
  }

  if (!user) return <View style={[styles.loading, { backgroundColor: pageBg }]}><Text style={styles.loadingText}>Loading...</Text></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Profile</Text>

      {/* Card */}
      <View style={[styles.card, { borderColor: primary, backgroundColor: secondary }]}>

        <View style={[styles.cardBanner, { backgroundColor: primary }]}>
          <Text style={styles.cardName}>{user.username}</Text>
          <Text style={styles.cardType}>🎮 Logger  •  🔥 {streak} day streak</Text>
        </View>

        <View style={[styles.avatarSection, { backgroundColor: secondary }]}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
            {user.avatarBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${user.avatarBase64}` }}
                style={[styles.avatar, { borderColor: primary }]}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { borderColor: primary }]}>
                <Text style={styles.avatarEmoji}>👤</Text>
                <Text style={[styles.avatarHint, { color: primary }]}>Tap to add photo</Text>
              </View>
            )}
            <View style={[styles.editBadge, { borderColor: primary }]}>
              <Text style={styles.editBadgeText}>✏️</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: primary }]} />

        <View style={[styles.abilitiesSection, { backgroundColor: secondary }]}>
          <Text style={[styles.abilitiesTitle, { color: primary }]}>Abilities</Text>
          {topActivities.length === 0 ? (
            <Text style={styles.noAbilities}>Log activities to unlock abilities!</Text>
          ) : (
            topActivities.map(([type, count]) => (
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
            <Text style={[styles.statVal, { color: primary }]}>{totalCount}</Text>
            <Text style={styles.statLbl}>Activities</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: primary }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: primary }]}>{streak}</Text>
            <Text style={styles.statLbl}>Day Streak</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: primary }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: primary }]}>{friendCount}</Text>
            <Text style={styles.statLbl}>Friends</Text>
          </View>
        </View>

        <View style={[styles.cardFooter, { backgroundColor: primary }]}>
          <Text style={styles.cardFooterText}>LogDay  •  {user.email}</Text>
        </View>
      </View>

      {/* Color pickers */}
      <View style={styles.colorSection}>
        <Text style={styles.colorLabel}>Banner & Accent Color</Text>
        <View style={styles.colorRow}>
          {PRIMARY_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => changePrimary(c)}
              style={[styles.swatch, { backgroundColor: c }, primary === c && styles.swatchSelected]}
            />
          ))}
        </View>

        <Text style={[styles.colorLabel, { marginTop: 16 }]}>Card Background</Text>
        <View style={styles.colorRow}>
          {SECONDARY_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => changeSecondary(c)}
              style={[
                styles.swatch,
                { backgroundColor: c, borderWidth: 1.5, borderColor: '#c7d2fe' },
                secondary === c && styles.swatchSelected,
              ]}
            />
          ))}
        </View>
      </View>

      {/* App-wide theme pickers */}
      <View style={styles.colorSection}>
        <Text style={styles.sectionDividerLabel}>App Theme</Text>

        <Text style={styles.colorLabel}>App Background</Text>
        <View style={styles.colorRow}>
          {APP_BG_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => updateTheme({ pageBg: c })}
              style={[
                styles.swatch,
                { backgroundColor: c, borderWidth: 1.5, borderColor: '#c7d2fe' },
                pageBg === c && styles.swatchSelected,
              ]}
            />
          ))}
        </View>

        <Text style={[styles.colorLabel, { marginTop: 16 }]}>App Accent Color</Text>
        <View style={styles.colorRow}>
          {APP_ACCENT_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => updateTheme({ accent: c })}
              style={[
                styles.swatch,
                { backgroundColor: c },
                appAccent === c && styles.swatchSelected,
              ]}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  content:          { padding: 20, paddingBottom: 48, alignItems: 'center' },
  loading:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { color: '#64748b' },
  screenTitle:      { fontSize: 26, fontWeight: '900', color: '#1e293b', marginBottom: 20,
                      alignSelf: 'flex-start' },

  card:             { width: '100%', maxWidth: 360, alignSelf: 'center', borderRadius: 20,
                      overflow: 'hidden', borderWidth: 3,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },

  cardBanner:       { padding: 18, paddingHorizontal: 20 },
  cardName:         { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  cardType:         { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  avatarSection:    { alignItems: 'center', paddingVertical: 22 },
  avatarWrap:       { position: 'relative' },
  avatar:           { width: 110, height: 110, borderRadius: 55, borderWidth: 3 },
  avatarPlaceholder:{ width: 110, height: 110, borderRadius: 55, borderWidth: 3,
                      justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.04)' },
  avatarEmoji:      { fontSize: 40 },
  avatarHint:       { fontSize: 10, fontWeight: '700', marginTop: 4 },
  editBadge:        { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#fff',
                      borderRadius: 12, padding: 3, borderWidth: 1.5 },
  editBadgeText:    { fontSize: 12 },

  divider:          { height: 2, opacity: 0.2 },

  abilitiesSection: { padding: 18 },
  abilitiesTitle:   { fontSize: 11, fontWeight: '800', letterSpacing: 1.5,
                      textTransform: 'uppercase', marginBottom: 14 },
  noAbilities:      { color: '#94a3b8', fontSize: 13, fontStyle: 'italic' },
  abilityRow:       { flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: 12 },
  abilityName:      { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  abilityCount:     { fontSize: 15, fontWeight: '800' },

  statsFooter:      { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  statItem:         { alignItems: 'center', flex: 1 },
  statVal:          { fontSize: 22, fontWeight: '900' },
  statLbl:          { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
  statDivider:      { width: 1.5, opacity: 0.25, marginVertical: 4 },

  cardFooter:       { paddingVertical: 10, alignItems: 'center' },
  cardFooterText:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  colorSection:        { marginTop: 24, width: '100%', maxWidth: 360, alignSelf: 'center' },
  sectionDividerLabel: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 14,
                         paddingTop: 8, borderTopWidth: 1.5, borderTopColor: '#e0f2fe' },
  colorLabel:          { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 10 },
  colorRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch:           { width: 34, height: 34, borderRadius: 17 },
  swatchSelected:   { transform: [{ scale: 1.25 }],
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
});
