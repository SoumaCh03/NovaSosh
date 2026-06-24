'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface PrivacySettingsData {
  defaultPostVisibility: string;
  friendRequestPolicy: string;
  messagingPolicy: string;
  taggingPolicy: string;
  mentionPolicy: string;
}

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: '🌍' },
  { value: 'FRIENDS', label: 'Friends Only', icon: '👥' },
  { value: 'FRIENDS_OF_FRIENDS', label: 'Friends of Friends', icon: '👨‍👩‍👧' },
  { value: 'ONLY_ME', label: 'Only Me', icon: '🔒' },
];

const POLICY_OPTIONS = [
  { value: 'EVERYONE', label: 'Everyone' },
  { value: 'FRIENDS', label: 'Friends Only' },
  { value: 'FRIENDS_OF_FRIENDS', label: 'Friends of Friends' },
  { value: 'NOBODY', label: 'Nobody' },
];

export default function PrivacySettingsPanel() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [settings, setSettings] = useState<PrivacySettingsData>({
    defaultPostVisibility: 'PUBLIC',
    friendRequestPolicy: 'EVERYONE',
    messagingPolicy: 'EVERYONE',
    taggingPolicy: 'EVERYONE',
    mentionPolicy: 'EVERYONE',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [accessToken]);

  const loadSettings = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await ApiClient.get<PrivacySettingsData>('/privacy', accessToken);
      setSettings({
        defaultPostVisibility: res.defaultPostVisibility || 'PUBLIC',
        friendRequestPolicy: res.friendRequestPolicy || 'EVERYONE',
        messagingPolicy: res.messagingPolicy || 'EVERYONE',
        taggingPolicy: res.taggingPolicy || 'EVERYONE',
        mentionPolicy: res.mentionPolicy || 'EVERYONE',
      });
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setSaving(true);
    setSaved(false);
    try {
      await ApiClient.patch('/privacy', settings, accessToken);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PrivacySettingsData, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border-token bg-surface p-6 shadow-sm">
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-token border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-token bg-surface p-6 shadow-sm space-y-6">
      <div>
        <h3 className="text-base font-bold text-primary-text uppercase tracking-wider mb-1">🔒 Privacy & Visibility</h3>
        <p className="text-xs text-muted-token">
          Control who can see your posts, send you friend requests, and interact with your content.
        </p>
      </div>

      {/* Default Post Visibility */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-secondary-text uppercase tracking-wider">Default Post Visibility</label>
        <p className="text-[10px] text-muted-token">Choose who can see your new posts by default</p>
        <div className="grid grid-cols-2 gap-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSetting('defaultPostVisibility', opt.value)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                settings.defaultPostVisibility === opt.value
                  ? 'border-accent-token bg-accent-token/10 text-accent-token'
                  : 'border-border-token bg-background hover:bg-surface-hover text-secondary-text hover:text-primary-text'
              }`}
            >
              <span className="text-base">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Friend Request Policy */}
      <SettingRow
        label="Who Can Send Friend Requests"
        description="Control who is allowed to send you friend requests"
        value={settings.friendRequestPolicy}
        options={POLICY_OPTIONS.filter(o => o.value !== 'FRIENDS')}
        onChange={(v) => updateSetting('friendRequestPolicy', v)}
      />

      {/* Messaging Policy */}
      <SettingRow
        label="Who Can Message You"
        description="Control who can send you direct messages"
        value={settings.messagingPolicy}
        options={POLICY_OPTIONS}
        onChange={(v) => updateSetting('messagingPolicy', v)}
      />

      {/* Tagging Policy */}
      <SettingRow
        label="Who Can Tag You"
        description="Control who can tag you in their posts"
        value={settings.taggingPolicy}
        options={POLICY_OPTIONS}
        onChange={(v) => updateSetting('taggingPolicy', v)}
      />

      {/* Mention Policy */}
      <SettingRow
        label="Who Can Mention You"
        description="Control who can mention you in comments"
        value={settings.mentionPolicy}
        options={POLICY_OPTIONS}
        onChange={(v) => updateSetting('mentionPolicy', v)}
      />

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-token/40">
        {saved && (
          <span className="text-xs font-bold text-success-token animate-in fade-in duration-200">✓ Saved successfully</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-accent-token hover:bg-accent-hover text-xs font-bold text-white transition disabled:opacity-50 shadow-lg shadow-accent-token/10"
        >
          {saving ? 'Saving...' : 'Save Privacy Settings'}
        </button>
      </div>
    </div>
  );
}

function SettingRow({ label, description, value, options, onChange }: {
  label: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-secondary-text uppercase tracking-wider">{label}</label>
      <p className="text-[10px] text-muted-token">{description}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-xs rounded-xl border border-border-token bg-background px-4 py-2.5 text-xs text-primary-text font-semibold outline-none focus:border-accent-token transition appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
