'use client';

import React, { useState } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import ChunkedUploader, { UploadStatus } from './ChunkedUploader';

interface MomentCreatorProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function MomentCreator({ onSuccess, onCancel }: MomentCreatorProps) {
  const accessToken = useAuthStore((state) => state.accessToken);

  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FOLLOWERS' | 'PRIVATE'>('PUBLIC');
  const [hashtagsStr, setHashtagsStr] = useState('');
  const [mentionsStr, setMentionsStr] = useState('');
  const [mediaFileId, setMediaFileId] = useState<string | null>(null);
  const [uploadingStatus, setUploadingStatus] = useState<UploadStatus>('IDLE');
  
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadSuccess = (fileId: string) => {
    setMediaFileId(fileId);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFileId) return;

    setPublishing(true);
    setError(null);

    // Parse hashtags (split by spaces or commas)
    const hashtags = hashtagsStr
      .split(/[\s,]+/)
      .filter((h) => h.trim().length > 0)
      .map((h) => (h.startsWith('#') ? h : `#${h}`));

    // Parse mentions (split by spaces or commas)
    const mentions = mentionsStr
      .split(/[\s,]+/)
      .filter((m) => m.trim().length > 0)
      .map((m) => (m.startsWith('@') ? m : `@${m}`));

    try {
      await ApiClient.post(
        '/moments',
        {
          mediaFileId,
          caption,
          visibility,
          hashtags,
          mentions,
        },
        accessToken!
      );

      // Reset
      setCaption('');
      setHashtagsStr('');
      setMentionsStr('');
      setMediaFileId(null);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to publish moment.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border-token bg-surface p-6 space-y-6 shadow-xl max-w-lg w-full mx-auto relative z-20">
      <div className="flex items-center justify-between border-b border-border-token pb-4">
        <div>
          <h3 className="text-base font-bold text-primary-text uppercase tracking-wider">Create a Moment</h3>
          <p className="text-xs text-muted-token">Share a portrait clip up to 90 seconds</p>
        </div>
        <button
          onClick={onCancel}
          disabled={publishing || uploadingStatus === 'UPLOADING' || uploadingStatus === 'PROCESSING'}
          className="text-xs font-semibold text-secondary-text hover:text-primary-text transition disabled:opacity-40"
        >
          Close
        </button>
      </div>

      <div className="space-y-4">
        {/* Step 1: Upload Video */}
        <div>
          <label className="block text-xs font-bold text-primary-text uppercase tracking-wider mb-2">
            Upload Portrait Video
          </label>
          <ChunkedUploader
            accept="video/mp4,video/quicktime,video/webm"
            maxSizeMB={500}
            onSuccess={handleUploadSuccess}
            onStatusChange={setUploadingStatus}
          />
        </div>

        {/* Step 2: Publish Metadata Form */}
        {mediaFileId && (
          <form onSubmit={handlePublish} className="space-y-4 pt-4 border-t border-border-token/40 animate-in fade-in slide-in-from-top-4 duration-300">
            {error && (
              <div className="rounded-xl border border-danger-token/20 bg-danger-token/5 p-3 text-xs text-danger-token font-medium">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-primary-text uppercase tracking-wider mb-2">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a descriptive caption..."
                rows={3}
                className="w-full rounded-xl border border-border-token bg-background px-4 py-3 text-xs text-primary-text placeholder-muted-token outline-none focus:border-accent-token transition resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-primary-text uppercase tracking-wider mb-2">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={hashtagsStr}
                  onChange={(e) => setHashtagsStr(e.target.value)}
                  placeholder="#music #nature"
                  className="w-full rounded-xl border border-border-token bg-background px-4 py-3 text-xs text-primary-text placeholder-muted-token outline-none focus:border-accent-token transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary-text uppercase tracking-wider mb-2">
                  Mentions
                </label>
                <input
                  type="text"
                  value={mentionsStr}
                  onChange={(e) => setMentionsStr(e.target.value)}
                  placeholder="@stoic_leader"
                  className="w-full rounded-xl border border-border-token bg-background px-4 py-3 text-xs text-primary-text placeholder-muted-token outline-none focus:border-accent-token transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-primary-text uppercase tracking-wider mb-2">
                Visibility Audience
              </label>
              <select
                value={visibility}
                onChange={(e: any) => setVisibility(e.target.value)}
                className="w-full rounded-xl border border-border-token bg-background px-4 py-3 text-xs text-primary-text outline-none focus:border-accent-token transition"
              >
                <option value="PUBLIC">🌍 Public Feed (Anyone can view)</option>
                <option value="FOLLOWERS">👥 Followers Only (My circle)</option>
                <option value="PRIVATE">🔒 Private (Only me)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border-token/40">
              <button
                type="button"
                onClick={onCancel}
                disabled={publishing}
                className="rounded-xl border border-border-token px-5 py-2.5 text-xs font-semibold text-secondary-text hover:bg-surface-hover transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200"
              >
                {publishing ? 'Publishing...' : '🚀 Publish Moment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
