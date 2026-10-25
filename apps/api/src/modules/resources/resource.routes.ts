import { Router } from 'express';
import { ResourceController } from './resource.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { idempotency } from '../../middleware/idempotency.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  allocateResourceSchema,
  createResourceSchema,
  queryResourcesSchema,
  updateResourceSchema,
} from './resource.schemas.js';

const router = Router();

router.use(authenticate);

// List resources (all authenticated roles can view)
router.get('/', validate({ query: queryResourcesSchema }), ResourceController.list);

// Create resource (ADMIN, COORDINATOR)
router.post(
  '/',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ body: createResourceSchema }),
  ResourceController.create
);

// Release an allocation (ADMIN, COORDINATOR)
router.post(
  '/allocations/:id/release',
  authorize('ADMIN', 'COORDINATOR'),
  ResourceController.release
);

// Get resource by ID (all authenticated roles)
router.get('/:id', ResourceController.getById);

// Update resource (ADMIN, COORDINATOR)
router.patch(
  '/:id',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ body: updateResourceSchema }),
  ResourceController.update
);

// Concurrency-safe allocate resource (ADMIN, COORDINATOR) with Idempotency Key
router.post(
  '/:id/allocate',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ body: allocateResourceSchema }),
  idempotency,
  ResourceController.allocate
);

export const resourceRoutes = router;
