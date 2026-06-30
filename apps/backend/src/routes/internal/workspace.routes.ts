import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';
import { Permission } from '@prisma/client';
import { 
  getWorkspaceStats, 
  getUserWorkspaces, 
  switchWorkspace, 
  createWorkspace,
  getCompressionDefaults,
  updateCompressionDefaults,
  updateWorkspaceDetails,
  deleteActiveWorkspace
} from '../../controllers/workspace.controller';

const router: Router = Router();

router.use(requireAuth);

router.get('/stats', getWorkspaceStats);
router.get('/list', getUserWorkspaces);
router.post('/switch', switchWorkspace);
router.post('/create', createWorkspace);
router.get('/compression-defaults', getCompressionDefaults);
router.put('/compression-defaults', requirePermissions([Permission.MANAGE_WORKSPACE]), updateCompressionDefaults);
router.put('/update', requirePermissions([Permission.MANAGE_WORKSPACE]), updateWorkspaceDetails);
router.delete('/delete', deleteActiveWorkspace);

export default router;
