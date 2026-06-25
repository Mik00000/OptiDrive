import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';
import { getRoles, createRole, updateRole, deleteRole } from '../../controllers/internal/roles.controller';
import { Permission } from '@prisma/client';

const router: Router = Router();

router.use(requireAuth);

router.get(
  '/', 
  getRoles
);

router.post(
  '/',
  requirePermissions([Permission.MANAGE_ROLES]),
  createRole
);

router.patch(
  '/:roleId',
  requirePermissions([Permission.MANAGE_ROLES]),
  updateRole
);

router.delete(
  '/:roleId',
  requirePermissions([Permission.MANAGE_ROLES]),
  deleteRole
);

export default router;
