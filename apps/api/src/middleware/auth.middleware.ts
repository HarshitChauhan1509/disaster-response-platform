import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../shared/errors/app-error.js';
import { User } from '../modules/auth/user.model.js';
import { UserRole } from '../shared/types/common.types.js';

interface JwtPayload {
  userId: string;
  role: UserRole;
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authentication token is missing');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw AppError.unauthorized('Authentication token is invalid');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    } catch (jwtErr) {
      if (jwtErr instanceof jwt.TokenExpiredError) {
        throw AppError.unauthorized('Authentication token has expired');
      }
      throw AppError.unauthorized('Invalid authentication token');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw AppError.unauthorized('User associated with token no longer exists');
    }

    if (!user.isActive) {
      throw AppError.forbidden('User account is deactivated');
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    next(error);
  }
};
