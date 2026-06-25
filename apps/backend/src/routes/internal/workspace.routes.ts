import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { getWorkspaceStats, getUserWorkspaces, switchWorkspace, createWorkspace } from '../../controllers/workspace.controller';

const router: Router = Router();

router.use(requireAuth);

router.get('/stats', getWorkspaceStats);
router.get('/list', getUserWorkspaces);
router.post('/switch', switchWorkspace);
router.post('/create', createWorkspace);

export default router;
