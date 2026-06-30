import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';
import { getDomains, createDomain, deleteDomain, verifyDomain } from '../../controllers/internal/domain.controller';
import { Permission } from '@prisma/client';

const router: Router = Router();

router.use(requireAuth);

router.get(
  '/', 
  getDomains
);

router.post(
  '/',
  requirePermissions([Permission.MANAGE_WORKSPACE]),
  createDomain
);

router.delete(
  '/:id',
  requirePermissions([Permission.MANAGE_WORKSPACE]),
  deleteDomain
);

router.post(
  '/:id/verify',
  requirePermissions([Permission.MANAGE_WORKSPACE]),
  verifyDomain
);

export default router;
