import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getToken } from '../auth';
import { useTheme } from '../context/ThemeContext';

import LoginScreen        from '../screens/LoginScreen';
import RegisterScreen     from '../screens/RegisterScreen';
import HomeScreen         from '../screens/HomeScreen';
import LogActivityScreen  from '../screens/LogActivityScreen';
import FriendsScreen      from '../screens/FriendsScreen';
import CompareScreen      from '../screens/CompareScreen';
import CommentsScreen     from '../screens/CommentsScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import DiscoverScreen     from '../screens/DiscoverScreen';
import MessagesScreen     from '../screens/MessagesScreen';
import ConversationScreen  from '../screens/ConversationScreen';
import UserProfileScreen  from '../screens/UserProfileScreen';
import NewChallengeScreen from '../screens/NewChallengeScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function icon(emoji) {
  return ({ focused }) => (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

function MainTabs({ onLogout }) {
  const { accent, tabBg, border } = useTheme();
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: { borderTopWidth: 1, borderTopColor: border, backgroundColor: tabBg, height: 58 },
      tabBarActiveTintColor: accent,
      tabBarInactiveTintColor: '#94a3b8',
    }}>
      <Tab.Screen name="Home"     options={{ tabBarIcon: icon('📋') }}>
        {props => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Feed"     component={DiscoverScreen}     options={{ tabBarIcon: icon('📡') }} />
      <Tab.Screen name="Friends"  component={FriendsScreen}      options={{ tabBarIcon: icon('👥') }} />
      <Tab.Screen name="Messages" component={MessagesScreen}     options={{ tabBarIcon: icon('💬') }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}      options={{ tabBarIcon: icon('🃏') }} />
    </Tab.Navigator>
  );
}

function MainStack({ onLogout }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs">
        {props => <MainTabs {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="LogActivity"  component={LogActivityScreen} />
      <Stack.Screen name="Compare"      component={CompareScreen} />
      <Stack.Screen name="Comments"     component={CommentsScreen} />
      <Stack.Screen name="Conversation"  component={ConversationScreen} />
      <Stack.Screen name="UserProfile"   component={UserProfileScreen} />
      <Stack.Screen name="NewChallenge"  component={NewChallengeScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const [loggedIn, setLoggedIn] = useState(null);

  useEffect(() => {
    getToken().then(token => setLoggedIn(!!token));
  }, []);

  if (loggedIn === null) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {loggedIn ? (
          <Stack.Screen name="Main">
            {props => <MainStack {...props} onLogout={() => setLoggedIn(false)} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLogin={() => setLoggedIn(true)} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {props => <RegisterScreen {...props} onLogin={() => setLoggedIn(true)} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
