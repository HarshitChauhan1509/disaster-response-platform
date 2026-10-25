import { Router } from 'express';
import { IncidentController } from './incident.controller.js';
import { AssignmentController } from '../assignments/assignment.controller.js';
import { ResourceController } from '../resources/resource.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { idempotency } from '../../middleware/idempotency.middleware.js';
import {
  createIncidentSchema,
  queryIncidentsSchema,
  updateIncidentSchema,
  updateIncidentStatusSchema,
} from './incident.schemas.js';
import { createAssignmentSchema } from '../assignments/assignment.schemas.js';

const router = Router();

// All incident endpoints require authentication
router.use(authenticate);

// List incidents (all authenticated roles can view)
router.get('/', validate({ query: queryIncidentsSchema }), IncidentController.list);

// Create incident (ADMIN, COORDINATOR)
router.post(
  '/',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ body: createIncidentSchema }),
  IncidentController.create
);

// Get incident by ID (all authenticated roles)
router.get('/:id', IncidentController.getById);

// Update incident (ADMIN, COORDINATOR)
router.patch(
  '/:id',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ body: updateIncidentSchema }),
  IncidentController.update
);

// Change incident status (ADMIN, COORDINATOR)
router.post(
  '/:id/status',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ body: updateIncidentStatusSchema }),
  IncidentController.changeStatus
);

// Incident assignments
router.get('/:id/assignments', AssignmentController.listForIncident);

router.post(
  '/:id/assignments',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ body: createAssignmentSchema }),
  idempotency,
  AssignmentController.createForIncident
);

// Incident resource allocations
router.get('/:id/allocations', ResourceController.listByIncident);

export const incidentRoutes = router;


