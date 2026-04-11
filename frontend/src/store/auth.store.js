import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      unreadNotifications: 0,
      unreadMessages: 0,

      setTokens: (token) => set({ token }),

      setUser: (user) => set({ user }),

      login: (user, token) => set({ user, token }),

      logout: () => {
        api.post('/auth/logout').catch(() => {});
        set({ user: null, token: null });
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

      addNotification: (notification) => {
        set((s) => ({ unreadNotifications: s.unreadNotifications + 1 }));
      },

      clearUnread: () => set({ unreadNotifications: 0 }),

      addUnreadMessage: () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
      clearUnreadMessages: () => set({ unreadMessages: 0 }),
    }),
    { name: 'auth', partialize: (s) => ({ token: s.token }) }
  )
);
