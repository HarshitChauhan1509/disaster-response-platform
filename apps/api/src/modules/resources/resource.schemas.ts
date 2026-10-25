import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  type: z.enum(['MEDICAL', 'FOOD', 'WATER', 'VEHICLE', 'SHELTER', 'EQUIPMENT', 'OTHER']),
  totalQuantity: z.coerce.number().positive('Total quantity must be greater than 0'),
  availableQuantity: z.coerce.number().min(0, 'Available quantity cannot be negative').optional(),
  unit: z.string().min(1, 'Unit is required').trim(),
  location: z.object({
    type: z.literal('Point').default('Point'),
    coordinates: z
      .tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ])
      .refine(([lng, lat]) => !isNaN(lng) && !isNaN(lat), 'Invalid coordinates'),
  }),
  status: z.enum(['AVAILABLE', 'LOW', 'EXHAUSTED', 'INACTIVE']).optional(),
});

export const updateResourceSchema = z.object({
  name: z.string().min(2).trim().optional(),
  type: z.enum(['MEDICAL', 'FOOD', 'WATER', 'VEHICLE', 'SHELTER', 'EQUIPMENT', 'OTHER']).optional(),
  totalQuantity: z.coerce.number().positive().optional(),
  availableQuantity: z.coerce.number().min(0).optional(),
  unit: z.string().min(1).trim().optional(),
  location: z
    .object({
      type: z.literal('Point').default('Point'),
      coordinates: z.tuple([
        z.number().min(-180).max(180),
        z.number().min(-90).max(90),
      ]),
    })
    .optional(),
  status: z.enum(['AVAILABLE', 'LOW', 'EXHAUSTED', 'INACTIVE']).optional(),
});

export const queryResourcesSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  type: z.enum(['MEDICAL', 'FOOD', 'WATER', 'VEHICLE', 'SHELTER', 'EQUIPMENT', 'OTHER']).optional(),
  status: z.enum(['AVAILABLE', 'LOW', 'EXHAUSTED', 'INACTIVE']).optional(),
  search: z.string().optional(),
  sort: z.enum(['name', 'availableQuantity', 'createdAt']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const allocateResourceSchema = z.object({
  incidentId: z.string().min(1, 'Incident ID is required'),
  quantity: z.coerce.number().int().positive('Quantity must be an integer greater than 0'),
  notes: z.string().trim().optional(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type QueryResourcesInput = z.infer<typeof queryResourcesSchema>;
export type AllocateResourceInput = z.infer<typeof allocateResourceSchema>;
