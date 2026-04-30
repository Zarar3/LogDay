import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

// ─── HSL color utilities ─────────────────────────────────────────────────────

function safeHex(v) {
  if (!v || typeof v !== 'string') return '#6366F1';
  let h = v.trim();
  if (!h.startsWith('#')) h = '#' + h;
  if (/^#[0-9A-Fa-f]{3}$/.test(h))
    h = '#' + h[1]+h[1] + h[2]+h[2] + h[3]+h[3];
  return /^#[0-9A-Fa-f]{6}$/.test(h) ? h.toUpperCase() : '#6366F1';
}

function hexToHsl(hex) {
  const h = safeHex(hex).replace('#', '');
  const r = parseInt(h.slice(0,2), 16) / 255;
  const g = parseInt(h.slice(2,4), 16) / 255;
  const b = parseInt(h.slice(4,6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hu = 0, sa = 0;
  const li = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sa = li > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hu = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hu = ((b - r) / d + 2) / 6; break;
      case b: hu = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(hu * 360), Math.round(sa * 100), Math.round(li * 100)];
}

function hslToHex(h, s, l) {
  const sv = s / 100, lv = l / 100;
  const k = n => (n + h / 30) % 12;
  const a = sv * Math.min(lv, 1 - lv);
  const f = n => Math.round((lv - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255);
  return '#' + [f(0), f(8), f(4)].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ─── ColorSlider: single draggable track ─────────────────────────────────────

function ColorSlider({ numSegs, getSegColor, ratio, onRatio }) {
  const trackRef = useRef(null);
  const layout   = useRef({ x: 0, width: 280 });

  function handleMove(pageX) {
    const r = (pageX - layout.current.x) / layout.current.width;
    onRatio(Math.max(0, Math.min(1, r)));
  }

  return (
    <View
      ref={trackRef}
      style={cpStyles.sliderOuter}
      onLayout={() => {
        // measure absolute screen position so pageX calculations are correct
        trackRef.current?.measure((_x, _y, w, _h, pageX) => {
          layout.current = { x: pageX, width: w };
        });
      }}
      onStartShouldSetResponderCapture={() => true}
      onMoveShouldSetResponderCapture={() => true}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => handleMove(e.nativeEvent.pageX)}
      onResponderMove={(e)  => handleMove(e.nativeEvent.pageX)}
    >
      <View style={cpStyles.trackInner}>
        {Array.from({ length: numSegs }, (_, i) => (
          <View key={i} style={[cpStyles.seg, { backgroundColor: getSegColor(i / (numSegs - 1)) }]} />
        ))}
      </View>
      <View style={[cpStyles.thumb, { left: `${ratio * 100}%`, marginLeft: -10 }]} />
    </View>
  );
}

// ─── ColorPicker: H/S/L sliders + preview ────────────────────────────────────

function ColorPicker({ value, onChange }) {
  const lastExternal = useRef(safeHex(value));
  const [hsl, setHsl] = useState(() => hexToHsl(safeHex(value)));
  const [h, s, l] = hsl;

  useEffect(() => {
    const sv = safeHex(value);
    if (sv !== lastExternal.current) {
      lastExternal.current = sv;
      setHsl(hexToHsl(sv));
    }
  }, [value]);

  function update(nh, ns, nl) {
    const hex = hslToHex(nh, ns, nl);
    lastExternal.current = hex;
    setHsl([nh, ns, nl]);
    onChange(hex);
  }

  const preview = hslToHex(h, s, l);

  return (
    <View style={cpStyles.wrap}>
      <Text style={cpStyles.lbl}>Hue</Text>
      <ColorSlider numSegs={36}
        getSegColor={(t) => hslToHex(Math.round(t * 360), 100, 50)}
        ratio={h / 360}
        onRatio={(r) => update(Math.round(r * 360), s, l)} />

      <Text style={cpStyles.lbl}>Saturation</Text>
      <ColorSlider numSegs={20}
        getSegColor={(t) => hslToHex(h, Math.round(t * 100), Math.max(l, 30))}
        ratio={s / 100}
        onRatio={(r) => update(h, Math.round(r * 100), l)} />

      <Text style={cpStyles.lbl}>Lightness</Text>
      <ColorSlider numSegs={20}
        getSegColor={(t) => hslToHex(h, Math.max(s, 60), Math.round(t * 100))}
        ratio={l / 100}
        onRatio={(r) => update(h, s, Math.round(r * 100))} />

      <View style={cpStyles.previewRow}>
        <View style={[cpStyles.previewBox, { backgroundColor: preview }]} />
        <Text style={cpStyles.hexText}>{preview}</Text>
      </View>
    </View>
  );
}

const cpStyles = StyleSheet.create({
  wrap:        { marginTop: 6 },
  lbl:         { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 12, marginBottom: 4, letterSpacing: 0.5 },
  sliderOuter: { height: 30, justifyContent: 'center', position: 'relative' },
  trackInner:  { height: 22, borderRadius: 11, flexDirection: 'row', overflow: 'hidden' },
  seg:         { flex: 1 },
  thumb:       { position: 'absolute', top: 5, width: 20, height: 20, borderRadius: 10,
                 backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(0,0,0,0.18)',
                 shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                 shadowOpacity: 0.35, shadowRadius: 3, elevation: 5 },
  previewRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  previewBox:  { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  hexText:     { fontSize: 13, fontWeight: '700', color: '#64748b', letterSpacing: 1 },
});

// ─── Swatches ─────────────────────────────────────────────────────────────────

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
  '#0f172a', '#1e1b4b', '#0c1a2e', '#18181b',
];

const APP_ACCENT_COLORS = [
  '#4F46E5', '#0ea5e9', '#8b5cf6', '#ec4899',
  '#10b981', '#f97316', '#ef4444', '#f59e0b',
];

const TAB_BG_COLORS = [
  '#ffffff', '#f8fafc', '#f0f9ff', '#fff7ed',
  '#0f172a', '#1e293b', '#18181b', '#1e1b4b',
];

const DEFAULT_PRIMARY   = '#6366f1';
const DEFAULT_SECONDARY = '#fffbeb';

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { pageBg, accent: appAccent, tabBg, updateTheme, toggleDark, isDark,
          cardBg, textPrimary, textSecondary, border } = useTheme();
  const [user, setUser]           = useState(null);
  const [streak, setStreak]       = useState(0);
  const [topActivities, setTop]   = useState([]);
  const [totalCount, setTotal]    = useState(0);
  const [friendCount, setFriends] = useState(0);
  const [primary, setPrimary]     = useState(DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(DEFAULT_SECONDARY);
  const [isPublic, setIsPublic]   = useState(true);

  const saveTimer = useRef({});

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
      setIsPublic(me.isPublic !== false);
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
      allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true,
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

  function changePrimary(color) {
    setPrimary(color);
    clearTimeout(saveTimer.current.primary);
    saveTimer.current.primary = setTimeout(() => {
      api.patch('/auth/profile', { cardColor: color }).catch(() => {});
    }, 600);
  }

  function changeSecondary(color) {
    setSecondary(color);
    clearTimeout(saveTimer.current.secondary);
    saveTimer.current.secondary = setTimeout(() => {
      api.patch('/auth/profile', { cardSecondaryColor: color }).catch(() => {});
    }, 600);
  }

  async function togglePrivacy() {
    const next = !isPublic;
    setIsPublic(next);
    try {
      await api.patch('/auth/profile', { isPublic: next });
    } catch {
      setIsPublic(!next);
    }
  }

  if (!user) return (
    <View style={[styles.loading, { backgroundColor: pageBg }]}>
      <Text style={[styles.loadingText, { color: textSecondary }]}>Loading...</Text>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.screenTitle, { color: textPrimary }]}>Profile</Text>

      {/* Card */}
      <View style={[styles.card, { borderColor: primary, backgroundColor: secondary }]}>
        <View style={[styles.cardBanner, { backgroundColor: primary }]}>
          <Text style={styles.cardName}>{user.username}</Text>
          <Text style={styles.cardType}>🎮 Logger  •  🔥 {streak} day streak</Text>
        </View>

        <View style={[styles.avatarSection, { backgroundColor: secondary }]}>
          <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap}>
            {user.avatarBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${user.avatarBase64}` }}
                style={[styles.avatar, { borderColor: primary }]} />
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

      {/* Card color pickers */}
      <View style={[styles.colorSection, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.sectionHeader, { color: textPrimary }]}>Card Colors</Text>

        <Text style={[styles.colorLabel, { color: textSecondary }]}>Banner & Accent</Text>
        <View style={styles.colorRow}>
          {PRIMARY_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => changePrimary(c)}
              style={[styles.swatch, { backgroundColor: c }, primary === c && styles.swatchSelected]} />
          ))}
        </View>
        <ColorPicker value={primary} onChange={changePrimary} />

        <Text style={[styles.colorLabel, { color: textSecondary, marginTop: 20 }]}>Card Background</Text>
        <View style={styles.colorRow}>
          {SECONDARY_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => changeSecondary(c)}
              style={[styles.swatch, { backgroundColor: c, borderWidth: 1, borderColor: border }, secondary === c && styles.swatchSelected]} />
          ))}
        </View>
        <ColorPicker value={secondary} onChange={changeSecondary} />
      </View>

      {/* App theme */}
      <View style={[styles.colorSection, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeader, { color: textPrimary }]}>App Theme</Text>
          <TouchableOpacity style={[styles.darkToggle, { backgroundColor: isDark ? appAccent : border }]} onPress={toggleDark}>
            <Text style={styles.darkToggleText}>{isDark ? '☀️ Light' : '🌙 Dark'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.colorLabel, { color: textSecondary }]}>App Background</Text>
        <View style={styles.colorRow}>
          {APP_BG_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => updateTheme({ pageBg: c })}
              style={[styles.swatch, { backgroundColor: c, borderWidth: 1, borderColor: border }, pageBg === c && styles.swatchSelected]} />
          ))}
        </View>
        <ColorPicker value={pageBg} onChange={v => updateTheme({ pageBg: v })} />

        <Text style={[styles.colorLabel, { color: textSecondary, marginTop: 20 }]}>App Accent Color</Text>
        <View style={styles.colorRow}>
          {APP_ACCENT_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => updateTheme({ accent: c })}
              style={[styles.swatch, { backgroundColor: c }, appAccent === c && styles.swatchSelected]} />
          ))}
        </View>
        <ColorPicker value={appAccent} onChange={v => updateTheme({ accent: v })} />

        <Text style={[styles.colorLabel, { color: textSecondary, marginTop: 20 }]}>Tab Bar Color</Text>
        <View style={styles.colorRow}>
          {TAB_BG_COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => updateTheme({ tabBg: c })}
              style={[styles.swatch, { backgroundColor: c, borderWidth: 1, borderColor: border }, tabBg === c && styles.swatchSelected]} />
          ))}
        </View>
        <ColorPicker value={tabBg} onChange={v => updateTheme({ tabBg: v })} />
      </View>

      {/* Privacy */}
      <View style={[styles.colorSection, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.sectionHeader, { color: textPrimary, marginBottom: 14 }]}>Privacy</Text>
        <TouchableOpacity style={[styles.privacyRow, { borderColor: border }]} onPress={togglePrivacy} activeOpacity={0.75}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.privacyTitle, { color: textPrimary }]}>
              {isPublic ? '🌐  Public Profile' : '🔒  Private Profile'}
            </Text>
            <Text style={[styles.privacyDesc, { color: textSecondary }]}>
              {isPublic
                ? 'Anyone can see your activity logs'
                : 'Only friends can see your activity logs'}
            </Text>
          </View>
          <View style={[styles.privacyToggle, { backgroundColor: isPublic ? appAccent : border }]}>
            <View style={[styles.privacyKnob, { alignSelf: isPublic ? 'flex-end' : 'flex-start' }]} />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  content:          { padding: 20, paddingBottom: 48, alignItems: 'center' },
  loading:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { fontSize: 15 },
  screenTitle:      { fontSize: 26, fontWeight: '900', marginBottom: 20, alignSelf: 'flex-start' },

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

  colorSection:     { marginTop: 16, width: '100%', maxWidth: 360, borderRadius: 16,
                      padding: 16, borderWidth: 1.5 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionHeader:    { fontSize: 15, fontWeight: '800' },
  darkToggle:       { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  darkToggleText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  colorLabel:       { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  colorRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch:           { width: 34, height: 34, borderRadius: 17 },
  swatchSelected:   { transform: [{ scale: 1.25 }],
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },

  privacyRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1,
                      borderRadius: 14, padding: 14, gap: 14 },
  privacyTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  privacyDesc:      { fontSize: 12, fontWeight: '500' },
  privacyToggle:    { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  privacyKnob:      { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
});
