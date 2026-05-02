import React, { useState, useEffect } from 'react';
import { Text, View, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../auth';
import { useTheme } from '../context/ThemeContext';

import LoginScreen        from '../screens/LoginScreen';
import RegisterScreen     from '../screens/RegisterScreen';
import VerifyEmailScreen  from '../screens/VerifyEmailScreen';
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
import NewChallengeScreen      from '../screens/NewChallengeScreen';
import NewGroupChallengeScreen from '../screens/NewGroupChallengeScreen';
import BingoScreen             from '../screens/BingoScreen';
import WeeklyDigestScreen      from '../screens/WeeklyDigestScreen';
import OnboardingScreen        from '../screens/OnboardingScreen';
import { useBadges } from '../context/BadgeContext';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function icon(emoji, badge = 0) {
  return ({ focused }) => (
    <View style={{ position: 'relative' }}>
      <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
      {badge > 0 && (
        <View style={{
          position: 'absolute', top: -2, right: -6,
          width: 14, height: 14, borderRadius: 7,
          backgroundColor: '#ef4444',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

function MainTabs({ onLogout }) {
  const { accent, tabBg, border } = useTheme();
  const { pendingFriends, unreadMessages, refresh } = useBadges();

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

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
      <Tab.Screen name="Friends"  component={FriendsScreen}      options={{ tabBarIcon: icon('👥', pendingFriends) }} />
      <Tab.Screen name="Messages" component={MessagesScreen}     options={{ tabBarIcon: icon('💬', unreadMessages) }} />
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
      <Stack.Screen name="NewChallenge"      component={NewChallengeScreen} />
      <Stack.Screen name="NewGroupChallenge" component={NewGroupChallengeScreen} />
      <Stack.Screen name="Bingo"             component={BingoScreen} />
      <Stack.Screen name="WeeklyDigest"      component={WeeklyDigestScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const [loggedIn,  setLoggedIn]  = useState(null);
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => {
    Promise.all([
      getToken(),
      AsyncStorage.getItem('@logday_onboarded'),
    ]).then(([token, ob]) => {
      setLoggedIn(!!token);
      setOnboarded(ob === 'true');
    });
  }, []);

  if (loggedIn === null || onboarded === null) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {loggedIn && !onboarded ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onDone={() => setOnboarded(true)} />}
          </Stack.Screen>
        ) : loggedIn ? (
          <Stack.Screen name="Main">
            {props => <MainStack {...props} onLogout={() => { setLoggedIn(false); setOnboarded(false); }} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLogin={() => setLoggedIn(true)} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {props => <RegisterScreen {...props} onLogin={() => setLoggedIn(true)} />}
            </Stack.Screen>
            <Stack.Screen name="VerifyEmail">
              {props => <VerifyEmailScreen {...props} onLogin={() => setLoggedIn(true)} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
