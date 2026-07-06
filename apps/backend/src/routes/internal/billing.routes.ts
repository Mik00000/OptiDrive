import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';
import { Permission } from '@prisma/client';
import {
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
  cancelEnterpriseRequest,
  getInvoiceHistory,
  getUsageAlertSettings,
  updateUsageAlertSettings,
} from '../../controllers/billing.controller';
import {
  createEnterpriseRequest,
  getEnterpriseRequestStatus,
} from '../../controllers/enterprise.controller';

const router: Router = Router();

// Усі billing-роути потребують авторизації
router.use(requireAuth);

// Статус підписки та Enterprise-запиту — доступні для всіх авторизованих
router.get('/status', getBillingStatus);
router.get('/enterprise-request/status', getEnterpriseRequestStatus);
router.get('/usage-alerts', getUsageAlertSettings);

// Створення/управління — потребує MANAGE_BILLING дозволу
router.post('/create-checkout-session', requirePermissions([Permission.MANAGE_BILLING]), createCheckoutSession);
router.post('/create-portal-session', requirePermissions([Permission.MANAGE_BILLING]), createPortalSession);
router.post('/enterprise-request', requirePermissions([Permission.MANAGE_BILLING]), createEnterpriseRequest);
router.post('/cancel-enterprise-request', requirePermissions([Permission.MANAGE_BILLING]), cancelEnterpriseRequest);
router.get('/invoices', requirePermissions([Permission.MANAGE_BILLING]), getInvoiceHistory);
router.post('/usage-alerts', requirePermissions([Permission.MANAGE_BILLING]), updateUsageAlertSettings);

export default router;
