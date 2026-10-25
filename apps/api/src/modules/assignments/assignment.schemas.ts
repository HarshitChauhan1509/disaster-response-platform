import { z } from 'zod';

export const createAssignmentSchema = z.object({
  responderId: z.string().min(1, 'Responder ID is required'),
  notes: z.string().trim().optional(),
});

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  notes: z.string().trim().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;
