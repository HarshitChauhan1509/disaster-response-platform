import { Router } from 'express';
import { AssignmentController } from './assignment.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { idempotency } from '../../middleware/idempotency.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { updateAssignmentStatusSchema } from './assignment.schemas.js';

const router = Router();

router.use(authenticate);

// Get assignments for current logged-in responder
router.get('/my', authorize('RESPONDER'), AssignmentController.getMyAssignments);

// Update assignment status (accept/reject by responder, cancel by coordinator)
router.patch(
  '/:id',
  validate({ body: updateAssignmentStatusSchema }),
  idempotency,
  AssignmentController.updateStatus
);

export const assignmentRoutes = router;
