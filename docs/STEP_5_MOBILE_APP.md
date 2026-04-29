# Step 5 — Mobile App (Expo + Navigation + Auth Screens)

## Goal
Create the Expo app with screen navigation, a login screen, and a register screen that talk to your backend.

---

## 5.1 Scaffold the Expo App

```bash
cd mobile
npx create-expo-app . --template blank
```

Install navigation and dependencies:
```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler
npm install axios
npx expo install expo-secure-store
```

---

## 5.2 Folder Structure

Create this structure inside `mobile/`:
```
mobile/
├── App.js
├── src/
│   ├── api.js              # axios instance pointing to your backend
│   ├── auth.js             # token storage helpers
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── HomeScreen.js
│   │   ├── LogActivityScreen.js
│   │   ├── FriendsScreen.js
│   │   └── CompareScreen.js
│   └── navigation/
│       └── AppNavigator.js
```

Run:
```bash
mkdir -p src/screens src/navigation
```

---

## 5.3 Create the API Client

Create `mobile/src/api.js`:

```js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: 'http://YOUR_LOCAL_IP:3000/api',  // replace with your machine's local IP
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

> **Finding your local IP:** On Windows, open a terminal and run `ipconfig`. Look for the IPv4 address under your Wi-Fi adapter (e.g. `192.168.1.42`). Use that instead of `localhost` because your phone and computer need to be on the same Wi-Fi network.

---

## 5.4 Token Storage Helpers

Create `mobile/src/auth.js`:

```js
import * as SecureStore from 'expo-secure-store';

export async function saveToken(token) {
  await SecureStore.setItemAsync('token', token);
}

export async function getToken() {
  return await SecureStore.getItemAsync('token');
}

export async function removeToken() {
  await SecureStore.deleteItemAsync('token');
}
```

---

## 5.5 Build the Auth Screens

**`mobile/src/screens/LoginScreen.js`**
```jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../api';
import { saveToken } from '../auth';

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await saveToken(data.token);
      navigation.replace('Main');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Login failed');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LogDay</Text>
      <TextInput style={styles.input} placeholder="Email" value={email}
        onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Password" value={password}
        onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title:     { fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  input:     { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
  button:    { backgroundColor: '#4F46E5', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  buttonText:{ color: '#fff', fontWeight: '600', fontSize: 16 },
  link:      { textAlign: 'center', color: '#4F46E5' },
});
```

**`mobile/src/screens/RegisterScreen.js`**
```jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import api from '../api';
import { saveToken } from '../auth';

export default function RegisterScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleRegister() {
    try {
      const { data } = await api.post('/auth/register', { email, username, password });
      await saveToken(data.token);
      navigation.replace('Main');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput style={styles.input} placeholder="Email" value={email}
        onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Username" value={username}
        onChangeText={setUsername} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password}
        onChangeText={setPassword} secureTextEntry />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title:     { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 32 },
  input:     { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
  button:    { backgroundColor: '#4F46E5', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  buttonText:{ color: '#fff', fontWeight: '600', fontSize: 16 },
  link:      { textAlign: 'center', color: '#4F46E5' },
});
```

---

## 5.6 Create a Placeholder Home Screen

Create `mobile/src/screens/HomeScreen.js`:

```jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to LogDay!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text:      { fontSize: 24, fontWeight: 'bold' },
});
```

---

## 5.7 Set Up Navigation

Create `mobile/src/navigation/AppNavigator.js`:

```jsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getToken } from '../auth';

import LoginScreen    from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen     from '../screens/HomeScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home"    component={HomeScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [loggedIn, setLoggedIn] = useState(null);

  useEffect(() => {
    getToken().then(token => setLoggedIn(!!token));
  }, []);

  if (loggedIn === null) return null; // loading

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {loggedIn ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login"    component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## 5.8 Update App.js

Replace the contents of `mobile/App.js` with:

```jsx
import 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return <AppNavigator />;
}
```

---

## 5.9 Test on Your Phone

1. Make sure your backend is running (`npm run dev` in the `backend/` folder)
2. Start Expo: `npx expo start`
3. Scan the QR code with Expo Go on your iPhone
4. You should see the Login screen
5. Tap "Sign up", create an account — it should hit your backend and navigate to Home

---

## Checklist

- [ ] Expo app starts and shows on your phone via Expo Go
- [ ] Login screen and Register screen display correctly
- [ ] Registering a new user navigates to the Home screen
- [ ] Logging in with existing credentials navigates to the Home screen
- [ ] Wrong password shows an error alert

---

## Next Step → [STEP_6_ACTIVITIES.md](STEP_6_ACTIVITIES.md)
