import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';
import { Permission } from '@prisma/client';
import {
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
} from '../../controllers/billing.controller';

const router: Router = Router();

// Усі billing-роути потребують авторизації
router.use(requireAuth);

// Статус підписки — доступний для всіх авторизованих
router.get('/status', getBillingStatus);

// Створення/управління — потребує MANAGE_BILLING дозволу
router.post('/create-checkout-session', requirePermissions([Permission.MANAGE_BILLING]), createCheckoutSession);
router.post('/create-portal-session', requirePermissions([Permission.MANAGE_BILLING]), createPortalSession);

export default router;
