import { create } from 'zustand';
import { PublicUser } from '@nova/shared-types';

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSession: (user: PublicUser, accessToken: string) => void;
  clearSession: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false,
  setSession: (user, accessToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nova_user', JSON.stringify(user));
      localStorage.setItem('nova_token', accessToken);
    }
    set({ user, accessToken, isAuthenticated: true });
  },
  clearSession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nova_user');
      localStorage.removeItem('nova_token');
    }
    set({ user: null, accessToken: null, isAuthenticated: false });
  },
  hydrate: () => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('nova_user');
      const storedToken = localStorage.getItem('nova_token');
      if (storedUser && storedToken) {
        try {
          const user = JSON.parse(storedUser);
          set({ user, accessToken: storedToken, isAuthenticated: true, isHydrated: true });
          return;
        } catch {
          // Clear corrupt data
          localStorage.removeItem('nova_user');
          localStorage.removeItem('nova_token');
        }
      }
    }
    set({ isHydrated: true });
  },
}));
