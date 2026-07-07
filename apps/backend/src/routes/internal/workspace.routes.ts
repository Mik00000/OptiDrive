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
  deleteActiveWorkspace,
  testS3Connection,
  startWorkspaceMigration,
  getWorkspaceAuditLogs,
  uploadWatermark
} from '../../controllers/workspace.controller';
import multer from 'multer';
import os from 'os';

const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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
router.post('/test-s3', requirePermissions([Permission.MANAGE_WORKSPACE]), testS3Connection);
router.post('/start-migration', requirePermissions([Permission.MANAGE_WORKSPACE]), startWorkspaceMigration);
router.post('/watermark', upload.single('image'), uploadWatermark);
router.get('/audit-logs', getWorkspaceAuditLogs);

export default router;
