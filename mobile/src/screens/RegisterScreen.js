import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import api from '../api';

export default function RegisterScreen({ navigation, onLogin }) {
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegister() {
    try {
      const { data } = await api.post('/auth/register', { email, username, password });
      if (data.pendingVerification) {
        navigation.navigate('VerifyEmail', { email: data.email, onLogin });
      }
    } catch (e) {
      Alert.alert('Oops!', e.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>🚀</Text>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join and start logging your days</Text>

        <TextInput style={styles.input} placeholder="📧  Email" value={email}
          onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
          placeholderTextColor="rgba(255,255,255,0.6)" />
        <TextInput style={styles.input} placeholder="👤  Username" value={username}
          onChangeText={setUsername} autoCapitalize="none"
          placeholderTextColor="rgba(255,255,255,0.6)" />
        <TextInput style={styles.input} placeholder="🔒  Password (min 6 chars)" value={password}
          onChangeText={setPassword} secureTextEntry
          placeholderTextColor="rgba(255,255,255,0.6)" />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Create Account →</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#7C3AED' },
  inner:      { flex: 1, justifyContent: 'center', padding: 28 },
  emoji:      { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  title:      { fontSize: 36, fontWeight: '900', textAlign: 'center', color: '#fff',
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
  buttonText: { color: '#7C3AED', fontWeight: '800', fontSize: 16 },
  link:       { textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  linkBold:   { color: '#fff', fontWeight: '700' },
});
