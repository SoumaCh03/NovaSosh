'use client';

import React, { useState } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function FollowButton({ targetUserId, initialIsFollowing }: { targetUserId: string, initialIsFollowing: boolean }) {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!isAuthenticated) return alert('Please login to follow users');
    
    // Optimistic UI update
    const previousState = isFollowing;
    setIsFollowing(!isFollowing);
    setLoading(true);

    try {
      if (previousState) {
        // Unfollow
        console.log(`[Analytics] Track: user_unfollowed -> target: ${targetUserId}`);
        await ApiClient.delete(`/graph/follow/${targetUserId}`, accessToken!);
      } else {
        // Follow
        console.log(`[Analytics] Track: user_followed -> target: ${targetUserId}`);
        await ApiClient.post(`/graph/follow/${targetUserId}`, {}, accessToken!);
      }
    } catch (err) {
      // Revert optimistic UI
      setIsFollowing(previousState);
      alert('Failed to update follow status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={isFollowing ? 'Unfollow User' : 'Follow User'}
      className={`px-6 py-2 rounded-xl font-bold text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[100px] ${
        isFollowing
          ? 'bg-surface border border-border-token hover:bg-surface-hover/80 text-primary-text'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }`}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
        </svg>
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </button>
  );
}
