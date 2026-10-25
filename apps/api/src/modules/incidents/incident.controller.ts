import { Request, Response, NextFunction } from 'express';
import { IncidentService } from './incident.service.js';
import {
  createIncidentSchema,
  queryIncidentsSchema,
  updateIncidentSchema,
  updateIncidentStatusSchema,
} from './incident.schemas.js';

export class IncidentController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createIncidentSchema.parse(req.body);
      const incident = await IncidentService.create(data, req.user!.id);

      res.status(201).json({
        success: true,
        data: incident,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = queryIncidentsSchema.parse(req.query);
      const result = await IncidentService.list(filter);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incident = await IncidentService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: incident,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateIncidentSchema.parse(req.body);
      const incident = await IncidentService.update(req.params.id, data, req.user!.id);

      res.status(200).json({
        success: true,
        data: incident,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, message } = updateIncidentStatusSchema.parse(req.body);
      const incident = await IncidentService.changeStatus(req.params.id, status, message, req.user!.id);

      res.status(200).json({
        success: true,
        data: incident,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }
}
