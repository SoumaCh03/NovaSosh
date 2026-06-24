'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'FRIENDS_OF_FRIENDS' | 'ONLY_ME';

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; icon: string; description: string }[] = [
  { value: 'PUBLIC', label: 'Public', icon: '🌍', description: 'Anyone can see this post' },
  { value: 'FRIENDS', label: 'Friends', icon: '👥', description: 'Only your friends can see this' },
  { value: 'FRIENDS_OF_FRIENDS', label: 'Friends of Friends', icon: '👨‍👩‍👧', description: 'Friends and their friends can see this' },
  { value: 'ONLY_ME', label: 'Only Me', icon: '🔒', description: 'Only you can see this post' },
];

const SAMPLE_IMAGES = [
  { name: 'Beach Sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80' },
  { name: 'Mountain Peak', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80' },
  { name: 'Neon City', url: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&auto=format&fit=crop&q=80' },
  { name: 'Cyberpunk Setup', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80' }
];

const MAX_IMAGE_SIZE_MB = 20;
const MAX_VIDEO_SIZE_MB = 500;

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [type, setType] = useState<'TEXT' | 'IMAGE' | 'POLL'>('TEXT');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [showVisibilityPicker, setShowVisibilityPicker] = useState(false);

  // Device upload state
  const [deviceFile, setDeviceFile] = useState<File | null>(null);
  const [devicePreview, setDevicePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [uploadedMediaFileId, setUploadedMediaFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const selectedVisibility = VISIBILITY_OPTIONS.find(v => v.value === visibility)!;

  const handleDeviceFile = (file: File) => {
    setError(null);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const sizeMB = file.size / (1024 * 1024);

    if (!isImage && !isVideo) {
      setError('Please select an image or video file.');
      return;
    }
    if (isImage && sizeMB > MAX_IMAGE_SIZE_MB) {
      setError(`Image exceeds ${MAX_IMAGE_SIZE_MB} MB limit.`);
      return;
    }
    if (isVideo && sizeMB > MAX_VIDEO_SIZE_MB) {
      setError(`Video exceeds ${MAX_VIDEO_SIZE_MB} MB limit.`);
      return;
    }

    setDeviceFile(file);
    setImageUrl('');
    setCustomImageUrl(false);

    // Generate preview
    const previewUrl = URL.createObjectURL(file);
    setDevicePreview(previewUrl);

    // Auto-set type
    if (isImage) setType('IMAGE');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files.length > 0) {
      handleDeviceFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleDeviceFile(e.target.files[0]);
    }
  };

  const clearDeviceFile = () => {
    setDeviceFile(null);
    if (devicePreview) URL.revokeObjectURL(devicePreview);
    setDevicePreview(null);
    setUploadedMediaFileId(null);
    setUploadProgress(0);
    setUploadStatus('IDLE');
  };

  const uploadDeviceFile = async (): Promise<string | null> => {
    if (!deviceFile || !accessToken) return null;
    setUploadStatus('UPLOADING');
    setUploadProgress(0);

    try {
      // 1. Init upload session
      const initRes = await ApiClient.post<{ uploadId: string; chunkSize: number; totalChunks: number }>(
        '/media/upload/init',
        { fileName: deviceFile.name, mimeType: deviceFile.type, fileSize: deviceFile.size },
        accessToken
      );

      const { uploadId, chunkSize, totalChunks } = initRes;

      // 2. Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, deviceFile.size);
        const chunk = deviceFile.slice(start, end);

        const formData = new FormData();
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', i.toString());
        formData.append('chunk', chunk, 'chunk');

        abortRef.current = new AbortController();

        const response = await fetch('http://localhost:4000/api/v1/media/upload/chunk', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: formData,
          signal: abortRef.current.signal,
        });

        if (!response.ok) throw new Error(`Chunk ${i} upload failed`);
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 80));
      }

      // 3. Complete upload
      setUploadStatus('PROCESSING');
      const completeRes = await ApiClient.post<{ mediaFile: { id: string }; jobId: string }>(
        '/media/upload/complete',
        { uploadId },
        accessToken
      );

      // 4. Poll processing job
      const mediaFileId = completeRes.mediaFile.id;
      const jobId = completeRes.jobId;

      await new Promise<void>((resolve, reject) => {
        const timer = setInterval(async () => {
          try {
            const job = await ApiClient.get<{ status: string; progress: number; error: string | null }>(
              `/media/jobs/${jobId}`,
              accessToken
            );
            if (job.status === 'COMPLETED') {
              clearInterval(timer);
              setUploadProgress(100);
              setUploadStatus('COMPLETED');
              resolve();
            } else if (job.status === 'FAILED') {
              clearInterval(timer);
              setUploadStatus('FAILED');
              reject(new Error(job.error || 'Media processing failed'));
            } else {
              setUploadProgress(80 + Math.round(job.progress * 0.2));
            }
          } catch (err) {
            clearInterval(timer);
            reject(err);
          }
        }, 1500);
      });

      setUploadedMediaFileId(mediaFileId);
      return mediaFileId;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setUploadStatus('FAILED');
        setError(err.message || 'Upload failed.');
      }
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let mediaUrls: string[] = [];
      let mediaFileId: string | null = uploadedMediaFileId;

      // If device file selected but not yet uploaded, upload it now
      if (deviceFile && !uploadedMediaFileId) {
        mediaFileId = await uploadDeviceFile();
        if (!mediaFileId && deviceFile) {
          setLoading(false);
          return; // upload failed
        }
      }

      // If using URL-based image
      if (!deviceFile && type === 'IMAGE' && imageUrl) {
        mediaUrls = [imageUrl];
      }

      await ApiClient.post('/posts', {
        type: deviceFile ? (deviceFile.type.startsWith('video/') ? 'VIDEO' : 'IMAGE') : type,
        caption,
        mediaUrls,
        mediaFileId: mediaFileId || undefined,
        visibility,
        ...(type === 'POLL' ? { pollOptions: pollOptions.filter(o => o.trim() !== '') } : {})
      }, accessToken!);

      // Clear fields
      setCaption('');
      setImageUrl('');
      setType('TEXT');
      setPollOptions(['', '']);
      setVisibility('PUBLIC');
      clearDeviceFile();
      onPostCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-token p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] rounded-2xl border border-border-token bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        <div className="flex items-center justify-between border-b border-border-token px-6 py-4 shrink-0">
          <h3 className="text-base font-bold text-primary-text uppercase tracking-wider">Create New Post</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-token hover:bg-surface-hover hover:text-secondary-text transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-xl border border-danger-token/20 bg-danger-token/10 p-3 text-xs text-danger-token">
              {error}
            </div>
          )}

          {/* Visibility Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVisibilityPicker(!showVisibilityPicker)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-token bg-background hover:bg-surface-hover text-xs font-semibold text-secondary-text transition-all duration-200"
            >
              <span>{selectedVisibility.icon}</span>
              <span>{selectedVisibility.label}</span>
              <svg className={`h-3.5 w-3.5 ml-1 transition-transform ${showVisibilityPicker ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showVisibilityPicker && (
              <div className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border border-border-token bg-surface shadow-xl z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setVisibility(opt.value); setShowVisibilityPicker(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-hover ${
                      visibility === opt.value ? 'bg-accent-token/10' : ''
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <div>
                      <p className={`text-xs font-bold ${visibility === opt.value ? 'text-accent-token' : 'text-primary-text'}`}>{opt.label}</p>
                      <p className="text-[10px] text-muted-token">{opt.description}</p>
                    </div>
                    {visibility === opt.value && (
                      <span className="ml-auto text-accent-token text-sm">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Select Post Type */}
          <div>
            <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
              Post Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setType('TEXT'); clearDeviceFile(); }}
                className={`py-3.5 rounded-xl border text-sm font-semibold transition ${
                  type === 'TEXT' && !deviceFile
                    ? 'border-accent-token bg-accent-token/10 text-accent-token'
                    : 'border-border-token bg-background/30 text-secondary-text hover:border-surface-hover'
                }`}
              >
                📝 Text
              </button>
              <button
                type="button"
                onClick={() => setType('IMAGE')}
                className={`py-3.5 rounded-xl border text-sm font-semibold transition ${
                  type === 'IMAGE' || deviceFile
                    ? 'border-accent-token bg-accent-token/10 text-accent-token'
                    : 'border-border-token bg-background/30 text-secondary-text hover:border-surface-hover'
                }`}
              >
                🖼️ Media
              </button>
              <button
                type="button"
                onClick={() => { setType('POLL'); clearDeviceFile(); }}
                className={`py-3.5 rounded-xl border text-sm font-semibold transition ${
                  type === 'POLL'
                    ? 'border-accent-token bg-accent-token/10 text-accent-token'
                    : 'border-border-token bg-background/30 text-secondary-text hover:border-surface-hover'
                }`}
              >
                📊 Poll
              </button>
            </div>
          </div>

          {/* Caption Input */}
          <div>
            <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
              Caption
            </label>
            <textarea
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full rounded-xl border border-border-token bg-background/50 px-4 py-3 text-sm text-primary-text placeholder-muted-token outline-none focus:border-accent-token transition resize-none"
            />
          </div>

          {/* Poll Options */}
          {type === 'POLL' && (
            <div>
              <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider mb-2">
                Poll Options
              </label>
              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[idx] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      className="flex-1 rounded-xl border border-border-token bg-background/50 px-4 py-2 text-sm outline-none focus:border-accent-token"
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="text-danger-token p-2">✕</button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 5 && (
                  <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-accent-token font-bold mt-2 hover:underline">
                    + Add Option
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Device File Upload Zone */}
          {(type === 'IMAGE' || deviceFile) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-secondary-text uppercase tracking-wider">
                  Upload from Device
                </label>
                {!deviceFile && (
                  <button
                    type="button"
                    onClick={() => setCustomImageUrl(!customImageUrl)}
                    className="text-xs text-accent-token hover:text-accent-hover font-semibold"
                  >
                    {customImageUrl ? 'Choose Sample Image' : 'Enter URL Instead'}
                  </button>
                )}
              </div>

              {deviceFile ? (
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="relative rounded-xl overflow-hidden border border-border-token bg-background max-h-[200px] flex items-center justify-center">
                    {deviceFile.type.startsWith('image/') ? (
                      <img src={devicePreview!} alt="Upload preview" className="w-full max-h-[200px] object-cover" />
                    ) : (
                      <video src={devicePreview!} className="w-full max-h-[200px] object-cover" muted />
                    )}
                    <button
                      type="button"
                      onClick={clearDeviceFile}
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-danger-token/80 text-white text-xs flex items-center justify-center hover:bg-danger-token transition"
                    >
                      ✕
                    </button>
                  </div>
                  {/* File info */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary-text font-semibold truncate max-w-[200px]">{deviceFile.name}</span>
                    <span className="text-muted-token">{(deviceFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                  {/* Upload progress */}
                  {(uploadStatus === 'UPLOADING' || uploadStatus === 'PROCESSING') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-secondary-text">
                        <span>{uploadStatus === 'UPLOADING' ? 'Uploading...' : 'Processing...'}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border-token">
                        <div className="h-full bg-gradient-to-r from-accent-token to-indigo-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ) : !customImageUrl ? (
                /* Drag & Drop Zone */
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-border-token hover:border-accent-token rounded-2xl p-6 text-center bg-surface-hover/10 hover:bg-surface-hover/20 transition-all duration-300 relative cursor-pointer"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <span className="text-3xl block">📤</span>
                    <div className="text-xs font-bold text-primary-text">
                      Drag & drop or <span className="text-accent-token underline">browse files</span>
                    </div>
                    <p className="text-[10px] text-muted-token">
                      Images up to {MAX_IMAGE_SIZE_MB} MB · Videos up to {MAX_VIDEO_SIZE_MB} MB
                    </p>
                  </div>
                </div>
              ) : (
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-xl border border-border-token bg-background/50 px-4 py-3 text-sm text-primary-text outline-none focus:border-accent-token transition"
                />
              )}

              {/* Sample images (shown when no device file and not custom URL mode) */}
              {!deviceFile && !customImageUrl && (
                <div>
                  <p className="text-[10px] text-muted-token font-semibold uppercase tracking-wider mb-2">Or select a sample image</p>
                  <div className="grid grid-cols-4 gap-2">
                    {SAMPLE_IMAGES.map((img) => (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => setImageUrl(img.url)}
                        className={`flex flex-col items-center p-1.5 rounded-lg border text-xs text-left transition ${
                          imageUrl === img.url
                            ? 'border-accent-token bg-accent-token/10 text-accent-token'
                            : 'border-border-token/80 bg-background/30 text-secondary-text hover:border-surface-hover'
                        }`}
                      >
                        <img src={img.url} alt={img.name} className="h-12 w-full object-cover rounded mb-1" />
                        <span className="font-medium truncate max-w-full text-[9px]">{img.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-token/50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border-token px-5 py-2.5 text-xs font-semibold text-secondary-text hover:bg-surface-hover transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (type === 'IMAGE' && !imageUrl && !deviceFile)}
              className="rounded-xl bg-accent-token px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-accent-hover disabled:bg-surface-hover disabled:text-muted-token transition duration-200"
            >
              {loading ? (uploadStatus === 'UPLOADING' ? 'Uploading...' : uploadStatus === 'PROCESSING' ? 'Processing...' : 'Creating...') : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
