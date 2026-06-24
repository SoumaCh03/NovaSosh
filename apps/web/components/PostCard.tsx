'use client';

import React, { useState, useRef } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

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
  visibility?: string;
  isEdited?: boolean;
  sharedPostId?: string;
  sharedPost?: Post;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    username: string;
    displayName: string;
  };
}

export default function PostCard({ post, onPostDeleted }: { post: Post; onPostDeleted?: (id: string) => void }) {
  const { user, accessToken } = useAuthStore((state) => state);

  const [liked, setLiked] = useState(post.viewerHasLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showOptions, setShowOptions] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [editVisibility, setEditVisibility] = useState(post.visibility || 'PUBLIC');
  const [currentCaption, setCurrentCaption] = useState(post.caption || '');
  const [currentVisibility, setCurrentVisibility] = useState(post.visibility || 'PUBLIC');
  const [isDeleted, setIsDeleted] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const isAuthor = user?.id === post.author.id;

  const handleReport = async () => {
    try {
      await ApiClient.post('/moderation/reports', {
        targetType: 'POST',
        targetId: post.id,
        reason: 'Inappropriate Content (User Reported)'
      }, accessToken!);
      alert('Post reported successfully.');
      setShowOptions(false);
    } catch (e) {
      alert('Failed to report post.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post permanently?')) return;
    try {
      await ApiClient.delete(`/posts/${post.id}`, accessToken!);
      setIsDeleted(true);
      if (onPostDeleted) onPostDeleted(post.id);
    } catch (e) {
      alert('Failed to delete post.');
    }
  };

  const handleEditSubmit = async () => {
    try {
      await ApiClient.put(`/posts/${post.id}`, {
        caption: editCaption,
        visibility: editVisibility
      }, accessToken!);
      setCurrentCaption(editCaption);
      setCurrentVisibility(editVisibility);
      setIsEditing(false);
      setShowOptions(false);
    } catch (e) {
      alert('Failed to edit post.');
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await ApiClient.post(`/posts/${post.id}/share`, { visibility: 'PUBLIC' }, accessToken!);
      alert('Post shared to your timeline!');
    } catch (e) {
      alert('Failed to share post.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleLike = async () => {
    // Optimistic UI update
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

    try {
      const res = await ApiClient.post<{ liked: boolean; likeCount: number }>(
        `/posts/${post.id}/like`,
        {},
        accessToken!
      );
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch {
      // Revert if error
      setLiked(liked);
      setLikeCount(likeCount);
    }
  };

  const toggleComments = async () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && comments.length === 0) {
      loadComments();
    }
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await ApiClient.get<{ data: Comment[] }>(`/posts/${post.id}/comments`, accessToken!);
      setComments(res.data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const content = newComment;
    setNewComment('');

    try {
      const res = await ApiClient.post<Comment>(
        `/posts/${post.id}/comments`,
        { content },
        accessToken!
      );
      setComments((prev) => [...prev, res]);
      setCommentCount((prev) => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    }
  };

  const visibilityIcon = (v?: string) => {
    switch (v) {
      case 'FRIENDS': return '👥';
      case 'FRIENDS_OF_FRIENDS': return '👨‍👩‍👧';
      case 'ONLY_ME': return '🔒';
      case 'CUSTOM': return '⚙️';
      default: return '🌍';
    }
  };

  if (isDeleted) return null;

  return (
    <div className="rounded-2xl border border-border-token bg-surface/10 backdrop-blur-lg overflow-hidden hover:border-surface-hover transition duration-300">
      {/* Shared Post Indicator */}
      {post.sharedPost && (
        <div className="px-6 py-2 bg-surface-hover/30 border-b border-border-token/40 flex items-center gap-2 text-xs text-muted-token">
          <span>🔄</span>
          <span>Shared by {post.author.displayName}</span>
        </div>
      )}

      {/* Post Header */}
      <div className="p-6 flex items-center justify-between border-b border-border-token/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent-token/10 border border-accent-token/20 flex items-center justify-center font-bold text-accent-token">
            {(post.sharedPost ? post.sharedPost.author : post.author).username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-primary-text">{(post.sharedPost ? post.sharedPost.author : post.author).displayName}</span>
              {(post.sharedPost ? post.sharedPost.author : post.author).isVerified && (
                <span className="text-xs text-accent-token bg-accent-token/10 px-1.5 py-0.5 rounded-full font-bold">
                  ✓
                </span>
              )}
            </div>
            <p className="text-xs text-muted-token">
              @{(post.sharedPost ? post.sharedPost.author : post.author).username} • {new Date((post.sharedPost || post).createdAt).toLocaleDateString()}
              {currentVisibility && (
                <span className="ml-1.5" title={currentVisibility}>{visibilityIcon(currentVisibility)}</span>
              )}
              {post.isEdited && <span className="ml-1.5 italic opacity-70">(Edited)</span>}
            </p>
          </div>
        </div>
        
        {/* Options Menu */}
        <div className="relative">
          <button onClick={() => setShowOptions(!showOptions)} className="text-muted-token hover:text-primary-text px-2">
            •••
          </button>
          {showOptions && (
            <div className="absolute right-0 mt-2 w-40 bg-surface border border-border-token rounded-xl shadow-lg z-10 overflow-hidden">
              {isAuthor && (
                <>
                  <button onClick={() => { setIsEditing(true); setShowOptions(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-primary-text hover:bg-surface-hover transition">
                    Edit Post
                  </button>
                  <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-xs font-bold text-danger-token hover:bg-danger-token/10 transition">
                    Delete Post
                  </button>
                </>
              )}
              {!isAuthor && (
                <button onClick={handleReport} className="w-full text-left px-4 py-2 text-xs font-bold text-danger-token hover:bg-danger-token/10 transition">
                  Report Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Body */}
      <div className="px-6 py-4 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              className="w-full bg-surface/50 border border-border-token rounded-xl p-3 text-sm text-primary-text"
              rows={4}
              value={editCaption}
              onChange={(e) => setEditCaption(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <select 
                value={editVisibility}
                onChange={(e) => setEditVisibility(e.target.value)}
                className="bg-surface/50 border border-border-token rounded-xl p-2 text-xs text-primary-text"
              >
                <option value="PUBLIC">Public</option>
                <option value="FRIENDS">Friends</option>
                <option value="ONLY_ME">Only Me</option>
              </select>
              <button onClick={handleEditSubmit} className="bg-accent-token text-white px-4 py-2 rounded-xl text-xs font-bold">Save</button>
              <button onClick={() => setIsEditing(false)} className="bg-surface-hover text-primary-text px-4 py-2 rounded-xl text-xs font-bold">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {currentCaption && (
              <p className="text-sm text-secondary-text leading-relaxed whitespace-pre-line">{currentCaption}</p>
            )}
            {post.sharedPost?.caption && !currentCaption && (
              <p className="text-sm text-secondary-text leading-relaxed whitespace-pre-line">{post.sharedPost.caption}</p>
            )}

            {(post.sharedPost || post).type === 'IMAGE' && (post.sharedPost || post).media?.[0] && (
              <div className="rounded-xl overflow-hidden border border-border-token bg-background/40 max-h-[450px] flex items-center justify-center">
                <img
                  src={(post.sharedPost || post).media[0].rawUrl}
                  alt="Post media"
                  className="w-full max-h-[450px] object-cover hover:scale-[1.02] transition duration-500"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Post Footer Actions */}
      <div className="px-6 py-4 border-t border-border-token/40 flex items-center gap-6">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 text-xs font-semibold tracking-wider transition ${
            liked ? 'text-rose-500' : 'text-muted-token hover:text-secondary-text'
          }`}
        >
          <span className={`text-base transform active:scale-150 transition duration-150 ${liked ? 'scale-110' : ''}`}>
            {liked ? '❤️' : '🤍'}
          </span>
          {likeCount} Likes
        </button>

        <button
          onClick={toggleComments}
          className={`flex items-center gap-2 text-xs font-semibold tracking-wider transition ${
            showComments ? 'text-accent-token' : 'text-muted-token hover:text-secondary-text'
          }`}
        >
          <span className="text-base">💬</span>
          {commentCount} Comments
        </button>

        <button
          onClick={handleShare}
          disabled={isSharing}
          className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-token hover:text-secondary-text transition ml-auto disabled:opacity-50"
        >
          <span className="text-base">↗️</span>
          Share
        </button>
      </div>

      {/* Comments Section Drawer/Panel */}
      {showComments && (
        <div className="bg-background/50 border-t border-border-token/60 p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h4 className="text-xs font-bold text-secondary-text uppercase tracking-wider">Comments</h4>

          {/* Comment List */}
          {commentsLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-token border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-token italic">No comments yet. Start the conversation!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="text-xs space-y-1">
                    <p className="font-semibold text-secondary-text">
                      {comment.author.displayName}{' '}
                      <span className="font-normal text-muted-token">@{comment.author.username}</span>
                    </p>
                    <p className="text-secondary-text/80 leading-normal">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Comment Form */}
          <form onSubmit={handlePostComment} className="flex gap-2 pt-2 border-t border-border-token/60">
            <input
              type="text"
              required
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-xl border border-border-token bg-surface/30 px-4 py-2.5 text-xs text-primary-text placeholder-muted-token outline-none focus:border-accent-token transition"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="rounded-xl bg-accent-token px-4 text-xs font-semibold text-white hover:bg-accent-hover disabled:bg-surface-hover disabled:text-muted-token transition"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
