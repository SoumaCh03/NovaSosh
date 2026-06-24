'use client';

import React from 'react';
import { useAuthStore } from '../stores/authStore';
import AppNavigation from './AppNavigation';

/**
 * Wraps authenticated page content with the unified AppNavigation shell.
 * Renders children directly for unauthenticated users (login/register pages
 * handle their own layout).
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // During SSR or before hydration, render children directly to avoid flash
  if (!isHydrated) {
    return <>{children}</>;
  }

  // For unauthenticated users, the AppNavigation component handles passthrough
  // internally, but we still wrap for consistency
  return <AppNavigation>{children}</AppNavigation>;
}
