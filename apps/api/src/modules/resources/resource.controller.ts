import { Request, Response, NextFunction } from 'express';
import { ResourceService } from './resource.service.js';
import {
  allocateResourceSchema,
  createResourceSchema,
  queryResourcesSchema,
  updateResourceSchema,
} from './resource.schemas.js';

export class ResourceController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createResourceSchema.parse(req.body);
      const resource = await ResourceService.create(data, req.user!.id);

      res.status(201).json({
        success: true,
        data: resource,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = queryResourcesSchema.parse(req.query);
      const result = await ResourceService.list(filter);

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
      const resource = await ResourceService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: resource,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = updateResourceSchema.parse(req.body);
      const resource = await ResourceService.update(req.params.id, data, req.user!.id);

      res.status(200).json({
        success: true,
        data: resource,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async allocate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = allocateResourceSchema.parse(req.body);
      const allocation = await ResourceService.allocate(req.params.id, data, req.user!.id);

      res.status(201).json({
        success: true,
        data: allocation,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async release(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allocation = await ResourceService.release(req.params.id, req.user!.id);

      res.status(200).json({
        success: true,
        data: allocation,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allocations = await ResourceService.listAllocationsByIncident(req.params.id);

      res.status(200).json({
        success: true,
        data: allocations,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }
}
