import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User, token: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user: User, token: string) => {
    set({ user, sessionToken: token, isAuthenticated: true });
    AsyncStorage.setItem('session_token', token);
  },

  login: async () => {
    try {
      const redirectUrl = Platform.OS === 'web'
        ? `${API_URL}/`
        : Linking.createURL('/');
      
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
      
      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        // Mobile flow
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await get().processAuthRedirect(result.url);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
    }
  },

  processAuthRedirect: async (url: string) => {
    try {
      // Extract session_id from URL (support both hash and query)
      let sessionId = null;
      
      if (url.includes('#session_id=')) {
        sessionId = url.split('#session_id=')[1]?.split('&')[0];
      } else if (url.includes('?session_id=')) {
        sessionId = url.split('?session_id=')[1]?.split('&')[0];
      }
      
      if (!sessionId) {
        console.error('No session_id found in redirect URL');
        set({ isLoading: false });
        return;
      }
      
      // Exchange session_id for user data
      const response = await fetch(`${API_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
      });
      
      if (!response.ok) {
        throw new Error('Session exchange failed');
      }
      
      const data = await response.json();
      
      // Store session token
      await AsyncStorage.setItem('session_token', data.session_token);
      
      // Set user data
      set({
        user: {
          user_id: data.id,
          email: data.email,
          name: data.name,
          picture: data.picture,
        },
        sessionToken: data.session_token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth redirect processing error:', error);
      set({ isLoading: false });
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      // Check for existing session token
      const token = await AsyncStorage.getItem('session_token');
      
      if (!token) {
        set({ isLoading: false });
        return;
      }
      
      // Verify token with backend
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        set({
          user: userData,
          sessionToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        // Invalid token, clear it
        await AsyncStorage.removeItem('session_token');
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Check auth error:', error);
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      const token = get().sessionToken;
      
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      
      await AsyncStorage.removeItem('session_token');
      set({
        user: null,
        sessionToken: null,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
}));
