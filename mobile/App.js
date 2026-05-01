import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/context/ThemeContext';
import { BadgeProvider } from './src/context/BadgeContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <BadgeProvider>
          <AppNavigator />
        </BadgeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
