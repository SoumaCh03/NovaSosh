'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

interface Comment {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

interface MomentCommentDrawerProps {
  momentId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentCountChange: (count: number) => void;
}

export default function MomentCommentDrawer({ momentId, isOpen, onClose, onCommentCountChange }: MomentCommentDrawerProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadComments();
    }
  }, [isOpen, momentId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.get<{ data: Comment[] }>(`/moments/${momentId}/comments`, accessToken!);
      setComments(res.data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const content = newComment;
    setNewComment('');

    try {
      const res = await ApiClient.post<Comment>(
        `/moments/${momentId}/comments`,
        { content },
        accessToken!
      );
      setComments((prev) => [...prev, res]);
      onCommentCountChange(comments.length + 1);
    } catch (err) {
      console.error('Failed to post comment:', err);
      setNewComment(content); // restore text on error
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-surface/95 border-l border-border-token/80 z-30 flex flex-col shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-token/40 p-4 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-primary-text">Comments</span>
        <button
          onClick={onClose}
          className="text-secondary-text hover:text-primary-text transition text-lg"
        >
          ✕
        </button>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-token border-t-transparent"></div>
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-token italic text-center py-10">No comments yet. Start the conversation!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-1 text-xs border-b border-border-token/20 pb-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary-text">
                  {comment.author.displayName || 'Creator'}{' '}
                  <span className="font-normal text-muted-token">@{comment.author.username}</span>
                </span>
                <span className="text-[9px] text-muted-token">{new Date(comment.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-secondary-text leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="border-t border-border-token/40 p-4 shrink-0 flex gap-2 bg-surface">
        <input
          type="text"
          required
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-xl border border-border-token bg-background px-4 py-2.5 text-xs text-primary-text placeholder-muted-token outline-none focus:border-accent-token transition"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="rounded-xl bg-accent-token hover:bg-accent-hover px-4 text-xs font-bold text-white transition disabled:opacity-40"
        >
          Post
        </button>
      </form>
    </div>
  );
}
