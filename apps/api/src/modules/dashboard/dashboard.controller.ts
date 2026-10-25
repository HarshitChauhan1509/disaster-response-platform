import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await DashboardService.getSummary();

      res.status(200).json({
        success: true,
        data: summary,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }
}
