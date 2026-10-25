import { z } from 'zod';

export const createIncidentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').trim(),
  description: z.string().min(5, 'Description must be at least 5 characters').trim(),
  type: z.enum(['FLOOD', 'EARTHQUAKE', 'FIRE', 'BUILDING_COLLAPSE', 'CYCLONE', 'MEDICAL', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedPeople: z.coerce.number().min(0, 'Affected people cannot be negative').default(0),
  location: z.object({
    type: z.literal('Point').default('Point'),
    coordinates: z
      .tuple([
        z.number().min(-180).max(180), // longitude
        z.number().min(-90).max(90),   // latitude
      ])
      .refine(([lng, lat]) => !isNaN(lng) && !isNaN(lat), 'Invalid coordinates'),
  }),
  address: z.string().min(2, 'Address is required').trim(),
  requiredSkills: z
    .array(z.enum(['MEDICAL', 'FIRE', 'SEARCH_AND_RESCUE', 'ENGINEERING', 'DRIVER', 'WATER_RESCUE']))
    .default([]),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(3).trim().optional(),
  description: z.string().min(5).trim().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  type: z.enum(['FLOOD', 'EARTHQUAKE', 'FIRE', 'BUILDING_COLLAPSE', 'CYCLONE', 'MEDICAL', 'OTHER']).optional(),
  affectedPeople: z.coerce.number().min(0).optional(),
  address: z.string().min(2).trim().optional(),
  requiredSkills: z
    .array(z.enum(['MEDICAL', 'FIRE', 'SEARCH_AND_RESCUE', 'ENGINEERING', 'DRIVER', 'WATER_RESCUE']))
    .optional(),
});

export const updateIncidentStatusSchema = z.object({
  status: z.enum(['REPORTED', 'VERIFIED', 'ACTIVE', 'CONTAINED', 'RESOLVED', 'REJECTED', 'CANCELLED']),
  message: z.string().optional(),
});

export const queryIncidentsSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  status: z.string().optional(),
  severity: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['createdAt', 'priorityScore', 'affectedPeople', 'severity']).optional().default('priorityScore'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;
export type UpdateIncidentStatusInput = z.infer<typeof updateIncidentStatusSchema>;
export type QueryIncidentsInput = z.infer<typeof queryIncidentsSchema>;
