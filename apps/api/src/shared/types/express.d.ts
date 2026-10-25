import { AuthUser } from './common.types.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: AuthUser;
      idempotencyKey?: string;
    }
  }
}

export {};
