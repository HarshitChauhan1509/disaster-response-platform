import { Request, Response, NextFunction } from 'express';
import { AssignmentService } from './assignment.service.js';
import {
  createAssignmentSchema,
  updateAssignmentStatusSchema,
} from './assignment.schemas.js';

export class AssignmentController {
  static async createForIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createAssignmentSchema.parse(req.body);
      const assignment = await AssignmentService.create(
        {
          incidentId: req.params.id,
          responderId: data.responderId,
          notes: data.notes,
        },
        req.user!.id
      );

      res.status(201).json({
        success: true,
        data: assignment,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listForIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await AssignmentService.listByIncident(req.params.id);

      res.status(200).json({
        success: true,
        data: assignments,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, notes } = updateAssignmentStatusSchema.parse(req.body);
      const assignment = await AssignmentService.updateStatus(
        req.params.id,
        status,
        notes,
        req.user!
      );

      res.status(200).json({
        success: true,
        data: assignment,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyAssignments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const assignments = await AssignmentService.listMyAssignments(req.user!.id);

      res.status(200).json({
        success: true,
        data: assignments,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }
}
