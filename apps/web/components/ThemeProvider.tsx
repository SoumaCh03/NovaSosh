'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';

interface ThemeContextProps {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('SYSTEM');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Sync theme changes to the DOM, LocalStorage, and Cookies
  const applyTheme = (targetTheme: Theme) => {
    let active: 'light' | 'dark' = 'dark';

    if (targetTheme === 'SYSTEM') {
      if (typeof window !== 'undefined') {
        active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } else {
      active = targetTheme === 'LIGHT' ? 'light' : 'dark';
    }

    setResolvedTheme(active);

    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (active === 'dark') {
        root.classList.remove('light');
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }

      // Persist locally
      localStorage.setItem('nova_theme', targetTheme);
      // Persist in cookie (1 year expiry) for SSR read
      document.cookie = `theme=${active}; path=/; max-age=31536000; SameSite=Lax`;
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);

    // Sync to backend if logged in
    if (isAuthenticated && accessToken) {
      try {
        await ApiClient.patch<{ theme: string }>('/theme', { theme: newTheme }, accessToken);
      } catch (err) {
        console.error('Failed to sync theme preference to server:', err);
      }
    }
  };

  // 1. Initial local load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const localTheme = localStorage.getItem('nova_theme') as Theme | null;
      if (localTheme) {
        setThemeState(localTheme);
        applyTheme(localTheme);
      } else {
        applyTheme('SYSTEM');
      }
    }
  }, []);

  // 2. Load preference from DB when user logs in
  useEffect(() => {
    const fetchUserTheme = async () => {
      if (isAuthenticated && accessToken) {
        try {
          const res = await ApiClient.get<{ theme: string }>('/theme', accessToken);
          const userTheme = res.theme as Theme;
          setThemeState(userTheme);
          applyTheme(userTheme);
        } catch (err) {
          console.error('Failed to fetch theme from DB:', err);
        }
      }
    };
    fetchUserTheme();
  }, [isAuthenticated, accessToken]);

  // 3. Reactively update system theme change triggers
  useEffect(() => {
    if (theme !== 'SYSTEM') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      applyTheme('SYSTEM');
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
