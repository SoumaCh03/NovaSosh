'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import FollowButton from './FollowButton';

interface User {
  id: string;
  profile: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

export default function UserListModal({ title, users, onClose, loading, emptyMessage }: { title: string, users: User[], onClose: () => void, loading: boolean, emptyMessage: string }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-surface border border-border-token rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-token shrink-0">
          <h2 id="modal-title" className="text-lg font-black">{title}</h2>
          <button 
            onClick={onClose} 
            aria-label="Close modal"
            className="p-2 -mr-2 rounded-xl text-muted-token hover:bg-surface-hover transition"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 no-scrollbar">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-12 w-12 rounded-full bg-surface-hover shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-surface-hover rounded"></div>
                    <div className="h-3 w-1/4 bg-surface-hover rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 px-6 text-center text-muted-token">
              <div className="text-4xl mb-4 opacity-50">👻</div>
              <p className="font-semibold text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <ul className="space-y-1 p-2">
              {users.map(u => (
                <li key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-hover/50 transition">
                  <div 
                    onClick={() => { onClose(); router.push(`/${u.profile.username}`); }}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    {u.profile.avatarUrl ? (
                      <img src={u.profile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0 border border-border-token" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-border-token">
                        {u.profile.username.slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-sm text-primary-text truncate">{u.profile.displayName}</p>
                        {u.profile.isVerified && <span className="text-[10px] text-indigo-400">✓</span>}
                      </div>
                      <p className="text-xs text-muted-token truncate">@{u.profile.username}</p>
                    </div>
                  </div>
                  
                  {/* Simplistic follow integration for demo. Real app checks initial state */}
                  <div className="pl-4 shrink-0">
                    <FollowButton targetUserId={u.id} initialIsFollowing={false} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
