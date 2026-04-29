import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@logday_theme';

const DEFAULT = { pageBg: '#f0f9ff', accent: '#4F46E5' };

const ThemeContext = createContext({ ...DEFAULT, updateTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(v => { if (v) setTheme({ ...DEFAULT, ...JSON.parse(v) }); })
      .catch(() => {});
  }, []);

  async function updateTheme(updates) {
    const next = { ...theme, ...updates };
    setTheme(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }

  return (
    <ThemeContext.Provider value={{ ...theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
