import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      // M-1: token is NOT persisted to localStorage — it lives in memory only.
      // XSS cannot steal it via localStorage.getItem(). On page reload, initializeAuth()
      // silently refreshes the token using the HttpOnly refresh cookie.
      token: null,
      isInitializing: true,
      unreadNotifications: 0,
      unreadMessages: 0,

      setTokens: (token) => set({ token }),

      setUser: (user) => set({ user }),

      login: (user, token) => set({ user, token }),

      logout: () => {
        api.post('/auth/logout').catch(() => {});
        set({ user: null, token: null, isInitializing: false });
        window.location.href = '/login';
      },

      fetchMe: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
        } catch {
          get().logout();
        }
      },

      // Called once on app mount. Silently exchanges the HttpOnly refresh cookie for a
      // new access token, keeping the user logged in across page reloads without touching
      // localStorage.
      initializeAuth: async () => {
        try {
          const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
          set({ token: data.token });
          // Fetch user profile so the app has user data immediately
          const { data: me } = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${data.token}` },
            withCredentials: true,
          });
          set({ user: me, isInitializing: false });
        } catch {
          // No valid refresh cookie — user is logged out
          set({ token: null, user: null, isInitializing: false });
        }
      },

      addNotification: (notification) => {
        set((s) => ({ unreadNotifications: s.unreadNotifications + 1 }));
      },

      clearUnread: () => set({ unreadNotifications: 0 }),

      addUnreadMessage: () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
      clearUnreadMessages: () => set({ unreadMessages: 0 }),
    }),
    {
      name: 'auth',
      // M-1: Only persist non-sensitive UI state. Token is intentionally excluded.
      partialize: (s) => ({
        unreadNotifications: s.unreadNotifications,
        unreadMessages: s.unreadMessages,
      }),
    }
  )
);
