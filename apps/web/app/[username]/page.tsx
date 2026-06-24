'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

import FollowButton from '../../components/FollowButton';
import FriendButton from '../../components/FriendButton';
import UserListModal from '../../components/UserListModal';

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

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-4xl mx-auto w-full">
      <div className="h-48 bg-surface border border-border-token rounded-xl w-full"></div>
      <div className="flex px-6 items-end -mt-12 gap-4">
        <div className="h-24 w-24 rounded-full bg-surface border-4 border-background"></div>
        <div className="flex-1 space-y-2 pb-2">
          <div className="h-6 w-1/3 bg-surface rounded"></div>
          <div className="h-4 w-1/4 bg-surface rounded"></div>
        </div>
      </div>
      <div className="px-6 space-y-4">
        <div className="h-4 w-2/3 bg-surface rounded"></div>
        <div className="h-4 w-1/2 bg-surface rounded"></div>
        <div className="flex gap-4">
          <div className="h-4 w-16 bg-surface rounded"></div>
          <div className="h-4 w-16 bg-surface rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePageWrapper(props: { params: Promise<{ username: string }> }) {
  const params = React.use(props.params);
  return (
    <ErrorBoundary fallback={<div className="p-8 text-center text-danger-token">Something went wrong loading this profile.</div>}>
      <ProfilePage username={params.username} />
    </ErrorBoundary>
  );
}

function ProfilePage({ username }: { username: string }) {
  const router = useRouter();
  const accessToken = useAuthStore(s => s.accessToken);
  const currentUser = useAuthStore(s => s.user);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Graph state
  const [listConfig, setListConfig] = useState<{ type: 'followers' | 'following' | 'friends', title: string } | null>(null);
  const [listUsers, setListUsers] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const openList = async (type: 'followers' | 'following' | 'friends', title: string) => {
    if (!profile) return;
    setListConfig({ type, title });
    setListLoading(true);
    setListUsers([]);
    try {
      const res = await ApiClient.get<{ [key: string]: any[] }>(`/graph/${profile.user.id}/${type}`, accessToken!);
      setListUsers(res[type] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    // Analytics Hook stub
    console.log(`[Analytics] Track: profile_view -> ${username}`);

    const fetchProfile = async () => {
      try {
        setLoading(true);
        // We might not be authenticated, but we try sending the token if we have it
        const res = await ApiClient.get<{ profile: any }>(`/profiles/${username}`, accessToken || undefined);
        setProfile(res.profile);
      } catch (err: any) {
        if (err.statusCode === 404) {
          setError('PROFILE_NOT_FOUND');
        } else {
          setError(err.message || 'Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, accessToken]);

  const isOwner = currentUser?.username === username;

  return (
    <div className="overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full pb-12">
          {loading ? (
            <div className="mt-8"><ProfileSkeleton /></div>
          ) : error === 'PROFILE_NOT_FOUND' ? (
            <div className="mt-32 flex flex-col items-center justify-center text-center space-y-4 px-4">
              <div className="h-24 w-24 rounded-full bg-surface border border-border-token flex items-center justify-center text-4xl">🤔</div>
              <h2 className="text-2xl font-bold">Profile Not Found</h2>
              <p className="text-muted-token">The user @{username} doesn't exist or has been deleted.</p>
              <button onClick={() => router.push('/')} className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition">Go Home</button>
            </div>
          ) : error ? (
            <div className="mt-12 text-center text-danger-token px-4 bg-danger-token/10 py-4 rounded-xl max-w-lg mx-auto">
              <p className="font-bold">Error loading profile</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : profile ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Cover Photo */}
              <div className="h-48 sm:h-64 w-full bg-surface border-b border-border-token relative">
                {profile.coverUrl && (
                  <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              </div>

              {/* Profile Info Header */}
              <div className="px-6 sm:px-8 flex flex-col sm:flex-row gap-4 sm:items-end -mt-16 sm:-mt-12 relative z-10">
                <div className="relative inline-block">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={`${profile.displayName}'s avatar`} className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-background object-cover bg-surface" />
                  ) : (
                    <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-background bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white shadow-xl">
                      {profile.username.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {profile.isVerified && (
                    <div className="absolute bottom-1 right-1 h-8 w-8 bg-indigo-500 text-white rounded-full flex items-center justify-center border-2 border-background shadow-lg" title="Verified">✓</div>
                  )}
                </div>

                <div className="flex-1 pb-2 space-y-1">
                  <h1 className="text-3xl font-black tracking-tight">{profile.displayName}</h1>
                  <p className="text-muted-token font-medium">@{profile.username} • {profile.type}</p>
                </div>

                <div className="pb-4 flex gap-2">
                  {isOwner ? (
                    <button onClick={() => router.push('/settings/profile')} aria-label="Edit Profile" className="px-6 py-2 bg-surface border border-border-token rounded-xl font-bold text-sm hover:bg-surface-hover transition shadow-sm">
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      {/* Using false for demo. In a real app, initial state is fetched from the profile API */}
                      <FollowButton targetUserId={profile.user.id} initialIsFollowing={false} />
                      <FriendButton targetUserId={profile.user.id} initialStatus={'NONE'} />
                    </>
                  )}
                </div>
              </div>

              {/* Bio & Stats */}
              <div className="px-6 sm:px-8 mt-6 space-y-6">
                {profile.bio && (
                  <p className="text-primary-text leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-token font-medium">
                  {profile.location && <div className="flex items-center gap-1">📍 {profile.location}</div>}
                  {profile.website && <div className="flex items-center gap-1">🔗 <a href={profile.website} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">{profile.website.replace(/^https?:\/\//, '')}</a></div>}
                  <div className="flex items-center gap-1">🗓 Joined {new Date(profile.createdAt).toLocaleDateString()}</div>
                </div>

                <div className="flex items-center gap-6 pt-4 border-t border-border-token/40">
                  <div className="flex flex-col"><span className="text-xl font-black text-primary-text">{profile.postsCount}</span><span className="text-xs text-muted-token uppercase tracking-wider font-bold">Posts</span></div>
                  <div className="flex flex-col cursor-pointer hover:opacity-70 transition" onClick={() => openList('followers', 'Followers')}><span className="text-xl font-black text-primary-text">{profile.followerCount}</span><span className="text-xs text-muted-token uppercase tracking-wider font-bold">Followers</span></div>
                  <div className="flex flex-col cursor-pointer hover:opacity-70 transition" onClick={() => openList('following', 'Following')}><span className="text-xl font-black text-primary-text">{profile.followingCount}</span><span className="text-xs text-muted-token uppercase tracking-wider font-bold">Following</span></div>
                  <div className="flex flex-col cursor-pointer hover:opacity-70 transition" onClick={() => openList('friends', 'Friends')}><span className="text-xl font-black text-primary-text">{profile.friendsCount || 0}</span><span className="text-xs text-muted-token uppercase tracking-wider font-bold">Friends</span></div>
                </div>
              </div>

              {/* Content Tabs (Empty States) */}
              <div className="mt-8 border-t border-border-token">
                <div className="flex overflow-x-auto no-scrollbar">
                  {['Posts', 'Moments', 'About'].map((tab, i) => (
                    <button key={tab} className={`px-8 py-4 font-bold tracking-wide text-sm border-b-2 transition whitespace-nowrap ${i === 0 ? 'border-primary text-primary-text' : 'border-transparent text-muted-token hover:text-primary-text hover:bg-surface-hover/20'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                
                <div className="py-24 px-6 text-center space-y-4">
                  <div className="text-5xl opacity-50">✨</div>
                  <h3 className="text-xl font-bold">No posts yet</h3>
                  <p className="text-muted-token max-w-sm mx-auto">When @{username} shares posts, they will appear here. Check back later!</p>
                </div>
              </div>
              
              {listConfig && (
                <UserListModal 
                  title={listConfig.title}
                  users={listUsers.map((u: any) => listConfig.type === 'following' ? u.following : listConfig.type === 'followers' ? u.follower : u)} 
                  loading={listLoading}
                  emptyMessage={`No ${listConfig.type} found.`}
                  onClose={() => setListConfig(null)}
                />
              )}
            </div>
          ) : null}
      </div>
    </div>
  );
}
