import { Request, Response, NextFunction } from 'express';
import { ResponderService } from './responder.service.js';
import {
  createResponderSchema,
  queryRespondersSchema,
  updateResponderSchema,
} from './responder.schemas.js';
import { AppError } from '../../shared/errors/app-error.js';

export class ResponderController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createResponderSchema.parse(req.body);
      const responder = await ResponderService.create(data, req.user!.id);

      res.status(201).json({
        success: true,
        data: responder,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = queryRespondersSchema.parse(req.query);
      const result = await ResponderService.list(filter);

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
      const responder = await ResponderService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: responder,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const responder = await ResponderService.getById(req.params.id);

      // If user is RESPONDER, they can only update their own responder profile
      if (req.user!.role === 'RESPONDER' && responder.userId._id.toString() !== req.user!.id) {
        throw AppError.forbidden('You can only update your own responder status and location');
      }

      const data = updateResponderSchema.parse(req.body);
      const updated = await ResponderService.update(req.params.id, data, req.user!.id);

      res.status(200).json({
        success: true,
        data: updated,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }
}
