import { Router } from 'express';
import { createApiKey, getApiKeys, revokeApiKey } from '../../controllers/api-keys.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router: Router = Router();

router.use(requireAuth);
router.post('/', createApiKey);
router.get('/', getApiKeys);
router.delete('/:id', revokeApiKey);

export default router;
