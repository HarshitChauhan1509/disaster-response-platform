import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// All authenticated roles can view operational dashboard summary
router.get('/summary', authenticate, DashboardController.getSummary);

export const dashboardRoutes = router;
