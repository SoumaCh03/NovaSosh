'use client';

import React, { useState } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export type FriendStatus = 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED';

export default function FriendButton({ targetUserId, initialStatus, requestId }: { targetUserId: string, initialStatus: FriendStatus, requestId?: string }) {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<FriendStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'add' | 'accept' | 'reject' | 'cancel' | 'remove') => {
    if (!isAuthenticated) return alert('Please login to manage friends');
    
    setLoading(true);
    try {
      if (action === 'add') {
        console.log(`[Analytics] Track: friend_requested -> target: ${targetUserId}`);
        await ApiClient.post(`/graph/friend/${targetUserId}`, {}, accessToken!);
        setStatus('PENDING_SENT');
      } else if (action === 'accept') {
        console.log(`[Analytics] Track: friend_accepted -> target: ${targetUserId}`);
        await ApiClient.patch(`/graph/friend/requests/${requestId}/accept`, {}, accessToken!);
        setStatus('ACCEPTED');
      } else if (action === 'reject') {
        await ApiClient.patch(`/graph/friend/requests/${requestId}/reject`, {}, accessToken!);
        setStatus('NONE');
      } else if (action === 'cancel') {
        await ApiClient.delete(`/graph/friend/requests/${requestId}/cancel`, accessToken!);
        setStatus('NONE');
      } else if (action === 'remove') {
        if(confirm('Are you sure you want to remove this friend?')) {
          await ApiClient.delete(`/graph/friend/${targetUserId}`, accessToken!);
          setStatus('NONE');
        }
      }
    } catch (err) {
      alert('Failed to update friend status');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'ACCEPTED') {
    return (
      <button onClick={() => handleAction('remove')} disabled={loading} className="px-6 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl font-bold text-sm hover:bg-danger-token/10 hover:text-danger-token hover:border-danger-token/30 transition shadow-sm flex items-center justify-center min-w-[120px]">
        {loading ? '...' : 'Friends ✓'}
      </button>
    );
  }

  if (status === 'PENDING_SENT') {
    return (
      <button onClick={() => handleAction('cancel')} disabled={loading} className="px-6 py-2 bg-surface border border-border-token rounded-xl font-bold text-sm text-muted-token hover:text-danger-token transition shadow-sm flex items-center justify-center min-w-[120px]">
        {loading ? '...' : 'Requested'}
      </button>
    );
  }

  if (status === 'PENDING_RECEIVED') {
    return (
      <div className="flex gap-2">
        <button onClick={() => handleAction('accept')} disabled={loading} className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 transition shadow-sm">
          Accept
        </button>
        <button onClick={() => handleAction('reject')} disabled={loading} className="px-4 py-2 bg-surface border border-border-token text-primary-text rounded-xl font-bold text-sm hover:bg-surface-hover transition shadow-sm">
          Decline
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => handleAction('add')} disabled={loading} className="px-6 py-2 bg-surface border border-border-token text-primary-text rounded-xl font-bold text-sm hover:bg-surface-hover transition shadow-sm flex items-center justify-center min-w-[120px]">
      {loading ? '...' : '+ Add Friend'}
    </button>
  );
}
