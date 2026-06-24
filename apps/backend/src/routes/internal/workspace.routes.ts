import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { getWorkspaceStats } from '../../controllers/workspace.controller';

const router: Router = Router();

router.use(requireAuth);

router.get('/stats', getWorkspaceStats);

export default router;
