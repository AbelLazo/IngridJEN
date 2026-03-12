import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlertProvider, useAlert } from '@/context/AlertContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { InstitutionProvider } from '@/context/InstitutionContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth } from '@/lib/firebaseConfig';
import { useRouter, useSegments } from 'expo-router';
import { signOut } from 'firebase/auth';
import { ActivityIndicator, Alert, Text, TextInput, View } from 'react-native';

// Disable default font scaling globally to prevent UI breakage
// if users have drastically increased font sizes in system Accessibility settings.
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.allowFontScaling = false;

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.allowFontScaling = false;

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AlertProvider>
          <AuthProvider>
            <InstitutionProvider>
              <RootLayoutNav />
            </InstitutionProvider>
          </AuthProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, userRole, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { showAlert } = useAlert();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBehaviorAsync('inset-touch');
      NavigationBar.setBackgroundColorAsync('#00000000');
      NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
    }
  }, [colorScheme]);

  // OTA Updates Check
  useEffect(() => {
    if (__DEV__) return;

    async function onFetchUpdateAsync() {
      try {
        // Only check if we are in a production environment and updates are enabled
        if (!Updates.isEnabled) return;
        
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          Alert.alert(
            "Actualización Disponible",
            "Hay una nueva versión de la aplicación. ¿Deseas actualizar ahora?",
            [
              { text: "Más tarde", style: "cancel" },
              {
                text: "Actualizar",
                onPress: async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch (e) {
                    Alert.alert("Error", "No se pudo descargar la actualización.");
                  }
                }
              }
            ]
          );
        }
      } catch (error) {
        console.log("Updates check skipped or failed:", error);
      }
    }

    onFetchUpdateAsync();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (user && userRole === null) {
      showAlert("Acceso Denegado", "Tu cuenta está sin privilegios. Contacta a un administrador.", undefined, 'error');
      signOut(auth);
      return;
    }

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'oauthredirect';
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

  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Give the router state a tiny delay to process the redirect before rendering children
      setTimeout(() => setIsNavigationReady(true), 10);
    }
  }, [isLoading]);

  if (isLoading || !isNavigationReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A0B12' }}>
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
