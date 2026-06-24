'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export type UploadStatus = 'IDLE' | 'UPLOADING' | 'PAUSED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface ChunkedUploaderProps {
  accept: string;
  maxSizeMB: number;
  onSuccess: (mediaFileId: string) => void;
  onStatusChange?: (status: UploadStatus) => void;
}

export default function ChunkedUploader({ accept, maxSizeMB, onSuccess, onStatusChange }: ChunkedUploaderProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  
  const [status, setStatusState] = useState<UploadStatus>('IDLE');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const statusRef = useRef<UploadStatus>('IDLE');
  const uploadIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileRef = useRef<File | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const totalChunksRef = useRef<number>(0);
  const chunkSizeRef = useRef<number>(5 * 1024 * 1024); // 5MB default

  const setStatus = (s: UploadStatus) => {
    setStatusState(s);
    statusRef.current = s;
    if (onStatusChange) onStatusChange(s);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (status !== 'IDLE' && status !== 'FAILED' && status !== 'COMPLETED') return;
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setError(null);
    setProgress(0);
    
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File is too large. Maximum size is ${maxSizeMB} MB.`);
      return;
    }

    fileRef.current = file;
    chunkIndexRef.current = 0;
    startUpload();
  };

  const startUpload = async () => {
    const file = fileRef.current;
    if (!file) return;

    setStatus('UPLOADING');
    setError(null);

    try {
      // 1. Init Upload Session
      const initRes = await ApiClient.post<{ uploadId: string; chunkSize: number; totalChunks: number }>(
        '/media/upload/init',
        {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
        accessToken!
      );

      uploadIdRef.current = initRes.uploadId;
      chunkSizeRef.current = initRes.chunkSize;
      totalChunksRef.current = initRes.totalChunks;
      chunkIndexRef.current = 0;

      // 2. Start chunk uploading loop
      uploadNextChunk();
    } catch (err: any) {
      setStatus('FAILED');
      setError(err.message || 'Failed to initialize upload.');
    }
  };

  const uploadNextChunk = async () => {
    if (statusRef.current === 'PAUSED') return;
    if (statusRef.current === 'IDLE' || !uploadIdRef.current || !fileRef.current) return;

    const file = fileRef.current;
    const uploadId = uploadIdRef.current;
    const chunkIndex = chunkIndexRef.current;
    const totalChunks = totalChunksRef.current;
    const chunkSize = chunkSizeRef.current;

    if (chunkIndex >= totalChunks) {
      // Merge and complete upload
      completeUpload();
      return;
    }

    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('chunk', chunkBlob, 'chunk');

    abortControllerRef.current = new AbortController();

    try {
      // Direct raw fetch to pass form data and signal abort controller
      const response = await fetch('http://localhost:4000/api/v1/media/upload/chunk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload chunk ${chunkIndex}. Status: ${response.status}`);
      }

      // Increment chunk index and continue
      chunkIndexRef.current += 1;
      setProgress(Math.round((chunkIndexRef.current / totalChunks) * 80)); // 80% represents upload stage
      uploadNextChunk();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Paused or cancelled
        return;
      }
      setStatus('FAILED');
      setError(err.message || 'Chunk upload failed.');
    }
  };

  const completeUpload = async () => {
    setStatus('PROCESSING');
    try {
      const res = await ApiClient.post<{ mediaFile: { id: string }; jobId: string }>(
        '/media/upload/complete',
        { uploadId: uploadIdRef.current },
        accessToken!
      );

      // Start polling transcode progress
      pollJobStatus(res.jobId, res.mediaFile.id);
    } catch (err: any) {
      setStatus('FAILED');
      setError(err.message || 'Failed to complete upload.');
    }
  };

  const pollJobStatus = async (jobId: string, mediaFileId: string) => {
    const timer = setInterval(async () => {
      if (statusRef.current !== 'PROCESSING') {
        clearInterval(timer);
        return;
      }

      try {
        const job = await ApiClient.get<{ status: string; progress: number; error: string | null }>(
          `/media/jobs/${jobId}`,
          accessToken!
        );

        if (job.status === 'COMPLETED') {
          clearInterval(timer);
          setProgress(100);
          setStatus('COMPLETED');
          onSuccess(mediaFileId);
        } else if (job.status === 'FAILED') {
          clearInterval(timer);
          setStatus('FAILED');
          setError(job.error || 'Media processing failed.');
        } else {
          // Scale remaining 20% for transcode operations
          const transcodeProgress = 80 + Math.round(job.progress * 0.2);
          setProgress(Math.min(transcodeProgress, 99));
        }
      } catch (err: any) {
        clearInterval(timer);
        setStatus('FAILED');
        setError(err.message || 'Error tracking processing job.');
      }
    }, 1500);
  };

  const pauseUpload = () => {
    if (status !== 'UPLOADING') return;
    setStatus('PAUSED');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const resumeUpload = () => {
    if (status !== 'PAUSED') return;
    setStatus('UPLOADING');
    uploadNextChunk();
  };

  const cancelUpload = async () => {
    if (status === 'IDLE' || status === 'COMPLETED') return;
    
    setStatus('IDLE');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (uploadIdRef.current) {
      try {
        await ApiClient.post('/media/upload/abort', { uploadId: uploadIdRef.current }, accessToken!);
      } catch (err) {
        console.error('Failed to abort upload session:', err);
      }
    }

    // Reset values
    fileRef.current = null;
    uploadIdRef.current = null;
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      {status === 'IDLE' || status === 'FAILED' || status === 'COMPLETED' ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-border-token hover:border-accent-token rounded-2xl p-8 text-center bg-surface-hover/20 hover:bg-surface-hover/30 transition-all duration-300 relative cursor-pointer"
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <div className="space-y-3">
            <span className="text-4xl block">📤</span>
            <div className="text-sm font-bold text-primary-text">
              Drag & Drop file here or <span className="text-accent-token underline">Browse file</span>
            </div>
            <p className="text-xs text-muted-token">
              Supports portrait videos up to {maxSizeMB} MB
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-border-token bg-surface rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-sm font-bold text-primary-text truncate">{fileRef.current?.name}</p>
              <p className="text-xs text-muted-token mt-0.5">
                {status === 'UPLOADING' && 'Uploading raw segments...'}
                {status === 'PAUSED' && 'Upload paused'}
                {status === 'PROCESSING' && 'Transcoding video HLS playlists...'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {status === 'UPLOADING' && (
                <button
                  type="button"
                  onClick={pauseUpload}
                  className="px-2.5 py-1 text-[10px] font-bold text-secondary-text hover:text-primary-text border border-border-token rounded-lg transition"
                >
                  Pause
                </button>
              )}
              {status === 'PAUSED' && (
                <button
                  type="button"
                  onClick={resumeUpload}
                  className="px-2.5 py-1 text-[10px] font-bold text-accent-token border border-accent-token/20 hover:bg-accent-token/10 rounded-lg transition"
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={cancelUpload}
                className="px-2.5 py-1 text-[10px] font-bold text-danger-token border border-danger-token/20 hover:bg-danger-token/10 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-secondary-text">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border-token">
              <div
                className="h-full bg-gradient-to-r from-accent-token to-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger-token/20 bg-danger-token/5 p-4 text-xs font-medium text-danger-token">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
