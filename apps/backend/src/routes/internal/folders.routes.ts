import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  createFolder,
  getFolders,
  renameFolder,
  deleteFolder,
  moveItems,
  getFolderNavigationPath,
  downloadFolder
} from '../../controllers/folders.controller';

const router: Router = Router();

router.use(requireAuth);

router.post('/', createFolder);
router.get('/', getFolders);
router.patch('/:id', renameFolder);
router.delete('/:id', deleteFolder);
router.post('/move', moveItems);
router.get('/:id/path', getFolderNavigationPath);
router.get('/:id/download', downloadFolder);

export default router;
