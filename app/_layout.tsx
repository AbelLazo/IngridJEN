import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { InstitutionProvider } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Set navigation bar to transparent so our app menu can sit behind/above the system bar area
      // and use useSafeAreaInsets to add padding.
      NavigationBar.setBehaviorAsync('inset-touch');
      NavigationBar.setBackgroundColorAsync('#00000000'); // Transparent
      NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
    }
  }, [colorScheme]);

  return (
    <SafeAreaProvider>
      <InstitutionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="students" options={{ title: 'Estudiantes' }} />
            <Stack.Screen name="teachers" options={{ title: 'Profesores' }} />
            <Stack.Screen name="courses" options={{ title: 'Cursos' }} />
            <Stack.Screen name="classes" options={{ title: 'Clases' }} />
            <Stack.Screen name="schedule" options={{ title: 'Horario' }} />
            <Stack.Screen name="fees" options={{ title: 'Mensualidad' }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>

          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </InstitutionProvider>
    </SafeAreaProvider>
  );
}
