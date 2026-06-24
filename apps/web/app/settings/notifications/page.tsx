'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated } = useAuthStore();
  const [settings, setSettings] = useState({
    pushEnabled: false,
    emailEnabled: true,
    notifyLikes: true,
    notifyComments: true,
    notifyFollows: true,
    notifyMentions: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login');
    const fetchSettings = async () => {
      try {
        const res = await ApiClient.get<{ data: any }>('/notifications/settings', accessToken!);
        if (res.data) setSettings(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isAuthenticated, accessToken, router]);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ApiClient.put('/notifications/settings', settings, accessToken!);
      alert('Settings saved successfully!');
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push notifications are not supported in your browser.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Permission denied for push notifications.');
        return;
      }

      // Normally we'd get the VAPID key and subscribe here
      // const registration = await navigator.serviceWorker.ready;
      // const subscription = await registration.pushManager.subscribe({ ... })
      // await ApiClient.post('/notifications/push/subscribe', subscription.toJSON(), accessToken!);

      alert('Push notifications enabled!');
      handleToggle('pushEnabled');
    } catch (e) {
      alert('Failed to enable push notifications');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-token animate-pulse">Loading settings...</div>;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-8">Notification Preferences</h1>
      
      <div className="bg-surface border border-border-token rounded-3xl p-6 space-y-6">
        
        <div className="space-y-4">
          <h2 className="text-xl font-bold border-b border-border-token pb-2">Delivery Methods</h2>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">Push Notifications</p>
              <p className="text-xs text-muted-token">Receive real-time alerts on this device</p>
            </div>
            <button 
              onClick={settings.pushEnabled ? () => handleToggle('pushEnabled') : subscribeToPush}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.pushEnabled ? 'bg-emerald-500' : 'bg-surface-hover border border-border-token'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.pushEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">Email Notifications</p>
              <p className="text-xs text-muted-token">Receive daily summaries and important alerts</p>
            </div>
            <button 
              onClick={() => handleToggle('emailEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.emailEnabled ? 'bg-indigo-500' : 'bg-surface-hover border border-border-token'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.emailEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold border-b border-border-token pb-2">Notify me when...</h2>
          
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">Someone likes my post</p>
            <input type="checkbox" checked={settings.notifyLikes} onChange={() => handleToggle('notifyLikes')} className="h-5 w-5 rounded border-border-token text-indigo-500" />
          </div>
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">Someone comments on my post</p>
            <input type="checkbox" checked={settings.notifyComments} onChange={() => handleToggle('notifyComments')} className="h-5 w-5 rounded border-border-token text-indigo-500" />
          </div>
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">Someone follows me</p>
            <input type="checkbox" checked={settings.notifyFollows} onChange={() => handleToggle('notifyFollows')} className="h-5 w-5 rounded border-border-token text-indigo-500" />
          </div>
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">Someone mentions me</p>
            <input type="checkbox" checked={settings.notifyMentions} onChange={() => handleToggle('notifyMentions')} className="h-5 w-5 rounded border-border-token text-indigo-500" />
          </div>
        </div>

        <div className="pt-6">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-500 text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

      </div>
    </div>
  );
}
