import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  image: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  travelInterests: z.array(z.string()).optional(),
  visitedCountries: z.array(z.string()).optional(),
  currentLocation: z.string().optional(),
  gallery: z.array(z.string()).optional()
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6)
});

// Admin: set role/block
export const updateUserAdminSchema = z.object({
  role: z.enum(["USER", "ADMIN", "MODERATOR"]).optional(),
  isBlocked: z.boolean().optional()
});
