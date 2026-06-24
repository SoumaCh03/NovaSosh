'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import PostCard from '../../components/PostCard';

export default function ExplorePage() {
  const router = useRouter();
  const { accessToken, isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login');
    const fetchExplore = async () => {
      try {
        const res = await ApiClient.get<{ data: any[] }>('/feed/recommended', accessToken!);
        setPosts(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchExplore();
  }, [isAuthenticated, accessToken, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[Analytics] Track: post_searched -> query: ${searchQuery}`);
    // Simulate search locally for demo
    if (searchQuery) {
      setPosts(prev => prev.filter(p => p.caption?.toLowerCase().includes(searchQuery.toLowerCase())));
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md pb-6 pt-2">
          <form onSubmit={handleSearch} className="relative">
            <input 
              type="text" 
              placeholder="Search posts, hashtags, or users..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border-token rounded-2xl px-6 py-4 text-base focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition shadow-sm"
            />
            <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-token hover:text-primary-text transition p-2">
              🔍
            </button>
          </form>
          
          <div className="flex items-center gap-3 mt-4 overflow-x-auto no-scrollbar pb-2">
            <span className="text-sm font-bold text-muted-token whitespace-nowrap">Trending:</span>
            {['#AI', '#Web3', '#Design', '#TypeScript', '#NovaSosh'].map(tag => (
              <button key={tag} onClick={() => setSearchQuery(tag)} className="px-4 py-1.5 bg-surface border border-border-token rounded-full text-xs font-bold hover:bg-surface-hover transition whitespace-nowrap">
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Explore Grid */}
        <div className="mt-4">
          {loading ? (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-surface rounded-3xl h-64 border border-border-token animate-pulse break-inside-avoid shadow-sm"></div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🌍</div>
              <h2 className="text-2xl font-black mb-2">No trending posts yet</h2>
              <p className="text-muted-token">Check back later for new content from around the world.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {posts.map(post => (
                <div key={post.id} className="break-inside-avoid">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
