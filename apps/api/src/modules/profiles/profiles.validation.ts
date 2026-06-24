import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().max(100).optional().or(z.literal('')),
  type: z.enum(['PERSONAL', 'CREATOR', 'PROFESSIONAL', 'BUSINESS', 'COMMUNITY']).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(20).optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  coverUrl: z.string().url().optional().or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
