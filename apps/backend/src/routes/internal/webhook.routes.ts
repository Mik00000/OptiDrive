import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';
import { Permission } from '@prisma/client';
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  testWebhook,
  retryWebhookDelivery
} from '../../controllers/internal/webhook.controller';

const router: Router = Router();

router.use(requireAuth);
router.use(requirePermissions([Permission.MANAGE_API_KEYS])); // Вебхуки — це частина розробницьких налаштувань

router.get('/', getWebhooks);
router.post('/', createWebhook);
router.patch('/:webhookId', updateWebhook);
router.delete('/:webhookId', deleteWebhook);
router.get('/:webhookId/deliveries', getWebhookDeliveries);
router.post('/:webhookId/test', testWebhook);
router.post('/:webhookId/deliveries/:deliveryId/retry', retryWebhookDelivery);

export default router;
