'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  if (!user) return null;

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const navItems = [
    { name: 'Feed', icon: '🏠', path: '/' },
    { name: 'Explore', icon: '🌍', path: '/explore' },
    { name: 'Communities', icon: '🏢', path: '/communities' },
    { name: 'Messages', icon: '💬', path: '/messages' },
    { name: 'Notifications', icon: '🔔', path: '/notifications' },
    { name: 'Creator', icon: '💎', path: '/creator-dashboard' },
    { name: 'Profile', icon: '👤', path: `/${user.username}` },
    { name: 'Settings', icon: '⚙️', path: '/settings/profile' },
  ];

  return (
    <aside className="w-64 border-r border-border-token bg-surface shrink-0 hidden md:flex flex-col relative z-20">
      <div className="h-18 flex items-center px-6 border-b border-border-token shrink-0">
        <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
             <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          NOVA
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 py-6 flex flex-col gap-8">
        <nav className="space-y-1.5">
          <p className="px-4 text-[10px] font-bold tracking-widest text-muted-token/60 uppercase mb-3">Navigation</p>
          {navItems.map(item => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-surface border border-border-token text-accent-token shadow-inner'
                    : 'text-muted-token hover:bg-surface-hover/40 hover:text-primary-text border border-transparent'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-border-token/40 pt-5 space-y-4 px-4 pb-4">
        <div className="flex items-center gap-3.5 px-2 py-1.5 rounded-xl hover:bg-surface-hover/20 transition duration-300">
          <div className="relative shrink-0">
            {user.avatarUrl ? (
               <img src={user.avatarUrl} alt="avatar" className="h-11 w-11 rounded-full object-cover border border-indigo-400/30" />
            ) : (
               <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-indigo-400/30 flex items-center justify-center font-bold text-sm text-white shadow-md">
                 {user.username.slice(0, 2).toUpperCase()}
               </div>
            )}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-primary-text truncate">{user.displayName}</p>
            </div>
            <p className="text-xs text-muted-token truncate">@{user.username}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-token hover:border-danger-token/20 bg-surface-hover/10 hover:bg-danger-token/10 py-3 text-xs font-bold text-muted-token hover:text-danger-token transition-all duration-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>
      </div>
    </aside>
  );
}
