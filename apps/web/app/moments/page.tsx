'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import MomentPlayer from '../../components/MomentPlayer';
import MomentCreator from '../../components/MomentCreator';

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

export default function MomentsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  // Authentication validation
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load feed on mount
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadFeed();
    }
  }, [isAuthenticated, accessToken]);

  const loadFeed = async (cursor?: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const url = cursor ? `/moments/feed?cursor=${cursor}` : '/moments/feed';
      const res = await ApiClient.get<{ data: Moment[]; nextCursor: string | null }>(url, accessToken!);
      
      if (cursor) {
        setMoments((prev) => [...prev, ...res.data]);
      } else {
        setMoments(res.data);
        if (res.data.length > 0) {
          setActiveId(res.data[0].id);
        }
      }
      setNextCursor(res.nextCursor);
    } catch (err: any) {
      setError(err.message || 'Failed to load Moments timeline feed.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger infinite scroll when bottom is reached
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    if (isAtBottom && nextCursor && !loading) {
      loadFeed(nextCursor);
    }
  };

  // Observe intersecting moment slides to toggle autoplay
  useEffect(() => {
    if (moments.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-moment-id');
            if (id) {
              setActiveId(id);
            }
          }
        });
      },
      { threshold: 0.6 } // trigger when slide occupies 60% viewport height
    );

    const slides = document.querySelectorAll('.moment-slide');
    slides.forEach((s) => observer.observe(s));

    return () => {
      slides.forEach((s) => observer.unobserve(s));
    };
  }, [moments]);

  if (!isAuthenticated || !user) return null;

  return (
    <div className="flex h-screen bg-slate-950 font-sans overflow-hidden text-slate-100 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.05),transparent_40%)] pointer-events-none" />

      {/* Main timeline workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        
        {/* Floating Headers */}
        <header className="h-16 border-b border-border-token/40 px-8 flex items-center justify-between shrink-0 bg-slate-950/60 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-xs font-bold text-secondary-text hover:text-primary-text transition flex items-center gap-1"
            >
              ← Dashboard
            </button>
            <span className="text-muted-token">|</span>
            <h2 className="text-base font-black tracking-tight uppercase bg-gradient-to-r from-slate-50 to-indigo-400 bg-clip-text text-transparent">
              🎥 Moments
            </h2>
          </div>

          <button
            onClick={() => setIsCreatorOpen(true)}
            className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-accent-token to-indigo-500 hover:from-accent-hover hover:to-indigo-600 transition duration-200"
          >
            <span>+</span> Upload Moment
          </button>
        </header>

        {/* Swipe timeline viewport */}
        <div 
          onScroll={handleScroll}
          className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col py-4"
        >
          {loading && moments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-secondary-text">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-token border-t-transparent"></div>
              <p className="text-xs font-bold tracking-wide animate-pulse">Initializing Feed...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto">
              <p className="text-xs font-medium text-danger-token">⚠️ {error}</p>
              <button
                onClick={() => loadFeed()}
                className="px-4 py-2 border border-border-token rounded-xl text-xs font-bold text-accent-token hover:bg-surface-hover transition"
              >
                Retry
              </button>
            </div>
          ) : moments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center max-w-sm mx-auto p-6">
              <span className="text-4xl">🎬</span>
              <div>
                <h4 className="text-sm font-bold text-primary-text uppercase tracking-wider">No Moments Found</h4>
                <p className="text-xs text-muted-token mt-2">
                  Be the first creator to share short video moments on NOVA! Click upload to get started.
                </p>
              </div>
              <button
                onClick={() => setIsCreatorOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-accent-token hover:bg-accent-hover text-xs font-bold text-white transition shadow-md shadow-accent-token/10"
              >
                Publish First Moment
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {moments.map((moment) => (
                <div
                  key={moment.id}
                  data-moment-id={moment.id}
                  className="moment-slide w-full h-[calc(100vh-80px)] snap-start snap-always flex items-center justify-center py-4"
                >
                  <MomentPlayer
                    moment={moment}
                    isActive={activeId === moment.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Modal overlay for Moment publication */}
      {isCreatorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MomentCreator
            onSuccess={() => {
              setIsCreatorOpen(false);
              loadFeed(); // Reload moments
            }}
            onCancel={() => setIsCreatorOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
