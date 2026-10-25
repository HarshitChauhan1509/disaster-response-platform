import { z } from 'zod';

export const createResponderSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  skills: z
    .array(z.enum(['MEDICAL', 'FIRE', 'SEARCH_AND_RESCUE', 'ENGINEERING', 'DRIVER', 'WATER_RESCUE']))
    .min(1, 'At least one skill is required'),
  organization: z.string().min(2, 'Organization name is required').trim(),
  location: z.object({
    type: z.literal('Point').default('Point'),
    coordinates: z
      .tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ])
      .refine(([lng, lat]) => !isNaN(lng) && !isNaN(lat), 'Invalid coordinates'),
  }),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'BUSY', 'OFF_DUTY']).optional().default('AVAILABLE'),
});

export const updateResponderSchema = z.object({
  skills: z
    .array(z.enum(['MEDICAL', 'FIRE', 'SEARCH_AND_RESCUE', 'ENGINEERING', 'DRIVER', 'WATER_RESCUE']))
    .optional(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'BUSY', 'OFF_DUTY']).optional(),
  organization: z.string().min(2).trim().optional(),
  location: z
    .object({
      type: z.literal('Point').default('Point'),
      coordinates: z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ]),
    })
    .optional(),
});

export const queryRespondersSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'BUSY', 'OFF_DUTY']).optional(),
  skill: z.enum(['MEDICAL', 'FIRE', 'SEARCH_AND_RESCUE', 'ENGINEERING', 'DRIVER', 'WATER_RESCUE']).optional(),
  organization: z.string().optional(),
  // Geospatial proximity query
  longitude: z.coerce.number().min(-180).max(180).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  maxDistanceKm: z.coerce.number().positive().optional().default(50),
});

export type CreateResponderInput = z.infer<typeof createResponderSchema>;
export type UpdateResponderInput = z.infer<typeof updateResponderSchema>;
export type QueryRespondersInput = z.infer<typeof queryRespondersSchema>;
