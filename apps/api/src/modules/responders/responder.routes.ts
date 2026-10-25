import { Router } from 'express';
import { ResponderController } from './responder.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createResponderSchema,
  queryRespondersSchema,
  updateResponderSchema,
} from './responder.schemas.js';

const router = Router();

router.use(authenticate);

// List responders (ADMIN, COORDINATOR)
router.get(
  '/',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ query: queryRespondersSchema }),
  ResponderController.list
);

// Create responder (ADMIN, COORDINATOR)
router.post(
  '/',
  authorize('ADMIN', 'COORDINATOR'),
  validate({ body: createResponderSchema }),
  ResponderController.create
);

// Get responder by ID (all authenticated users)
router.get('/:id', ResponderController.getById);

// Update responder (ADMIN, COORDINATOR, or RESPONDER updating self)
router.patch(
  '/:id',
  validate({ body: updateResponderSchema }),
  ResponderController.update
);

export const responderRoutes = router;
