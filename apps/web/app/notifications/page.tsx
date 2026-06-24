'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';


export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await ApiClient.get<{ data: any[] }>('/notifications', accessToken!);
      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login');
    fetchNotifications();
    // Poll every 10 seconds for Live Activity
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, accessToken, router]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await ApiClient.patch(`/notifications/${id}/read`, {}, accessToken!);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await ApiClient.patch(`/notifications/all/read`, {}, accessToken!);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearRead = async () => {
    const readIds = notifications.filter(n => n.isRead).map(n => n.id);
    if (!readIds.length) return;
    try {
      await ApiClient.deleteWithBody('/notifications', { ids: readIds }, accessToken!);
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return '❤️';
      case 'COMMENT': return '💬';
      case 'FOLLOW': return '👥';
      case 'MENTION': return '🔔';
      default: return '📍';
    }
  };

  if (!isAuthenticated) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black">Notifications {unreadCount > 0 && <span className="bg-danger-token text-white text-sm px-2 py-0.5 rounded-full">{unreadCount}</span>}</h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="text-sm font-bold text-indigo-500 hover:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark all as read
            </button>
            <button 
              onClick={handleClearRead}
              className="text-sm font-bold text-danger-token hover:text-red-400"
            >
              Clear read
            </button>
            <button onClick={() => router.push('/settings/notifications')} className="p-2 bg-surface hover:bg-surface-hover rounded-full transition border border-border-token text-muted-token">
              ⚙️
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-surface rounded-2xl h-24 border border-border-token animate-pulse"></div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-3xl border border-border-token">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-2xl font-black mb-2">You're all caught up!</h2>
            <p className="text-muted-token">No new notifications at the moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div 
                key={notif.id} 
                onClick={() => handleMarkAsRead(notif.id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer ${
                  notif.isRead ? 'bg-surface border-border-token opacity-70' : 'bg-surface border-indigo-500/50 shadow-sm'
                }`}
              >
                <div className="text-2xl mt-1">{getIcon(notif.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {notif.actor?.profile?.avatarUrl ? (
                      <img src={notif.actor.profile.avatarUrl} alt="avatar" className="h-6 w-6 rounded-full" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                        {notif.actor?.profile?.username.slice(0, 2).toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="font-bold text-sm text-primary-text">{notif.actor?.profile?.displayName || 'Someone'}</span>
                  </div>
                  <p className="text-sm text-secondary-text">
                    {notif.type === 'LIKE' && 'liked your post.'}
                    {notif.type === 'COMMENT' && 'commented on your post.'}
                    {notif.type === 'FOLLOW' && 'started following you.'}
                    {notif.type === 'MENTION' && 'mentioned you.'}
                  </p>
                  <p className="text-xs text-muted-token mt-2">
                    {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {!notif.isRead && <div className="h-2.5 w-2.5 bg-indigo-500 rounded-full mt-2"></div>}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
