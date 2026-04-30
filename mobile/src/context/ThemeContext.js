import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext({});
const KEY = '@logday_theme';

const LIGHT_BASE = {
  cardBg:        '#ffffff',
  textPrimary:   '#1e293b',
  textSecondary: '#64748b',
  border:        '#dbeafe',
  inputBg:       '#f8fafc',
  statsBg:       '#f0f9ff',
};

const DARK_BASE = {
  cardBg:        '#1e293b',
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  border:        '#2d3f55',
  inputBg:       '#0f172a',
  statsBg:       '#162032',
};

const LIGHT_DEFAULTS = { pageBg: '#f0f9ff', accent: '#4F46E5', tabBg: '#ffffff', isDark: false };
const DARK_DEFAULTS  = { pageBg: '#0f172a', accent: '#6366f1', tabBg: '#0f172a',  isDark: true };

export function ThemeProvider({ children }) {
  const [stored, setStored] = useState(LIGHT_DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(v => { if (v) setStored({ ...LIGHT_DEFAULTS, ...JSON.parse(v) }); })
      .catch(() => {});
  }, []);

  async function updateTheme(updates) {
    const next = { ...stored, ...updates };
    setStored(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }

  async function toggleDark() {
    const next = stored.isDark
      ? { ...stored, pageBg: LIGHT_DEFAULTS.pageBg, accent: LIGHT_DEFAULTS.accent, tabBg: LIGHT_DEFAULTS.tabBg, isDark: false }
      : { ...stored, pageBg: DARK_DEFAULTS.pageBg,  accent: DARK_DEFAULTS.accent,  tabBg: DARK_DEFAULTS.tabBg,  isDark: true };
    setStored(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }

  const base = stored.isDark ? DARK_BASE : LIGHT_BASE;

  return (
    <ThemeContext.Provider value={{ ...stored, ...base, updateTheme, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
