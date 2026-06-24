// Types shared between apps/api and apps/web. Keep these as plain DTOs —
// no Prisma types, no Express types — so the web app can import this
// package without pulling in backend-only dependencies.

export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DEACTIVATED';
export type PostVisibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
export type PostType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'POLL';
export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified: boolean;
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  user: PublicUser;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

// Model-specific Data Transfer Objects (DTOs)
export interface UserDTO {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  createdAt: string;
}

export interface ProfileDTO {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  website: string | null;
  location: string | null;
  isPrivate: boolean;
  isVerified: boolean;
  postsCount: number;
  followerCount: number;
  followingCount: number;
}

export interface MediaAssetDTO {
  id: string;
  type: MediaType;
  rawUrl: string;
  processedUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface PostDTO {
  id: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  type: PostType;
  caption: string | null;
  visibility: PostVisibility;
  media: MediaAssetDTO[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewerHasLiked?: boolean;
  createdAt: string;
}
