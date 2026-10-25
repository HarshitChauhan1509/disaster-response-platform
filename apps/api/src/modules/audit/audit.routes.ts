import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';

const router = Router();

// Only ADMIN and COORDINATOR can view audit logs
router.get('/', authenticate, authorize('ADMIN', 'COORDINATOR'), AuditController.getLogs);

export const auditRoutes = router;
