import { z } from 'zod';

export const createPostSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'POLL']).default('TEXT'),
  caption: z.string().max(2200).optional(),
  mediaUrls: z.array(z.string().url()).optional().default([]),
  mediaFileId: z.string().uuid().optional(),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'FRIENDS_OF_FRIENDS', 'ONLY_ME', 'CUSTOM']).optional().default('PUBLIC'),
  pollOptions: z.array(z.string()).min(2, 'A poll must have at least 2 options').max(5, 'Max 5 options allowed').optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment cannot exceed 1000 characters'),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updatePostSchema = z.object({
  caption: z.string().max(2200).nullable().optional(),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'FRIENDS_OF_FRIENDS', 'ONLY_ME', 'CUSTOM']).optional(),
  // For simplicity, mentions/hashtags can be parsed from the caption
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const updatePrivacySchema = z.object({
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'FRIENDS_OF_FRIENDS', 'ONLY_ME', 'CUSTOM']),
});
export type UpdatePrivacyInput = z.infer<typeof updatePrivacySchema>;

export const sharePostSchema = z.object({
  caption: z.string().max(2200).optional(),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'FRIENDS_OF_FRIENDS', 'ONLY_ME', 'CUSTOM']).default('PUBLIC'),
});
export type SharePostInput = z.infer<typeof sharePostSchema>;

