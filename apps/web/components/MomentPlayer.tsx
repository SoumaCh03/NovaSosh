'use client';

import React, { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import MomentCommentDrawer from './MomentCommentDrawer';

interface Variant {
  variantType: string;
  url: string;
}

interface Moment {
  id: string;
  caption: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  mediaFile: {
    rawUrl: string;
    variants: Variant[];
  };
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
}

interface MomentPlayerProps {
  moment: Moment;
  isActive: boolean;
}

export default function MomentPlayer({ moment, isActive }: MomentPlayerProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastTapRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(moment.duration);
  const [likeCount, setLikeCount] = useState(moment.likeCount);
  const [liked, setLiked] = useState(moment.viewerHasLiked);
  const [saved, setSaved] = useState(moment.viewerHasSaved);
  const [commentCount, setCommentCount] = useState(moment.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);

  // Retrieve optimal video sources
  const hlsVariant = moment.mediaFile.variants.find((v) => v.variantType === 'HLS_PLAYLIST');
  const mp4Variant = moment.mediaFile.variants.find((v) => v.variantType === 'OPTIMIZED');
  const posterVariant = moment.mediaFile.variants.find((v) => v.variantType === 'PREVIEW');

  const videoSrc = hlsVariant?.url || mp4Variant?.url || moment.mediaFile.rawUrl;
  const posterSrc = posterVariant?.url || '';

  // Initialize player and Hls.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set initial mute state
    video.muted = muted;

    if (videoSrc.endsWith('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        video.src = videoSrc;
      }
    } else {
      video.src = videoSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoSrc]);

  // Autoplay/pause based on timeline focus
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlaying(true);
            // Trigger background view viewcount API (non-blocking)
            registerView();
          })
          .catch((err) => {
            console.error('Autoplay was blocked by browser policies:', err);
            setPlaying(false);
          });
      }
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const registerView = async () => {
    try {
      await ApiClient.post(
        `/moments/${moment.id}/view`,
        {
          watchTime: 2.0, // default view segment log
          completed: false,
          userId: user?.id || null
        }
      );
    } catch (err) {
      // Quiet fail for analytics logs
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || moment.duration);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
      setPlaying(false);
    } else {
      video.play().then(() => setPlaying(true));
    }

    // Flash Play/Pause icon overlay
    setShowPlayOverlay(true);
    setTimeout(() => {
      setShowPlayOverlay(false);
    }, 500);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    video.muted = !muted;
    setMuted(!muted);
  };

  const handleLike = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistic UI updates
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));

    try {
      await ApiClient.post(`/moments/${moment.id}/like`, {}, accessToken!);
    } catch {
      // Revert on error
      setLiked(liked);
      setLikeCount(likeCount);
    }
  };

  // Double tap to like gesture
  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      // Double tap detected
      if (!liked) {
        handleLike();
      }
      // Show heart animation
      setShowHeartAnimation(true);
      setTimeout(() => {
        setShowHeartAnimation(false);
      }, 800);
    } else {
      // Single tap - play/pause
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
    // Simple mock or save API (omitted for workspace simplicity or tied directly to Moments toggle)
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`http://localhost:3000/moments?id=${moment.id}`);
    alert('Share link copied to clipboard!');
  };

  const formatProgress = (curr: number, dur: number) => {
    const pct = (curr / (dur || 1)) * 100;
    return `${pct}%`;
  };

  return (
    <div
      onClick={handleTap}
      className="relative w-full h-[calc(100vh-80px)] max-w-[420px] mx-auto bg-black border border-border-token rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center select-none"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        loop
        playsInline
        poster={posterSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-full object-cover"
      />

      {/* Double tap heart splash overlay */}
      {showHeartAnimation && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-ping">
          <span className="text-8xl text-red-500 opacity-90">❤️</span>
        </div>
      )}

      {/* Single tap play/pause indicator overlay */}
      {showPlayOverlay && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300">
          <div className="h-16 w-16 rounded-full bg-black/40 flex items-center justify-center text-white text-2xl font-bold animate-pulse">
            {playing ? '▶️' : '⏸️'}
          </div>
        </div>
      )}

      {/* Bottom overlay timeline seek progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-border-token/40 z-20">
        <div
          className="h-full bg-accent-token transition-all duration-100"
          style={{ width: formatProgress(currentTime, duration) }}
        />
      </div>

      {/* Top action details: Creator Username and Verification */}
      <div className="absolute bottom-4 left-4 right-16 z-20 text-white space-y-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-accent-token to-indigo-400 border border-indigo-400/20 flex items-center justify-center font-bold text-xs">
            {moment.creator.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold">{moment.creator.displayName}</span>
              {moment.creator.isVerified && (
                <span className="text-[9px] text-accent-token bg-accent-token/10 px-1 py-0.2 rounded-full font-bold">✓</span>
              )}
            </div>
            <p className="text-[10px] text-white/70 font-semibold">@{moment.creator.username}</p>
          </div>
          <button className="ml-3 px-3 py-1 rounded-full bg-accent-token hover:bg-accent-hover text-[9px] font-bold text-white transition">
            Follow
          </button>
        </div>

        {moment.caption && (
          <p className="text-xs text-white/80 leading-relaxed font-medium line-clamp-2 pr-4">
            {moment.caption}
          </p>
        )}
      </div>

      {/* Right vertical utility sidebar: Engagement buttons */}
      <div className="absolute right-4 bottom-16 z-20 flex flex-col items-center gap-4 text-white">
        {/* Mute button */}
        <button
          onClick={toggleMute}
          className="h-10 w-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-sm shadow-md hover:scale-105 transition"
        >
          {muted ? '🔇' : '🔊'}
        </button>

        {/* Like button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={handleLike}
            className={`h-11 w-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-lg shadow-md hover:scale-105 transition ${
              liked ? 'text-red-500' : 'text-white'
            }`}
          >
            {liked ? '❤️' : '🤍'}
          </button>
          <span className="text-[10px] font-black">{likeCount}</span>
        </div>

        {/* Comment button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCommentsOpen(!commentsOpen);
            }}
            className="h-11 w-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-lg shadow-md hover:scale-105 transition text-white"
          >
            💬
          </button>
          <span className="text-[10px] font-black">{commentCount}</span>
        </div>

        {/* Bookmark/Save button */}
        <button
          onClick={handleSave}
          className={`h-11 w-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-lg shadow-md hover:scale-105 transition ${
            saved ? 'text-yellow-500' : 'text-white'
          }`}
        >
          {saved ? '⭐' : '☆'}
        </button>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="h-11 w-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-lg shadow-md hover:scale-105 transition text-white"
        >
          🔗
        </button>
      </div>

      {/* Expandable comments drawer overlay */}
      <MomentCommentDrawer
        momentId={moment.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={(count) => setCommentCount(count)}
      />
    </div>
  );
}
