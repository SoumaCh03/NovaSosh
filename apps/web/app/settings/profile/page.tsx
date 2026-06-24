'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';


// Simple error boundary component for React
class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function EditProfilePageWrapper() {
  return (
    <ErrorBoundary fallback={<div className="p-8 text-center text-danger-token">Something went wrong in the settings panel.</div>}>
      <EditProfilePage />
    </ErrorBoundary>
  );
}

function EditProfilePage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated } = useAuthStore();
  
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    type: 'PERSONAL',
    contactEmail: '',
    contactPhone: '',
    avatarUrl: '',
    coverUrl: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Analytics Hook stub
    console.log(`[Analytics] Track: profile_settings_view`);

    const fetchProfile = async () => {
      try {
        const res = await ApiClient.get<{ profile: any }>(`/profiles/${user!.username}`, accessToken!);
        const p = res.profile;
        setFormData({
          displayName: p.displayName || '',
          bio: p.bio || '',
          location: p.location || '',
          website: p.website || '',
          type: p.type || 'PERSONAL',
          contactEmail: p.contactEmail || '',
          contactPhone: p.contactPhone || '',
          avatarUrl: p.avatarUrl || '',
          coverUrl: p.coverUrl || '',
        });
      } catch (err: any) {
        showToast(err.message || 'Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, accessToken, isAuthenticated, router]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    console.log(`[Analytics] Track: profile_edit_save`);
    try {
      await ApiClient.patch<{ profile: any }>('/profiles/me', formData, accessToken!);
      showToast('Profile updated successfully', 'success');
      // Trigger notification integration (stub)
      console.log(`[Notification] Trigger profile_updated event`);
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Fake upload handler for demonstration
  const handleUpload = (type: 'avatarUrl' | 'coverUrl') => {
    const fakeUrl = prompt(`Enter a URL for your ${type === 'avatarUrl' ? 'Profile Picture' : 'Cover Photo'}:\n(File upload simulation)`);
    if (fakeUrl) {
      setFormData({ ...formData, [type]: fakeUrl });
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
          <h1 className="text-3xl font-black mb-8">Edit Profile</h1>

          {loading ? (
            <div className="animate-pulse space-y-8">
              <div className="h-32 bg-surface rounded-xl w-full"></div>
              <div className="h-10 bg-surface rounded-xl w-1/2"></div>
              <div className="h-24 bg-surface rounded-xl w-full"></div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-8">
              {/* Media Uploads */}
              <div className="space-y-4 p-6 bg-surface border border-border-token rounded-2xl">
                <h2 className="text-xl font-bold tracking-tight">Media</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-2">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      {formData.avatarUrl ? (
                        <img src={formData.avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover border border-border-token" />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-surface-hover border border-border-token flex items-center justify-center text-muted-token">?</div>
                      )}
                      <button type="button" aria-label="Upload Avatar" onClick={() => handleUpload('avatarUrl')} className="px-4 py-2 bg-background border border-border-token rounded-lg text-sm font-semibold hover:text-indigo-400 transition">
                        Change Avatar
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-2">Cover Photo</label>
                    <div className="flex flex-col gap-3">
                      {formData.coverUrl ? (
                        <img src={formData.coverUrl} alt="Cover" className="h-20 w-full rounded-xl object-cover border border-border-token" />
                      ) : (
                        <div className="h-20 w-full rounded-xl bg-surface-hover border border-border-token flex items-center justify-center text-muted-token text-xs">No Cover</div>
                      )}
                      <button type="button" aria-label="Upload Cover" onClick={() => handleUpload('coverUrl')} className="w-full py-2 bg-background border border-border-token rounded-lg text-sm font-semibold hover:text-indigo-400 transition">
                        Change Cover
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4 p-6 bg-surface border border-border-token rounded-2xl">
                <h2 className="text-xl font-bold tracking-tight">Basic Info</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-1.5">Display Name</label>
                    <input type="text" value={formData.displayName} onChange={e => setFormData({ ...formData, displayName: e.target.value })} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition outline-none" required />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-1.5">Bio</label>
                    <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} rows={3} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition outline-none" placeholder="Tell the world about yourself..." />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-muted-token mb-1.5">Location</label>
                      <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" placeholder="City, Country" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-muted-token mb-1.5">Website</label>
                      <input type="url" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" placeholder="https://..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4 p-6 bg-surface border border-border-token rounded-2xl">
                <h2 className="text-xl font-bold tracking-tight">Advanced Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-muted-token mb-1.5">Profile Type</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none appearance-none">
                      <option value="PERSONAL">Personal</option>
                      <option value="CREATOR">Creator</option>
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="BUSINESS">Business</option>
                      <option value="COMMUNITY">Community</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-muted-token mb-1.5">Public Contact Email</label>
                      <input type="email" value={formData.contactEmail} onChange={e => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-muted-token mb-1.5">Public Contact Phone</label>
                      <input type="tel" value={formData.contactPhone} onChange={e => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full bg-background border border-border-token rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={saving} className="px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
