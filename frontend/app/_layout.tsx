import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export default function RootLayout() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const processAuthRedirect = useAuthStore((state) => (state as any).processAuthRedirect);

  useEffect(() => {
    // Check for existing session
    checkAuth();

    // Handle deep links (mobile)
    if (Platform.OS !== 'web') {
      // Cold start
      Linking.getInitialURL().then((url) => {
        if (url && (url.includes('session_id'))) {
          processAuthRedirect(url);
        }
      });

      // Hot link
      const subscription = Linking.addEventListener('url', ({ url }) => {
        if (url && url.includes('session_id')) {
          processAuthRedirect(url);
        }
      });

      return () => subscription.remove();
    } else {
      // Web: check URL hash for session_id
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash.includes('session_id')) {
          processAuthRedirect(window.location.href);
          // Clean URL
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
