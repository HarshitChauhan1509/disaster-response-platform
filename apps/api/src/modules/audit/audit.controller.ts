import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service.js';
import { z } from 'zod';

export const auditQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
  entityId: z.string().optional(),
});

export class AuditController {
  static async getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = auditQuerySchema.parse(req.query);
      const result = await AuditService.list(filter as Parameters<typeof AuditService.list>[0]);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }
}
