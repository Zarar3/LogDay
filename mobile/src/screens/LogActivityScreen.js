import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import { useTheme } from '../context/ThemeContext';

const CUSTOM_KEY = '@logday_custom_activities';

const DEFAULTS = [
  { label: '🏃 Running',    value: 'Running' },
  { label: '🚶 Walking',    value: 'Walking' },
  { label: '🏋️ Gym',        value: 'Gym' },
  { label: '📚 Reading',    value: 'Reading' },
  { label: '🍳 Cooking',    value: 'Cooking' },
  { label: '🎮 Gaming',     value: 'Gaming' },
  { label: '📖 Studying',   value: 'Studying' },
  { label: '🧘 Meditation', value: 'Meditation' },
  { label: '🎵 Music',      value: 'Music' },
  { label: '🎨 Art',        value: 'Art' },
];

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function LogActivityScreen({ navigation }) {
  const { pageBg, accent, cardBg, textPrimary, textSecondary, border, inputBg } = useTheme();
  const [type, setType]               = useState('');
  const [duration, setDuration]       = useState('');
  const [notes, setNotes]             = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [imageUri, setImageUri]       = useState(null);
  const [custom, setCustom]           = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_KEY)
      .then(v => { if (v) setCustom(JSON.parse(v)); })
      .catch(() => {});
  }, []);

  async function saveCustomActivity() {
    const name = type.trim();
    if (!name || DEFAULTS.some(d => d.value.toLowerCase() === name.toLowerCase())) return;
    if (custom.includes(name)) return;
    const updated = [...custom, name];
    setCustom(updated);
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
  }

  async function removeCustom(name) {
    const updated = custom.filter(c => c !== name);
    setCustom(updated);
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled) {
      setImageBase64(result.assets[0].base64);
      setImageUri(result.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!type.trim()) return Alert.alert('Hold on ✋', 'Activity type is required');
    try {
      await api.post('/activities', {
        type: type.trim(),
        duration: duration ? parseInt(duration) : null,
        notes: notes.trim() || null,
        date: todayDate(),
        imageBase64: imageBase64 || null,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save activity');
    }
  }

  const isCustomType = type.trim() &&
    !DEFAULTS.some(d => d.value.toLowerCase() === type.trim().toLowerCase()) &&
    !custom.includes(type.trim());

  return (
    <ScrollView style={[styles.container, { backgroundColor: pageBg }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.heading, { color: textPrimary }]}>Log an Activity ✏️</Text>
      </View>

      <Text style={[styles.label, { color: textPrimary }]}>What did you do? 🤔</Text>
      <View style={styles.typeRow}>
        <TextInput
          style={[styles.input, { flex: 1, backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
          placeholder="e.g. Running"
          value={type}
          onChangeText={setType}
          placeholderTextColor={textSecondary}
        />
        {isCustomType && (
          <TouchableOpacity style={[styles.saveChipBtn, { backgroundColor: accent }]} onPress={saveCustomActivity}>
            <Text style={styles.saveChipText}>+ Save</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.chips}>
        {DEFAULTS.map(s => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, { backgroundColor: cardBg, borderColor: border }, type === s.value && { backgroundColor: accent, borderColor: accent }]}
            onPress={() => setType(s.value)}>
            <Text style={[styles.chipText, { color: textSecondary }, type === s.value && { color: '#fff' }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {custom.length > 0 && (
        <>
          <Text style={[styles.customLabel, { color: accent }]}>Your Custom Activities</Text>
          <View style={styles.chips}>
            {custom.map(c => (
              <View key={c} style={[styles.chip, { backgroundColor: cardBg, borderColor: border }, type === c && { backgroundColor: accent, borderColor: accent }]}>
                <TouchableOpacity onPress={() => setType(c)}>
                  <Text style={[styles.chipText, { color: textSecondary }, type === c && { color: '#fff' }]}>⭐ {c}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeCustom(c)} style={styles.chipDeleteBtn}>
                  <Text style={styles.chipDeleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={[styles.label, { color: textPrimary }]}>Duration ⏱ (minutes, optional — max 4 hrs)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
        placeholder="e.g. 30  (max 240)"
        value={duration}
        onChangeText={v => {
          const n = parseInt(v);
          if (v === '' || (!isNaN(n) && n <= 240)) setDuration(v);
        }}
        keyboardType="number-pad"
        placeholderTextColor={textSecondary}
      />

      <Text style={[styles.label, { color: textPrimary }]}>Notes 📝 (optional)</Text>
      <TextInput
        style={[styles.input, styles.textarea, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
        placeholder="How did it go?"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        placeholderTextColor={textSecondary}
      />

      <Text style={[styles.label, { color: textPrimary }]}>Photo 📸 (optional)</Text>
      {imageUri ? (
        <View>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          <TouchableOpacity style={styles.removePhoto} onPress={() => { setImageBase64(null); setImageUri(null); }}>
            <Text style={styles.removePhotoText}>✕ Remove photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={[styles.photoBtn, { backgroundColor: inputBg, borderColor: border }]} onPress={pickImage}>
          <Text style={[styles.photoBtnText, { color: accent }]}>📷 Add a photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.button, { backgroundColor: accent, shadowColor: accent }]} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Save Activity 🎯</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  content:        { padding: 24, paddingBottom: 48 },
  header:         { marginTop: 40, marginBottom: 24 },
  back:           { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  heading:        { fontSize: 28, fontWeight: '800' },
  label:          { fontWeight: '700', marginBottom: 8, marginTop: 20 },
  customLabel:    { fontWeight: '700', marginBottom: 8, marginTop: 12, fontSize: 13 },
  typeRow:        { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input:          { borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 15 },
  textarea:       { height: 90, textAlignVertical: 'top' },
  saveChipBtn:    { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  saveChipText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText:       { fontWeight: '600', fontSize: 13 },
  chipDeleteBtn:  { marginLeft: 2 },
  chipDeleteText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  photoBtn:       { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 20,
                    alignItems: 'center', marginTop: 4 },
  photoBtnText:   { fontWeight: '700', fontSize: 15 },
  preview:        { width: '100%', height: 200, borderRadius: 14, marginTop: 4 },
  removePhoto:    { alignItems: 'center', marginTop: 8 },
  removePhotoText:{ color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  button:         { padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32,
                    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6 },
  buttonText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
});
