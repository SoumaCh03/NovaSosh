'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/authStore';

export default function CommunitiesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  // Simulated data for demo purposes since the API route isn't fully wired yet in the monorepo
  const [myCommunities, setMyCommunities] = useState<any[]>([
    { id: '1', name: 'Next.js Devs', description: 'A place to discuss all things React and Next.js.', memberCount: 1250, isPrivate: false },
    { id: '2', name: 'UI/UX Design', description: 'Share your latest mockups and get feedback.', memberCount: 840, isPrivate: false }
  ]);
  
  const [discoverCommunities, setDiscoverCommunities] = useState<any[]>([
    { id: '3', name: 'Startup Founders', description: 'Networking for early stage tech founders.', memberCount: 430, isPrivate: true },
    { id: '4', name: 'Gaming Lounge', description: 'Casual gaming talk and looking for group.', memberCount: 3200, isPrivate: false },
    { id: '5', name: 'Local Photographers', description: 'Street photography and editing tips.', memberCount: 150, isPrivate: false }
  ]);

  const [joining, setJoining] = useState<string | null>(null);

  const handleJoin = (id: string, name: string) => {
    setJoining(id);
    console.log(`[Analytics] Track: community_joined -> id: ${id}`);
    
    // Simulate API delay
    setTimeout(() => {
      const comm = discoverCommunities.find(c => c.id === id);
      if (comm) {
        setDiscoverCommunities(prev => prev.filter(c => c.id !== id));
        setMyCommunities(prev => [...prev, comm]);
      }
      setJoining(null);
    }, 800);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black">Communities</h1>
            <p className="text-muted-token mt-1">Connect with people who share your interests.</p>
          </div>
          <button className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 transition flex items-center gap-2">
            <span>➕</span> Create Community
          </button>
        </div>

        <div className="space-y-12">
          
          {/* My Communities */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-indigo-500">🏢</span> Your Communities
            </h2>
            
            {myCommunities.length === 0 ? (
              <div className="bg-surface border border-border-token rounded-2xl p-8 text-center">
                <p className="font-bold text-muted-token">You haven't joined any communities yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCommunities.map(comm => (
                  <div key={comm.id} className="bg-surface border border-border-token rounded-2xl p-5 hover:border-indigo-500/50 transition cursor-pointer group shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 flex items-center justify-center font-black text-xl border border-indigo-500/20 group-hover:scale-105 transition-transform">
                        {comm.name.charAt(0)}
                      </div>
                      {comm.isPrivate && <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">Private</span>}
                    </div>
                    <h3 className="font-bold text-lg text-primary-text mb-1">{comm.name}</h3>
                    <p className="text-sm text-muted-token line-clamp-2 mb-4 flex-1">{comm.description}</p>
                    <div className="pt-3 border-t border-border-token/50 flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-token">{comm.memberCount.toLocaleString()} members</span>
                      <button className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition bg-indigo-500/10 px-3 py-1.5 rounded-lg">View Feed</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Discover */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-emerald-500">🌍</span> Discover
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoverCommunities.map(comm => (
                <div key={comm.id} className="bg-background border border-border-token rounded-2xl p-5 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50"></div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-primary-text">{comm.name}</h3>
                    {comm.isPrivate && <span className="text-xs font-bold text-muted-token bg-surface px-2 py-1 rounded-md border border-border-token">Private</span>}
                  </div>
                  <p className="text-sm text-muted-token line-clamp-2 mb-4 flex-1">{comm.description}</p>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs font-bold text-muted-token">{comm.memberCount.toLocaleString()} members</span>
                    <button 
                      onClick={() => handleJoin(comm.id, comm.name)}
                      disabled={joining === comm.id}
                      className="text-sm font-bold bg-surface border border-border-token px-4 py-2 rounded-xl hover:bg-surface-hover hover:border-emerald-500/50 hover:text-emerald-500 transition disabled:opacity-50"
                      aria-label={`Join ${comm.name}`}
                    >
                      {joining === comm.id ? 'Joining...' : comm.isPrivate ? 'Request' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
    </div>
  );
}
