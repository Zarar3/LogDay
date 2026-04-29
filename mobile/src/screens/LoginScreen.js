import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../api';
import { saveToken } from '../auth';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await saveToken(data.token);
      onLogin();
    } catch (e) {
      Alert.alert('Oops!', e.response?.data?.error || 'Login failed');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>📓</Text>
        <Text style={styles.title}>LogDay</Text>
        <Text style={styles.subtitle}>Track your day. Beat your friends.</Text>

        <TextInput style={styles.input} placeholder="📧  Email" value={email}
          onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          placeholderTextColor="rgba(255,255,255,0.6)" />
        <TextInput style={styles.input} placeholder="🔒  Password" value={password}
          onChangeText={setPassword} secureTextEntry placeholderTextColor="rgba(255,255,255,0.6)" />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#4F46E5' },
  inner:      { flex: 1, justifyContent: 'center', padding: 28 },
  emoji:      { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  title:      { fontSize: 42, fontWeight: '900', textAlign: 'center', color: '#fff',
                letterSpacing: -1, marginBottom: 6 },
  subtitle:   { fontSize: 16, textAlign: 'center', color: 'rgba(255,255,255,0.75)',
                marginBottom: 40 },
  input:      { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 16,
                marginBottom: 12, fontSize: 15, borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.3)', color: '#fff' },
  button:     { backgroundColor: '#fff', padding: 16, borderRadius: 14, alignItems: 'center',
                marginTop: 8, marginBottom: 20,
                shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  buttonText: { color: '#4F46E5', fontWeight: '800', fontSize: 16 },
  link:       { textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  linkBold:   { color: '#fff', fontWeight: '700' },
});
