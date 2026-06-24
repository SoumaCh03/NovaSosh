'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import ThemeSelector from '../components/ThemeSelector';
import PrivacySettings from '../components/PrivacySettings';

interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
}

interface Media {
  id: string;
  rawUrl: string;
}

interface Post {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'POLL';
  caption: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: Author;
  media: Media[];
  viewerHasLiked: boolean;
}

interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  deviceLabel: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);

  const [activeTab, setActiveTab] = useState<'feed' | 'settings'>('feed');
  const [feedType, setFeedType] = useState<'recommended' | 'following'>('recommended');
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Global Create Post Listener
  useEffect(() => {
    const handleCreatePost = () => setIsCreateOpen(true);
    window.addEventListener('nova:create-post', handleCreatePost);
    return () => window.removeEventListener('nova:create-post', handleCreatePost);
  }, []);

  // Verification/Auth redirection
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load feed on mount or auth load or feedType change
  useEffect(() => {
    if (isAuthenticated && accessToken && activeTab === 'feed') {
      loadFeed();
    }
  }, [isAuthenticated, accessToken, activeTab, feedType]);

  // Load active sessions when settings tab is viewed
  useEffect(() => {
    if (activeTab === 'settings' && accessToken) {
      loadSessions();
    }
  }, [activeTab, accessToken]);

  const loadFeed = async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const res = await ApiClient.get<{ data: Post[] }>(`/feed/${feedType}`, accessToken!);
      setPosts(res.data);
    } catch (err: any) {
      setPostsError(err.message || 'Failed to load recommended feed');
    } finally {
      setPostsLoading(false);
    }
  };

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await ApiClient.get<{ data: Session[] }>('/auth/sessions', accessToken!);
      setSessions(res.data);
    } catch (err: any) {
      setSessionsError(err.message || 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await ApiClient.delete(`/auth/sessions/${sessionId}`, accessToken!);
      loadSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke session');
    }
  };

  const handleLogout = async () => {
    try {
      await ApiClient.post('/auth/logout', {}, accessToken!);
    } catch {
      // Ignore network errors on logout
    } finally {
      clearSession();
      router.push('/login');
    }
  };

  if (!isAuthenticated || !user) {
    return null; // AuthHydrator/Layout handles rendering loading states
  }

  return (
    <div className="w-full h-full relative">
        {/* Blurred header background */}
        <header className="h-18 border-b border-border-token px-8 flex items-center justify-between shrink-0 bg-background/65 backdrop-blur-md sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary-text flex items-center gap-2">
              {activeTab === 'feed' ? '✨ Feed' : '⚙️ Interface & Security Settings'}
            </h2>
            <p className="text-[11px] text-muted-token font-medium">
              {activeTab === 'feed'
                ? 'Discover updates and popular posts on NOVA'
                : 'Customize your visual theme and monitor active device sessions'}
            </p>
          </div>
          {activeTab === 'feed' && (
            <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <button 
                onClick={() => setFeedType('recommended')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${feedType === 'recommended' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-token hover:bg-surface-hover hover:text-primary-text'}`}
              >
                For You
              </button>
              <button 
                onClick={() => setFeedType('following')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${feedType === 'following' ? 'bg-indigo-500 text-white shadow-md' : 'text-muted-token hover:bg-surface-hover hover:text-primary-text'}`}
              >
                Following
              </button>
            </div>
          )}
          {activeTab === 'feed' && (
            <button
              onClick={loadFeed}
              disabled={postsLoading}
              className="p-2 rounded-xl border border-border-token bg-surface hover:border-border-token text-muted-token hover:text-primary-text transition duration-200 disabled:opacity-40"
              title="Refresh Feed"
            >
              <svg className={`h-4.5 w-4.5 ${postsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
              </svg>
            </button>
          )}
        </header>

        {/* Scrollable workspace */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl w-full mx-auto">
            {activeTab === 'feed' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Main Post Feed Timeline (8 columns on lg screens) */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Quick Post Creator Trigger Card */}
                  <div 
                    onClick={() => setIsCreateOpen(true)}
                    className="rounded-2xl border border-border-token bg-surface p-5 backdrop-blur-md flex items-center gap-4 hover:border-border-token hover:bg-surface-hover/30 cursor-pointer transition-all duration-300"
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white">
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-background border border-border-token rounded-xl px-4 py-2.5 text-xs text-muted-token font-medium">
                      What's on your mind, {user.displayName}? Share a photo or a thought...
                    </div>
                    <button className="h-9 w-9 rounded-xl bg-background border border-border-token flex items-center justify-center text-muted-token hover:text-indigo-400 transition">
                      📷
                    </button>
                  </div>

                  {/* Feed Loaders / Errors / List */}
                  {postsLoading && posts.length === 0 ? (
                    <div className="space-y-6">
                      {[1, 2].map((n) => (
                        <div key={n} className="rounded-2xl border border-border-token bg-surface p-6 animate-pulse space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-background" />
                            <div className="space-y-2 flex-1">
                              <div className="h-3 w-1/3 bg-background" />
                              <div className="h-2 w-1/4 bg-background" />
                            </div>
                          </div>
                          <div className="h-24 bg-background rounded-xl" />
                          <div className="h-4 w-1/5 bg-background" />
                        </div>
                      ))}
                    </div>
                  ) : postsError ? (
                    <div className="rounded-2xl border border-danger-token/20 bg-danger-token/5 p-6 text-center space-y-3">
                      <p className="text-sm text-danger-token font-medium">{postsError}</p>
                      <button
                        onClick={loadFeed}
                        className="px-4 py-2 rounded-xl bg-danger-token/10 hover:bg-danger-token/20 border border-danger-token/20 text-xs font-bold text-danger-token transition"
                      >
                        Try Loading Again
                      </button>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="rounded-2xl border border-border-token bg-surface p-12 text-center space-y-4">
                      <div className="text-3xl">✨</div>
                      <h4 className="text-sm font-bold text-primary-text uppercase tracking-wider">No feed posts found</h4>
                      <p className="text-xs text-muted-token max-w-sm mx-auto">
                        Be the first to share an update! Click the 'Create New Post' button to kickstart the feed timeline.
                      </p>
                      <button
                        onClick={() => setIsCreateOpen(true)}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/10"
                      >
                        Create First Post
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Side: Suggested Accounts & Profile Summary (4 columns on lg screens) */}
                <div className="lg:col-span-4 space-y-6 hidden lg:block sticky top-24">
                  {/* User Profile Mini Card */}
                  <div className="rounded-2xl border border-border-token bg-surface p-6 backdrop-blur-md space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-indigo-400/20 flex items-center justify-center font-bold text-sm text-white">
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-primary-text truncate">{user.displayName}</p>
                          <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded-full font-bold">✓</span>
                        </div>
                        <p className="text-xs text-muted-token truncate">@{user.username}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-border-token/40 pt-4 text-center">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-token font-semibold uppercase tracking-wider">Followers</p>
                        <p className="text-sm font-black text-primary-text">142</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-token font-semibold uppercase tracking-wider">Following</p>
                        <p className="text-sm font-black text-primary-text">98</p>
                      </div>
                    </div>
                  </div>

                  {/* Suggested Accounts Section */}
                  <div className="rounded-2xl border border-border-token bg-surface p-6 backdrop-blur-md space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-muted-token uppercase tracking-widest">Suggested For You</h4>
                      <button className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold">See All</button>
                    </div>
                    <div className="space-y-4">
                      {[
                        { name: 'Marcus Aurelius', username: 'stoic_leader', color: 'from-amber-500 to-orange-500' },
                        { name: 'Sarah Connor', username: 'cyber_rebel', color: 'from-emerald-500 to-teal-500' },
                        { name: 'Nova Devs', username: 'nova_official', color: 'from-pink-500 to-rose-500', verified: true }
                      ].map((item) => (
                        <div key={item.username} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-8.5 w-8.5 rounded-full bg-gradient-to-tr ${item.color} flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-md`}>
                              {item.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-primary-text truncate">{item.name}</p>
                                {item.verified && <span className="text-[8px] text-indigo-400 bg-indigo-500/10 px-0.5 rounded-full font-bold">✓</span>}
                              </div>
                              <p className="text-[10px] text-muted-token truncate">@{item.username}</p>
                            </div>
                          </div>
                          <button className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg hover:bg-indigo-500/10 transition">
                            Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* Settings view containing ThemeSelector and Connected Devices list */
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Theme Selector */}
                <ThemeSelector />

                {/* Privacy Settings */}
                <PrivacySettings />

                {/* Connected Devices */}
                <div className="rounded-2xl border border-border-token bg-surface p-6 shadow-sm">
                  <h3 className="text-base font-bold text-primary-text uppercase tracking-wider mb-2">Connected Devices</h3>
                  <p className="text-xs text-muted-token mb-6">
                    A list of browser and device sessions that are currently authenticated to access your account. You can revoke access for any session at any time.
                  </p>

                  {sessionsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-token border-t-transparent"></div>
                    </div>
                  ) : sessionsError ? (
                    <p className="text-xs text-danger-token font-semibold">{sessionsError}</p>
                  ) : (
                    <div className="space-y-4">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-4.5 rounded-xl bg-background border border-border-token hover:border-surface-hover transition duration-200"
                        >
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-primary-text truncate">
                                {session.userAgent || 'Unknown Device / Browser'}
                              </p>
                              {session.id === accessToken?.split('.')[1] && (
                                <span className="text-[9px] font-black text-success-token bg-success-token/10 border border-success-token/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 text-xs text-muted-token mt-1.5">
                              <span>IP Address: {session.ipAddress || 'unknown'}</span>
                              <span>•</span>
                              <span>Linked: {new Date(session.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            className="shrink-0 rounded-xl border border-danger-token/20 bg-danger-token/5 hover:bg-danger-token/10 px-4 py-2 text-xs font-bold text-danger-token hover:border-danger-token/35 transition duration-200"
                          >
                            Revoke
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>


      {/* Modal interface for creating posts */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={loadFeed}
      />
    </div>
  );
}
