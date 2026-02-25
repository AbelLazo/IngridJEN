import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { InstitutionProvider } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '@/lib/firebaseConfig';
import { useRouter, useSegments } from 'expo-router';
import { signOut } from 'firebase/auth';
import { ActivityIndicator, Alert, View } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <InstitutionProvider>
            <RootLayoutNav />
          </InstitutionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, userRole, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBehaviorAsync('inset-touch');
      NavigationBar.setBackgroundColorAsync('#00000000');
      NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
    }
  }, [colorScheme]);

  useEffect(() => {
    if (isLoading) return;

    if (user && userRole === null) {
      Alert.alert("Acceso Denegado", "Tu cuenta está sin privilegios. Contacta a un administrador.");
      signOut(auth);
      return;
    }

    const inAuthGroup = segments[0] === 'login';
    const isAccessingUsers = segments[0] === 'users';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // Redirect to dashboard if authenticated and trying to access login
      router.replace('/');
    } else if (user && isAccessingUsers && userRole !== 'admin') {
      // Prevent non-admins from entering the users page via direct URL or deep link
      router.replace('/');
    }
  }, [user, userRole, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#111827' : '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="students" options={{ title: 'Estudiantes' }} />
        <Stack.Screen name="teachers" options={{ title: 'Profesores' }} />
        <Stack.Screen name="courses" options={{ title: 'Cursos' }} />
        <Stack.Screen name="classes" options={{ title: 'Clases' }} />
        <Stack.Screen name="schedule" options={{ title: 'Horario' }} />
        <Stack.Screen name="fees" options={{ title: 'Mensualidad' }} />
        <Stack.Screen name="users" options={{ title: 'Usuarios', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
