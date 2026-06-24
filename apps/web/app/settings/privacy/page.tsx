'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';


// Simple error boundary
class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { if (this.state.hasError) return this.props.fallback; return this.props.children; }
}

export default function PrivacySettingsWrapper() {
  return (
    <ErrorBoundary fallback={<div className="p-8 text-center text-danger-token">Something went wrong.</div>}>
      <PrivacySettingsPage />
    </ErrorBoundary>
  );
}

function PrivacySettingsPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated } = useAuthStore();
  
  const [settings, setSettings] = useState({
    defaultPostVisibility: 'PUBLIC',
    friendRequestPolicy: 'EVERYONE',
    messagingPolicy: 'EVERYONE',
    taggingPolicy: 'EVERYONE',
    mentionPolicy: 'EVERYONE',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login');
    const fetchSettings = async () => {
      try {
        const res = await ApiClient.get<{ settings: any }>('/privacy', accessToken!);
        if (res.settings) setSettings(res.settings);
      } catch (err: any) {
        showToast(err.message || 'Failed to load privacy settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [isAuthenticated, accessToken, router]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    console.log(`[Analytics] Track: privacy_updated`);
    try {
      await ApiClient.patch<{ settings: any }>('/privacy', settings, accessToken!);
      showToast('Privacy settings updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update privacy settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative">
      <div className="flex-1 overflow-y-auto relative">
        {toast && (
          <div className={`absolute top-4 right-4 px-6 py-3 rounded-xl font-bold shadow-2xl animate-in slide-in-from-top-2 z-50 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-danger-token text-white'}`}>
            {toast.message}
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full p-6 sm:p-10">
          <h1 className="text-3xl font-black mb-8">Privacy Settings</h1>

          {loading ? (
            <div className="animate-pulse space-y-6">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-surface rounded-xl w-full"></div>)}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="p-6 bg-surface border border-border-token rounded-2xl space-y-4">
                <h2 className="text-xl font-bold">Content Visibility</h2>
                <div>
                  <label className="block text-sm font-bold text-muted-token mb-1.5">Default Post Visibility</label>
                  <select value={settings.defaultPostVisibility} onChange={e => setSettings({...settings, defaultPostVisibility: e.target.value})} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none">
                    <option value="PUBLIC">Public</option>
                    <option value="FRIENDS">Friends Only</option>
                    <option value="FRIENDS_OF_FRIENDS">Friends of Friends</option>
                    <option value="PRIVATE">Only Me</option>
                  </select>
                </div>
              </div>

              <div className="p-6 bg-surface border border-border-token rounded-2xl space-y-4">
                <h2 className="text-xl font-bold">Interactions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-1.5">Who can send friend requests?</label>
                    <select value={settings.friendRequestPolicy} onChange={e => setSettings({...settings, friendRequestPolicy: e.target.value})} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none">
                      <option value="EVERYONE">Everyone</option>
                      <option value="FRIENDS_OF_FRIENDS">Friends of Friends</option>
                      <option value="NOBODY">Nobody</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-1.5">Who can message you?</label>
                    <select value={settings.messagingPolicy} onChange={e => setSettings({...settings, messagingPolicy: e.target.value})} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none">
                      <option value="EVERYONE">Everyone</option>
                      <option value="FRIENDS">Friends Only</option>
                      <option value="NOBODY">Nobody</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-1.5">Who can tag you?</label>
                    <select value={settings.taggingPolicy} onChange={e => setSettings({...settings, taggingPolicy: e.target.value})} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none">
                      <option value="EVERYONE">Everyone</option>
                      <option value="FRIENDS">Friends Only</option>
                      <option value="NOBODY">Nobody</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-1.5">Who can mention you?</label>
                    <select value={settings.mentionPolicy} onChange={e => setSettings({...settings, mentionPolicy: e.target.value})} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none">
                      <option value="EVERYONE">Everyone</option>
                      <option value="FRIENDS">Friends Only</option>
                      <option value="NOBODY">Nobody</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={saving} className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Privacy Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
