'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';
import { ApiClient } from '../lib/api';

/* ─── SVG Icon Components ─── */
const Icons = {
  home: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M3 12.5l9-9 9 9M5 11v8a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1v-8" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      }
    </svg>
  ),
  moments: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M4 4h4l2 3h10v11a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm6 8l4 3-4 3v-6z" />
        : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></>
      }
    </svg>
  ),
  explore: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.36 5.65l-2.13 5.48-5.46 2.13 2.13-5.48 5.46-2.13z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      }
    </svg>
  ),
  messages: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      }
    </svg>
  ),
  notifications: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      }
    </svg>
  ),
  communities: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      }
    </svg>
  ),
  creator: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      }
    </svg>
  ),
  profile: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      }
    </svg>
  ),
  settings: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  admin: (active: boolean) => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  logout: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  create: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  search: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
};

/* ─── Badge Component ─── */
function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white px-1 leading-none shadow-lg shadow-red-500/30 animate-in zoom-in-50 duration-200">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ─── Main Navigation Component ─── */
export default function AppNavigation({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Public routes that don't need navigation
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  const isPublicRoute = publicRoutes.some(r => pathname.startsWith(r));

  // Fetch notification & message counts
  const fetchBadgeCounts = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await ApiClient.get<{ data: any[] }>('/notifications', accessToken);
      const unread = (res.data || []).filter((n: any) => !n.isRead).length;
      setUnreadNotifications(unread);
    } catch {
      // silently fail
    }
    // For messages - in production this would be a dedicated endpoint
    // For now we simulate with a stored count
    try {
      const msgRes = await ApiClient.get<{ data: any[] }>('/messenger/conversations', accessToken);
      // Count conversations with unread messages (simplified)
      setUnreadMessages(0); // Will be 0 until messenger has unread tracking
    } catch {
      // silently fail
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isAuthenticated || isPublicRoute) return;
    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [isAuthenticated, isPublicRoute, fetchBadgeCounts]);

  // Don't render navigation on public routes
  if (isPublicRoute || !isAuthenticated || !user) {
    return <>{children}</>;
  }

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const profilePath = `/${user.username}`;

  const primaryNav = [
    { name: 'Feed', icon: Icons.home, path: '/', ariaLabel: 'Home Feed' },
    { name: 'Explore', icon: Icons.explore, path: '/explore', ariaLabel: 'Explore' },
    { name: 'Moments', icon: Icons.moments, path: '/moments', ariaLabel: 'Moments' },
    { name: 'Messages', icon: Icons.messages, path: '/messages', ariaLabel: 'Messages', badge: unreadMessages },
    { name: 'Notifications', icon: Icons.notifications, path: '/notifications', ariaLabel: 'Notifications', badge: unreadNotifications },
  ];

  const secondaryNav = [
    { name: 'Communities', icon: Icons.communities, path: '/communities', ariaLabel: 'Communities' },
    { name: 'Creator Studio', icon: Icons.creator, path: '/creator-dashboard', ariaLabel: 'Creator Studio' },
  ];

  const systemNav = [
    { name: 'Settings', icon: Icons.settings, path: '/settings/profile', ariaLabel: 'Settings' },
    { name: 'Admin', icon: Icons.admin, path: '/settings/moderation', ariaLabel: 'Admin Console' },
  ];

  const mobileNav = [
    { name: 'Feed', icon: Icons.home, path: '/', ariaLabel: 'Home Feed' },
    { name: 'Explore', icon: Icons.explore, path: '/explore', ariaLabel: 'Explore' },
    { name: 'Moments', icon: Icons.moments, path: '/moments', ariaLabel: 'Moments' },
    { name: 'Messages', icon: Icons.messages, path: '/messages', ariaLabel: 'Messages', badge: unreadMessages },
    { name: 'Profile', icon: Icons.profile, path: profilePath, ariaLabel: 'Profile' },
  ];

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden text-foreground">
      {/* ── Background Ambience ── */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.04),transparent_45%)] pointer-events-none z-0" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.03),transparent_40%)] pointer-events-none z-0" />

      {/* ═══════════════════════════════════════════ */}
      {/* DESKTOP SIDEBAR — hidden below md           */}
      {/* ═══════════════════════════════════════════ */}
      <aside
        className="hidden md:flex w-[72px] lg:w-64 border-r border-border-token bg-surface/40 backdrop-blur-xl flex-col shrink-0 relative z-30 transition-all duration-300"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* ── Logo ── */}
        <div className="h-16 flex items-center px-4 lg:px-5 border-b border-border-token/60 shrink-0">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 group"
            aria-label="NOVA Home"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-base text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 group-hover:rotate-2 transition-all duration-300 shrink-0">
              N
            </div>
            <span className="hidden lg:block text-xl font-black tracking-wider bg-gradient-to-r from-primary-text via-secondary-text to-accent-token bg-clip-text text-transparent">
              NOVA
            </span>
          </button>
        </div>

        {/* ── Create Post Button ── */}
        <div className="px-3 lg:px-4 pt-4 pb-2 shrink-0">
          <button
            onClick={() => {
              // Dispatch a custom event that the feed page listens to
              window.dispatchEvent(new CustomEvent('nova:create-post'));
            }}
            className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200"
            aria-label="Create new post"
          >
            {Icons.create()}
            <span className="hidden lg:inline">Create Post</span>
          </button>
        </div>

        {/* ── Primary Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-2 lg:px-3 py-3 space-y-6" aria-label="Primary navigation">
          <div>
            <p className="hidden lg:block px-3 text-[10px] font-bold tracking-[0.15em] text-muted-token/50 uppercase mb-2">Main</p>
            <ul className="space-y-0.5" role="list">
              {primaryNav.map(item => {
                const active = isActive(item.path);
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => router.push(item.path)}
                      aria-label={item.ariaLabel}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group relative ${active
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'text-muted-token hover:bg-surface-hover/50 hover:text-primary-text border border-transparent'
                        }`}
                    >
                      <span className={`relative shrink-0 ${active ? 'text-indigo-400' : 'text-muted-token group-hover:text-primary-text'}`}>
                        {item.icon(active)}
                        {item.badge !== undefined && <Badge count={item.badge} />}
                      </span>
                      <span className="hidden lg:block truncate">{item.name}</span>
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Secondary Navigation ── */}
          <div>
            <p className="hidden lg:block px-3 text-[10px] font-bold tracking-[0.15em] text-muted-token/50 uppercase mb-2">Social</p>
            <ul className="space-y-0.5" role="list">
              {secondaryNav.map(item => {
                const active = isActive(item.path);
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => router.push(item.path)}
                      aria-label={item.ariaLabel}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group relative ${active
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'text-muted-token hover:bg-surface-hover/50 hover:text-primary-text border border-transparent'
                        }`}
                    >
                      <span className={`shrink-0 ${active ? 'text-indigo-400' : 'text-muted-token group-hover:text-primary-text'}`}>
                        {item.icon(active)}
                      </span>
                      <span className="hidden lg:block truncate">{item.name}</span>
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── System Navigation ── */}
          <div>
            <p className="hidden lg:block px-3 text-[10px] font-bold tracking-[0.15em] text-muted-token/50 uppercase mb-2">System</p>
            <ul className="space-y-0.5" role="list">
              {systemNav.map(item => {
                const active = isActive(item.path);
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => router.push(item.path)}
                      aria-label={item.ariaLabel}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group relative ${active
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'text-muted-token hover:bg-surface-hover/50 hover:text-primary-text border border-transparent'
                        }`}
                    >
                      <span className={`shrink-0 ${active ? 'text-indigo-400' : 'text-muted-token group-hover:text-primary-text'}`}>
                        {item.icon(active)}
                      </span>
                      <span className="hidden lg:block truncate">{item.name}</span>
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* ── Logout ── */}
        <div className="border-t border-border-token/40 p-3 lg:p-4 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center lg:justify-start gap-2.5 rounded-xl border border-border-token/60 hover:border-red-500/30 bg-transparent hover:bg-red-500/5 px-3 py-2.5 text-xs font-bold text-muted-token hover:text-red-400 transition-all duration-200"
            aria-label="Log out"
          >
            {Icons.logout()}
            <span className="hidden lg:inline">Log Out</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════ */}
      {/* MAIN CONTENT AREA                           */}
      {/* ═══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">

        {/* ── Top Header Bar ── */}
        <header className="h-14 border-b border-border-token/60 bg-surface/40 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 shrink-0 relative z-20">
          {/* Mobile: Hamburger + Logo */}
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-surface-hover/50 text-muted-token transition"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => router.push('/')} className="flex items-center gap-1.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white">N</div>
              <span className="text-base font-black tracking-wider bg-gradient-to-r from-primary-text to-accent-token bg-clip-text text-transparent">NOVA</span>
            </button>
          </div>

          {/* Desktop: Search Bar */}
          <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-token">{Icons.search()}</span>
              <input
                type="text"
                placeholder="Search NOVA..."
                className="w-full bg-background/60 border border-border-token/60 rounded-xl pl-10 pr-4 py-2 text-sm text-primary-text placeholder-muted-token/60 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition"
                onFocus={() => router.push('/explore')}
                aria-label="Search"
              />
            </div>
          </div>

          {/* Desktop Quick Actions */}
          <div className="flex items-center gap-1.5">
            {/* Create (mobile) */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('nova:create-post'))}
              className="md:hidden p-2.5 rounded-xl hover:bg-surface-hover/50 text-muted-token hover:text-indigo-400 transition relative"
              aria-label="Create new post"
            >
              {Icons.create()}
            </button>

            {/* Notifications Quick Icon */}
            <button
              onClick={() => router.push('/notifications')}
              className="p-2.5 rounded-xl hover:bg-surface-hover/50 text-muted-token hover:text-primary-text transition relative"
              aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}`}
            >
              {Icons.notifications(isActive('/notifications'))}
              <Badge count={unreadNotifications} />
            </button>

            {/* Messages Quick Icon */}
            <button
              onClick={() => router.push('/messages')}
              className="p-2.5 rounded-xl hover:bg-surface-hover/50 text-muted-token hover:text-primary-text transition relative"
              aria-label={`Messages${unreadMessages > 0 ? ` (${unreadMessages} unread)` : ''}`}
            >
              {Icons.messages(isActive('/messages'))}
              <Badge count={unreadMessages} />
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => router.push(profilePath)}
              className="ml-1 h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white border-2 border-transparent hover:border-indigo-400/40 transition-all shrink-0"
              aria-label="Your profile"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                user.username.slice(0, 2).toUpperCase()
              )}
            </button>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* ═══════════════════════════════════════════ */}
        {/* MOBILE BOTTOM NAV — visible below md        */}
        {/* ═══════════════════════════════════════════ */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-surface/80 backdrop-blur-xl border-t border-border-token/60 flex items-center justify-around px-2 z-40"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {mobileNav.map(item => {
            const active = isActive(item.path);
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                aria-label={item.ariaLabel}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 relative ${active ? 'text-indigo-400' : 'text-muted-token'
                  }`}
              >
                <span className="relative">
                  {item.icon(active)}
                  {item.badge !== undefined && <Badge count={item.badge} />}
                </span>
                <span className={`text-[10px] font-semibold leading-none ${active ? 'text-indigo-400' : 'text-muted-token'}`}>
                  {item.name}
                </span>
                {active && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* MOBILE SLIDE-OUT MENU                       */}
      {/* ═══════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-surface border-r border-border-token z-50 md:hidden flex flex-col animate-in slide-in-from-left duration-200" role="dialog" aria-label="Mobile menu">
            <div className="h-14 flex items-center justify-between px-4 border-b border-border-token/60">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-sm text-white">N</div>
                <span className="text-lg font-black tracking-wider bg-gradient-to-r from-primary-text to-accent-token bg-clip-text text-transparent">NOVA</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-surface-hover/50 text-muted-token" aria-label="Close menu">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Mobile menu navigation">
              {[...primaryNav, ...secondaryNav, ...systemNav].map(item => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.name}
                    onClick={() => { router.push(item.path); setMobileMenuOpen(false); }}
                    aria-label={item.ariaLabel}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${active ? 'bg-indigo-500/10 text-indigo-400' : 'text-muted-token hover:bg-surface-hover/50 hover:text-primary-text'
                      }`}
                  >
                    <span className="relative">
                      {item.icon(active)}
                      {'badge' in item && item.badge !== undefined && <Badge count={item.badge as number} />}
                    </span>
                    {item.name}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-border-token/40 p-3 space-y-3">
              <button onClick={() => { router.push(profilePath); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover/30 transition">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white relative">
                  {user.username.slice(0, 2).toUpperCase()}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-surface" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-primary-text">{user.displayName}</p>
                  <p className="text-[10px] text-muted-token">@{user.username}</p>
                </div>
              </button>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-token/60 hover:border-red-500/30 hover:bg-red-500/5 px-3 py-2.5 text-xs font-bold text-muted-token hover:text-red-400 transition-all">
                {Icons.logout()}
                Log Out
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
