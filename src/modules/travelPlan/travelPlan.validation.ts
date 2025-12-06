import { z } from "zod";

export const createTravelPlanSchema = z.object({
  title: z.string().min(3),
  destinationCountry: z.string().optional(),
  destinationCity: z.string().optional(),
  startDate: z.string().datetime(), // ISO string
  endDate: z.string().datetime(),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  travelType: z.enum(["SOLO", "FAMILY", "FRIENDS"]),
  description: z.string().max(2000).optional(),
  groupChatLink: z.string().url().optional(),
  contact: z.string().min(3).optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  maxParticipants: z.number().int().positive().optional()
});

// For editing a plan – all fields optional
export const updateTravelPlanSchema = z.object({
  title: z.string().min(3).optional(),
  destinationCountry: z.string().optional(),
  destinationCity: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budgetMin: z.number().int().nonnegative().optional(),
  budgetMax: z.number().int().nonnegative().optional(),
  travelType: z.enum(["SOLO", "FAMILY", "FRIENDS"]).optional(),
  description: z.string().max(2000).optional(),
  groupChatLink: z.string().url().optional(),
  contact: z.string().min(3).optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  maxParticipants: z.number().int().positive().optional()
});

export const updateTravelPlanStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "CANCELED", "FULL"])
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional()
});
