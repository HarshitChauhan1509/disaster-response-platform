import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.header('x-request-id');
  const requestId = existingId || uuidv4();
  
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
