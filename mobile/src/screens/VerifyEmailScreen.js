import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import api from '../api';
import { saveToken } from '../auth';

export default function VerifyEmailScreen({ route, navigation, onLogin }) {
  const { email } = route.params;
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [resending, setResend]  = useState(false);

  async function handleVerify() {
    if (code.length !== 6) return Alert.alert('Check your code', 'Enter the 6-digit code from your email.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { email, code });
      await saveToken(data.token);
      onLogin();
    } catch (e) {
      Alert.alert('Invalid code', e.response?.data?.error || 'Please try again.');
    }
    setLoading(false);
  }

  async function handleResend() {
    setResend(true);
    try {
      await api.post('/auth/resend-code', { email });
      Alert.alert('Sent!', 'A new code has been sent to your email.');
      setCode('');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Could not resend code.');
    }
    setResend(false);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>📬</Text>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="000000"
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={code}
          onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          textAlign="center"
        />

        <TouchableOpacity
          style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || code.length !== 6}>
          {loading
            ? <ActivityIndicator color="#4F46E5" />
            : <Text style={styles.buttonText}>Verify →</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
          <Text style={styles.resendText}>
            {resending ? 'Sending...' : "Didn't get it? Resend code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.backBtn}>
          <Text style={styles.backText}>← Use a different email</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#4F46E5' },
  inner:        { flex: 1, justifyContent: 'center', padding: 28, alignItems: 'center' },
  emoji:        { fontSize: 56, marginBottom: 12 },
  title:        { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
  subtitle:     { fontSize: 15, color: 'rgba(255,255,255,0.75)', textAlign: 'center',
                  marginBottom: 36, lineHeight: 22 },
  emailText:    { color: '#fff', fontWeight: '700' },
  codeInput:    { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, padding: 20,
                  fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 16,
                  borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
                  width: '100%', marginBottom: 20 },
  button:       { backgroundColor: '#fff', padding: 16, borderRadius: 14, alignItems: 'center',
                  width: '100%', marginBottom: 16,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  buttonDisabled: { opacity: 0.45 },
  buttonText:   { color: '#4F46E5', fontWeight: '800', fontSize: 16 },
  resendBtn:    { marginBottom: 20, padding: 8 },
  resendText:   { color: 'rgba(255,255,255,0.75)', fontSize: 14, textDecorationLine: 'underline' },
  backBtn:      { padding: 8 },
  backText:     { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
});
