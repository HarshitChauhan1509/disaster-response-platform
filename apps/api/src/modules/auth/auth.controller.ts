import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { loginSchema } from './auth.schemas.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = loginSchema.parse(req.body);
      const result = await AuthService.login(input);

      res.status(200).json({
        success: true,
        data: result,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
          requestId: req.id,
        });
        return;
      }

      const user = await AuthService.getMe(req.user.id);

      res.status(200).json({
        success: true,
        data: user,
        requestId: req.id,
      });
    } catch (error) {
      next(error);
    }
  }
}
